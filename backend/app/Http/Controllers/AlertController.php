<?php

namespace App\Http\Controllers;

use App\Models\Alert;
use App\Models\Symbol;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AlertController extends Controller
{
    use AuthorizesRequests;
    public function index(Request $request): JsonResponse
    {
        $alerts = $request->user()
            ->alerts()
            ->with('symbol')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn($a) => $this->format($a));

        return response()->json($alerts);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'symbol'  => 'required|string|max:20',
            'name' => 'required|string|max:100',
            'asset_type' => 'required|in:stock,crypto,etf',
            'api_id' => 'nullable|string|max:100',
            'image_url' => 'nullable|url',
            'target_price' => 'required|numeric|min:0',
            'condition' => 'required|in:above,below',
        ]);

        $symbol = Symbol::firstOrCreate(
            ['symbol' => strtoupper($data['symbol'])],
            [
                'name' => $data['name'],
                'asset_type' => $data['asset_type'],
                'api_id' => $data['api_id'] ?? null,
                'image_url' => $data['image_url'] ?? null,
            ]
        );

        $alert = $request->user()->alerts()->create([
            'symbol_id'=> $symbol->id,
            'target_price' => $data['target_price'],
            'condition' => $data['condition'],
        ]);

        $alert->load('symbol');
        $alert->refresh();

        return response()->json($this->format($alert), 201);
    }

    public function update(Request $request, Alert $alert): JsonResponse
    {
        $this->authorize('update', $alert);

        $validated = $request->validate([
            'target_price' => 'sometimes|numeric|min:0',
            'condition' => 'sometimes|in:above,below',
            'is_active' => 'sometimes|boolean',
        ]);

        $alert->update($validated);
        $alert->load('symbol');  

        return response()->json($this->format($alert));
    }

    public function destroy(Request $request, Alert $alert): JsonResponse
    {
        $this->authorize('delete', $alert);
        $alert->delete();

        return response()->json(null, 204);
    }

    private function format(Alert $alert): array
    {
        return [
            'id' => $alert->id,
            'symbol' => $alert->symbol->symbol,
            'name' => $alert->symbol->name,
            'asset_type' => $alert->symbol->asset_type,
            'image_url' => $alert->symbol->image_url,
            'target_price' => $alert->target_price,
            'condition'=> $alert->condition,
            'is_active' => $alert->is_active,
            'created_at' => ($alert->created_at ?? now())->toISOString()
        ];
    }
}