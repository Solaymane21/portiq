<?php
namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;

class AdminController extends Controller
{
    public function users(): JsonResponse
    {
        $users = User::select('name', 'email')
            ->get()
            ->map(function ($user) {
                return [
                    'usuario' => $user->name,
                    'email' => $user->email,
                    'suscripcion' => !empty($user->suscription_type),
                ];
            });

        return response()->json($users);
    }
}