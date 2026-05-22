<?php

namespace App\Http\Controllers;

use App\Models\Favorite;
use App\Models\FavoritePortfolio;
use App\Models\Symbol;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\Http;

class FavoriteController extends Controller
{
    public function index(Request $request)
    {
        $userId = $request->user()->id;

        // Activos favoritos
        $assets = Favorite::where('user_id', $userId)
            ->with('symbol')
            ->get()
            ->map(fn($f) => [
                'id' => $f->id,
                'symbol_id' => $f->symbol_id,
                'symbol' => $f->symbol->symbol,
                'name' => $f->symbol->name,
                'image_url'  => $f->symbol->image_url,
                'asset_type' => $f->symbol->asset_type,
                'api_id' => $f->symbol->api_id,
            ]);

        // Portfolios favoritos
        $portfolios = FavoritePortfolio::where('favorite_portfolios.user_id', $userId)
            ->join('portfolios', 'portfolios.id', '=', 'favorite_portfolios.portfolio_id')
            ->select(
                'favorite_portfolios.id as favorite_id',
                'portfolios.id as portfolio_id',
                'portfolios.name',
                'portfolios.is_public',
                'portfolios.is_default',
                'portfolios.user_id as owner_id',
                'portfolios.created_at',
                'portfolios.updated_at'
            )
            ->get();

        return response()->json([
            'assets'     => $assets,
            'portfolios' => $portfolios,
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'symbol' => 'required|string',
            'name' => 'required|string',
            'api_id' => 'required|string',
            'image_url' => 'nullable|string',
            'asset_type' => 'required|in:crypto,stock,etf',
        ]);

        $imageUrl = $request->image_url;

        // Stocks/ETFs sin imagen, buscar en FMP
        if (!$imageUrl && in_array($request->asset_type, ['stock', 'etf'])) {
            $fmpUrl   = 'https://financialmodelingprep.com/image-stock/' . strtoupper($request->symbol) .'.png';
            $response = Http::timeout(5)->get($fmpUrl);

            if ($response->successful() && str_starts_with($response->header('Content-Type'), 'image/')) {
                $imageUrl = $fmpUrl;
            }
        }

        $symbol = Symbol::firstOrCreate(
            ['symbol' => strtoupper($request->symbol)],
            [
                'name' => $request->name,
                'api_id' => $request->api_id,
                'image_url' => $imageUrl,
                'asset_type' => $request->asset_type,
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

    public function destroyPortfolio(Request $request, int $portfolioId)
    {
        FavoritePortfolio::where('user_id', $request->user()->id)
            ->where('portfolio_id', $portfolioId)
            ->delete();

        return response()->json(['message' => 'Portfolio eliminado de favoritos']);
    }
}