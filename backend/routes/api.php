<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\EmailController;
use App\Http\Controllers\MarketController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\PortfolioController;
use App\Http\Controllers\InvestmentController;
use App\Http\Controllers\StripeWebhookController;
use App\Http\Controllers\SubscriptionController;

Route::prefix('auth')->group(function() {
    Route::post('/reset-code', [EmailController::class, 'sendForgotPasswordCode']);
    Route::post('/register-code', [EmailController::class, 'sendRegisterCode']);
    Route::post('/verify-code', [EmailController::class, 'verifyCode']);
    Route::post('/resend-code', [EmailController::class, 'resendCode']);
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::get('/google/redirect', [AuthController::class, 'googleRedirect']);
    Route::get('/google/callback', [AuthController::class, 'googleCallback']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);
});

Route::post('/stripe/webhook', [StripeWebhookController::class, 'handleWebhook']);

Route::middleware('auth:sanctum')->group(function () {
    // Stripe
    Route::post('/subscription/checkout', [SubscriptionController::class, 'checkout']);
    Route::get('/subscription/status', [SubscriptionController::class, 'status']);
    Route::post('/subscription/cancel', [SubscriptionController::class, 'cancel']);
    Route::get('/subscription/portal', [SubscriptionController::class, 'portal']);

    Route::get('/portfolios', [PortfolioController::class, 'index']);
    Route::post('/portfolios', [PortfolioController::class, 'store']);
    Route::put('/portfolios/{portfolio}', [PortfolioController::class, 'update']);
    Route::delete('/portfolios/{portfolio}', [PortfolioController::class, 'destroy']);

    Route::get('/portfolios/{portfolioId}/investments', [InvestmentController::class, 'index']);
    Route::post('/portfolios/{portfolioId}/investments', [InvestmentController::class, 'store']);
    Route::put('/portfolios/{portfolioId}/investments/{investmentId}', [InvestmentController::class, 'update']);
    Route::delete('/portfolios/{portfolioId}/investments/{investmentId}', [InvestmentController::class, 'destroy']);

    Route::get('/auth/validate-token', [AuthController::class, 'validateToken']);
});

Route::get('/search/{symbol}', [MarketController::class, 'search']);
Route::get('/prices', [MarketController::class, 'prices']);
Route::get('/portfolio/value', [MarketController::class, 'portfolioValue']);
Route::get('/history/{symbol}', [MarketController::class, 'history']);

//Admmin
Route::prefix('admin')->group(function() {
    Route::get('/users', [AdminController::class, 'users']);
    Route::delete('/users/{id}', [AdminController::class, 'delete']);
});
