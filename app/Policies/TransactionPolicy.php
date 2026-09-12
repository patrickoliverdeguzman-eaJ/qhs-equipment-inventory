<?php

namespace App\Policies;

use App\Models\Transaction;
use App\Models\User;

class TransactionPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Transaction $transaction): bool
    {
        return $user->isAdmin()
            || $user->id === $transaction->borrower_id
            || $user->managesLaboratory($transaction->laboratory_id);
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Transaction $transaction): bool
    {
        if ($user->isAdmin() || $user->managesLaboratory($transaction->laboratory_id)) {
            return true;
        }

        return $user->id === $transaction->borrower_id
            && in_array($transaction->status, ['pending', 'rejected'], true);
    }

    public function delete(User $user, Transaction $transaction): bool
    {
        return $this->update($user, $transaction)
            && in_array($transaction->status, ['pending', 'rejected'], true);
    }

    public function process(User $user, Transaction $transaction): bool
    {
        return $user->isAdmin() || $user->managesLaboratory($transaction->laboratory_id);
    }
}
