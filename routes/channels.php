<?php

use App\Models\Laboratory;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function (User $user, int $id): bool {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('transactions.user.{id}', function (User $user, int $id): bool {
    return $user->role === 'admin' || $user->id === $id;
});

Broadcast::channel('transactions.lab.{laboratory}', function (User $user, Laboratory $laboratory): bool {
    return $user->isAdmin()
        || ($user->isCustodian() && $user->laboratories()->whereKey($laboratory->id)->exists());
});

Broadcast::channel('transactions.admin', function (User $user): bool {
    return $user->role === 'admin';
});
