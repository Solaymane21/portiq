<?php

namespace App\Http\Controllers;

use App\Models\Portfolio;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

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

        $rows = $portfolios->map(fn (Portfolio $p) => $this->publicRankingRow($p));

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

    public function follow(Request $request, $portfolioId)
    {
        $portfolio = Portfolio::where('id', $portfolioId)
            ->where('is_public', true)
            ->firstOrFail();

        if ((int) $portfolio->user_id === (int) $request->user()->id) {
            return response()->json([
                'message' => 'No puedes seguir tu propia cartera.'
            ], 422);
        }

        DB::table('favorite_portfolios')->insertOrIgnore([
            'user_id' => $request->user()->id,
            'portfolio_id' => $portfolio->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'message' => 'Cartera seguida.'
        ]);
    }

    public function unfollow(Request $request, int $portfolioId): \Illuminate\Http\JsonResponse
    {
        DB::table('favorite_portfolios')
            ->where('user_id', $request->user()->id)
            ->where('portfolio_id', $portfolioId)
            ->delete();

        return response()->json(['message' => 'Has dejado de seguir la cartera.']);
    }

    public function index(Request $request)
    {
        $portfolios = $request->user()->portfolios()
            ->with('investments')
            ->orderByDesc('is_default')
            ->orderBy('created_at')
            ->get();

        $data = $portfolios->map(fn (Portfolio $p) => $this->portfolioSummary($p, true));

        return response()->json($data);
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
            'portfolio' => $this->portfolioSummary($portfolio, false),
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $portfolio = $request->user()->portfolios()->with('investments')->findOrFail($id);

        $isDefault = $request->is_default ?? false;

        if ($isDefault && ! $portfolio->is_default) {
            $request->user()->portfolios()
                ->where('id', '!=', $portfolio->id)
                ->update(['is_default' => false]);
        }

        $portfolio->update([
            'name' => $request->name,
            'is_default' => $isDefault,
            'is_public' => $request->is_public ?? false,
        ]);

        $portfolio->load('investments');

        return response()->json([
            'message' => 'Cartera actualizada.',
            'portfolio' => $this->portfolioSummary($portfolio, true),
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $portfolio = $request->user()->portfolios()->findOrFail($id);

        $portfolio->investments()->delete();
        $portfolio->delete();

        return response()->json([
            'message' => 'Cartera eliminada.',
        ]);
    }

    private function activeInvestments(Collection $investments): Collection
    {
        return $investments->filter(fn ($inv) => (float) $inv->quantity > 0);
    }

    private function portfolioValue(Collection $investments): float
    {
        return (float) $investments->sum(fn ($inv) => (float) $inv->quantity * (float) $inv->avg_buy_price);
    }

    private function portfolioSummary(Portfolio $portfolio, bool $includeMetrics): array
    {
        $investments = $portfolio->investments ?? collect();
        $active = $this->activeInvestments($investments);

        $row = [
            'id' => $portfolio->id,
            'name' => $portfolio->name,
            'is_default' => (bool) $portfolio->is_default,
            'is_public' => (bool) $portfolio->is_public,
            'created_at' => $portfolio->created_at,
            'updated_at' => $portfolio->updated_at,
        ];

        if ($includeMetrics) {
            $row['asset_count'] = $active->count();
            $row['total_value'] = round($this->portfolioValue($investments), 2);
        } else {
            $row['asset_count'] = 0;
            $row['total_value'] = 0;
        }

        return $row;
    }

    private function publicRankingRow(Portfolio $portfolio): array
    {
        $user = $portfolio->user;
        $investments = $portfolio->investments ?? collect();
        $active = $this->activeInvestments($investments);

        return [
            'id' => $portfolio->id,
            'name' => $portfolio->name,
            'owner_name' => $user->name,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'avatar' => $user->avatar,
            ],
            'asset_count' => $active->count(),
            'total_value' => round($this->portfolioValue($investments), 2),
            'created_at' => $portfolio->created_at,
            'updated_at' => $portfolio->updated_at,
        ];
    }
}