<?php

namespace App\Http\Controllers;

use App\Mail\VerificationMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class EmailController extends Controller
{
    public function sendCode(Request $request)
    {
        $request->validate([
            'email' => 'required|email|unique:users,email'
        ]);

        $code = rand(100000, 999999);

        Cache::put('verify_' . $request->email, $code, now()->addMinutes(15));

        Mail::to($request->email)->send(new VerificationMail($code));

        return response()->json(['message' => 'Código enviado']);
    }

    public function verifyCode(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'code'  => 'required|digits:6',
        ]);

        $stored = Cache::get('verify_' . $request->email);

        if (!$stored || $stored != $request->code) {
            return response()->json(['message' => 'Código inválido o expirado'], 422);
        }

        Cache::forget('verify_' . $request->email);
        return response()->json(['verified' => true]);
    }

    public function resendCode(Request $request)
    {
        $request->validate([
            'email' => 'required|email'
        ]);

        $code = Cache::get('verify_' . $request->email);

        // Si no existe, generar uno nuevo
        if (!$code) {
            $code = rand(100000, 999999);
            Cache::put('verify_' . $request->email, $code, now()->addMinutes(15));
        }

        Mail::to($request->email)->send(new VerificationMail($code));

        return response()->json(['message' => 'Código reenviado']);
    }
}
