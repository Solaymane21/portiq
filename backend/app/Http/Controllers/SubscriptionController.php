<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class SubscriptionController extends Controller
{
    // Devuelve la URL de Stripe Checkout
    public function checkout(Request $request)
    {
        $user = $request->user();

        $priceId = env('STRIPE_PRICE_PRO');

        $checkout = $user
            ->newSubscription('default', $priceId)
            ->allowPromotionCodes()
            ->checkout([
                'success_url' => env('FRONTEND_URL') . '/app/dashboard',
                'cancel_url'  => env('FRONTEND_URL') . '/app/dashboard',
            ]);

        return response()->json(['url' => $checkout->url]);
    }

    // Consulta el estado actual de la suscripción
    public function status(Request $request)
    {
        $user = $request->user();
        $subscription = $user->subscription('default');

        return response()->json([
            'is_subscribed' => $user->subscribed('default'),
            'plan' => $user->suscription_type,
            'ends_at'  => $subscription?->ends_at,
            'on_grace' => $subscription?->onGracePeriod() ?? false,
        ]);
    }

    // Cancelar suscripción al final del período
    public function cancel(Request $request)
    {
        $request->user()->subscription('default')->cancel();
        return response()->json(['message' => 'Suscripción cancelada. Activa hasta fin del período.']);
    }

    // Portal de Stripe
    public function portal(Request $request)
    {
        $url = $request->user()->billingPortalUrl(env('FRONTEND_URL') . '/settings');
        return response()->json(['url' => $url]);
    }
}
