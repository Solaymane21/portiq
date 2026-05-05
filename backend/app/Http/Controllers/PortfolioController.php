<?php

namespace App\Http\Controllers;

use App\Models\Portfolio;
use Illuminate\Http\Request;

class PortfolioController extends Controller
{
    public function publicRanking(Request $request)
    {
        $sort = (string) $request->query('sort', 'total_value');
        $order = strtolower((string) $request->query('order', 'desc')) === 'asc' ? 'asc' : 'desc';
        $search = $request->query('q');

        $allowedSorts = ['total_value', 'asset_count', 'name', 'owner_name', 'created_at', 'updated_at'];
        if (! in_array($sort, $allowedSorts, true)) {
            $sort = 'total_value';
        }

        $portfolios = Portfolio::query()
            ->where('is_public', true)
            ->with(['user:id,name,avatar', 'investments'])
            ->get();

        $rows = $portfolios->map(function (Portfolio $portfolio) {
            $activosCount = $portfolio->investments
                ->filter(fn ($investment) => $investment->quantity > 0)
                ->count();

            $valorTotal = $portfolio->investments->sum(function ($investment) {
                return $investment->quantity * $investment->avg_buy_price;
            });

            $user = $portfolio->user;

            return [
                'id' => $portfolio->id,
                'name' => $portfolio->name,
                'owner_name' => $user->name,
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'avatar' => $user->avatar,
                ],
                'asset_count' => $activosCount,
                'total_value' => round((float) $valorTotal, 2),
                'created_at' => $portfolio->created_at,
                'updated_at' => $portfolio->updated_at,
            ];
        });

        if ($search !== null && $search !== '') {
            $needle = mb_strtolower((string) $search);
            $rows = $rows->filter(function (array $row) use ($needle) {
                return str_contains(mb_strtolower($row['name']), $needle)
                    || str_contains(mb_strtolower($row['owner_name']), $needle);
            });
        }

        $sorted = $order === 'desc'
            ? $rows->sortByDesc($sort)
            : $rows->sortBy($sort);

        return response()->json($sorted->values());
    }

    public function index(Request $request)
    {
        $portfolios = $request->user()->portfolios()->with('investments')
            ->orderByDesc('is_default')
            ->orderBy('created_at')
            ->get();

        $portfoliosData = $portfolios->map(function ($portfolio) {
            $activosCount = $portfolio->investments
            ->filter(fn($investment) => $investment->quantity > 0)
            ->count();
            
            $valorTotal = $portfolio->investments->sum(function ($investment) {
                return $investment->quantity * $investment->avg_buy_price; 
            });

            return [
                'id' => $portfolio->id,
                'name' => $portfolio->name,
                'is_default' => (bool) $portfolio->is_default,
                'is_public' => (bool) $portfolio->is_public,
                'asset_count' => $activosCount,
                'total_value' => round($valorTotal, 2),
                'created_at' => $portfolio->created_at,
                'updated_at' => $portfolio->updated_at
            ];
        }); 

        return response()->json($portfoliosData);
    }

    public function store(Request $request)
    {
        $isDefault = $request->is_default ?? false;

        if ($isDefault) {
            $request->user()->portfolios()->update(['is_default' => false]);
        }

        $portfolio = $request->user()->portfolios()->create([
            'name' => $request->name,
            'is_default' => $isDefault,
            'is_public' => $request->is_public ?? false,
        ]);

        return response()->json([
            'message' => 'Cartera creada.',
            'portfolio' => [
                'id' => $portfolio->id,
                'name' => $portfolio->name,
                'is_default' => (bool) $portfolio->is_default,
                'is_public' => (bool) $portfolio->is_public,
                'asset_count' => 0,
                'total_value' => 0,
                'created_at' => $portfolio->created_at,
                'updated_at' => $portfolio->updated_at
            ]
        ], 201);
    }

    public function update(Request $request, $id) 
    {
        $portfolio = $request->user()->portfolios()->with('investments')->findOrFail($id);
        
        $isDefault = $request->is_default ?? false;

        if ($isDefault && !$portfolio->is_default) {
            $request->user()->portfolios()
                ->where('id', '!=', $portfolio->id)
                ->update(['is_default' => false]);
        }

        $portfolio->update([
            'name' => $request->name,
            'is_default' => $isDefault,
            'is_public' => $request->is_public ?? false,
        ]);

        $activosCount = $portfolio->investments->count();
        $valorTotal = $portfolio->investments->sum(function ($investment) {
            return $investment->quantity * $investment->avg_buy_price; 
        });

        return response()->json([
            'message' => 'Cartera actualizada.',
            'portfolio' => [
                'id' => $portfolio->id,
                'name' => $portfolio->name,
                'is_default' => (bool) $portfolio->is_default,
                'is_public' => (bool) $portfolio->is_public,
                'asset_count' => $activosCount,
                'total_value' => round($valorTotal, 2),
                'created_at' => $portfolio->created_at,
                'updated_at' => $portfolio->updated_at
            ]
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $portfolio = $request->user()->portfolios()->findOrFail($id);

        $portfolio->investments()->delete();
        
        $portfolio->delete();

        return response()->json([
            'message' => 'Cartera eliminada.'
        ]);
    }
}