<?php

namespace App\Policies;

use App\Models\MaintenanceWorkOrder;
use App\Models\User;

class MaintenanceWorkOrderPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isAdmin() || $user->isCustodian();
    }

    public function view(User $user, MaintenanceWorkOrder $workOrder): bool
    {
        return $user->isAdmin() || $user->managesLaboratory($workOrder->laboratory_id);
    }

    public function create(User $user): bool
    {
        return $user->isAdmin() || $user->isCustodian();
    }

    public function update(User $user, MaintenanceWorkOrder $workOrder): bool
    {
        return $this->view($user, $workOrder);
    }
}
