<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Favorite extends Model
{
    protected $table = 'tracking_lists';
    public $timestamps = false;

    protected $fillable = ['user_id', 'symbol_id'];

    public function symbol()
    {
        return $this->belongsTo(Symbol::class);
    }
}
