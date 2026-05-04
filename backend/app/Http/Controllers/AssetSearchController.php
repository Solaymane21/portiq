<?php

namespace App\Http\Controllers;

use App\Models\Symbol;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class AssetSearchController extends Controller
{
    private function getTwelveDataWithRotation($url, $params) 
    {
        $key1 = env('TWELVEDATA_API_KEY_1');
        $key2 = env('TWELVEDATA_API_KEY_2');

        $params['apikey'] = $key1;
        $response = Http::get($url, $params);

        if ($response->status() == 429 || (isset($response->json()['code']) && $response->json()['code'] == 429)) {
            Log::warning('Límite de Twelve Data superado en KEY_1. Cambiando a KEY_2.');
            
            $params['apikey'] = $key2;
            $response = Http::get($url, $params);
        }

        return $response;
    }

    public function search(Request $request)
    {
        $request->validate([
            'q' => 'required|string|min:2|max:50',
        ]);

        $query = $request->q;

        $local = Symbol::where('symbol', 'ilike', "%{$query}%")
            ->orWhere('name', 'ilike', "%{$query}%")
            ->limit(8)
            ->get()
            ->map(fn($s) => [
                'symbol'     => $s->symbol,
                'name'       => $s->name,
                'api_id'     => $s->api_id,
                'image_url'  => $s->image_url,
                'asset_type' => $s->asset_type,
                'source'     => 'local',
            ])
            ->toArray();

        if (count($local) >= 4) {
            return response()->json($local);
        }

        $externalResults = [];
        $localSymbols = array_column($local, 'symbol');

        // CoinGecko para crypto
        try {
            $cgResponse = Http::get('https://api.coingecko.com/api/v3/search', [
                'query' => $query
            ]);

            if ($cgResponse->successful()) {
                $coins = array_slice($cgResponse->json('coins', []), 0, 4);
                foreach ($coins as $coin) {
                    $sym = strtoupper($coin['symbol']);
                    if (!in_array($sym, $localSymbols)) {
                        $externalResults[] = [
                            'symbol'     => $sym,
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
            Log::error('Error CoinGecko search: ' . $e->getMessage());
        }

        // Twelve Data para acciones
        try {
            $tdResponse = Http::get('https://api.twelvedata.com/symbol_search', [
                'symbol'     => $query,
                'outputsize' => 10,
            ]);

            if ($tdResponse->successful() && isset($tdResponse->json()['data'])) {
                $addedSymbols = [];
                foreach ($tdResponse->json()['data'] as $stock) {
                    $sym = strtoupper($stock['symbol']);
                    if (!in_array($sym, $localSymbols) && !in_array($sym, $addedSymbols)) {
                        $externalResults[] = [
                            'symbol'     => $sym,
                            'name'       => $stock['instrument_name'],
                            'api_id'     => $stock['symbol'],
                            'image_url'  => null,
                            'asset_type' => 'stock',
                            'source'     => 'api',
                        ];
                        $addedSymbols[] = $sym;
                    }
                    if (count($externalResults) >= 4) break;
                }
            }
        } catch (\Exception $e) {
            Log::error('Error Twelve Data search: ' . $e->getMessage());
        }

        return response()->json(array_merge($local, $externalResults));
    }

    public function history(Request $request)
    {
        $request->validate([
            'api_id' => 'required|string',
            'asset_type' => 'required|in:crypto,stock',
            'date' => 'required|date_format:Y-m-d'
        ]);

        $apiId = $request->api_id;
        $assetType = $request->asset_type;
        $date = Carbon::parse($request->date);

        try {
            if ($assetType === 'crypto') {
                $cgDate = $date->format('d-m-Y');
                $response = Http::get("https://api.coingecko.com/api/v3/coins/{$apiId}/history", [
                    'date' => $cgDate
                ]);

                if ($response->successful()) {
                    $data = $response->json();
                    
                    if (isset($data['market_data']['current_price']['eur'])) {
                        return response()->json([
                            'price' => (float) $data['market_data']['current_price']['eur']
                        ]);
                    }
                }
            } else {
                $targetDate = $date->format('Y-m-d');
                
                $response = $this->getTwelveDataWithRotation("https://api.twelvedata.com/time_series", [
                    'symbol' => $apiId,
                    'interval' => '1day',
                    'outputsize' => 5,
                ]);

                if ($response->successful() && isset($response->json()['values'])) {
                    $values = $response->json()['values'];
                    $precioOriginal = null;
                    
                    foreach ($values as $day) {
                        if (str_starts_with($day['datetime'], $targetDate)) {
                            $precioOriginal = (float) $day['open'];
                            break;
                        }
                    }

                    if ($precioOriginal === null && !empty($values)) {
                        $precioOriginal = (float) $values[0]['open'];
                    }

                    if ($precioOriginal !== null) {

                        $exchangeResponse = $this->getTwelveDataWithRotation("https://api.twelvedata.com/currency_conversion", [
                            'symbol' => 'USD/EUR',
                            'amount' => $precioOriginal,
                        ]);

                        if ($exchangeResponse->successful() && isset($exchangeResponse->json()['amount'])) {
                            return response()->json([
                                'price' => (float) $exchangeResponse->json()['amount']
                            ]);
                        }

                        return response()->json([
                            'price' => $precioOriginal
                        ]);
                    }
                }
            }

            return response()->json(['price' => null]);

        } catch (\Exception $e) {
            Log::error('Error fetching historical price: ' . $e->getMessage());
            return response()->json(['price' => null]);
        }
    }
}