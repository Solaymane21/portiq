<?php

namespace App\Http\Controllers;

use App\Models\Portfolio;
use App\Models\Investment;
use App\Models\Symbol;
use Illuminate\Http\Request;

class InvestmentController extends Controller
{
    public function index(Portfolio $portfolio)
    {
        $investments = $portfolio->investments()->with('symbol')->get();

        $valorTotal = 0;
        $inversionTotal = 0;

        $data = $investments->map(function ($inv) use (&$valorTotal, &$inversionTotal) {
            
            // Como ya no guardamos el current_price en BD, para la demo simulamos un precio de mercado
            // basándonos en tu precio de compra. (Aquí luego engancharás tu API en tiempo real).
            $precioActual = $inv->avg_buy_price * (rand(90, 110) / 100);
            
            $valorCalculado = $precioActual * $inv->quantity;
            $inversionPosicion = $inv->avg_buy_price * $inv->quantity;

            $valorTotal += $valorCalculado;
            $inversionTotal += $inversionPosicion;

            return [
                'id' => $inv->id,
                'simbolo' => $inv->symbol->symbol,
                'nombre' => $inv->symbol->name,
                'image_url' => $inv->symbol->image_url, 
                'peso' => 0, 
                'retorno7d' => $inv->avg_buy_price > 0 ? round((($precioActual - $inv->avg_buy_price) / $inv->avg_buy_price) * 100, 2) : 0,
                'valor' => round($valorCalculado, 2),
                'acciones' => $inv->quantity,
                'avg_buy_price' => $inv->avg_buy_price
            ];
        });

        $ganancias = $valorTotal - $inversionTotal;
        $porcentaje = $inversionTotal > 0 ? round(($ganancias / $inversionTotal) * 100, 2) : 0;

        $data = $data->map(function ($item) use ($valorTotal) {
            $item['peso'] = $valorTotal > 0 ? round(($item['valor'] / $valorTotal) * 100, 2) : 0;
            return $item;
        });

        return response()->json([
            'cartera_name' => $portfolio->name,
            'stats' => [
                'valor_total' => round($valorTotal, 2),
                'ganancias' => round($ganancias, 2),
                'porcentaje' => $porcentaje
            ],
            'data' => $data
        ]);
    }

    public function store(Request $request, Portfolio $portfolio)
    {
        $request->validate([
            'simbolo' => 'required|string|max:20',
            'nombre' => 'nullable|string',
            'image_url' => 'nullable|string', 
            'type' => 'required|in:buy,sell', 
            'quantity' => 'required|numeric|min:0.000001',
            'price' => 'required|numeric|min:0.01',
        ]);

        $symbolTicker = strtoupper($request->simbolo);

        // Guardamos el símbolo. (Hemos quitado el current_price de aquí).
        $symbol = Symbol::firstOrCreate(
            ['symbol' => $symbolTicker],
            [
                'name' => $request->nombre ?? ($symbolTicker . ' (Pendiente API)'),
                'image_url' => $request->image_url,
                'asset_type' => 'Crypto/Stock'
            ]
        );

        if ($request->image_url && empty($symbol->image_url)) {
            $symbol->update(['image_url' => $request->image_url]);
        }

        $investment = $portfolio->investments()->where('symbol_id', $symbol->id)->first();

        if ($request->type === 'buy') {
            if ($investment) {
                $valorAntiguo = $investment->quantity * $investment->avg_buy_price;
                $valorNuevo = $request->quantity * $request->price;
                
                $nuevaCantidad = $investment->quantity + $request->quantity;
                $nuevoPrecioMedio = ($valorAntiguo + $valorNuevo) / $nuevaCantidad;

                $investment->update([
                    'quantity' => $nuevaCantidad,
                    'avg_buy_price' => $nuevoPrecioMedio
                ]);
            } else {
                $investment = $portfolio->investments()->create([
                    'symbol_id' => $symbol->id,
                    'quantity' => $request->quantity,
                    'avg_buy_price' => $request->price,
                ]);
            }

        } elseif ($request->type === 'sell') {
            if (!$investment) {
                return response()->json(['message' => 'No tienes posiciones para vender de este activo'], 400);
            }

            $nuevaCantidad = $investment->quantity - $request->quantity;

            if ($nuevaCantidad <= 0) {
                $investment->delete(); 
            } else {
                $investment->update(['quantity' => $nuevaCantidad]);
            }
        }

        return response()->json(['message' => 'Transacción procesada con éxito'], 201);
    }

    public function update(Request $request, Portfolio $portfolio, Investment $investment)
    {
        return response()->json(['message' => 'Método obsoleto. Usa el endpoint store con type buy/sell.'], 400);
    }

    public function destroy(Portfolio $portfolio, Investment $investment)
    {
        if ($investment->portfolio_id !== $portfolio->id) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        $investment->delete();
        return response()->json(['message' => 'Inversión eliminada correctamente']);
    }
}