<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AssetSearchController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\EmailController;
use App\Http\Controllers\FavoriteController;
use App\Http\Controllers\InitialDataController;
use App\Http\Controllers\MarketController;
use App\Http\Controllers\PreferencesController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\PortfolioController;
use App\Http\Controllers\StripeWebhookController;
use App\Http\Controllers\SubscriptionController;
use App\Http\Controllers\InvestmentController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\AlertController;
use App\Http\Controllers\InvestorProfileController;
use App\Http\Controllers\NotificationController;


Route::prefix('auth')->group(function() {
    Route::post('/reset-code', [EmailController::class, 'sendForgotPasswordCode']);
    Route::post('/register-code', [EmailController::class, 'sendRegisterCode']);
    Route::post('/verify-code', [EmailController::class, 'verifyCode']);
    Route::post('/resend-code', [EmailController::class, 'resendCode']);
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/demo', [AuthController::class, 'demo'])->middleware('throttle:20,1');
    Route::get('/google/redirect', [AuthController::class, 'googleRedirect']);
    Route::get('/google/callback', [AuthController::class, 'googleCallback']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);
});

Route::post('/stripe/webhook', [StripeWebhookController::class, 'handleWebhook']);
Route::get('/assets/search', [AssetSearchController::class, 'search']);
Route::get('/assets/history', [AssetSearchController::class, 'history']);

// rutas protegidas con sanctum
Route::middleware(['auth:sanctum', 'demo.readonly'])->group(function () {
    // General
    Route::get('/auth/validate-token', [AuthController::class, 'validateToken']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'me']);
    Route::get('/initial-data', [InitialDataController::class, 'index']);

    // Stripe
    Route::post('/subscription/checkout', [SubscriptionController::class, 'checkout']);
    Route::get('/subscription/status', [SubscriptionController::class, 'status']);
    Route::post('/subscription/cancel', [SubscriptionController::class, 'cancel']);
    Route::get('/subscription/portal', [SubscriptionController::class, 'portal']);
    Route::post('/subscription/resume', [SubscriptionController::class, 'resume']);
    Route::get('/subscription/plan-limits', [SubscriptionController::class, 'planLimits']);

    //Portfolios
    Route::get('/portfolios/public', [PortfolioController::class, 'publicRanking']);
    Route::post('/portfolios/{portfolioId}/follow', [PortfolioController::class, 'follow']);
    Route::delete('/portfolios/{portfolioId}/unfollow', [PortfolioController::class, 'unfollow']);
    Route::get('/portfolios', [PortfolioController::class, 'index']);
    Route::post('/portfolios', [PortfolioController::class, 'store']);
    Route::put('/portfolios/{portfolio}', [PortfolioController::class, 'update']);
    Route::delete('/portfolios/{portfolio}', [PortfolioController::class, 'destroy']);

    //Investments
    Route::get('/portfolios/{portfolioId}/investments', [InvestmentController::class, 'index']);
    Route::post('/portfolios/{portfolioId}/investments', [InvestmentController::class, 'store']);
    Route::put('/portfolios/{portfolioId}/investments/{investmentId}', [InvestmentController::class, 'update']);
    Route::delete('/portfolios/{portfolioId}/investments/{investmentId}', [InvestmentController::class, 'destroy']);
    Route::post('/portfolios/{portfolioId}/investments/{investmentId}/buy', [InvestmentController::class, 'buy']);
    Route::post('/portfolios/{portfolioId}/investments/{investmentId}/sell', [InvestmentController::class, 'sell']);
    
    //Trades
    Route::get('/portfolios/{portfolioId}/trades', [\App\Http\Controllers\TradeController::class, 'index']);
    
    // Settings
    Route::post('/change-name', [SettingsController::class, 'changeName']);
    Route::post('/change-password', [SettingsController::class, 'changePassword']);
    Route::delete('/account', [SettingsController::class, 'deleteAccount']);
    Route::get('/preferences', [PreferencesController::class, 'show']);
    Route::patch('/preferences', [PreferencesController::class, 'update']);
    Route::patch('/preferences/cookies', [PreferencesController::class, 'setCookiesPreference']);
    
    //Alerts
    Route::get('/alerts',          [AlertController::class, 'index']);
    Route::post('/alerts',         [AlertController::class, 'store']);
    Route::patch('/alerts/{alert}',[AlertController::class, 'update']);
    Route::delete('/alerts/{alert}',[AlertController::class, 'destroy']);
    
    // Favorites
    Route::get('/favorites', [FavoriteController::class, 'index']);
    Route::post('/favorites', [FavoriteController::class, 'store']);
    Route::delete('/favorites/{symbolId}', [FavoriteController::class, 'destroy']);
    Route::delete('/favorites/portfolios/{portfolioId}', [FavoriteController::class, 'destroyPortfolio']);
    
    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::patch('/notifications/{id}/read', [NotificationController::class, 'markRead']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead']);
    
    // Investor Profile
    Route::get('/investor-profile',  [InvestorProfileController::class, 'show']);
    
    // Only premium
    Route::post('/investor-profile', [InvestorProfileController::class, 'store']);
    Route::post('/portfolios/{portfolioId}/investments/import', [InvestmentController::class, 'importPositions']);
    
    
    });
    
//Prices
Route::get('/search/{symbol}', [MarketController::class, 'search']);
Route::get('/prices', [MarketController::class, 'prices']);
Route::get('/portfolio/value', [MarketController::class, 'portfolioValue']);
Route::get('/history/{symbol}', [MarketController::class, 'history']);
Route::get('/portfolio-history', [MarketController::class, 'portfolioHistory']);

//Admin
Route::prefix('admin')->middleware('auth:sanctum')->group(function() {
    Route::get('/users', [AdminController::class, 'users']);
    Route::delete('/users/{id}', [AdminController::class, 'delete']);
    Route::post('/users/{user}/subscription/cancel', [AdminController::class, 'cancelUserSubscription']);
    Route::post('/users/{user}/subscription/resume', [AdminController::class, 'resumeUserSubscription']);
});



