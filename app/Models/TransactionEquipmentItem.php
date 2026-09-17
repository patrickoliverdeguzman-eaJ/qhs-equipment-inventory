<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransactionEquipmentItem extends Model
{
    protected $fillable = [
        'transaction_id',
        'equipment_item_id',
        'issued_at',
        'condition_at_issue',
        'returned_at',
        'condition_at_return',
        'return_notes',
        'returned_by_id',
        'returned_by_name',
    ];

    protected $casts = [
        'issued_at' => 'datetime',
        'returned_at' => 'datetime',
    ];

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(EquipmentItem::class, 'equipment_item_id');
    }

    public function returnedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'returned_by_id');
    }
}
