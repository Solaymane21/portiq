<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('alerts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('symbol_id')->constrained('symbols')->onDelete('cascade');
            $table->decimal('target_price', 20, 8);
            $table->boolean('is_active')->default(true);
            $table->boolean('triggered')->default(false);
            $table->string('condition');
            $table->timestamp('triggered_at')->nullable(); 
            $table->timestamp('created_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('alerts');
    }
};