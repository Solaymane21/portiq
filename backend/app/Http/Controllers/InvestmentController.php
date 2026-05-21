<?php

namespace App\Http\Controllers;

use App\Models\Investment;
use App\Models\Portfolio;
use App\Models\Symbol;
use App\Models\Trade;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class InvestmentController extends Controller
{
    private const CACHE_TTL = 60;

    /**
     * Portfolio completo con precios reales desde tu Python API
     */
    public function index(Request $request, $portfolioId): \Illuminate\Http\JsonResponse
    {
        $portfolio = Portfolio::with(['investments.symbol', 'investments.trades' => function($query) {
            $query->where('type', 'compra')->orWhere('type', 'nuevaPosicion')->orderBy('operated_at', 'asc');
        }, 'user'])
            ->where('id', $portfolioId)
            ->firstOrFail();

        $this->authorizePortfolioAccess($portfolio, $request->user());

        $readOnly = $portfolio->user_id !== $request->user()->id;
        $cacheKey = "portfolio_{$portfolioId}_investments";

        if ($readOnly) {
            $cached = Cache::get($cacheKey);
            if ($cached) {
                return response()->json($cached);
            }
        }

        $investmentsData = $this->buildInvestmentsWithRealPrices($portfolio);
        $totalValue = $this->calculateTotalValue($investmentsData);

        if ($totalValue > 0) {
            $this->calculateWeights($investmentsData, $totalValue);
        }

        $response = [
            'portfolio_name' => $portfolio->name,
            'total_value' => round($totalValue, 2),
            'investments' => $investmentsData,
            'read_only' => $readOnly,
            'owner_name' => $readOnly ? $portfolio->user?->name : null,
        ];

        Cache::put($cacheKey, $response, self::CACHE_TTL);

        return response()->json($response);
    }

    /**
     * Nueva posicion
     */
    public function store(Request $request, $portfolioId): \Illuminate\Http\JsonResponse
    {
        $validated = $request->validate([
            'symbol' => 'required|string|max:20',
            'name' => 'nullable|string|max:255',
            'image_url' => 'nullable|string|max:2048',
            'asset_type' => 'required|string|in:stock,crypto',
            'quantity' => 'required|numeric|min:0.00000001',
            'avg_buy_price' => 'required|numeric|min:0',
            'operated_at' => 'nullable|date',
        ]);

        $portfolio = $request->user()->portfolios()->findOrFail($portfolioId);

        $investment = $this->applyBuyLot($portfolio, strtoupper($validated['symbol']), $validated);

        Cache::forget("portfolio_{$portfolioId}_investments");

        return response()->json([
            'message' => 'Posición guardada con éxito',
            'investment'=> $investment->load('symbol'),
        ], 201);
    }

    /**
     * Importacion masiva optimizada
     */
    public function importPositions(Request $request, $portfolioId): \Illuminate\Http\JsonResponse
    {
        $validated = $request->validate([
            'positions' => 'required|array|min:1|max:500',
            'positions.*.symbol' => 'required|string|max:20',
            'positions.*.name' => 'nullable|string|max:255',
            'positions.*.image_url' => 'nullable|string|max:2048',
            'positions.*.asset_type' => 'required|string|in:stock,crypto',
            'positions.*.quantity' => 'required|numeric|min:0.00000001',
            'positions.*.avg_buy_price' => 'required|numeric|min:0',
            'positions.*.operated_at' => 'nullable|date',
        ]);

        $portfolio = $request->user()->portfolios()->findOrFail($portfolioId);

        DB::transaction(function () use ($portfolio, $validated) {
            $this->bulkApplyBuyLots($portfolio, $validated['positions']);
        });

        Cache::forget("portfolio_{$portfolioId}_investments");

        return response()->json([
            'message' => 'Importación completada.',
            'count' => count($validated['positions']),
        ]);
    }

    public function update(Request $request, $portfolioId, $investmentId): \Illuminate\Http\JsonResponse
    {
        return response()->json(['message' => 'Usa buy() o sell()'], 501);
    }

    /**
     * Eliminar posicion
     */
    public function destroy(Request $request, $portfolioId, $investmentId): \Illuminate\Http\JsonResponse
    {
        $portfolio = $request->user()->portfolios()->findOrFail($portfolioId);
        $investment = $portfolio->investments()->findOrFail($investmentId);

        if ($investment->trades()->exists()) {
            return response()->json([
                'message' => 'No puedes eliminar posición con trades. Usa sell().',
            ], 422);
        }

        $investment->delete();
        Cache::forget("portfolio_{$portfolioId}_investments");

        return response()->json(['message' => 'Posición eliminada.']);
    }

    /**
     * Compra adicional
     */
    public function buy(Request $request, $portfolioId, $investmentId): \Illuminate\Http\JsonResponse
    {
        $validated = $request->validate([
            'quantity' => 'required|numeric|min:0.00000001',
            'price_per_unit' => 'required|numeric|min:0.01',
            'operated_at' => 'nullable|date',
        ]);

        $portfolio = $request->user()->portfolios()->findOrFail($portfolioId);
        $investment = $portfolio->investments()->findOrFail($investmentId);

        $adjustment = $this->calculateBuyAdjustment($investment, $validated);

        $investment->update([
            'quantity' => $adjustment['quantity'],
            'avg_buy_price' => $adjustment['avgBuyPrice'],
        ]);

        Trade::create([
            'investment_id' => $investment->id,
            'quantity' => $validated['quantity'],
            'price_per_unit' => $validated['price_per_unit'],
            'type' => 'compra',
            'operated_at' => $this->parseOperatedAt($validated['operated_at']),
        ]);

        Cache::forget("portfolio_{$portfolioId}_investments");

        return response()->json([
            'message' => 'Compra registrada.',
            'investment' => $investment->fresh(['symbol']),
        ]);
    }

    /**
     * Venta
     */
    public function sell(Request $request, $portfolioId, $investmentId): \Illuminate\Http\JsonResponse
    {
        $validated = $request->validate([
            'quantity' => 'required|numeric|min:0.00000001',
            'price_per_unit' => 'required|numeric|min:0.01',
            'operated_at' => 'nullable|date',
        ]);

        $portfolio = $request->user()->portfolios()->findOrFail($portfolioId);
        $investment = $portfolio->investments()->findOrFail($investmentId);

        if ($validated['quantity'] > $investment->quantity) {
            return response()->json([
                'message' => 'Cantidad insuficiente.',
                'current_quantity' => $investment->quantity,
                'requested' => $validated['quantity'],
            ], 422);
        }

        $newQuantity = $investment->quantity - $validated['quantity'];

        Trade::create([
            'investment_id' => $investment->id,
            'quantity' => $validated['quantity'],
            'price_per_unit' => $validated['price_per_unit'],
            'type' => 'venta',
            'operated_at' => $this->parseOperatedAt($validated['operated_at']),
        ]);

        if ($newQuantity <= 0) {
            $investment->update(['quantity' => 0]);
        } else {
            $investment->update(['quantity' => $newQuantity]);
        }

        Cache::forget("portfolio_{$portfolioId}_investments");

        return response()->json([
            'message' => 'Venta registrada.',
            'investment' => $investment->fresh(['symbol']),
        ]);
    }

    // ==================== METODOS PRIVADOS ====================

    private function authorizePortfolioAccess(Portfolio $portfolio, $user): void
    {
        if ($portfolio->user_id !== $user->id && !$portfolio->is_public) {
            abort(403, 'Sin acceso al portafolio');
        }
    }

    /**
     * Integracion FastAPI
     */
    private function buildInvestmentsWithRealPrices(Portfolio $portfolio): array
    {
        $symbols = $portfolio->investments
            ->filter(fn($inv) => $inv->symbol)
            ->pluck('symbol')
            ->map(fn($s) => [
                'api_id'     => $s->api_id,
                'asset_type' => $s->asset_type,
                'symbol'     => $s->symbol,
            ])
            ->toArray();

        if (empty($symbols)) return [];

        $tickerMap = [];
        foreach ($symbols as $s) {
            $ticker = $s['asset_type'] === 'crypto'
                ? $s['api_id']
                : $s['symbol'];
            $tickerMap[$ticker] = [
                'api_id'     => $s['api_id'],
                'asset_type' => $s['asset_type'],
            ];
        }

        $symbolsPayload = array_map(fn($ticker, $meta) => [
            'ticker'     => $ticker,
            'api_id'     => $meta['api_id'],
            'asset_type' => $meta['asset_type'],
        ], array_keys($tickerMap), array_values($tickerMap));

        $prices = $this->getPricesFromPythonAPI($symbolsPayload);

        return $portfolio->investments->map(function ($investment) use ($prices, $tickerMap) {
            if (!$investment->symbol) return null;

            $assetType = $investment->symbol->asset_type;
            $lookupKey = $assetType === 'crypto'
                ? $investment->symbol->api_id
                : $investment->symbol->symbol;

            $currentPrice = $prices[$lookupKey] ?? $investment->avg_buy_price;
            $currentPrice = max($currentPrice, 0.00000001);

            $currentValue = $investment->quantity * $currentPrice;
            $buyValue     = $investment->quantity * $investment->avg_buy_price;
            $pl           = $currentValue - $buyValue;
            $plPct        = $buyValue > 0 ? round(($pl / $buyValue) * 100, 2) : 0;

            $firstTrade = $investment->trades->first();
            $purchaseDate = null;
            if ($firstTrade && $firstTrade->operated_at) {
                $purchaseDate = $firstTrade->operated_at instanceof \Carbon\Carbon 
                    ? $firstTrade->operated_at->format('Y-m-d')
                    : date('Y-m-d', strtotime($firstTrade->operated_at));
            } else {
                $purchaseDate = $investment->created_at instanceof \Carbon\Carbon 
                    ? $investment->created_at->format('Y-m-d')
                    : date('Y-m-d');
            }
            return [
                'id'            => $investment->id,
                'symbol_id'     => $investment->symbol_id,
                'quantity'      => $investment->quantity,
                'avg_buy_price' => round($investment->avg_buy_price, 8),
                'symbol'        => $investment->symbol->symbol,
                'name'          => $investment->symbol->name,
                'asset_type'    => $investment->symbol->asset_type,
                'image_url'     => $investment->symbol->image_url,
                'api_id'        => $investment->symbol->api_id,
                'current_price' => round($currentPrice, 8),
                'value'         => round($currentValue, 2),
                'pl'            => round($pl, 2),
                'pl_percentage' => $plPct,
                'weight'        => 0,
                'purchase_date' => $purchaseDate,
            ];
        })->filter()->values()->toArray();
    }

    /**
     * Llamada a tu FastAPI /prices endpoint
     */
    private function getPricesFromPythonAPI(array $symbols): array
    {
        $tickers    = implode(',', array_column($symbols, 'ticker'));
        $assetTypes = implode(',', array_column($symbols, 'asset_type'));
        $cacheKey   = 'prices_' . md5($tickers);

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($tickers, $assetTypes) {
            try {
                $response = Http::timeout(10)->get(env('PYTHON_API_URL') . '/prices', [
                    'symbols'     => $tickers,
                    'asset_types' => $assetTypes,
                ]);

                if ($response->successful()) {
                    $data   = $response->json();
                    $prices = [];

                    foreach ($data['results'] ?? [] as $result) {
                        if (isset($result['price']) && is_numeric($result['price'])) {
                            $prices[$result['api_id'] ?? $result['symbol']] = (float) $result['price'];
                        }
                    }

                    Log::info('Prices mapeados:', $prices);
                    return $prices;
                }
            } catch (\Exception $e) {
                Log::error('Error Python API precios: ' . $e->getMessage());
            }

            return [];
        });
    }
        
    /**
     * Importacion masiva optimizada
     */
    private function bulkApplyBuyLots(Portfolio $portfolio, array $positions): void
    {
        $tickers = array_map(fn($p) => strtoupper($p['symbol']), $positions);
        $symbols = Symbol::whereIn('symbol', $tickers)
            ->get()
            ->keyBy('symbol');

        foreach ($positions as $position) {
            $ticker = strtoupper($position['symbol']);

            if (!isset($symbols[$ticker])) {
                $symbol = Symbol::firstOrCreate(
                    ['symbol' => $ticker],
                    [
                        'name' => $position['name'] ?? $ticker,
                        'image_url' => $position['image_url'] ?? null,
                        'asset_type' => $position['asset_type'],
                    ]
                );
                $symbols[$ticker] = $symbol;
            } else {
                $symbol = $symbols[$ticker];
            }

            $this->applyBuyLot($portfolio, $ticker, $position);
        }
    }

    /**
     * Logica reutilizable para nuevas compras
     */
    private function applyBuyLot(Portfolio $portfolio, string $symbolTicker, array $fields): Investment
    {
        $symbol = Symbol::firstOrCreate(
            ['symbol' => $symbolTicker],
            [
                'name' => $fields['name'] ?? $symbolTicker,
                'image_url' => $fields['image_url'] ?? null,
                'asset_type' => $fields['asset_type'],
            ]
        );

        $investment = Investment::where('portfolio_id', $portfolio->id)
            ->where('symbol_id', $symbol->id)
            ->first();

        $quantity = (float) $fields['quantity'];
        $price = (float) $fields['avg_buy_price'];

        if ($investment) {
            // Actualizar existente
            $adjustment = $this->calculateBuyAdjustment($investment, [
                'quantity' => $quantity,
                'price_per_unit' => $price,
            ]);

            $investment->update([
                'quantity' => $adjustment['quantity'],
                'avg_buy_price' => $adjustment['avgBuyPrice'],
            ]);
            $tradeType = 'compra';
        } else {
            // Nueva posición
            $investment = $portfolio->investments()->create([
                'symbol_id' => $symbol->id,
                'quantity' => $quantity,
                'avg_buy_price' => $price,
            ]);
            $tradeType = 'nuevaPosicion';
        }

        Trade::create([
            'investment_id' => $investment->id,
            'quantity' => $quantity,
            'price_per_unit' => $price,
            'type' => $tradeType,
            'operated_at' => $this->parseOperatedAt($fields['operated_at'] ?? null),
        ]);

        return $investment;
    }

    private function calculateBuyAdjustment(Investment $investment, array $operation): array
    {
        $totalCostBefore = $investment->quantity * $investment->avg_buy_price;
        $newCost = $operation['quantity'] * $operation['price_per_unit'];
        $newQuantity = $investment->quantity + $operation['quantity'];
        $newAvgPrice = ($totalCostBefore + $newCost) / $newQuantity;

        return [
            'quantity' => $newQuantity,
            'avgBuyPrice' => $newAvgPrice,
        ];
    }

    private function calculateTotalValue(array $investmentsData): float
    {
        return array_sum(array_column($investmentsData, 'value'));
    }

    private function calculateWeights(array &$investmentsData, float $totalValue): void
    {
        foreach ($investmentsData as &$data) {
            $data['weight'] = round(($data['value'] / $totalValue) * 100, 2);
        }
    }

    private function parseOperatedAt(?string $date): Carbon
    {
        return $date ? Carbon::parse($date) : now();
    }
}