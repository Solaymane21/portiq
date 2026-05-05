<?php

namespace App\Http\Controllers;

use App\Models\Investment;
use App\Models\Symbol;
use App\Models\Trade;
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

            $currentPrice = (float) $investment->avg_buy_price; 
            $currentValue = (float) $investment->quantity * $currentPrice;
            $totalPortfolioValue += $currentValue;

            $investmentsData[] = [
                'id' => $investment->id,
                'portfolio_id' => $investment->portfolio_id,
                'symbol_id' => $investment->symbol_id,
                'quantity' => (float) $investment->quantity,
                'avg_buy_price' => (float) $investment->avg_buy_price,
                'symbol' => $symbol->symbol,
                'name' => $symbol->name,
                'asset_type' => $symbol->asset_type,
                'image_url' => $symbol->image_url,
                'api_id' => $symbol->api_id,
                'current_price' => $currentPrice,
                'value' => $currentValue,
                'weight' => 0,
                'return_7d' => 0, 
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
            'symbol' => 'required|string|max:20',
            'name' => 'nullable|string|max:255',
            'image_url' => 'nullable|string|max:2048',
            'asset_type' => 'required|string|in:stock,crypto',
            'quantity' => 'required|numeric|min:0.00000001',
            'avg_buy_price' => 'required|numeric',
            'operated_at' => 'nullable|date',
        ]);

        $portfolio = $request->user()->portfolios()->findOrFail($portfolioId);
        $symbolTicker = strtoupper($request->symbol);

        $symbol = Symbol::firstOrCreate(
            ['symbol' => $symbolTicker],
            [
                'name' => $request->name ?: $symbolTicker,
                'image_url' => $request->image_url,
                'asset_type' => $request->asset_type,
                'current_price' => $request->avg_buy_price,
                'is_active' => true,
            ]
        );

        $investment = Investment::where('portfolio_id', $portfolio->id)
            ->where('symbol_id', $symbol->id)
            ->first();

        if ($investment) {
            $totalCostAntes = $investment->quantity * $investment->avg_buy_price;
            $costoNuevaOperacion = $request->quantity * $request->avg_buy_price;

            $nuevaCantidad = $investment->quantity + $request->quantity;
            $nuevoPrecioMedio = ($totalCostAntes + $costoNuevaOperacion) / $nuevaCantidad;

            $investment->update([
                'quantity' => $nuevaCantidad,
                'avg_buy_price' => $nuevoPrecioMedio
            ]);
            $tipoTrade = 'compra';
        } else {
            $investment = $portfolio->investments()->create([
                'symbol_id' => $symbol->id,
                'quantity' => $request->quantity,
                'avg_buy_price' => $request->avg_buy_price,
            ]);
            $tipoTrade = 'nuevaPosicion';
        }

        Trade::create([
            'investment_id' => $investment->id,
            'quantity' => $request->quantity,
            'price_per_unit' => $request->avg_buy_price,
            'type' => $tipoTrade,
            'operated_at' => $request->operated_at ?? now(),
        ]);

        return response()->json([
            'message' => 'Posición guardada con éxito',
            'investment' => $investment
        ], 201);
    }

    public function update(Request $request, $portfolioId, $investmentId)
    {
        //BUY y SELL hacen su funcion
    }

    public function destroy(Request $request, $portfolioId, $investmentId)
    {
        $portfolio = $request->user()->portfolios()->findOrFail($portfolioId);
        $investment = $portfolio->investments()->findOrFail($investmentId);
        $investment->delete();
        return response()->json(['message' => 'Posición eliminada correctamente.']);
    }

    public function buy(Request $request, $portfolioId, $investmentId)
    {
        $request->validate([
            'quantity' => 'required|numeric|min:0.00000001',
            'price_per_unit' => 'required|numeric',
            'operated_at' => 'nullable|date',
        ]);

        $portfolio = $request->user()->portfolios()->findOrFail($portfolioId);
        $investment = $portfolio->investments()->findOrFail($investmentId);

        $totalCostAntes = $investment->quantity * $investment->avg_buy_price;
        $costoNuevaCompra = $request->quantity * $request->price_per_unit;

        $nuevaCantidad = $investment->quantity + $request->quantity;
        $nuevoPrecioMedio = ($totalCostAntes + $costoNuevaCompra) / $nuevaCantidad;

        $investment->update([
            'quantity' => $nuevaCantidad,
            'avg_buy_price' => $nuevoPrecioMedio,
        ]);

        Trade::create([
            'investment_id' => $investment->id,
            'quantity' => $request->quantity,
            'price_per_unit' => $request->price_per_unit,
            'type' => 'compra',
            'operated_at' => $request->operated_at ?? now(),
        ]);

        return response()->json([
            'message' => 'Compra registrada correctamente.',
            'investment' => $investment->fresh(),
        ]);
    }

    public function sell(Request $request, $portfolioId, $investmentId)
    {
        $request->validate([
            'quantity' => 'required|numeric|min:0.00000001',
            'price_per_unit' => 'required|numeric',
            'operated_at' => 'nullable|date',
        ]);

        $portfolio = $request->user()->portfolios()->findOrFail($portfolioId);
        $investment = $portfolio->investments()->findOrFail($investmentId);

        if ($request->quantity > $investment->quantity) {
            return response()->json([
                'message' => 'No puedes vender más cantidad de la que tienes.'
            ], 422);
        }

        $nuevaCantidad = $investment->quantity - $request->quantity;

        Trade::create([
            'investment_id' => $investment->id,
            'quantity' => $request->quantity,
            'price_per_unit' => $request->price_per_unit,
            'type' => 'venta',
            'operated_at' => $request->operated_at ?? now(),
        ]);

        if ($nuevaCantidad <= 0) {
            $investment->update(['quantity' => 0]); // ← CAMBIA A 0, NO BORRA
            return response()->json([
                'message' => 'Venta registrada y posición cerrada (cantidad = 0).'
            ]);
        }

        $investment->update([
            'quantity' => $nuevaCantidad,
        ]);

        return response()->json([
            'message' => 'Venta registrada correctamente.',
            'investment' => $investment->fresh(),
        ]);
    }
}