<?php
namespace App\Http\Controllers;

use App\Models\Portfolio;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class AdminController extends Controller
{
    public function users(): JsonResponse
    {
        $users = User::all();
        $totalUsers = User::all()->count();
        $loggedToday = User::whereDate('last_login_at', today())->count();
        $premiumUsers = User::where('suscription_type', 'premium')->count();
        $totalPortfolios = Portfolio::all()->count();

        return response()->json([
            'users' => $users,
            'totalUsers' => $totalUsers,
            'loggedToday' => $loggedToday,
            'premiumUsers' => $premiumUsers,
            'totalPortfolios' => $totalPortfolios
        ]);
    }

    public function delete($id)
    {
        $user = User::findOrFail($id);
        $user->delete();

        return response()->json(['message' => 'Usuario eliminado correctamente.']);
    }
}
