<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InvestorProfile extends Model
{
    protected $fillable = [
        'user_id',
        'profile_type',
        'total_score',
        'raw_answers',
    ];

    protected $casts = [
        'raw_answers'   => 'array',
        'total_score'   => 'integer',
        'profile_type'  => 'string'
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}