<?php

namespace App\Http\Controllers;

use App\Http\Requests\SubmitInvestorProfileRequest;
use App\Models\InvestorProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class InvestorProfileController extends Controller
{
    private array $profileData = [
        'conservador' => [
            'label'       => 'Conservador',
            'description' => 'Priorizas la seguridad de tu capital por encima del rendimiento. Prefieres instrumentos de bajo riesgo con retornos predecibles y estables.',
        ],
        'moderado' => [
            'label'       => 'Moderado',
            'description' => 'Buscas un equilibrio entre seguridad y crecimiento. Aceptas cierta volatilidad a corto plazo para obtener mejores rendimientos a medio-largo plazo.',
        ],
        'agresivo' => [
            'label'       => 'Agresivo',
            'description' => 'Tienes alta tolerancia al riesgo y buscas maximizar el crecimiento a largo plazo. Aceptas volatilidad significativa con visión de horizonte amplio.',
        ],
    ];

    public function store(SubmitInvestorProfileRequest $request): JsonResponse
    {
        $answers     = $request->validated()['answers'];
        $totalScore  = array_sum($answers);
        $profileType = $this->classifyByScore($totalScore);
        $user        = Auth::user();

        $profile = InvestorProfile::updateOrCreate(
            ['user_id' => $user->id],
            [
                'profile_type' => $profileType,
                'total_score'  => $totalScore,
                'raw_answers'  => $answers,
            ]
        );

        $data = $this->profileData[$profileType];

        return response()->json([
            'profile'      => $profileType,
            'label'        => $data['label'],
            'score'        => $totalScore,
            'max_score'    => 27,
            'description'  => $data['description'],
            'answers'      => $answers,
            'completed_at' => $profile->updated_at,
        ]);
    }

    public function show(): JsonResponse
    {
        $user = Auth::user();
        $profile = InvestorProfile::where('user_id', $user->id)->first();

        if (!$profile) {
            return response()->json(['message' => 'Perfil no encontrado.'], 404);
        }

        $data = $this->profileData[$profile->profile_type];

        return response()->json([
            'profile'      => $profile->profile_type,
            'label'        => $data['label'],
            'score'        => $profile->total_score,
            'max_score'    => 27,
            'description'  => $data['description'],
            'answers'      => $profile->raw_answers,
            'completed_at' => $profile->updated_at,
        ]);
    }

    private function classifyByScore(int $score): string
    {
        return match (true) {
            $score <= 9  => 'conservador',
            $score <= 18 => 'moderado',
            default      => 'agresivo',
        };
    }
}