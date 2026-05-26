<?php

namespace App\Http\Controllers;

use App\Models\Portfolio;
use App\Models\Trade;
use Illuminate\Http\Request;

class TradeController extends Controller
{
    public function index(Request $request, $portfolioId)
    {
        // Sacamos la cartera o devolvemos 404 si no existe
        $portfolio = Portfolio::where('id', $portfolioId)->firstOrFail();

        // Solo puede entrar el dueño o si la cartera es publica
        $user = $request->user();
        if ((int) $portfolio->user_id !== (int) $user->id && ! $portfolio->is_public) {
            abort(403, 'No autorizado');
        }

        // Traemos las operaciones de esa cartera con su simbolo
        $trades = Trade::whereHas('investment', function ($query) use ($portfolioId) {
                $query->where('portfolio_id', $portfolioId);
            })
            ->with('investment.symbol')
            ->orderBy('operated_at', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        $totalIn = 0;
        $totalOut = 0;

        $formattedTrades = $trades->map(function ($trade) use (&$totalIn, &$totalOut) {
            $symbol = $trade->investment->symbol ?? null;
            $totalValue = (float) ($trade->quantity * $trade->price_per_unit);

            // Sumamos segun si entra dinero o sale
            if ($trade->type === 'venta') {
                $totalOut += $totalValue;
            } else {
                $totalIn += $totalValue;
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

        return response()->json([
            'portfolio_name' => $portfolio->name,
            'stats' => [
                'total_depositado' => $totalIn,
                'total_retirado' => $totalOut,
                'exposicion_neta' => $totalIn - $totalOut,
                'total_operaciones' => $trades->count(),
            ],
            'trades' => $formattedTrades,
        ]);
    }
}