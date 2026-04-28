<?php

namespace App\Http\Controllers;

use App\Models\Investment;
use App\Models\Portfolio;
use App\Models\Symbol;
use Illuminate\Http\Request;

class InvestmentController extends Controller
{
    /**
     * GET: Obtener las posiciones de una cartera que pertenece al usuario
     */
    public function index(Request $request, $portfolioId)
    {
        // 1. Buscamos la cartera ASEGURÁNDONOS de que sea del usuario autenticado
        $portfolio = $request->user()->portfolios()->with('investments.symbol')->findOrFail($portfolioId);
        
        $investmentsData = [];
        $totalPortfolioValue = 0;

        foreach ($portfolio->investments as $investment) {
            $symbol = $investment->symbol;
            
            $currentPrice = $investment->avg_buy_price * (1 + (rand(-5, 5) / 100));
            $currentValue = $investment->quantity * $currentPrice;
            $totalPortfolioValue += $currentValue;
            
            $simulated7dReturn = rand(-100, 150) / 10; 

            $investmentsData[] = [
                'id' => $investment->id,
                'simbolo' => $symbol->symbol,
                'image_url' => $symbol->image_url,
                'acciones' => (float) $investment->quantity,
                'avg_buy_price' => (float) $investment->avg_buy_price,
                'current_price' => $currentPrice,
                'valor' => $currentValue,
                'retorno7d' => $simulated7dReturn,
                'peso' => 0, 
            ];
        }

        if ($totalPortfolioValue > 0) {
            foreach ($investmentsData as &$data) {
                $data['peso'] = round(($data['valor'] / $totalPortfolioValue) * 100, 2);
            }
        }

        return response()->json([
            'portfolio_name' => $portfolio->name,
            'total_value' => $totalPortfolioValue,
            'investments' => $investmentsData
        ]);
    }

    /**
     * POST: Añadir una posición a una cartera del usuario
     */
    public function store(Request $request, $portfolioId)
    {
        $request->validate([
            'symbol' => 'required|string|max:10',
            'quantity' => 'required|numeric|min:0.00000001',
            'avg_buy_price' => 'required|numeric|min:0.01',
        ]);

        // Verificamos propiedad
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

    /**
     * PUT: Actualizar posición (Para el futuro)
     */
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

    /**
     * DELETE: Vender activo (Para el futuro)
     */
    public function destroy(Request $request, $portfolioId, $investmentId)
    {
        $portfolio = $request->user()->portfolios()->findOrFail($portfolioId);
        
        $investment = $portfolio->investments()->findOrFail($investmentId);
        
        $investment->delete();

        return response()->json(['message' => 'Posición eliminada correctamente.']);
    }
}