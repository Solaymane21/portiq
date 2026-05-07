<?php
namespace App\Policies;

use App\Models\Alert;
use App\Models\User;

class AlertPolicy
{
    public function update(User $user, Alert $alert): bool
    {
        return $user->id === $alert->user_id;
    }

    public function delete(User $user, Alert $alert): bool
    {
        return $user->id === $alert->user_id;
    }
}