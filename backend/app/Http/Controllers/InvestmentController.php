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
    // Tiempo de cache en segundos
    private const CACHE_TTL = 60;

    // Devuelve el portfolio completo con precios actualizados
    public function index(Request $request, $portfolioId): \Illuminate\Http\JsonResponse
    {
        // Cargamos portfolio, usuario, simbolos y compras iniciales
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

        // Comprobamos si el usuario puede ver este portfolio
        $this->authorizePortfolioAccess($portfolio, $request->user());

        // Marcamos si el portfolio se esta viendo en modo solo lectura
        $readOnly = $portfolio->user_id !== $request->user()->id;

        // Generamos la clave de cache para este portfolio
        $cacheKey = $this->getPortfolioCacheKey($portfolioId);

        // Si es solo lectura intentamos responder desde cache
        if ($readOnly) {
            $cached = Cache::get($cacheKey);

            // Si ya estaba en cache devolvemos la respuesta al momento
            if ($cached) {
                return response()->json($cached);
            }
        }

        // Montamos las inversiones con precio actual
        $investmentsData = $this->buildInvestmentsWithRealPrices($portfolio);

        // Sumamos el valor total del portfolio
        $totalValue = $this->calculateTotalValue($investmentsData);

        // Calculamos el peso de cada activo si el total es valido
        if ($totalValue > 0) {
            $this->calculateWeights($investmentsData, $totalValue);
        }

        // Preparamos la respuesta final
        $response = [
            'portfolio_name' => $portfolio->name,
            'total_value' => round($totalValue, 2),
            'investments' => $investmentsData,
            'read_only' => $readOnly,
            'owner_name' => $readOnly ? $portfolio->user?->name : null,
        ];

        // Guardamos la respuesta en cache
        Cache::put($cacheKey, $response, self::CACHE_TTL);

        return response()->json($response);
    }

    // Crea una nueva posicion o suma a una existente
    public function store(Request $request, $portfolioId): \Illuminate\Http\JsonResponse
    {
        // Validamos los datos de entrada
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

        // Solo el dueño puede crear posiciones en su portfolio
        $portfolio = $request->user()->portfolios()->findOrFail($portfolioId);

        // Contamos cuantos activos siguen abiertos en este portfolio
        $activeCount = $portfolio->investments()->where('quantity', '>', 0)->count();

        // Comprobamos si el plan permite meter otro activo
        $check = app(PlanLimitService::class)->check($request->user(), 'assets_per_portfolio', $activeCount);

        // Si el plan no lo permite devolvemos error claro
        if (!$check['allowed']) {
            return response()->json([
                'message' => $check['message'],
                'code' => 'PLAN_LIMIT_EXCEEDED',
                'resource' => 'assets_per_portfolio',
                'limit' => $check['limit'],
            ], 403);
        }

        // Aplicamos la compra como nuevo lote
        $investment = $this->applyBuyLot($portfolio, strtoupper($validated['symbol']), $validated);

        // Limpiamos cache para que el portfolio se recalcule
        Cache::forget($this->getPortfolioCacheKey($portfolioId));

        return response()->json([
            'message' => 'Posicion guardada con exito',
            'investment' => $investment->load('symbol'),
        ], 201);
    }

    // Importa varias posiciones de golpe
    public function importPositions(Request $request, $portfolioId): \Illuminate\Http\JsonResponse
    {
        // Validamos el array de posiciones
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

        // Buscamos el portfolio del usuario actual
        $portfolio = $request->user()->portfolios()->findOrFail($portfolioId);

        // Metemos todo en transaccion para que falle todo o nada
        DB::transaction(function () use ($portfolio, $validated) {
            $this->bulkApplyBuyLots($portfolio, $validated['positions']);
        });

        // Limpiamos cache para forzar recarga
        Cache::forget($this->getPortfolioCacheKey($portfolioId));

        return response()->json([
            'message' => 'Importacion completada.',
            'count' => count($validated['positions']),
        ]);
    }

    // Este endpoint no se usa porque hay buy y sell
    public function update(Request $request, $portfolioId, $investmentId): \Illuminate\Http\JsonResponse
    {
        return response()->json(['message' => 'Usa buy() o sell()'], 501);
    }

    // Elimina una posicion si no tiene trades
    public function destroy(Request $request, $portfolioId, $investmentId): \Illuminate\Http\JsonResponse
    {
        // Buscamos el portfolio del usuario
        $portfolio = $request->user()->portfolios()->findOrFail($portfolioId);

        // Buscamos la inversion dentro de ese portfolio
        $investment = $portfolio->investments()->findOrFail($investmentId);

        // Si tiene historial no dejamos borrarla asi
        if ($investment->trades()->exists()) {
            return response()->json([
                'message' => 'No puedes eliminar posicion con trades. Usa sell().',
            ], 422);
        }

        // Si no tiene trades la borramos
        $investment->delete();

        // Limpiamos cache del portfolio
        Cache::forget($this->getPortfolioCacheKey($portfolioId));

        return response()->json(['message' => 'Posicion eliminada.']);
    }

    // Registra una compra extra sobre una posicion existente
    public function buy(Request $request, $portfolioId, $investmentId): \Illuminate\Http\JsonResponse
    {
        // Validamos los datos de la compra
        $validated = $request->validate([
            'quantity' => 'required|numeric|min:0.00000001',
            'price_per_unit' => 'required|numeric|min:0.00000001',
            'operated_at' => 'nullable|date',
        ]);

        // Buscamos el portfolio del usuario
        $portfolio = $request->user()->portfolios()->findOrFail($portfolioId);

        // Buscamos la inversion a modificar
        $investment = $portfolio->investments()->findOrFail($investmentId);

        // Recalculamos cantidad total y precio medio
        $adjustment = $this->calculateBuyAdjustment($investment, $validated);

        // Guardamos los nuevos valores en la inversion
        $investment->update([
            'quantity' => $adjustment['quantity'],
            'avg_buy_price' => $adjustment['avgBuyPrice'],
        ]);

        // Registramos el movimiento en trades
        Trade::create([
            'investment_id' => $investment->id,
            'quantity' => $validated['quantity'],
            'price_per_unit' => $validated['price_per_unit'],
            'type' => 'compra',
            'operated_at' => $this->parseOperatedAt($validated['operated_at'] ?? null),
        ]);

        // Limpiamos cache para refrescar datos
        Cache::forget($this->getPortfolioCacheKey($portfolioId));

        return response()->json([
            'message' => 'Compra registrada.',
            'investment' => $investment->fresh(['symbol']),
        ]);
    }

    // Registra una venta parcial o total
    public function sell(Request $request, $portfolioId, $investmentId): \Illuminate\Http\JsonResponse
    {
        // Validamos los datos de la venta
        $validated = $request->validate([
            'quantity' => 'required|numeric|min:0.00000001',
            'price_per_unit' => 'required|numeric|min:0.00000001',
            'operated_at' => 'nullable|date',
        ]);

        // Buscamos el portfolio del usuario
        $portfolio = $request->user()->portfolios()->findOrFail($portfolioId);

        // Buscamos la inversion que se va a vender
        $investment = $portfolio->investments()->findOrFail($investmentId);

        // No dejamos vender mas cantidad de la que existe
        if ($validated['quantity'] > $investment->quantity) {
            return response()->json([
                'message' => 'Cantidad insuficiente.',
                'current_quantity' => $investment->quantity,
                'requested' => $validated['quantity'],
            ], 422);
        }

        // Restamos la cantidad vendida
        $newQuantity = $investment->quantity - $validated['quantity'];

        // Guardamos la venta en el historial
        Trade::create([
            'investment_id' => $investment->id,
            'quantity' => $validated['quantity'],
            'price_per_unit' => $validated['price_per_unit'],
            'type' => 'venta',
            'operated_at' => $this->parseOperatedAt($validated['operated_at'] ?? null),
        ]);

        // Si llega a cero la posicion queda cerrada
        $investment->update([
            'quantity' => $newQuantity <= 0 ? 0 : $newQuantity,
        ]);

        // Limpiamos cache del portfolio
        Cache::forget($this->getPortfolioCacheKey($portfolioId));

        return response()->json([
            'message' => 'Venta registrada.',
            'investment' => $investment->fresh(['symbol']),
        ]);
    }

    // Comprueba si el usuario puede acceder al portfolio
    private function authorizePortfolioAccess(Portfolio $portfolio, $user): void
    {
        // Si no es suyo y no es publico devolvemos 403
        if ($portfolio->user_id !== $user->id && !$portfolio->is_public) {
            abort(403, 'Sin acceso al portafolio');
        }
    }

    // Monta el array final de inversiones con precio real
    private function buildInvestmentsWithRealPrices(Portfolio $portfolio): array
    {
        return $portfolio->investments
            ->map(function ($investment) {
                // Si falta el simbolo no podemos procesar esta fila
                if (!$investment->symbol) {
                    return null;
                }

                // Sacamos datos base del simbolo
                $symbolData = $investment->symbol;
                $assetType = $symbolData->asset_type;
                $apiId = $symbolData->api_id;
                $symbol = $symbolData->symbol;

                // Intentamos resolver el precio actual
                $currentPrice = $this->resolveCurrentPrice($investment, $symbol, $apiId, $assetType);

                // Nos aseguramos de no trabajar con cero absoluto
                $currentPrice = max((float) $currentPrice, 0.00000001);

                // Convertimos a float para operar bien
                $quantity = (float) $investment->quantity;
                $avgBuyPrice = (float) $investment->avg_buy_price;

                // Calculamos valor actual, coste, beneficio y porcentaje
                $currentValue = $quantity * $currentPrice;
                $buyValue = $quantity * $avgBuyPrice;
                $pl = $currentValue - $buyValue;
                $plPct = $buyValue > 0 ? round(($pl / $buyValue) * 100, 2) : 0;

                // Devolvemos la estructura que necesita el frontend
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

    // Saca el precio actual y si falla usa el precio medio
    private function resolveCurrentPrice(Investment $investment, string $symbol, ?string $apiId, string $assetType): float
    {
        // Empezamos sin identificador
        $identifier = null;

        // En crypto solemos usar api_id si existe
        if ($assetType === 'crypto' && !empty($apiId)) {
            $identifier = $apiId;
        }

        // En stock usamos api_id si existe y si no el simbolo
        if ($assetType === 'stock') {
            $identifier = !empty($apiId) ? $apiId : $symbol;
        }

        // Intentamos sacar el precio desde la API de Python
        $currentPrice = $identifier
            ? $this->getCurrentPriceFromPythonAPI($identifier, $assetType)
            : null;

        // Si viene precio valido lo devolvemos
        if ($currentPrice !== null) {
            return (float) $currentPrice;
        }

        // Si falla dejamos rastro en logs
        Log::warning('Precio actual no encontrado, usando avg_buy_price', [
            'investment_id' => $investment->id,
            'symbol' => $symbol,
            'api_id' => $apiId,
            'asset_type' => $assetType,
        ]);

        // Como fallback usamos el precio medio de compra
        return (float) $investment->avg_buy_price;
    }

    // Saca la fecha de compra mas antigua disponible
    private function resolvePurchaseDate(Investment $investment): string
    {
        // Cogemos el primer trade cargado
        $firstTrade = $investment->trades->first();

        // Si existe fecha operada la devolvemos
        if ($firstTrade && $firstTrade->operated_at) {
            return $firstTrade->operated_at instanceof Carbon
                ? $firstTrade->operated_at->format('Y-m-d')
                : date('Y-m-d', strtotime($firstTrade->operated_at));
        }

        // Si no, intentamos usar la fecha de creacion
        if ($investment->created_at instanceof Carbon) {
            return $investment->created_at->format('Y-m-d');
        }

        // Como ultimo recurso devolvemos hoy
        return date('Y-m-d');
    }

    // Pide el precio actual a la API de Python
    private function getCurrentPriceFromPythonAPI(string $identifier, string $assetType): ?float
    {
        // Leemos la URL base de la API externa
        $pythonApi = config('services.ml.url');

        // Usamos la fecha de hoy para pedir el precio actual
        $today = now()->format('Y-m-d');

        // La cache distingue por identificador, tipo y fecha
        $cacheKey = 'current_price_' . md5($identifier . '_' . $assetType . '_' . $today);

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($pythonApi, $identifier, $assetType, $today) {
            try {
                // Llamamos a FastAPI con timeout para no colgar la app
                $response = Http::timeout(10)->get("{$pythonApi}/historical-price/{$identifier}", [
                    'date' => $today,
                    'asset_type' => $assetType,
                    'convert_to_eur' => 'false',
                ]);

                // Si FastAPI responde mal lo dejamos en logs
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

                // Sacamos el campo price del json
                $price = $response->json('price');

                // Si es numerico lo devolvemos como float
                if (is_numeric($price)) {
                    return (float) $price;
                }

                // Si no hay un price valido lo registramos
                Log::warning('FastAPI respondio sin price valido', [
                    'identifier' => $identifier,
                    'asset_type' => $assetType,
                    'date' => $today,
                    'response' => $response->json(),
                ]);
            } catch (\Exception $e) {
                // Si la llamada falla del todo tambien lo registramos
                Log::error('Error FastAPI precio actual [' . $identifier . ']: ' . $e->getMessage(), [
                    'identifier' => $identifier,
                    'asset_type' => $assetType,
                    'date' => $today,
                ]);
            }

            // Si algo fue mal devolvemos null
            return null;
        });
    }

    // Importa varias compras en una sola pasada
    private function bulkApplyBuyLots(Portfolio $portfolio, array $positions): void
    {
        // Sacamos todos los tickers en mayusculas
        $tickers = array_map(function ($position) {
            return strtoupper($position['symbol']);
        }, $positions);

        // Traemos de golpe los simbolos ya existentes
        $symbols = Symbol::whereIn('symbol', $tickers)
            ->get()
            ->keyBy('symbol');

        foreach ($positions as $position) {
            // Normalizamos el ticker actual
            $ticker = strtoupper($position['symbol']);

            // Si no existe lo creamos o lo actualizamos
            if (!isset($symbols[$ticker])) {
                $symbols[$ticker] = $this->createOrUpdateSymbol(null, $ticker, $position);
            } else {
                $symbols[$ticker] = $this->createOrUpdateSymbol($symbols[$ticker], $ticker, $position);
            }

            // Aplicamos cada compra a su portfolio
            $this->applyBuyLot($portfolio, $ticker, $position);
        }
    }

    // Crea el simbolo o actualiza sus datos si cambian
    private function createOrUpdateSymbol(?Symbol $symbol, string $ticker, array $fields): Symbol
    {
        // Si no existe lo creamos con datos basicos
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

        // Si llega un api_id distinto actualizamos el simbolo
        if (!empty($fields['api_id']) && $symbol->api_id !== $fields['api_id']) {
            $symbol->update([
                'api_id' => $fields['api_id'],
                'name' => $fields['name'] ?? $symbol->name,
                'image_url' => $fields['image_url'] ?? $symbol->image_url,
                'asset_type' => $fields['asset_type'] ?? $symbol->asset_type,
            ]);

            // Devolvemos el modelo refrescado
            return $symbol->fresh();
        }

        return $symbol;
    }

    // Aplica una compra nueva o suma a una posicion existente
    private function applyBuyLot(Portfolio $portfolio, string $symbolTicker, array $fields): Investment
    {
        // Nos aseguramos de que el simbolo exista
        $symbol = $this->createOrUpdateSymbol(null, $symbolTicker, $fields);

        // Buscamos si ya habia una inversion de ese simbolo en el portfolio
        $investment = Investment::where('portfolio_id', $portfolio->id)
            ->where('symbol_id', $symbol->id)
            ->first();

        // Normalizamos cantidad y precio
        $quantity = (float) $fields['quantity'];
        $price = (float) $fields['avg_buy_price'];

        if ($investment) {
            // Si ya existia recalculamos media y cantidad
            $adjustment = $this->calculateBuyAdjustment($investment, [
                'quantity' => $quantity,
                'price_per_unit' => $price,
            ]);

            // Guardamos los nuevos datos acumulados
            $investment->update([
                'quantity' => $adjustment['quantity'],
                'avg_buy_price' => $adjustment['avgBuyPrice'],
            ]);

            // Marcamos el trade como compra normal
            $tradeType = 'compra';
        } else {
            // Si no existia creamos una nueva posicion
            $investment = $portfolio->investments()->create([
                'symbol_id' => $symbol->id,
                'quantity' => $quantity,
                'avg_buy_price' => $price,
            ]);

            // El primer trade se marca distinto
            $tradeType = 'nuevaPosicion';
        }

        // Guardamos el movimiento en la tabla de trades
        Trade::create([
            'investment_id' => $investment->id,
            'quantity' => $quantity,
            'price_per_unit' => $price,
            'type' => $tradeType,
            'operated_at' => $this->parseOperatedAt($fields['operated_at'] ?? null),
        ]);

        return $investment;
    }

    // Recalcula cantidad total y precio medio tras una compra
    private function calculateBuyAdjustment(Investment $investment, array $operation): array
    {
        // Coste acumulado antes de comprar mas
        $totalCostBefore = $investment->quantity * $investment->avg_buy_price;

        // Coste del nuevo lote
        $newCost = $operation['quantity'] * $operation['price_per_unit'];

        // Nueva cantidad total
        $newQuantity = $investment->quantity + $operation['quantity'];

        // Nuevo precio medio ponderado
        $newAvgPrice = ($totalCostBefore + $newCost) / $newQuantity;

        return [
            'quantity' => $newQuantity,
            'avgBuyPrice' => $newAvgPrice,
        ];
    }

    // Suma el valor total de todas las inversiones
    private function calculateTotalValue(array $investmentsData): float
    {
        return array_sum(array_column($investmentsData, 'value'));
    }

    // Calcula el peso porcentual de cada inversion
    private function calculateWeights(array &$investmentsData, float $totalValue): void
    {
        foreach ($investmentsData as &$investment) {
            $investment['weight'] = round(($investment['value'] / $totalValue) * 100, 2);
        }
    }

    // Convierte la fecha recibida o usa ahora por defecto
    private function parseOperatedAt(?string $date): Carbon
    {
        return $date ? Carbon::parse($date) : now();
    }

    // Genera la clave de cache del portfolio
    private function getPortfolioCacheKey($portfolioId): string
    {
        return "portfolio_{$portfolioId}_investments";
    }
}