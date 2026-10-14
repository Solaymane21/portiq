<?php

namespace App\Http\Controllers;

use App\Models\Symbol;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AssetSearchController extends Controller
{
    private const MAX_LOCAL_RESULTS = 8;
    private const MIN_LOCAL_TO_RETURN = 4;
    private const MAX_EXTERNAL_RESULTS = 4;
    private const CACHE_TTL = 300;

    public function search(Request $request)
    {
        // Validamos la busqueda
        $request->validate([
            'q' => 'required|string|min:2|max:50',
        ]);

        // Dejamos el texto limpio antes de buscar
        $query = strtoupper(trim($request->q));
        $cacheKey = 'asset_search_' . md5($request->q);

        // Si ya esta en cache, devolvemos eso
        $cachedResults = Cache::get($cacheKey);
        if ($cachedResults) {
            return response()->json($cachedResults);
        }

        // Si no, hacemos la busqueda normal
        $results = $this->performSearch($query);

        // Guardamos el resultado un rato para no repetir llamadas
        Cache::put($cacheKey, $results, self::CACHE_TTL);

        return response()->json($results);
    }

    private function performSearch(string $query): array
    {
        // Primero miramos si existe exacto en local
        $exactMatch = Symbol::where('symbol', $query)->get();
        if ($exactMatch->isNotEmpty()) {
            return $this->convertToArray($exactMatch);
        }

        // Si no, buscamos coincidencias parciales
        $localResults = $this->searchPartialInDatabase($query);

        // Si con local ya tenemos bastante, no hace falta salir fuera
        if (count($localResults) >= self::MIN_LOCAL_TO_RETURN) {
            return $localResults;
        }

        // Guardamos los simbolos locales para no repetirlos
        $localSymbols = array_column($localResults, 'symbol');
        $externalResults = [];

        // Completamos con APIs externas
        $this->searchInCoinGecko($query, $localSymbols, $externalResults);
        $this->searchInTwelveData($query, $localSymbols, $externalResults);

        return array_merge(
            $localResults,
            array_slice($externalResults, 0, self::MAX_EXTERNAL_RESULTS)
        );
    }

    // Pasamos los modelos al formato que devuelve la API
    private function convertToArray($symbols): array
    {
        $results = [];

        foreach ($symbols as $symbol) {
            $results[] = [
                'symbol' => $symbol->symbol,
                'name' => $symbol->name,
                'api_id' => $symbol->api_id,
                'image_url' => $symbol->image_url,
                'asset_type' => $symbol->asset_type,
                'source' => 'local',
            ];
        }

        return $results;
    }

    // Busqueda parcial en nuestra base de datos
    private function searchPartialInDatabase(string $query): array
    {
        $symbols = Symbol::where('symbol', 'ilike', "%{$query}%")
            ->orWhere('name', 'ilike', "%{$query}%")
            ->limit(self::MAX_LOCAL_RESULTS)
            ->get();

        return $this->convertToArray($symbols);
    }

    // Buscamos cryptos en CoinGecko
    private function searchInCoinGecko(string $query, array $localSymbols, array &$externalResults): void
    {
        try {
            $response = Http::timeout(5)->get('https://api.coingecko.com/api/v3/search', [
                'query' => $query,
            ]);

            // Si falla, salimos y ya esta
            if (!$response->successful()) {
                return;
            }

            $coins = array_slice($response->json('coins', []), 0, self::MAX_EXTERNAL_RESULTS);

            foreach ($coins as $coin) {
                $symbol = strtoupper($coin['symbol']);

                // Saltamos si ya existe o si ya hemos llegado al limite
                if (in_array($symbol, $localSymbols) || count($externalResults) >= self::MAX_EXTERNAL_RESULTS) {
                    continue;
                }

                $externalResults[] = [
                    'symbol' => $symbol,
                    'name' => $coin['name'],
                    'api_id' => $coin['api_symbol'],
                    'image_url' => $coin['large'] ?? $coin['thumb'] ?? null,
                    'asset_type' => 'crypto',
                    'source' => 'api',
                ];
            }
        } catch (\Exception $e) {
            Log::error('Error CoinGecko search [' . $query . ']: ' . $e->getMessage());
        }
    }

    // Buscamos acciones en TwelveData
    private function searchInTwelveData(string $query, array $localSymbols, array &$externalResults): void
    {
        try {
            $response = Http::timeout(5)->get('https://api.twelvedata.com/symbol_search', [
                'symbol' => $query,
                'outputsize' => 10,
            ]);

            $data = $response->json('data');

            // Si no viene nada util, no seguimos
            if (!$response->successful() || !is_array($data)) {
                return;
            }

            $addedSymbols = [];

            foreach ($data as $stock) {
                $symbol = strtoupper($stock['symbol']);

                // Evitamos repetir simbolos
                if (
                    in_array($symbol, $localSymbols) ||
                    in_array($symbol, $addedSymbols) ||
                    count($externalResults) >= self::MAX_EXTERNAL_RESULTS
                ) {
                    continue;
                }

                $externalResults[] = [
                    'symbol' => $symbol,
                    'name' => $stock['instrument_name'],
                    'api_id' => $stock['symbol'],
                    'image_url' => null,
                    'asset_type' => 'stock',
                    'source' => 'api',
                ];

                $addedSymbols[] = $symbol;
            }
        } catch (\Exception $e) {
            Log::error('Error TwelveData search [' . $query . ']: ' . $e->getMessage());
        }
    }

    // Pedimos el precio historico a la API de Python
    public function history(Request $request)
    {
        // Validamos lo minimo antes de llamar fuera
        $request->validate([
            'api_id' => 'required|string',
            'asset_type' => 'required|in:crypto,stock',
            'date' => 'required|date_format:Y-m-d',
            'convert_to_eur' => 'nullable|boolean',
        ]);

        $pythonApi = config('services.ml.url');
        $convertToEur = $request->boolean('convert_to_eur');

        try {
            $response = Http::timeout(10)->get("{$pythonApi}/historical-price/{$request->api_id}", [
                'date' => $request->date,
                'asset_type' => $request->asset_type,
                'convert_to_eur' => $convertToEur ? 'true' : 'false',
            ]);

            $price = $response->json('price');

            // Si viene bien, devolvemos el precio
            if ($response->successful() && $price !== null) {
                return response()->json([
                    'price' => (float) $price,
                ]);
            }

            // Si no hay precio, mantenemos la misma respuesta
            return response()->json(['price' => null]);
        } catch (\Exception $e) {
            Log::error('Error FastAPI [' . $request->api_id . ']: ' . $e->getMessage());

            // Si algo falla, devolvemos null igual
            return response()->json(['price' => null]);
        }
    }
}