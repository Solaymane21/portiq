<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// La cuenta demo la comparten todos los visitantes, asi que solo puede leer.
// Se permiten unas pocas escrituras inofensivas para que la demo se sienta viva.
class BlockDemoWrites
{
    private const ALLOWED_WRITES = [
        'api/preferences',
        'api/preferences/cookies',
        'api/notifications/*/read',
        'api/notifications/read-all',
        'api/auth/logout',
    ];

    // GETs que tocan Stripe y no tienen sentido en la demo
    private const BLOCKED_READS = [
        'api/subscription/portal',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user?->isDemo()) {
            return $next($request);
        }

        $allowed = $request->isMethodSafe()
            ? !$request->is(...self::BLOCKED_READS)
            : $request->is(...self::ALLOWED_WRITES);

        if ($allowed) {
            return $next($request);
        }

        return response()->json([
            'message' => 'En la demo no se pueden hacer cambios. Crea una cuenta gratis para probarlo.',
            'code' => 'DEMO_READ_ONLY',
        ], 403);
    }
}
