<?php

namespace App\Http\Controllers;

use App\Mail\VerificationMail;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class EmailController extends Controller
{
    // genera y envia un codigo de verificacion para el registro
    public function sendRegisterCode(Request $request)
    {
        $request->validate([
            'email' => 'required|email|unique:users,email'
        ]);

        $code = rand(100000, 999999);

        // guarda el codigo en cache durante quince minutos
        Cache::put('register_verify_' . $request->email, $code, now()->addMinutes(15));

        Mail::to($request->email)->send(new VerificationMail($code));

        return response()->json(['message' => 'Código enviado']);
    }

    // genera y envia un codigo de recuperacion de contraseña
    public function sendForgotPasswordCode(Request $request)
    {
        $request->validate([
            'email' => 'required|email'
        ]);

        $user = User::where('email', $request->email)->first();

        // respuesta general para no revelar si el email existe
        if(!$user) {
            return response()->json(['message' => 'Si el email existe, recibirás un código']);
        }

        $code = rand(100000, 999999);

        Cache::put('reset_verify_' . $request->email, $code, now()->addMinutes(15));

        Mail::to($request->email)->send(new VerificationMail($code));

        return response()->json(['message' => 'Código enviado']);
    }

    // verifica el codigo introducido por el usuario
    public function verifyCode(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'code'  => 'required|digits:6',
            'type'  => 'required|in:register,reset',
        ]);

        $cacheKey = $request->type . '_verify_' . $request->email;
        $stored = Cache::get($cacheKey);

        if (!$stored || $stored != $request->code) {
            return response()->json(['message' => 'Código inválido o expirado'], 422);
        }

        Cache::forget($cacheKey);

        // si es reset, genera un token temporal para el cambio de contraseña
        if ($request->type === 'reset') {
            $resetToken = Str::random(64);
            Cache::put('reset_token_' . $request->email, $resetToken, now()->addMinutes(30));

            return response()->json([
                'verified'    => true,
                'reset_token' => $resetToken,
            ]);
        }

        return response()->json(['verified' => true]);
    }

    // reenvia el codigo de verificacion, reutilizando el existente si aun es valido
    public function resendCode(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'type'  => 'required|in:register,reset',
        ]);

        $cacheKey = $request->type . '_verify_' . $request->email;
        $code = Cache::get($cacheKey);

        // genera uno nuevo solo si el anterior ha expirado
        if (!$code) {
            $code = rand(100000, 999999);
            Cache::put($cacheKey, $code, now()->addMinutes(15));
        }

        Mail::to($request->email)->send(new VerificationMail($code));

        return response()->json(['message' => 'Código reenviado']);
    }

    // valida el token de reseteo y actualiza la contraseña del usuario
    public function resetPassword(Request $request)
    {
        $request->validate([
            'email'                 => 'required|email',
            'reset_token'           => 'required|string',
            'password'              => 'required|min:8|confirmed',
            'password_confirmation' => 'required',
        ]);

        $stored = Cache::get('reset_token_' . $request->email);

        if (!$stored || $stored !== $request->reset_token) {
            return response()->json(['message' => 'Token inválido o expirado'], 422);
        }

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json(['message' => 'Usuario no encontrado'], 404);
        }

        $user->update([
            'password' => bcrypt($request->password)
        ]);

        // elimina el token una vez usado para evitar reutilizaciones
        Cache::forget('reset_token_' . $request->email);

        return response()->json(['message' => 'Contraseña actualizada correctamente']);
    }
}