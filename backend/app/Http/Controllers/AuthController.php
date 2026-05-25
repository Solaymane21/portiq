<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\AbstractProvider;

class AuthController extends Controller
{
    // inicia sesion con email y contraseña
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => 'Credencials incorrectes o el usuario no existe en PortIQ.'
            ], 401);
        }

        $user->update(['last_login_at' => now()]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Login correcte',
            'token' => $token,
            'token_type' => 'Bearer',
            'user' => $this->formatUser($user)
        ]);
    }

    // registra un nuevo usuario y crea sus preferencias por defecto
    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required|string|min:3|max:20',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|min:8',
            'suscription_type' => 'required|in:free,premium',
            'last_login_at' => now()
        ]);

        $user = User::create([
            'name'     => $request->name,
            'email'    => $request->email,
            'password' => Hash::make($request->password),
            'suscription_type'     => $request->suscription_type,
        ]);

        $user->preferences()->create([
            'currency' => 'EUR',
            'theme' => 'dark',
            'color_theme' => 'orange',
            'cookies' => null
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json(['token' => $token, 'user' => $this->formatUser($user, true)], 201);
    }

    // devuelve la url de redireccion de google oauth
    public function googleRedirect() {
        /** @var AbstractProvider $driver */
        $driver = Socialite::driver('google');

        $url = $driver->stateless()->redirect()->getTargetUrl();

        return response()->json(['redirect_url' => $url]);
    }

    // gestiona el callback de google, crea o actualiza el usuario y redirige al frontend
    public function googleCallback() {
        /** @var AbstractProvider $driver */
        $driver = Socialite::driver('google');
        $googleUser = $driver->stateless()->user();

        $isNewUser = false;

        $user = User::where('google_id', $googleUser->getId())->first();

        if (!$user) {
            $user = User::where('email', $googleUser->getEmail())->first();

            if ($user) {
                // vincula cuenta existente con google
                $user->update([
                    'google_id' => $googleUser->getId(),
                    'avatar' => $googleUser->getAvatar(),
                    'last_login_at' => now()
                ]);
            } else {
                // crea usuario nuevo desde google y sus preferencias por defecto
                $user = User::create([
                    'name' => $googleUser->getName(),
                    'email' => $googleUser->getEmail(),
                    'google_id' => $googleUser->getId(),
                    'avatar' => $googleUser->getAvatar(),
                    'password' => Hash::make(rand(0, 99999)),
                    'last_login_at' => now()
                ]);

                $user->preferences()->create([
                    'currency' => 'EUR',
                    'theme' => 'dark',
                    'color_theme' => 'orange',
                    'cookies' => null
                ]);

                $isNewUser = true;
            }
        }

        $user->update(['last_login_at' => now()]);

        $token = $user->createToken('google-oauth')->plainTextToken;

        $userData = base64_encode(json_encode($this->formatUser($user, $isNewUser)));

        // redirege al frontend y envia por parametros el token y informacion de usuario para guardarla en el localstorage
        $frontend = env('FRONTEND_URL');
        return redirect("{$frontend}/auth/callback#token={$token}&user={$userData}");
    }

    // actualiza la contraseña del usuario con token de reseteo
    public function resetPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'reset_token' => 'required|string',
            'password' => 'required|min:8|confirmed',
            'password_confirmation' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json(['message' => 'Usuario no encontrado'], 404);
        }

        $user->update([
            'password' => Hash::make($request->password)
        ]);

        return response()->json(['message' => 'Contraseña actualizada correctamente']);
    }

    // cierra la sesion eliminando el token actual
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Sesión cerrada correctamente']);
    }

    // formatea los datos del usuario para la respuesta json
    function formatUser(User $user, bool $isNewUser = false): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'avatar' => $user->avatar,
            'suscription_type' => $user->suscription_type,
            'is_admin' => $user->email === 'portiqinfo@gmail.com',
            'is_new_user' => $isNewUser
        ];
    }

    // comprueba si el token del usuario es valido
    function validateToken(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['valid' => false], 401);
        }

        return response()->json([
            'valid' => true,
            'user'  => $this->formatUser($user),
        ]);
    }

    // devuelve los datos del usuario autenticado
    public function me(Request $request)
    {
        return $this->formatUser($request->user());
    }
}