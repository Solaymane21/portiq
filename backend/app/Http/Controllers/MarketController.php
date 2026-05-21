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
        $assetTypes = explode(',', $request->query('asset_types', ''));

        return response()->json($this->ml->getPrices($symbols, $assetTypes));
    }

    public function portfolioValue(Request $request)
    {
        $positions = [
            ['symbol' => 'AAPL', 'quantity' => 10],
            ['symbol' => 'MSFT','quantity' => 5],
            ['symbol' => 'BTC-USD','quantity' => 0.5],
        ];

        return response()->json($this->ml->getPortfolioValue($positions));
    }

    public function history(string $symbol, Request $request){
        $period = $request->query('period', '1D');
        $assetType = $request->query('asset_type', 'stock');

        return response()->json($this->ml->getHistory($symbol, $period, $assetType));
    }

    public function portfolioHistory(Request $request){
        $symbols = $request->query('symbols');
        $quantities = $request->query('quantities');
        $assetTypes = $request->query('asset_types', '');
        $fromDate = $request->query('from_date');

        return response()->json(
            $this->ml->getPortfolioHistory($symbols, $quantities, $assetTypes, $fromDate)
        );
    }

    
}
