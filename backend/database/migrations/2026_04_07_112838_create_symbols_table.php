<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('symbols', function (Blueprint $table) {
            $table->id();
            $table->string('symbol')->unique();
            $table->string('name');
            $table->decimal('current_price', 20, 8);
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_updated')->nullable();
            $table->string('asset_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('symbols');
    }
};