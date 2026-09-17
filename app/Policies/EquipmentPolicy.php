<?php

namespace App\Policies;

use App\Models\Equipment;
use App\Models\User;

class EquipmentPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Equipment $equipment): bool
    {
        if ($user->isAdmin() || $user->role === 'user') {
            return $user->isAdmin() || (
                (bool) $equipment->isActive
                && (bool) $equipment->laboratory()->value('isActive')
            );
        }

        return $user->managesLaboratory($equipment->laboratory_id);
    }

    public function create(User $user): bool
    {
        return $user->isAdmin() || $user->isCustodian();
    }

    public function update(User $user, Equipment $equipment): bool
    {
        return $user->isAdmin() || $user->managesLaboratory($equipment->laboratory_id);
    }

    public function delete(User $user, Equipment $equipment): bool
    {
        return $user->isAdmin();
    }

    public function manageItems(User $user, Equipment $equipment): bool
    {
        return $user->isAdmin() || $user->managesLaboratory($equipment->laboratory_id);
    }
}
