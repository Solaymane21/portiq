<?php

namespace App\Http\Controllers;

use App\Models\Portfolio;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PortfolioController extends Controller
{
    public function index()
    {
        $portfolios = Portfolio::where('user_id', 8)->get();

        $portfolios->map(function ($portfolio) {
            $portfolio->activos_count = $portfolio->investments()->count();

            $valorTotal = $portfolio->investments()->sum(DB::raw('quantity * avg_buy_price'));
            $portfolio->valor_total = $valorTotal ? (float) $valorTotal : 0.00;

            return $portfolio;
        });

        return response()->json($portfolios);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'is_default' => 'boolean'
        ]);

        if ($request->boolean('is_default')) {
            Portfolio::where('user_id', 8)->update(['is_default' => false]);
        }

        $portfolio = Portfolio::create([
            'user_id' => 8,
            'name' => $request->name,
            'is_public' => false,
            'is_default' => $request->boolean('is_default'),
        ]);

        $portfolio->activos_count = 0;
        $portfolio->valor_total = 0.00;

        return response()->json($portfolio, 201);
    }

    public function update(Request $request, $id)
    {
        $portfolio = Portfolio::findOrFail($id);

        $request->validate([
            'name' => 'required|string|max:255',
            'is_default' => 'boolean'
        ]);

        if ($request->boolean('is_default')) {
            Portfolio::where('user_id', 8)
                ->where('id', '!=', $portfolio->id)
                ->update(['is_default' => false]);
        }

        $portfolio->update([
            'name' => $request->name,
            'is_default' => $request->has('is_default') ? $request->boolean('is_default') : $portfolio->is_default,
        ]);

        $portfolio->activos_count = $portfolio->investments()->count();
        $valorTotal = $portfolio->investments()->sum(DB::raw('quantity * avg_buy_price'));
        $portfolio->valor_total = $valorTotal ? (float) $valorTotal : 0.00;

        return response()->json($portfolio);
    }

    public function destroy($id)
    {
        $portfolio = Portfolio::findOrFail($id);
        $portfolio->delete();

        return response()->json(['message' => 'Eliminada correctamente']);
    }
}