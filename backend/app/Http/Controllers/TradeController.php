<?php

namespace App\Http\Controllers;

use App\Models\Portfolio;
use Illuminate\Http\Request;
use App\Models\Trade;

class TradeController extends Controller
{
    public function index(Request $request, $portfolioId)
    {
        $portfolio = Portfolio::where('id', $portfolioId)->firstOrFail();

        $user = $request->user();
        if ((int) $portfolio->user_id !== (int) $user->id && ! $portfolio->is_public) {
            abort(403, 'No autorizado');
        }

        $trades = Trade::whereHas('investment', function ($query) use ($portfolioId) {
                $query->where('portfolio_id', $portfolioId);
            })
            ->with('investment.symbol')
            ->orderBy('operated_at', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        $totalDepositado = 0; // Compras y Nuevas Posiciones
        $totalRetirado = 0;   // Ventas

        $formattedTrades = $trades->map(function ($trade) use (&$totalDepositado, &$totalRetirado) {
            $symbol = $trade->investment->symbol ?? null;
            $totalValue = (float) ($trade->quantity * $trade->price_per_unit);

            // Calculamos estadísticas
            if ($trade->type === 'venta') {
                $totalRetirado += $totalValue;
            } else {
                $totalDepositado += $totalValue;
            }

            return [
                'id' => $trade->id,
                'type' => $trade->type,
                'quantity' => (float) $trade->quantity,
                'price_per_unit' => (float) $trade->price_per_unit,
                'total_value' => $totalValue,
                'operated_at' => $trade->operated_at,
                'symbol' => $symbol ? $symbol->symbol : '???',
                'name' => $symbol ? $symbol->name : 'Desconocido',
                'image_url' => $symbol ? $symbol->image_url : null,
                'asset_type' => $symbol ? $symbol->asset_type : 'unknown',
            ];
        });

        // La Exposición Neta es el dinero real que sigue "en juego"
        $exposicionNeta = $totalDepositado - $totalRetirado;

        return response()->json([
            'portfolio_name' => $portfolio->name,
            'stats' => [
                'total_depositado' => $totalDepositado,
                'total_retirado' => $totalRetirado,
                'exposicion_neta' => $exposicionNeta,
                'total_operaciones' => $trades->count(),
            ],
            'trades' => $formattedTrades
        ]);
    }
}