<?php

namespace App\Http\Controllers;

use App\Models\Symbol;
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

        // buscar primero en BD
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

        // si hay suficientes resultados locales, devolver directamente
        if (count($local) >= 4) {
            return response()->json($local);
        }

        // buscar en APIs externas solo si faltan resultados
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

    // Se llama cuando el usuario confirma añadir el activo
    public function store(Request $request)
    {
        $request->validate([
            'symbol'     => 'required|string|max:20',
            'name'       => 'required|string|max:100',
            'api_id'     => 'required|string|max:100',
            'image_url'  => 'nullable|string',
            'asset_type' => 'required|in:crypto,stock,etf',
        ]);

        $symbol = Symbol::firstOrCreate(
            ['symbol' => strtoupper($request->symbol)],
            [
                'name'         => $request->name,
                'api_id'       => $request->api_id,
                'image_url'    => $request->image_url,
                'asset_type'   => $request->asset_type,
                'last_updated' => Carbon::now(),
            ]
        );

        return response()->json($symbol, 201);
    }
}