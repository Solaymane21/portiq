<?php

namespace App\Console\Commands;

use App\Models\Alert;
use App\Models\Favorite;
use App\Models\FavoritePortfolio;
use App\Models\InvestorProfile;
use App\Models\Notification;
use App\Models\Symbol;
use App\Models\Trade;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class SeedDemoAccount extends Command
{
    protected $signature   = 'demo:seed';
    protected $description = 'Crea o resetea la cuenta demo publica con datos de ejemplo';

    public function handle(): void
    {
        $config = config('demo');

        DB::transaction(function () use ($config) {
            $user = User::updateOrCreate(
                ['email' => $config['email']],
                [
                    'name' => $config['name'],
                    'password' => Hash::make(Str::random(40)),
                    'suscription_type' => 'premium',
                    'is_demo' => true,
                    'last_login_at' => now(),
                ]
            );

            // Borramos lo que hubiera para dejar la demo como nueva
            // (las carteras borran en cascada sus inversiones y trades)
            $user->portfolios()->delete();
            $user->notifications()->delete();
            $user->alerts()->delete();
            $user->favorites()->delete();
            $user->favoritePortfolios()->delete();

            $user->preferences()->updateOrCreate([], [
                'currency' => 'EUR',
                'theme' => 'dark',
                'color_theme' => 'orange',
                'cookies' => true,
            ]);

            $symbols = $this->seedSymbols($config['symbols']);

            foreach ($config['portfolios'] as $portfolioData) {
                $this->seedPortfolio($user, $portfolioData, $symbols);
            }

            foreach ($config['favorites'] as $ticker) {
                Favorite::create(['user_id' => $user->id, 'symbol_id' => $symbols[$ticker]->id]);
            }

            $alerts = $this->seedAlerts($user, $config['alerts'], $symbols);
            $this->seedNotifications($user, $config['notifications'], $alerts);

            $answers = $config['investor_profile_answers'];
            InvestorProfile::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'profile_type' => 'moderado',
                    'total_score' => array_sum($answers),
                    'raw_answers' => $answers,
                ]
            );
        });

        $this->info('Cuenta demo lista: ' . $config['email']);
    }

    // Crea los simbolos si no existen (si ya existen se respetan los datos actuales)
    private function seedSymbols(array $symbolsConfig): array
    {
        $symbols = [];

        foreach ($symbolsConfig as $ticker => $data) {
            $symbols[$ticker] = Symbol::firstOrCreate(['symbol' => $ticker], $data);
        }

        return $symbols;
    }

    // Crea la cartera y aplica sus operaciones en orden cronologico
    private function seedPortfolio(User $user, array $data, array $symbols): void
    {
        $portfolio = $user->portfolios()->create([
            'name' => $data['name'],
            'is_default' => $data['is_default'],
            'is_public' => $data['is_public'],
        ]);

        foreach ($data['positions'] as $ticker => $operations) {
            // Ordenamos de mas antigua a mas reciente
            usort($operations, fn($a, $b) => $b[3] <=> $a[3]);

            $investment = null;

            foreach ($operations as [$type, $quantity, $price, $daysAgo]) {
                $operatedAt = now()->subDays($daysAgo)->setTime(10, 0);

                if ($investment === null) {
                    // La primera compra abre la posicion
                    $investment = $portfolio->investments()->create([
                        'symbol_id' => $symbols[$ticker]->id,
                        'quantity' => $quantity,
                        'avg_buy_price' => $price,
                    ]);
                    $tradeType = 'nuevaPosicion';
                } elseif ($type === 'buy') {
                    // Mismo calculo de precio medio ponderado que InvestmentController::calculateBuyAdjustment
                    $newQuantity = $investment->quantity + $quantity;
                    $investment->update([
                        'quantity' => $newQuantity,
                        'avg_buy_price' => ($investment->quantity * $investment->avg_buy_price + $quantity * $price) / $newQuantity,
                    ]);
                    $tradeType = 'compra';
                } else {
                    // La venta solo reduce la cantidad, igual que InvestmentController::sell
                    $investment->update(['quantity' => max(0, $investment->quantity - $quantity)]);
                    $tradeType = 'venta';
                }

                Trade::create([
                    'investment_id' => $investment->id,
                    'quantity' => $quantity,
                    'price_per_unit' => $price,
                    'type' => $tradeType,
                    'operated_at' => $operatedAt,
                ]);
            }
        }
    }

    private function seedAlerts(User $user, array $alertsConfig, array $symbols): array
    {
        $alerts = [];

        foreach ($alertsConfig as [$ticker, $condition, $target, $active]) {
            $alerts[$ticker] = Alert::forceCreate([
                'user_id' => $user->id,
                'symbol_id' => $symbols[$ticker]->id,
                'target_price' => $target,
                'condition' => $condition,
                'is_active' => $active,
                'created_at' => now()->subDays(20),
            ]);
        }

        return $alerts;
    }

    private function seedNotifications(User $user, array $notificationsConfig, array $alerts): void
    {
        foreach ($notificationsConfig as $i => $data) {
            Notification::forceCreate([
                'user_id' => $user->id,
                'alert_id' => $data['alert'] ? $alerts[$data['alert']]->id : null,
                'title' => $data['title'],
                'message' => $data['message'],
                'is_read' => false,
                'created_at' => now()->subDays(2)->subHours($i),
            ]);
        }
    }
}
