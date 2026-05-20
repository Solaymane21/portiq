<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Investment extends Model
{
    use HasFactory;
    protected $fillable = [
        'portfolio_id', 
        'symbol_id', 
        'quantity', 
        'avg_buy_price'
    ];

    public function portfolio() {
        return $this->belongsTo(Portfolio::class);
    }
    public function symbol() {
        return $this->belongsTo(Symbol::class);
    }

    public function trades() {
        return $this->hasMany(Trade::class);
    }
}