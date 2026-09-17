<?php

namespace App\Models;

use App\Enums\MaintenancePriority;
use App\Enums\MaintenanceStatus;
use App\Enums\MaintenanceType;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MaintenanceWorkOrder extends Model
{
    use HasFactory;

    protected $fillable = [
        'equipment_item_id',
        'laboratory_id',
        'source_transaction_id',
        'type',
        'status',
        'priority',
        'title',
        'description',
        'condition_before',
        'assigned_to_id',
        'assigned_to_name',
        'reported_by_id',
        'reported_by_name',
        'scheduled_at',
        'due_at',
        'started_at',
        'completed_at',
        'service_provider',
        'estimated_cost',
        'actual_cost',
        'completion_notes',
        'result_condition',
        'recurrence_interval_days',
        'next_due_at',
    ];

    protected function casts(): array
    {
        return [
            'type' => MaintenanceType::class,
            'status' => MaintenanceStatus::class,
            'priority' => MaintenancePriority::class,
            'scheduled_at' => 'datetime',
            'due_at' => 'datetime',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
            'next_due_at' => 'datetime',
            'estimated_cost' => 'decimal:2',
            'actual_cost' => 'decimal:2',
            'recurrence_interval_days' => 'integer',
        ];
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(EquipmentItem::class, 'equipment_item_id');
    }

    public function laboratory(): BelongsTo
    {
        return $this->belongsTo(Laboratory::class);
    }

    public function sourceTransaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class, 'source_transaction_id');
    }

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to_id');
    }

    public function reportedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by_id');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->whereIn('status', MaintenanceStatus::activeValues());
    }

    public function isOverdue(): bool
    {
        return in_array($this->status->value, MaintenanceStatus::activeValues(), true)
            && $this->due_at?->isPast();
    }
}
