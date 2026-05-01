<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class SettingsController extends Controller
{
    // actualiza el nombre del usuario autenticado
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

    // verifica la contraseña actual y la reemplaza por la nueva
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

    // elimina la cuenta, cancela suscripcion activa y revoca todos los tokens
    public function deleteAccount(Request $request)
    {
        $user = $request->user();

        // cancela la suscripcion si existe antes de borrar el usuario
        if ($user->subscribed('default')) {
            $user->subscription('default')->cancelNow();
        }

        $user->tokens()->delete();

        // el borrado en cascada elimina preferences, portfolios, etc
        $user->delete();

        return response()->json(['message' => 'Cuenta eliminada correctamente.']);
    }
}