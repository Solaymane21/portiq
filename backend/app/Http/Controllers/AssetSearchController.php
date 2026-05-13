<?php

namespace App\Http\Controllers;

use App\Models\Symbol;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class AssetSearchController extends Controller
{
    private const MAX_LOCAL_RESULTS = 8;
    private const MIN_LOCAL_TO_RETURN = 4;
    private const MAX_EXTERNAL_RESULTS = 4;
    private const CACHE_TTL = 300;

    public function search(Request $request)
    {
        $request->validate([
            'q' => 'required|string|min:2|max:50',
        ]);
        
        $cacheKey = 'asset_search_' . md5($request->q);
        if ($cached = Cache::get($cacheKey)) {
            return response()->json($cached);
        }

        $query = strtoupper(trim($request->q));
        $results = $this->performSearch($query);

        Cache::put($cacheKey, $results, self::CACHE_TTL);
        
        return response()->json($results);
    }

    private function performSearch(string $query): array
    {
        $exactMatch = Symbol::where('symbol', $query)->get();
        if ($exactMatch->isNotEmpty()) {
            return $this->convertToArray($exactMatch);
        }

        $partialLocal = $this->searchPartialInDatabase($query);
        if (count($partialLocal) >= self::MIN_LOCAL_TO_RETURN) {
            return $partialLocal;
        }

        $localSymbols = array_column($partialLocal, 'symbol');
        $externalResults = [];
        
        $this->searchInCoinGecko($query, $localSymbols, $externalResults);
        $this->searchInTwelveData($query, $localSymbols, $externalResults);

        return array_merge($partialLocal, array_slice($externalResults, 0, self::MAX_EXTERNAL_RESULTS));
    }

    /**
     * Convierte modelos de DB a array JSON
     */
    private function convertToArray($symbols): array
    {
        $results = [];
        foreach ($symbols as $symbol) {
            $results[] = [
                'symbol'     => $symbol->symbol,
                'name'       => $symbol->name,
                'api_id'     => $symbol->api_id,
                'image_url'  => $symbol->image_url,
                'asset_type' => $symbol->asset_type,
                'source'     => 'local',
            ];
        }
        return $results;
    }

    /**
     * Busqueda parcial en nuestra base de datos
     */
    private function searchPartialInDatabase(string $query): array
    {
        $symbols = Symbol::where('symbol', 'ilike', "%{$query}%")
            ->orWhere('name', 'ilike', "%{$query}%")
            ->limit(self::MAX_LOCAL_RESULTS)
            ->get();

        return $this->convertToArray($symbols);
    }

    /**
     * Busca CRYPTO en CoinGecko API
     */
    private function searchInCoinGecko(string $query, array $localSymbols, array &$externalResults): void
    {
        try {
            $response = Http::timeout(5)->get('https://api.coingecko.com/api/v3/search', [
                'query' => $query
            ]);

            if ($response->successful()) {
                $coins = $response->json('coins', []);
                $coins = array_slice($coins, 0, self::MAX_EXTERNAL_RESULTS);

                foreach ($coins as $coin) {
                    $symbol = strtoupper($coin['symbol']);
                    
                    if (!in_array($symbol, $localSymbols) && 
                        count($externalResults) < self::MAX_EXTERNAL_RESULTS) {
                        
                        $externalResults[] = [
                            'symbol'     => $symbol,
                            'name'       => $coin['name'],
                            'api_id'     => $coin['api_symbol'],
                            'image_url'  => $coin['large'] ?? $coin['thumb'] ?? null,
                            'asset_type' => 'crypto',
                            'source'     => 'api'
                        ];
                    }
                }
            }
        } catch (\Exception $e) {
            Log::error('Error CoinGecko search [' . $query . ']: ' . $e->getMessage());
        }
    }

    /**
     * Busca ACCIONES en TwelveData API
     */
    private function searchInTwelveData(string $query, array $localSymbols, array &$externalResults): void
    {
        try {
            $response = Http::timeout(5)->get('https://api.twelvedata.com/symbol_search', [
                'symbol'     => $query,
                'outputsize' => 10,
            ]);

            if ($response->successful() && isset($response->json()['data'])) {
                $addedSymbols = [];

                foreach ($response->json()['data'] as $stock) {
                    $symbol = strtoupper($stock['symbol']);
                    
                    if (!in_array($symbol, $localSymbols) &&
                        !in_array($symbol, $addedSymbols) &&
                        count($externalResults) < self::MAX_EXTERNAL_RESULTS) {
                        
                        $externalResults[] = [
                            'symbol'     => $symbol,
                            'name'       => $stock['instrument_name'],
                            'api_id'     => $stock['symbol'],
                            'image_url'  => null,
                            'asset_type' => 'stock',
                            'source'     => 'api',
                        ];
                        $addedSymbols[] = $symbol;
                    }
                }
            }
        } catch (\Exception $e) {
            Log::error('Error TwelveData search [' . $query . ']: ' . $e->getMessage());
        }
    }

    /**
     * Obtiene precio historico
     */
    public function history(Request $request)
    {
        $request->validate([
            'api_id' => 'required|string',
            'asset_type' => 'required|in:crypto,stock',
            'date' => 'required|date_format:Y-m-d'
        ]);

        $pythonApi = env('PYTHON_API_URL');
        
        try {
            $response = Http::timeout(10)->get("{$pythonApi}/historical-price/{$request->api_id}", [
                'date' => $request->date,
                'asset_type' => $request->asset_type,
                'convert_to_eur' => 'true'
            ]);

            if ($response->successful() && isset($response->json()['price'])) {
                return response()->json([
                    'price' => (float) $response->json()['price']
                ]);
            }
            
            return response()->json(['price' => null]);
        } catch (\Exception $e) {
            Log::error('Error FastAPI [' . $request->api_id . ']: ' . $e->getMessage());
            return response()->json(['price' => null]);
        }
    }
}