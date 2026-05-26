<?php

namespace App\Http\Controllers;

use App\Models\Investment;
use App\Models\Portfolio;
use App\Models\Symbol;
use App\Models\Trade;
use App\Services\PlanLimitService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class InvestmentController extends Controller
{
    private const CACHE_TTL = 60;

    // Portfolio completo con precios reales desde la API de Python
    public function index(Request $request, $portfolioId): \Illuminate\Http\JsonResponse
    {
        $portfolio = Portfolio::with([
                'investments.symbol',
                'investments.trades' => function ($query) {
                    $query->where('type', 'compra')
                        ->orWhere('type', 'nuevaPosicion')
                        ->orderBy('operated_at', 'asc');
                },
                'user',
            ])
            ->where('id', $portfolioId)
            ->firstOrFail();

        $this->authorizePortfolioAccess($portfolio, $request->user());

        $readOnly = $portfolio->user_id !== $request->user()->id;
        $cacheKey = $this->getPortfolioCacheKey($portfolioId);

        // Si es solo lectura, intentamos tirar de cache
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

    // Nueva posicion
    public function store(Request $request, $portfolioId): \Illuminate\Http\JsonResponse
    {
        $validated = $request->validate([
            'symbol' => 'required|string|max:20',
            'name' => 'nullable|string|max:255',
            'image_url' => 'nullable|string|max:2048',
            'asset_type' => 'required|string|in:stock,crypto',
            'api_id' => 'nullable|string|max:255',
            'quantity' => 'required|numeric|min:0.00000001',
            'avg_buy_price' => 'required|numeric|min:0',
            'operated_at' => 'nullable|date',
        ]);

        $portfolio = $request->user()->portfolios()->findOrFail($portfolioId);

        // Miramos si el plan deja meter otro activo
        $activeCount = $portfolio->investments()->where('quantity', '>', 0)->count();
        $check = app(PlanLimitService::class)->check($request->user(), 'assets_per_portfolio', $activeCount);

        if (!$check['allowed']) {
            return response()->json([
                'message' => $check['message'],
                'code' => 'PLAN_LIMIT_EXCEEDED',
                'resource' => 'assets_per_portfolio',
                'limit' => $check['limit'],
            ], 403);
        }

        $investment = $this->applyBuyLot($portfolio, strtoupper($validated['symbol']), $validated);

        Cache::forget($this->getPortfolioCacheKey($portfolioId));

        return response()->json([
            'message' => 'Posición guardada con éxito',
            'investment' => $investment->load('symbol'),
        ], 201);
    }

    // Importacion masiva
    public function importPositions(Request $request, $portfolioId): \Illuminate\Http\JsonResponse
    {
        $validated = $request->validate([
            'positions' => 'required|array|min:1|max:500',
            'positions.*.symbol' => 'required|string|max:20',
            'positions.*.name' => 'nullable|string|max:255',
            'positions.*.image_url' => 'nullable|string|max:2048',
            'positions.*.asset_type' => 'required|string|in:stock,crypto',
            'positions.*.api_id' => 'nullable|string|max:255',
            'positions.*.quantity' => 'required|numeric|min:0.00000001',
            'positions.*.avg_buy_price' => 'required|numeric|min:0',
            'positions.*.operated_at' => 'nullable|date',
        ]);

        $portfolio = $request->user()->portfolios()->findOrFail($portfolioId);

        DB::transaction(function () use ($portfolio, $validated) {
            $this->bulkApplyBuyLots($portfolio, $validated['positions']);
        });

        Cache::forget($this->getPortfolioCacheKey($portfolioId));

        return response()->json([
            'message' => 'Importación completada.',
            'count' => count($validated['positions']),
        ]);
    }

    public function update(Request $request, $portfolioId, $investmentId): \Illuminate\Http\JsonResponse
    {
        return response()->json(['message' => 'Usa buy() o sell()'], 501);
    }

    // Eliminar posicion
    public function destroy(Request $request, $portfolioId, $investmentId): \Illuminate\Http\JsonResponse
    {
        $portfolio = $request->user()->portfolios()->findOrFail($portfolioId);
        $investment = $portfolio->investments()->findOrFail($investmentId);

        // Si tiene movimientos, no dejamos borrarla asi
        if ($investment->trades()->exists()) {
            return response()->json([
                'message' => 'No puedes eliminar posición con trades. Usa sell().',
            ], 422);
        }

        $investment->delete();
        Cache::forget($this->getPortfolioCacheKey($portfolioId));

        return response()->json(['message' => 'Posición eliminada.']);
    }

    // Compra extra sobre una posicion ya existente
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
            'operated_at' => $this->parseOperatedAt($validated['operated_at'] ?? null),
        ]);

        Cache::forget($this->getPortfolioCacheKey($portfolioId));

        return response()->json([
            'message' => 'Compra registrada.',
            'investment' => $investment->fresh(['symbol']),
        ]);
    }

    // Venta parcial o total
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
            'operated_at' => $this->parseOperatedAt($validated['operated_at'] ?? null),
        ]);

        $investment->update([
            'quantity' => $newQuantity <= 0 ? 0 : $newQuantity,
        ]);

        Cache::forget($this->getPortfolioCacheKey($portfolioId));

        return response()->json([
            'message' => 'Venta registrada.',
            'investment' => $investment->fresh(['symbol']),
        ]);
    }

    private function authorizePortfolioAccess(Portfolio $portfolio, $user): void
    {
        if ($portfolio->user_id !== $user->id && !$portfolio->is_public) {
            abort(403, 'Sin acceso al portafolio');
        }
    }

    // Monta las inversiones con precio actual
    private function buildInvestmentsWithRealPrices(Portfolio $portfolio): array
    {
        return $portfolio->investments
            ->map(function ($investment) {
                if (!$investment->symbol) {
                    return null;
                }

                $symbolData = $investment->symbol;
                $assetType = $symbolData->asset_type;
                $apiId = $symbolData->api_id;
                $symbol = $symbolData->symbol;

                $currentPrice = $this->resolveCurrentPrice($investment, $symbol, $apiId, $assetType);
                $currentPrice = max((float) $currentPrice, 0.00000001);

                $quantity = (float) $investment->quantity;
                $avgBuyPrice = (float) $investment->avg_buy_price;

                $currentValue = $quantity * $currentPrice;
                $buyValue = $quantity * $avgBuyPrice;
                $pl = $currentValue - $buyValue;
                $plPct = $buyValue > 0 ? round(($pl / $buyValue) * 100, 2) : 0;

                return [
                    'id' => $investment->id,
                    'symbol_id' => $investment->symbol_id,
                    'quantity' => $investment->quantity,
                    'avg_buy_price' => round($avgBuyPrice, 8),
                    'symbol' => $symbol,
                    'name' => $symbolData->name,
                    'asset_type' => $assetType,
                    'image_url' => $symbolData->image_url,
                    'api_id' => $apiId,
                    'current_price' => round($currentPrice, 8),
                    'value' => round($currentValue, 2),
                    'pl' => round($pl, 2),
                    'pl_percentage' => $plPct,
                    'weight' => 0,
                    'purchase_date' => $this->resolvePurchaseDate($investment),
                ];
            })
            ->filter()
            ->values()
            ->toArray();
    }

    // Saca el precio actual y si falla usa el precio medio de compra
    private function resolveCurrentPrice(Investment $investment, string $symbol, ?string $apiId, string $assetType): float
    {
        $identifier = null;

        if ($assetType === 'crypto' && !empty($apiId)) {
            $identifier = $apiId;
        }

        if ($assetType === 'stock') {
            $identifier = !empty($apiId) ? $apiId : $symbol;
        }

        $currentPrice = $identifier
            ? $this->getCurrentPriceFromPythonAPI($identifier, $assetType)
            : null;

        if ($currentPrice !== null) {
            return (float) $currentPrice;
        }

        Log::warning('Precio actual no encontrado, usando avg_buy_price', [
            'investment_id' => $investment->id,
            'symbol' => $symbol,
            'api_id' => $apiId,
            'asset_type' => $assetType,
        ]);

        return (float) $investment->avg_buy_price;
    }

    // Sacamos la fecha de compra desde el primer trade o desde la creacion
    private function resolvePurchaseDate(Investment $investment): string
    {
        $firstTrade = $investment->trades->first();

        if ($firstTrade && $firstTrade->operated_at) {
            return $firstTrade->operated_at instanceof Carbon
                ? $firstTrade->operated_at->format('Y-m-d')
                : date('Y-m-d', strtotime($firstTrade->operated_at));
        }

        if ($investment->created_at instanceof Carbon) {
            return $investment->created_at->format('Y-m-d');
        }

        return date('Y-m-d');
    }

    // Pide el precio actual usando la API de Python
    private function getCurrentPriceFromPythonAPI(string $identifier, string $assetType): ?float
    {
        $pythonApi = env('PYTHON_API_URL');
        $today = now()->format('Y-m-d');
        $cacheKey = 'current_price_' . md5($identifier . '_' . $assetType . '_' . $today);

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($pythonApi, $identifier, $assetType, $today) {
            try {
                $response = Http::timeout(10)->get("{$pythonApi}/historical-price/{$identifier}", [
                    'date' => $today,
                    'asset_type' => $assetType,
                    'convert_to_eur' => 'false',
                ]);

                if (!$response->successful()) {
                    Log::warning('FastAPI devolvio error HTTP', [
                        'identifier' => $identifier,
                        'asset_type' => $assetType,
                        'date' => $today,
                        'status' => $response->status(),
                        'body' => $response->body(),
                    ]);

                    return null;
                }

                $price = $response->json('price');

                if (is_numeric($price)) {
                    return (float) $price;
                }

                Log::warning('FastAPI respondio sin price valido', [
                    'identifier' => $identifier,
                    'asset_type' => $assetType,
                    'date' => $today,
                    'response' => $response->json(),
                ]);
            } catch (\Exception $e) {
                Log::error('Error FastAPI precio actual [' . $identifier . ']: ' . $e->getMessage(), [
                    'identifier' => $identifier,
                    'asset_type' => $assetType,
                    'date' => $today,
                ]);
            }

            return null;
        });
    }

    // Lo dejo por si luego se vuelve a usar
    private function getPricesFromPythonAPI(array $symbols): array
    {
        $tickers = implode(',', array_column($symbols, 'ticker'));
        $assetTypes = implode(',', array_column($symbols, 'asset_type'));
        $cacheKey = 'prices_' . md5($tickers . '_' . $assetTypes);

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($tickers, $assetTypes) {
            try {
                $response = Http::timeout(10)->get(env('PYTHON_API_URL') . '/prices', [
                    'symbols' => $tickers,
                    'asset_types' => $assetTypes,
                ]);

                if (!$response->successful()) {
                    return [];
                }

                $prices = [];

                foreach ($response->json('results', []) as $result) {
                    if (!isset($result['price']) || !is_numeric($result['price'])) {
                        continue;
                    }

                    $key = $result['api_id'] ?? $result['symbol'];
                    $prices[$key] = (float) $result['price'];
                }

                Log::info('Prices mapeados:', $prices);

                return $prices;
            } catch (\Exception $e) {
                Log::error('Error Python API precios: ' . $e->getMessage());

                return [];
            }
        });
    }

    // Importacion masiva de compras
    private function bulkApplyBuyLots(Portfolio $portfolio, array $positions): void
    {
        $tickers = array_map(function ($position) {
            return strtoupper($position['symbol']);
        }, $positions);

        $symbols = Symbol::whereIn('symbol', $tickers)
            ->get()
            ->keyBy('symbol');

        foreach ($positions as $position) {
            $ticker = strtoupper($position['symbol']);

            if (!isset($symbols[$ticker])) {
                $symbols[$ticker] = $this->createOrUpdateSymbol(null, $ticker, $position);
            } else {
                $symbols[$ticker] = $this->createOrUpdateSymbol($symbols[$ticker], $ticker, $position);
            }

            $this->applyBuyLot($portfolio, $ticker, $position);
        }
    }

    // Crea el simbolo si no existe y actualiza datos si hace falta
    private function createOrUpdateSymbol(?Symbol $symbol, string $ticker, array $fields): Symbol
    {
        if (!$symbol) {
            $symbol = Symbol::firstOrCreate(
                ['symbol' => $ticker],
                [
                    'name' => $fields['name'] ?? $ticker,
                    'image_url' => $fields['image_url'] ?? null,
                    'asset_type' => $fields['asset_type'],
                    'api_id' => $fields['api_id'] ?? null,
                ]
            );
        }

        if (!empty($fields['api_id']) && $symbol->api_id !== $fields['api_id']) {
            $symbol->update([
                'api_id' => $fields['api_id'],
                'name' => $fields['name'] ?? $symbol->name,
                'image_url' => $fields['image_url'] ?? $symbol->image_url,
                'asset_type' => $fields['asset_type'] ?? $symbol->asset_type,
            ]);

            return $symbol->fresh();
        }

        return $symbol;
    }

    // Logica comun para una compra nueva
    private function applyBuyLot(Portfolio $portfolio, string $symbolTicker, array $fields): Investment
    {
        $symbol = $this->createOrUpdateSymbol(null, $symbolTicker, $fields);

        $investment = Investment::where('portfolio_id', $portfolio->id)
            ->where('symbol_id', $symbol->id)
            ->first();

        $quantity = (float) $fields['quantity'];
        $price = (float) $fields['avg_buy_price'];

        if ($investment) {
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
        foreach ($investmentsData as &$investment) {
            $investment['weight'] = round(($investment['value'] / $totalValue) * 100, 2);
        }
    }

    private function parseOperatedAt(?string $date): Carbon
    {
        return $date ? Carbon::parse($date) : now();
    }

    private function getPortfolioCacheKey($portfolioId): string
    {
        return "portfolio_{$portfolioId}_investments";
    }
}