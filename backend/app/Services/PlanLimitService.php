<?php

namespace App\Services;

use App\Models\User;

class PlanLimitService
{
    const FREE_LIMITS = [
        'portfolios'           => 1,
        'assets_per_portfolio' => 10,
        'favorites'            => 6,
        'alerts'               => 2,
    ];

    const PREMIUM_FEATURES = ['export', 'import', 'ml_analysis'];

    public function check(User $user, string $resource, int $currentCount): array
    {
        if ($user->isPremium()) {
            return ['allowed' => true];
        }

        $limit = self::FREE_LIMITS[$resource] ?? PHP_INT_MAX;

        if ($currentCount >= $limit) {
            return [
                'allowed'  => false,
                'limit'    => $limit,
                'current'  => $currentCount,
                'resource' => $resource,
                'message'  => $this->getLimitMessage($resource, $limit),
            ];
        }

        return ['allowed' => true, 'limit' => $limit, 'current' => $currentCount];
    }

    public function canUseFeature(User $user, string $feature): bool
    {
        if ($user->isPremium()) return true;
        return !in_array($feature, self::PREMIUM_FEATURES);
    }

    private function getLimitMessage(string $resource, int $limit): string
    {
        return match($resource) {
            'portfolios'           => "El plan gratuito permite máximo {$limit} cartera.",
            'assets_per_portfolio' => "El plan gratuito permite máximo {$limit} activos por cartera.",
            'favorites'            => "El plan gratuito permite máximo {$limit} favoritos.",
            'alerts'               => "El plan gratuito permite máximo {$limit} alertas de precio.",
            default                => "Has alcanzado el límite de tu plan actual.",
        };
    }
}