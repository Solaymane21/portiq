<?php

use App\Http\Controllers\MarketController;

Route::get('/search/{symbol}', [MarketController::class, 'search']);
Route::get('/prices', [MarketController::class, 'prices']);
Route::get('/portfolio/value', [MarketController::class, 'portfolioValue']);