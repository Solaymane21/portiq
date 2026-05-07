<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notification extends Model
{
    public $timestamps = false;
    const CREATED_AT = 'created_at';

    protected $fillable = [
        'user_id', 'alert_id', 'title', 'message', 'is_read',
    ];

    protected $casts = [
        'is_read'    => 'boolean',
        'created_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function alert(): BelongsTo
    {
        return $this->belongsTo(Alert::class);
    }
}