<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Symbol extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'symbol',
        'name',
        'image_url', 
        'last_updated',
        'asset_type'
    ];

    public function investments() {
        return $this->hasMany(Investment::class);
    }
}