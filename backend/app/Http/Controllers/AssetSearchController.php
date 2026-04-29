<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class AssetSearchController extends Controller
{
    public function search(Request $request)
    {
        $request->validate([
            'q' => 'required|string|min:2|max:50',
        ]);

        $query = $request->q;
        $results = [];

        try {
            $cgResponse = Http::get('https://api.coingecko.com/api/v3/search', [
                'query' => $query
            ]);

            if ($cgResponse->successful()) {
                $coins = array_slice($cgResponse->json('coins', []), 0, 4); 
                foreach ($coins as $coin) {
                    $results[] = [
                        'symbol' => strtoupper($coin['symbol']),
                        'name' => $coin['name'],
                        'api_id' => $coin['api_symbol'],
                        'image_url' => $coin['large'] ?? $coin['thumb'] ?? null,
                        'asset_type' => 'crypto',
                    ];
                }
            }
        } catch (\Exception $e) {
            Log::error('Error CoinGecko: ' . $e->getMessage());
        }

        try {
            $tdResponse = Http::get('https://api.twelvedata.com/symbol_search', [
                'symbol' => $query,
                'outputsize' => 10,
            ]);

            if ($tdResponse->successful() && isset($tdResponse->json()['data'])) {
                $stocks = $tdResponse->json()['data'];
                
                $addedSymbols = [];
                $stockResults = [];
                
                foreach ($stocks as $stock) {
                    $sym = strtoupper($stock['symbol']);
                    
                    if (!in_array($sym, $addedSymbols)) {
                        $stockResults[] = [
                            'symbol' => $sym,
                            'name' => $stock['instrument_name'],
                            'api_id' => $stock['symbol'],
                            'image_url' => null, 
                            'asset_type' => 'stock',
                        ];
                        
                        $addedSymbols[] = $sym;
                    }
                    
                    if (count($stockResults) >= 4) {
                        break;
                    }
                }
                
                $results = array_merge($results, $stockResults);
            }
        } catch (\Exception $e) {
            Log::error('Error Twelve Data: ' . $e->getMessage());
        }

        return response()->json($results);
    }

    public function history(Request $request)
    {
        $request->validate([
            'api_id' => 'required|string',
            'asset_type' => 'required|in:crypto,stock',
            'date' => 'required|date_format:Y-m-d',
        ]);

        $date = Carbon::parse($request->date);
        $price = 0;

        if ($request->asset_type === 'crypto') {
            $formattedDate = $date->format('d-m-Y');
            $response = Http::get("https://api.coingecko.com/api/v3/coins/{$request->api_id}/history", [
                'date' => $formattedDate,
                'localization' => 'false'
            ]);

            if ($response->successful() && isset($response->json()['market_data']['current_price']['usd'])) {
                $price = $response->json()['market_data']['current_price']['usd'];
            }
        } else {
            $tdApiKey = env('TWELVEDATA_API_KEY');
            $response = Http::get('https://api.twelvedata.com/eod', [
                'symbol' => $request->api_id,
                'date' => $date->format('Y-m-d'),
                'apikey' => $tdApiKey
            ]);

            if ($response->successful() && isset($response->json()['close'])) {
                $price = (float) $response->json()['close'];
            }
        }

        return response()->json(['price' => $price]);
    }
}