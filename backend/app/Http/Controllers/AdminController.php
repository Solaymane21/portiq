<?php
namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;

class AdminController extends Controller
{
    public function users(): JsonResponse
    {
        $users = User::select('name', 'email', 'suscription_type')
            ->get()
            ->map(function ($user) {
                return [
                    'usuario' => $user->name,
                    'email' => $user->email,
                    'suscripcion' => $user->suscription_type !== 'free'
                ];
            });

        return response()->json($users);
    }
}