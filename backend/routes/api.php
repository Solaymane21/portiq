<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\EmailController;
use Illuminate\Http\Request;
use App\Http\Controllers\MarketController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/send-code', [EmailController::class, 'sendCode']);
Route::post('/auth/verify-code', [EmailController::class, 'verifyCode']);
Route::post('/auth/resend-code', [EmailController::class, 'resendCode']);
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);

Route::get('/search/{symbol}', [MarketController::class, 'search']);
Route::get('/prices', [MarketController::class, 'prices']);
Route::get('/portfolio/value', [MarketController::class, 'portfolioValue']);
Route::get('/history/{symbol}', [MarketController::class, 'history']);
