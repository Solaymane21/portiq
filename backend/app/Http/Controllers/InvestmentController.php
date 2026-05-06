<?php

namespace App\Http\Controllers;

use App\Models\Investment;
use App\Models\Portfolio;
use App\Models\Symbol;
use App\Models\Trade;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class InvestmentController extends Controller
{
    public function index(Request $request, $portfolioId)
    {
        $portfolio = Portfolio::with(['investments.symbol', 'user'])
            ->where('id', $portfolioId)
            ->firstOrFail();

        $user = $request->user();
        if ((int) $portfolio->user_id !== (int) $user->id && ! $portfolio->is_public) {
            abort(403, 'No autorizado');
        }

        $investmentsData = [];
        $totalPortfolioValue = 0;

        foreach ($portfolio->investments as $investment) {
            $symbol = $investment->symbol;
            if (! $symbol) {
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

        $readOnly = (int) $portfolio->user_id !== (int) $user->id;

        return response()->json([
            'portfolio_name' => $portfolio->name,
            'total_value' => (float) $totalPortfolioValue,
            'investments' => $investmentsData,
            'read_only' => $readOnly,
            'owner_name' => $readOnly ? ($portfolio->user->name ?? null) : null,
        ]);
    }

    public function store(Request $request, $portfolioId)
    {
        $data = $request->validate([
            'symbol' => 'required|string|max:20',
            'name' => 'nullable|string|max:255',
            'image_url' => 'nullable|string|max:2048',
            'asset_type' => 'required|string|in:stock,crypto',
            'quantity' => 'required|numeric|min:0.00000001',
            'avg_buy_price' => 'required|numeric',
            'operated_at' => 'nullable|date',
        ]);

        $portfolio = $request->user()->portfolios()->findOrFail($portfolioId);

        $investment = $this->applyBuyLot($portfolio, strtoupper($data['symbol']), [
            'name' => $data['name'] ?? null,
            'image_url' => $data['image_url'] ?? null,
            'asset_type' => $data['asset_type'],
            'quantity' => (float) $data['quantity'],
            'avg_buy_price' => (float) $data['avg_buy_price'],
            'operated_at' => $data['operated_at'] ?? null,
        ]);

        return response()->json([
            'message' => 'Posición guardada con éxito',
            'investment' => $investment,
        ], 201);
    }

    /**
     * Importa varias posiciones en una sola petición (transacción única).
     */
    public function importPositions(Request $request, $portfolioId)
    {
        $validated = $request->validate([
            'positions' => 'required|array|min:1|max:500',
            'positions.*.symbol' => 'required|string|max:20',
            'positions.*.name' => 'nullable|string|max:255',
            'positions.*.image_url' => 'nullable|string|max:2048',
            'positions.*.asset_type' => 'required|string|in:stock,crypto',
            'positions.*.quantity' => 'required|numeric|min:0.00000001',
            'positions.*.avg_buy_price' => 'required|numeric',
            'positions.*.operated_at' => 'nullable|date',
        ]);

        $portfolio = $request->user()->portfolios()->findOrFail($portfolioId);

        DB::transaction(function () use ($portfolio, $validated) {
            foreach ($validated['positions'] as $row) {
                $this->applyBuyLot($portfolio, strtoupper($row['symbol']), [
                    'name' => $row['name'] ?? null,
                    'image_url' => $row['image_url'] ?? null,
                    'asset_type' => $row['asset_type'],
                    'quantity' => (float) $row['quantity'],
                    'avg_buy_price' => (float) $row['avg_buy_price'],
                    'operated_at' => $row['operated_at'] ?? null,
                ]);
            }
        });

        return response()->json([
            'message' => 'Importación completada.',
            'count' => count($validated['positions']),
        ]);
    }

    public function update(Request $request, $portfolioId, $investmentId)
    {
        // Las compras/ventas usan buy() y sell().
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
        $data = $request->validate([
            'quantity' => 'required|numeric|min:0.00000001',
            'price_per_unit' => 'required|numeric',
            'operated_at' => 'nullable|date',
        ]);

        $portfolio = $request->user()->portfolios()->findOrFail($portfolioId);
        $investment = $portfolio->investments()->findOrFail($investmentId);

        $totalCostAntes = $investment->quantity * $investment->avg_buy_price;
        $costoNuevaCompra = $data['quantity'] * $data['price_per_unit'];

        $nuevaCantidad = $investment->quantity + $data['quantity'];
        $nuevoPrecioMedio = ($totalCostAntes + $costoNuevaCompra) / $nuevaCantidad;

        $investment->update([
            'quantity' => $nuevaCantidad,
            'avg_buy_price' => $nuevoPrecioMedio,
        ]);

        Trade::create([
            'investment_id' => $investment->id,
            'quantity' => $data['quantity'],
            'price_per_unit' => $data['price_per_unit'],
            'type' => 'compra',
            'operated_at' => $this->parseOperatedAt($data['operated_at'] ?? null),
        ]);

        return response()->json([
            'message' => 'Compra registrada correctamente.',
            'investment' => $investment->fresh(),
        ]);
    }

    public function sell(Request $request, $portfolioId, $investmentId)
    {
        $data = $request->validate([
            'quantity' => 'required|numeric|min:0.00000001',
            'price_per_unit' => 'required|numeric',
            'operated_at' => 'nullable|date',
        ]);

        $portfolio = $request->user()->portfolios()->findOrFail($portfolioId);
        $investment = $portfolio->investments()->findOrFail($investmentId);

        if ($data['quantity'] > $investment->quantity) {
            return response()->json([
                'message' => 'No puedes vender más cantidad de la que tienes.',
            ], 422);
        }

        $nuevaCantidad = $investment->quantity - $data['quantity'];

        Trade::create([
            'investment_id' => $investment->id,
            'quantity' => $data['quantity'],
            'price_per_unit' => $data['price_per_unit'],
            'type' => 'venta',
            'operated_at' => $this->parseOperatedAt($data['operated_at'] ?? null),
        ]);

        if ($nuevaCantidad <= 0) {
            $investment->update(['quantity' => 0]);

            return response()->json([
                'message' => 'Venta registrada y posición cerrada (cantidad = 0).',
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

    /**
     * Alta o media de posición + registro de trade (misma lógica que store).
     */
    private function applyBuyLot(Portfolio $portfolio, string $symbolTicker, array $fields): Investment
    {
        $symbol = Symbol::firstOrCreate(
            ['symbol' => $symbolTicker],
            [
                'name' => $fields['name'] ?: $symbolTicker,
                'image_url' => $fields['image_url'] ?? null,
                'asset_type' => $fields['asset_type'],
            ]
        );

        $investment = Investment::where('portfolio_id', $portfolio->id)
            ->where('symbol_id', $symbol->id)
            ->first();

        $qty = $fields['quantity'];
        $price = $fields['avg_buy_price'];

        if ($investment) {
            $totalCostAntes = $investment->quantity * $investment->avg_buy_price;
            $costoNuevaOperacion = $qty * $price;
            $nuevaCantidad = $investment->quantity + $qty;
            $nuevoPrecioMedio = ($totalCostAntes + $costoNuevaOperacion) / $nuevaCantidad;

            $investment->update([
                'quantity' => $nuevaCantidad,
                'avg_buy_price' => $nuevoPrecioMedio,
            ]);
            $tipoTrade = 'compra';
        } else {
            $investment = $portfolio->investments()->create([
                'symbol_id' => $symbol->id,
                'quantity' => $qty,
                'avg_buy_price' => $price,
            ]);
            $tipoTrade = 'nuevaPosicion';
        }

        Trade::create([
            'investment_id' => $investment->id,
            'quantity' => $qty,
            'price_per_unit' => $price,
            'type' => $tipoTrade,
            'operated_at' => $this->parseOperatedAt($fields['operated_at'] ?? null),
        ]);

        return $investment->fresh();
    }

    private function parseOperatedAt(?string $date): Carbon
    {
        if ($date === null || $date === '') {
            return now();
        }

        return Carbon::parse($date);
    }
}
