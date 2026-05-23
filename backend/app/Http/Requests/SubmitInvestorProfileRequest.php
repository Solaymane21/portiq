<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SubmitInvestorProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'answers'   => ['required', 'array', 'size:9'],
            'answers.*' => ['required', 'integer', 'min:0', 'max:3'],
        ];
    }

    public function messages(): array
    {
        return [
            'answers.required' => 'Las respuestas son obligatorias.',
            'answers.size'     => 'Deben enviarse exactamente 9 respuestas.',
            'answers.*.min'    => 'Cada respuesta debe ser un valor entre 0 y 3.',
            'answers.*.max'    => 'Cada respuesta debe ser un valor entre 0 y 3.',
        ];
    }
}