<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class RequiresPremium
{
    public function handle(Request $request, Closure $next, string $feature = 'premium'): mixed
    {
        if (!$request->user()?->isPremium()) {
            return response()->json([
                'message'  => 'Esta función requiere el Plan Premium.',
                'code'     => 'PREMIUM_REQUIRED',
                'resource' => $feature,
            ], 403);
        }

        return $next($request);
    }
}