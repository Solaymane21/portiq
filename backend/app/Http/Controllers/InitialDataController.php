<?php

namespace App\Http\Controllers;

use App\Models\Favorite;
use Illuminate\Http\Request;

class InitialDataController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $assets = Favorite::where('user_id', $user->id)
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

        $preferences = $user->preferences
            ? [
                'currency'    => $user->preferences->currency,
                'theme'       => $user->preferences->theme,
                'color_theme' => $user->preferences->color_theme,
                'cookies' => $user->preferences->cookies,
            ]
            : [
                'currency'    => 'EUR',
                'theme'       => 'dark',
                'color_theme' => 'orange',
                'cookies' => null,
            ];

        return response()->json([
            'favorites' => [
                'assets' => $assets,
                'portfolios' => [],
            ],
            'preferences' => $preferences,
        ]);
    }
}
