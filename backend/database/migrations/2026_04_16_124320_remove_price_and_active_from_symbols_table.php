<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('symbols', function (Blueprint $table) {
            $table->dropColumn(['current_price', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::table('symbols', function (Blueprint $table) {
            $table->decimal('current_price', 20, 8)->default(0);
            $table->boolean('is_active')->default(true);
        });
    }
};