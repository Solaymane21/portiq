<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\EmailController;
use App\Http\Controllers\MarketController;
use Illuminate\Support\Facades\Route;

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

Route::get('/search/{symbol}', [MarketController::class, 'search']);
Route::get('/prices', [MarketController::class, 'prices']);
Route::get('/portfolio/value', [MarketController::class, 'portfolioValue']);
Route::get('/history/{symbol}', [MarketController::class, 'history']);
