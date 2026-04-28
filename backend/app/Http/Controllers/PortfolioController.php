<?php

namespace App\Http\Controllers;

use App\Models\Portfolio;
use Illuminate\Http\Request;

class PortfolioController extends Controller
{
    public function index(Request $request)
    {
        $portfolios = $request->user()->portfolios()->get();

        return response()->json($portfolios);
    }

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

    public function update(Request $request, $id) 
    {
        $portfolio = $request->user()->portfolios()->findOrFail($id);

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

    public function destroy(Request $request, $id)
    {
        $portfolio = $request->user()->portfolios()->findOrFail($id);

        $portfolio->delete();

        return response()->json([
            'message' => 'Cartera eliminada.'
        ]);
    }
}