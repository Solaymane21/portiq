<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class MLService
{
    private string $baseUrl;

    public function __construct()
    {
        $this->baseUrl = env('ML_SERVICE_URL', 'http://localhost:8001');
    }

    // Buscar un símbolo
    public function search(string $symbol): array
    {
        $response = Http::get("{$this->baseUrl}/search/{$symbol}");

        if ($response->failed()) {
            return ['error' => 'Ticker no encontrado'];
        }

        return $response->json();
    }

    // Precios de varios símbolos
    public function getPrices(array $symbols): array
    {
        $response = Http::get("{$this->baseUrl}/prices", [
            'symbols' => implode(',', $symbols)
        ]);

        return $response->json();
    }

    // Valor total de la cartera
    public function getPortfolioValue(array $positions): array
    {
        $positionsStr = collect($positions)
            ->map(fn($p) => "{$p['symbol']}:{$p['quantity']}")
            ->join(',');

        $response = Http::get("{$this->baseUrl}/portfolio/value", [
            'positions' => $positionsStr
        ]);

        return $response->json();
    }
}