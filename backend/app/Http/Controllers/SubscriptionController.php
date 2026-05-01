<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SubscriptionController extends Controller
{
    // genera y devuelve la url de pago de stripe checkout
    public function checkout(Request $request)
    {
        $user = $request->user();

        $priceId = env('STRIPE_PRICE_PRO');

        $checkout = $user
            ->newSubscription('default', $priceId)
            ->allowPromotionCodes()
            ->checkout([
                'success_url' => env('FRONTEND_URL') . '/app/dashboard?subscribed=1',
                'cancel_url'  => env('FRONTEND_URL') . '/app/dashboard',
            ]);

        return response()->json(['url' => $checkout->url]);
    }

    // devuelve el estado actual de la suscripcion del usuario
    public function status(Request $request)
    {
        $user = $request->user();
        $subscription = $user->subscription('default');

        $nextBillingDate = null;

        // consulta la fecha de siguiente cobro solo si la suscripcion esta activa
        if ($subscription && $subscription->stripe_status === 'active' && !$subscription->onGracePeriod()) {
            try {
                $stripeSubscription = $subscription->asStripeSubscription();
                $nextBillingDate = $stripeSubscription->items->data[0]->current_period_end ?? null;
            } catch (\Exception $e) {
                Log::error('Error fetching Stripe subscription: ' . $e->getMessage());
            }
        }

        return response()->json([
            'is_subscribed' => $user->subscribed('default'),
            'plan' => $user->suscription_type,
            'ends_at' => $subscription?->ends_at,
            'on_grace' => $subscription?->onGracePeriod() ?? false,
            'next_billing_date' => $nextBillingDate,
        ]);
    }

    // cancela la suscripcion al final del periodo de facturacion
    public function cancel(Request $request)
    {
        $subscription = $request->user()->subscription('default');

        if (!$subscription) {
            return response()->json(['message' => 'No tienes suscripción activa.'], 400);
        }

        $subscription->cancel();
        return response()->json(['message' => 'Suscripción cancelada. Activa hasta fin del período.']);
    }

    // reanuda una suscripcion cancelada si aun no ha expirado la suscripcion
    public function resume(Request $request)
    {
        $subscription = $request->user()->subscription('default');

        if (!$subscription || !$subscription->onGracePeriod()) {
            return response()->json(['message' => 'No hay suscripción cancelada para reanudar.'], 400);
        }

        $subscription->resume();
        return response()->json(['message' => 'Suscripción reanudada correctamente.']);
    }
}