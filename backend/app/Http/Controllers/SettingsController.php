<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class SettingsController extends Controller
{
    public function changeName(Request $request)
    {
        $request->validate([
            'name' => 'required|string|min:3|max:20',
        ]);

        $user = $request->user();

        $user->update([
            'name' => $request->name,
        ]);

        return response()->json([
            'message' => 'Nombre actualizado correctamente.',
            'user'    => $user,
        ]);
    }

    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:8',
        ]);

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'message' => 'La contraseña actual no es correcta.'
            ], 422);
        }

        $user->update([
            'password' => Hash::make($request->new_password),
        ]);

        return response()->json([
            'message' => 'Contraseña actualizada correctamente.'
        ]);
    }
}
