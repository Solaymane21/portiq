<?php
namespace App\Http\Controllers;

use App\Models\Portfolio;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AdminController extends Controller
{
    public function users(Request $request): JsonResponse
    {
        if ($request->user()->email !== 'portiqinfo@gmail.com') {
            return response()->json(['message' => 'No eres el admin.']);
        }

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

    public function delete(Request $request, $id)
    {
        if ($request->user()->email !== 'portiqinfo@gmail.com') {
            return response()->json(['message' => 'No eres el admin.']);
        }

        $user = User::findOrFail($id);
        $user->delete();

        return response()->json(['message' => 'Usuario eliminado correctamente.']);
    }

    public function cancelUserSubscription(Request $request, int $userId)
    {
        if ($request->user()->email !== 'portiqinfo@gmail.com') {
            return response()->json(['message' => 'No eres el admin.']);
        }

        $user = User::find($userId);

        if(!$user) {
            return response()->json(['message' => 'No existe el usuario']);
        }

        $subscription = $user->subscription('default');

        if (!$subscription || !$subscription->active()) {
            return response()->json(['message' => 'El usuario no tiene suscripción activa.']);
        }

        $subscription->cancel();
        $user->update(['subscription_cancelled' => true]);

        return response()->json(['message' => "Suscripción de {$user->name} cancelada correctamente."]);
    }

    public function resumeUserSubscription(Request $request, int $userId): JsonResponse
    {
        if ($request->user()->email !== 'portiqinfo@gmail.com') {
            return response()->json(['message' => 'No eres el admin.']);
        }

        $user = User::find($userId);

        if (!$user) {
            return response()->json(['message' => 'No existe el usuario.'], 404);
        }

        $subscription = $user->subscription('default');

        if (!$subscription || !$subscription->onGracePeriod()) {
            return response()->json(['message' => 'El usuario no tiene una suscripción cancelada para reanudar.'], 400);
        }

        $subscription->resume();
        $user->update(['subscription_cancelled' => false]);

        return response()->json(['message' => "Suscripción de {$user->name} reanudada correctamente."]);
    }
}
