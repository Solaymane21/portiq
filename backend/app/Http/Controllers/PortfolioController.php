<?php

namespace App\Http\Controllers;

use App\Models\Portfolio;
use Illuminate\Http\Request;

class PortfolioController extends Controller
{
    /**
     * Guarda una nueva cartera en la base de datos
     */
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

    
}