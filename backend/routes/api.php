<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\EmailController;
use App\Http\Controllers\MarketController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/reset-code', [EmailController::class, 'sendForgotPasswordCode']);
Route::post('/auth/register-code', [EmailController::class, 'sendRegisterCode']);
Route::post('/auth/verify-code', [EmailController::class, 'verifyCode']);
Route::post('/auth/resend-code', [EmailController::class, 'resendCode']);
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);
Route::get('/auth/google/redirect', [AuthController::class, 'googleRedirect']);
Route::get('/auth/google/callback', [AuthController::class, 'googleCallback']);
Route::post('/auth/reset-password', [AuthController::class, 'resetPassword']);

Route::get('/search/{symbol}', [MarketController::class, 'search']);
Route::get('/prices', [MarketController::class, 'prices']);
Route::get('/portfolio/value', [MarketController::class, 'portfolioValue']);
Route::get('/history/{symbol}', [MarketController::class, 'history']);
