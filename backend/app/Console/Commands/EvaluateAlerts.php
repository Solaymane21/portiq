<?php

namespace App\Console\Commands;

use App\Models\Alert;
use App\Models\Notification;
use App\Services\MLService;
use Illuminate\Console\Command;

class EvaluateAlerts extends Command
{
    protected $signature   = 'alerts:evaluate';
    protected $description = 'Evalúa alertas activas y las desactiva si se cumplen';

    public function __construct(private MLService $ml)
    {
        parent::__construct();
    }

    public function handle(): void
    {
        $alerts = Alert::where('is_active', true)
            ->with('symbol')
            ->get();

        if ($alerts->isEmpty()) return;

        $unique     = $alerts->unique('symbol_id')->values();
        $symbols    = $unique->map(fn($a) => $a->symbol->symbol)->all();
        $assetTypes = $unique->map(fn($a) => $a->symbol->asset_type ?? 'stock')->all();

        $response = $this->ml->getPrices($symbols, $assetTypes);

        $priceMap = collect($response['results'] ?? [])
            ->filter(fn($r) => !isset($r['error']) && isset($r['price']))
            ->keyBy('symbol')
            ->map(fn($r) => (float) $r['price']);

        foreach ($alerts as $alert) {
            $symbol = $alert->symbol->symbol;
            $price  = $priceMap[$symbol] ?? null;

            if ($price === null) continue;

            $triggered = match ($alert->condition) {
                'above' => $price >= $alert->target_price,
                'below' => $price <= $alert->target_price,
                default => false,
            };

            if ($triggered) {
                $alert->update(['is_active' => false]);

                Notification::create([
                    'user_id'  => $alert->user_id,
                    'alert_id' => $alert->id,
                    'title'    => "Alerta disparada: {$symbol}",
                    'message'  => "{$alert->symbol->name} ha alcanzado " . number_format($price, 2) . "€ (objetivo: " . number_format($alert->target_price, 2) . "€)",
                    'is_read'  => false,
                ]);

                $this->info("Alerta disparada: {$symbol} @ {$price}");
            }
        }
    }
}