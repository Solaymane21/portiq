<?php

namespace App\Http\Controllers;

use App\Models\Favorite;
use App\Models\Symbol;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\Http;

class FavoriteController extends Controller
{
    public function index(Request $request)
    {
        $favorites = Favorite::where('user_id', $request->user()->id)
            ->with('symbol')
            ->get()
            ->map(fn($f) => [
                'id'         => $f->id,
                'symbol_id'  => $f->symbol_id,
                'symbol'     => $f->symbol->symbol,
                'name'       => $f->symbol->name,
                'image_url'  => $f->symbol->image_url,
                'asset_type' => $f->symbol->asset_type,
                'api_id'     => $f->symbol->api_id,
            ]);

        return response()->json($favorites);
    }

    public function store(Request $request)
    {
        $request->validate([
            'symbol'     => 'required|string',
            'name'       => 'required|string',
            'api_id'     => 'required|string',
            'image_url'  => 'nullable|string',
            'asset_type' => 'required|in:crypto,stock,etf',
        ]);

        $imageUrl = $request->image_url;

        // Stocks/ETFs sin imagen, buscar en FMP
        if (!$imageUrl && in_array($request->asset_type, ['stock', 'etf'])) {
            $fmpUrl   = 'https://financialmodelingprep.com/image-stock/' . strtoupper($request->symbol) . '.png';
            $response = Http::timeout(5)->get($fmpUrl);

            if ($response->successful() && str_starts_with($response->header('Content-Type'), 'image/')) {
                $imageUrl = $fmpUrl;
            }
        }

        $symbol = Symbol::firstOrCreate(
            ['symbol' => strtoupper($request->symbol)],
            [
                'name'         => $request->name,
                'api_id'       => $request->api_id,
                'image_url'    => $imageUrl,
                'asset_type'   => $request->asset_type,
                'last_updated' => Carbon::now(),
            ]
        );

        // Symbol ya existía pero sin imagen, actualizarlo
        if (!$symbol->image_url && $imageUrl) {
            $symbol->update(['image_url' => $imageUrl]);
        }

        $favorite = Favorite::firstOrCreate([
            'user_id'   => $request->user()->id,
            'symbol_id' => $symbol->id,
        ]);

        return response()->json([
            'id'         => $favorite->id,
            'symbol_id'  => $symbol->id,
            'symbol'     => $symbol->symbol,
            'name'       => $symbol->name,
            'image_url'  => $symbol->image_url,
            'asset_type' => $symbol->asset_type,
            'api_id'     => $symbol->api_id,
        ], 201);
    }

    public function destroy(Request $request, int $symbolId)
    {
        Favorite::where('user_id', $request->user()->id)
            ->where('symbol_id', $symbolId)
            ->delete();

        return response()->json(['message' => 'Eliminado']);
    }
}