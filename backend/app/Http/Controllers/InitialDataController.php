<?php

namespace App\Http\Controllers;

use App\Models\Favorite;
use Illuminate\Http\Request;

class InitialDataController extends Controller
{
    public function index(Request $request)
    {
        $userId = $request->user()->id;

        $favorites = Favorite::where('user_id', $userId)
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
            ])
            ->values()
            ->toArray();

        return response()->json([
            'favorites' => $favorites
        ]);
    }
}
