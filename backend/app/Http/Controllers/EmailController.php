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
    public function sendRegisterCode(Request $request)
    {
        $request->validate([
            'email' => 'required|email|unique:users,email'
        ]);

        $code = rand(100000, 999999);

        Cache::put('register_verify_' . $request->email, $code, now()->addMinutes(15));

        Mail::to($request->email)->send(new VerificationMail($code));

        return response()->json(['message' => 'Código enviado']);
    }

    public function sendForgotPasswordCode(Request $request)
    {
        $request->validate([
            'email' => 'required|email'
        ]);

        $user = User::where('email', $request->email)->first();

        if(!$user) {
            return response()->json(['message' => 'Si el email existe, recibirás un código']);
        }

        $code = rand(100000, 999999);

        Cache::put('reset_verify_' . $request->email, $code, now()->addMinutes(15));

        Mail::to($request->email)->send(new VerificationMail($code));

        return response()->json(['message' => 'Código enviado']);
    }

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

    public function resendCode(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'type'  => 'required|in:register,reset',
        ]);

        $cacheKey = $request->type . '_verify_' . $request->email;
        $code = Cache::get($cacheKey);

        if (!$code) {
            $code = rand(100000, 999999);
            Cache::put($cacheKey, $code, now()->addMinutes(15));
        }

        Mail::to($request->email)->send(new VerificationMail($code));

        return response()->json(['message' => 'Código reenviado']);
    }

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

        Cache::forget('reset_token_' . $request->email);

        return response()->json(['message' => 'Contraseña actualizada correctamente']);
    }
}
