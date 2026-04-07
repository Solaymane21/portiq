<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('investor_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('risk_tolerance');
            $table->string('investment_horizon');
            $table->decimal('monthly_income', 15, 2);
            $table->decimal('monthly_expense', 15, 2);
            $table->decimal('savings_capacity', 15, 2);
            $table->string('profile_type');
            $table->decimal('ml_confidence', 5, 4);
            $table->timestamp('created_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('investor_profiles');
    }
};