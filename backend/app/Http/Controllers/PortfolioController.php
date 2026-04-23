<?php

namespace App\Http\Controllers;

use App\Models\Portfolio;
use Illuminate\Http\Request;

class PortfolioController extends Controller
{
    public function store(Request $request)
    {
        $portfolio = $request->user()->portfolios()->create([
            'name' => $request->name,
            'is_default' => $request->is_default ?? false,
            'is_public' => $request->is_public ?? false,
        ]);

        return response()->json([
            'message' => 'Cartera creada.',
            'portfolio' => $portfolio
        ], 201);
    }

    public function index(Request $request)
    {
        $portfolios = $request->user()->portfolios()->get();

        return response()->json($portfolios);
    }

    public function update(Request $request, Portfolio $portfolio)
    {
        $portfolio->update([
            'name' => $request->name,
            'is_default' => $request->is_default ?? false,
            'is_public' => $request->is_public ?? false,
        ]);

        return response()->json([
            'message' => 'Cartera actualizada.',
            'portfolio' => $portfolio
        ]);
    }

    public function destroy(Portfolio $portfolio)
    {
        $portfolio->delete();

        return response()->json([
            'message' => 'Cartera eliminada.'
        ]);
    }
    
}