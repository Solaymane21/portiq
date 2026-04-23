<?php

namespace App\Http\Controllers;

use App\Models\User;
use Laravel\Cashier\Http\Controllers\WebhookController as CashierWebhookController;

class StripeWebhookController extends CashierWebhookController
{
    // Actualizar suscripción a premium
    public function handleInvoicePaymentSucceeded(array $payload)
    {
        $stripeId = $payload['data']['object']['customer'];
        $user = User::where('stripe_id', $stripeId)->first();

        if ($user) {
            $user->update(['suscription_type' => 'premium']);
        }

        return $this->successMethod();
    }

    // Actualizar suscripción a gratis
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
