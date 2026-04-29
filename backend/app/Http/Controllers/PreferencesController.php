<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class PreferencesController extends Controller
{
    public function show(Request $request)
    {
        $preferences = $request->user()->preferences;
        return response()->json($preferences);
    }

    public function update(Request $request)
    {
        $request->validate([
            'currency' => 'in:EUR,USD',
            'theme'    => 'in:dark,light',
        ]);

        $preferences = $request->user()->preferences()->updateOrCreate(
            ['user_id' => $request->user()->id],
            $request->only(['currency', 'theme'])
        );

        return response()->json($preferences);
    }
}
