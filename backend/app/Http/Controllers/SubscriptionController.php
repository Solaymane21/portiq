<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class SubscriptionController extends Controller
{
    // Devuelve la URL de Stripe Checkout
    public function checkout(Request $request)
    {
        try {
            $user = $request->user();

            $priceId = env('STRIPE_PRICE_PRO');

            if (!$priceId) {
                return response()->json(['error' => 'STRIPE_PRICE_PRO no configurado en .env'], 500);
            }

            $checkout = $user
                ->newSubscription('default', $priceId)
                ->allowPromotionCodes()
                ->checkout([
                    'success_url' => 'http://localhost:4200/dashboard?subscription=success',
                    'cancel_url'  => 'http://localhost:4200/pricing',
                ]);

            return response()->json(['url' => $checkout->url]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage(),
                'type'  => get_class($e),
            ], 500);
        }
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
