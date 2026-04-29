<?php

namespace App\Http\Controllers;

use App\Models\Investment;
use App\Models\Symbol;
use Illuminate\Http\Request;

class InvestmentController extends Controller
{
    public function index(Request $request, $portfolioId)
    {
        $portfolio = $request->user()
            ->portfolios()
            ->with('investments.symbol')
            ->findOrFail($portfolioId);

        $investmentsData = [];
        $totalPortfolioValue = 0;

        foreach ($portfolio->investments as $investment) {
            $symbol = $investment->symbol;

            if (!$symbol) {
                continue;
            }

            $currentPrice = $investment->avg_buy_price;
            $currentValue = $investment->quantity * $currentPrice;
            $totalPortfolioValue += $currentValue;

            $simulated7dReturn = 0;

            $investmentsData[] = [
                'id' => $investment->id,
                'portfolio_id' => $investment->portfolio_id,
                'symbol_id' => $investment->symbol_id,
                'quantity' => (float) $investment->quantity,
                'avg_buy_price' => (float) $investment->avg_buy_price,
                'symbol' => $symbol->symbol,
                'image_url' => $symbol->image_url,
                'current_price' => (float) $currentPrice,
                'value' => (float) $currentValue,
                'weight' => 0,
                'return_7d' => (float) $simulated7dReturn,
            ];
        }

        if ($totalPortfolioValue > 0) {
            foreach ($investmentsData as &$data) {
                $data['weight'] = round(($data['value'] / $totalPortfolioValue) * 100, 2);
            }
            unset($data);
        }

        return response()->json([
            'portfolio_name' => $portfolio->name,
            'total_value' => (float) $totalPortfolioValue,
            'investments' => $investmentsData
        ]);
    }

    public function store(Request $request, $portfolioId)
    {
        $request->validate([
            'symbol' => 'required|string|max:10',
            'quantity' => 'required|numeric|min:0.00000001',
            'avg_buy_price' => 'required|numeric|min:0.01',
        ]);

        $portfolio = $request->user()->portfolios()->findOrFail($portfolioId);
        $symbolTicker = strtoupper($request->symbol);

        $symbol = Symbol::firstOrCreate(
            ['symbol' => $symbolTicker],
            [
                'name' => $symbolTicker,
                'asset_type' => 'crypto',
            ]
        );

        $investment = Investment::where('portfolio_id', $portfolio->id)
            ->where('symbol_id', $symbol->id)
            ->first();

        if ($investment) {
            $totalCostAntes = $investment->quantity * $investment->avg_buy_price;
            $costoNuevaCompra = $request->quantity * $request->avg_buy_price;

            $nuevaCantidad = $investment->quantity + $request->quantity;
            $nuevoPrecioMedio = ($totalCostAntes + $costoNuevaCompra) / $nuevaCantidad;

            $investment->update([
                'quantity' => $nuevaCantidad,
                'avg_buy_price' => $nuevoPrecioMedio
            ]);
        } else {
            $investment = $portfolio->investments()->create([
                'symbol_id' => $symbol->id,
                'quantity' => $request->quantity,
                'avg_buy_price' => $request->avg_buy_price,
            ]);
        }

        return response()->json([
            'message' => 'Posición guardada con éxito',
            'investment' => $investment
        ], 201);
    }

    public function update(Request $request, $portfolioId, $investmentId)
    {
        $request->validate([
            'quantity' => 'required|numeric|min:0.00000001',
            'avg_buy_price' => 'required|numeric|min:0.01',
        ]);

        $portfolio = $request->user()->portfolios()->findOrFail($portfolioId);
        $investment = $portfolio->investments()->findOrFail($investmentId);

        $investment->update([
            'quantity' => $request->quantity,
            'avg_buy_price' => $request->avg_buy_price,
        ]);

        return response()->json([
            'message' => 'Inversión actualizada.',
            'investment' => $investment
        ]);
    }

    public function destroy(Request $request, $portfolioId, $investmentId)
    {
        $portfolio = $request->user()->portfolios()->findOrFail($portfolioId);
        $investment = $portfolio->investments()->findOrFail($investmentId);

        $investment->delete();

        return response()->json([
            'message' => 'Posición eliminada correctamente.'
        ]);
    }
}