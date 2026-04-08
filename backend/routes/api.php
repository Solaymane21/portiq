<?php

use App\Http\Controllers\EmailController;
use Illuminate\Http\Request;
use App\Http\Controllers\MarketController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/send-code', [EmailController::class, 'sendCode']);
Route::post('/auth/verify-code', [EmailController::class, 'verifyCode']);
Route::post('/auth/resend-code', [EmailController::class, 'resendCode']);

Route::get('/search/{symbol}', [MarketController::class, 'search']);
Route::get('/prices', [MarketController::class, 'prices']);
Route::get('/portfolio/value', [MarketController::class, 'portfolioValue']);
