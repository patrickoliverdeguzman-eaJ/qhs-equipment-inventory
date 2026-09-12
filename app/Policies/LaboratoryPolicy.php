<?php

namespace App\Policies;

use App\Models\Laboratory;
use App\Models\User;

class LaboratoryPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Laboratory $laboratory): bool
    {
        return $user->isAdmin()
            || $user->role === 'user'
            || $user->managesLaboratory($laboratory->id);
    }

    public function create(User $user): bool
    {
        return $user->isAdmin();
    }

    public function update(User $user, Laboratory $laboratory): bool
    {
        return $user->isAdmin();
    }

    public function delete(User $user, Laboratory $laboratory): bool
    {
        return $user->isAdmin();
    }
}
