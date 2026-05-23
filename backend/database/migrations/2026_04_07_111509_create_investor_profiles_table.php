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
            $table->string('profile_type');
            $table->integer('total_score');
            $table->json('raw_answers');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('investor_profiles');
    }
};