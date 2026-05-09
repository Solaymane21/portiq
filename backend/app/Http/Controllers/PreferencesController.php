<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class PreferencesController extends Controller
{
    // devuelve las preferencias del usuario autenticado
    public function show(Request $request)
    {
        $preferences = $request->user()->preferences;
        return response()->json($preferences);
    }

    // actualiza o crea las preferencias del usuario
    public function update(Request $request)
    {
        $request->validate([
            'currency' => 'in:EUR,USD',
            'theme'    => 'in:dark,light',
            'color_theme' => 'sometimes|in:orange,lime,teal,sky,indigo,violet,rose,red'
        ]);

        $preferences = $request->user()->preferences()->updateOrCreate(
            ['user_id' => $request->user()->id],
            $request->only(['currency', 'theme', 'color_theme'])
        );

        return response()->json($preferences);
    }
}