<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Trade extends Model
{
    use HasFactory;

    public $timestamps = false; 

    protected $fillable = [
        'investment_id',
        'quantity',
        'price_per_unit',
        'type',
        'operated_at',
    ];

    public function investment()
    {
        return $this->belongsTo(Investment::class);
    }
}