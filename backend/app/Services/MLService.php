<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class MLService
{
    private string $baseUrl;

    public function __construct()
    {
        $this->baseUrl = config('services.ml.url', 'http://localhost:8001');
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

    //Historial para los precios de la grafica
    public function getHistory(string $symbol, string $period = '1D'): array{
        
        $response = Http::get("{$this->baseUrl}/history/{$symbol}", ['period' => $period]);

        if($response->failed()){
            return ['error' =>'No se puede obtener el historial'];
        }
        return $response->json();
    }
}