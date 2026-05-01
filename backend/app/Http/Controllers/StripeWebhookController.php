<?php

namespace App\Http\Controllers;

use App\Models\User;
use Laravel\Cashier\Http\Controllers\WebhookController as CashierWebhookController;

class StripeWebhookController extends CashierWebhookController
{
    // webhook que actualiza el usuario a premium, se ejecuta una vez el usuario ha pagado
    public function handleInvoicePaymentSucceeded(array $payload)
    {
        $stripeId = $payload['data']['object']['customer'];
        $user = User::where('stripe_id', $stripeId)->first();

        if ($user) {
            $user->update(['suscription_type' => 'premium']);
        }

        return $this->successMethod();
    }

    // webhook que cambia de premium a free, se ejecuta una vez el usuario le expira la suscripcion
    public function handleCustomerSubscriptionDeleted(array $payload)
    {
        $stripeId = $payload['data']['object']['customer'];
        $user = User::where('stripe_id', $stripeId)->first();

        if ($user) {
            $user->update(['suscription_type' => 'free']);
        }

        return $this->successMethod();
    }
}