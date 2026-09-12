<?php

namespace App\Events;

use App\Http\Resources\TransactionResource;
use App\Models\Transaction;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TransactionUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public array $transaction;

    public function __construct(Transaction $transaction)
    {
        $transaction->loadMissing([
            'borrower:id,name,email,avatar',
            'laboratory:id,name',
            'equipment:id,name',
            'assignedItems:id,equipment_id,unit_id,condition',
        ]);

        $this->transaction = (new TransactionResource($transaction))->resolve();
    }

    /** @return list<PrivateChannel> */
    public function broadcastOn(): array
    {
        $channels = [
            new PrivateChannel('transactions.admin'),
            new PrivateChannel('transactions.lab.'.$this->transaction['laboratory_id']),
        ];

        if ($this->transaction['borrower_id']) {
            $channels[] = new PrivateChannel('transactions.user.'.$this->transaction['borrower_id']);
        }

        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'transaction.updated';
    }
}
