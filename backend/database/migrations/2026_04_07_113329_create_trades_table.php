<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('trades', function (Blueprint $table) {
            $table->id();
            $table->foreignId('investment_id')->constrained('investments')->onDelete('cascade');
            $table->decimal('quantity', 20, 8);
            $table->decimal('price_per_unit', 20, 8);
            $table->string('type');
            $table->timestamp('operated_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('trades');
    }
};