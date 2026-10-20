<?php

namespace App\Http\Controllers;

use App\Models\Portfolio;
use App\Services\PlanLimitService;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class PortfolioController extends Controller
{
    private PlanLimitService $planLimit;

    public function __construct(PlanLimitService $planLimit)
    {
        $this->planLimit = $planLimit;
    }

    public function publicRanking(Request $request)
    {
        $sort = (string) $request->query('sort', 'total_value');
        $order = strtolower((string) $request->query('order', 'desc')) === 'asc' ? 'asc' : 'desc';
        $search = (string) $request->query('q', '');

        $allowedSorts = ['total_value', 'asset_count', 'name', 'owner_name', 'created_at', 'updated_at'];
        if (!in_array($sort, $allowedSorts, true)) {
            $sort = 'total_value';
        }

        // Sacamos solo las carteras publicas
        $portfolios = Portfolio::query()
            ->where('is_public', true)
            ->with(['user:id,name,avatar', 'investments'])
            ->get();

        // Montamos las filas que usara el ranking
        $rows = $portfolios->map(function (Portfolio $portfolio) {
            return $this->publicRankingRow($portfolio);
        });

        // Si viene texto, filtramos por nombre de cartera o dueño
        if ($search !== '') {
            $needle = mb_strtolower($search);

            $rows = $rows->filter(function (array $row) use ($needle) {
                return str_contains(mb_strtolower($row['name']), $needle)
                    || str_contains(mb_strtolower($row['owner_name']), $needle);
            });
        }

        // Ordenamos segun lo que llegue en la query
        $rows = $order === 'desc'
            ? $rows->sortByDesc($sort)
            : $rows->sortBy($sort);

        return response()->json($rows->values());
    }

    public function follow(Request $request, $portfolioId)
    {
        // Solo se puede seguir una cartera publica que exista
        $portfolio = Portfolio::where('id', $portfolioId)
            ->where('is_public', true)
            ->firstOrFail();

        // No dejamos seguir tu propia cartera
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

        return response()->json([
            'message' => 'Has dejado de seguir la cartera.',
        ]);
    }

    public function index(Request $request)
    {
        $portfolios = $request->user()->portfolios()
            ->with('investments')
            ->orderByDesc('is_default')
            ->orderBy('created_at')
            ->get();

        $data = $portfolios->map(function (Portfolio $portfolio) {
            return $this->portfolioSummary($portfolio, true);
        });

        return response()->json($data);
    }

    public function store(Request $request)
    {
        // Miramos si el plan deja crear otra cartera
        $count = $request->user()->portfolios()->count();
        $check = $this->planLimit->check($request->user(), 'portfolios', $count);

        if (!$check['allowed']) {
            return response()->json([
                'message' => $check['message'],
                'code' => 'PLAN_LIMIT_EXCEEDED',
                'resource' => 'portfolios',
                'limit' => $check['limit'],
            ], 403);
        }

        $isDefault = $request->is_default ?? false;

        // Si esta sera la principal, quitamos esa marca al resto
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

        // Si ahora pasa a ser principal, quitamos la principal anterior
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

        $portfolio->load('investments');

        // El nombre va dentro de la respuesta cacheada de la cartera
        Cache::forget(InvestmentController::getPortfolioCacheKey($portfolio->id));

        return response()->json([
            'message' => 'Cartera actualizada.',
            'portfolio' => $this->portfolioSummary($portfolio, true),
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $portfolio = $request->user()->portfolios()->findOrFail($id);

        // Borramos primero lo relacionado y luego la cartera
        $portfolio->investments()->delete();
        $portfolio->delete();

        return response()->json([
            'message' => 'Cartera eliminada.',
        ]);
    }

    private function activeInvestments(Collection $investments): Collection
    {
        return $investments->filter(function ($investment) {
            return (float) $investment->quantity > 0;
        });
    }

    private function portfolioValue(Collection $investments): float
    {
        return (float) $investments->sum(function ($investment) {
            return (float) $investment->quantity * (float) $investment->avg_buy_price;
        });
    }

    private function portfolioSummary(Portfolio $portfolio, bool $includeMetrics): array
    {
        $investments = $portfolio->investments ?? collect();
        $activeInvestments = $this->activeInvestments($investments);

        $row = [
            'id' => $portfolio->id,
            'name' => $portfolio->name,
            'is_default' => (bool) $portfolio->is_default,
            'is_public' => (bool) $portfolio->is_public,
            'created_at' => $portfolio->created_at,
            'updated_at' => $portfolio->updated_at,
        ];

        if ($includeMetrics) {
            $row['asset_count'] = $activeInvestments->count();
            $row['total_value'] = round($this->portfolioValue($investments), 2);

            return $row;
        }

        $row['asset_count'] = 0;
        $row['total_value'] = 0;

        return $row;
    }

    private function publicRankingRow(Portfolio $portfolio): array
    {
        $user = $portfolio->user;
        $investments = $portfolio->investments ?? collect();
        $activeInvestments = $this->activeInvestments($investments);

        return [
            'id' => $portfolio->id,
            'name' => $portfolio->name,
            'owner_name' => $user->name,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'avatar' => $user->avatar,
            ],
            'asset_count' => $activeInvestments->count(),
            'total_value' => round($this->portfolioValue($investments), 2),
            'created_at' => $portfolio->created_at,
            'updated_at' => $portfolio->updated_at,
        ];
    }
}