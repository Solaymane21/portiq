<?php

namespace App\Http\Controllers;

use App\Services\MLService;
use Illuminate\Http\Request;

class MarketController extends Controller
{
    public function __construct(private MLService $ml) {}

    public function search(string $symbol)
    {
        return response()->json($this->ml->search($symbol));
    }

    public function prices(Request $request)
    {
        $symbols = explode(',', $request->query('symbols'));
        return response()->json($this->ml->getPrices($symbols));
    }

    public function portfolioValue(Request $request)
    {
        $positions = [
            ['symbol' => 'AAPL',    'quantity' => 10],
            ['symbol' => 'MSFT',    'quantity' => 5],
            ['symbol' => 'BTC-USD', 'quantity' => 0.5],
        ];

        return response()->json($this->ml->getPortfolioValue($positions));
    }
}
