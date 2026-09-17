<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Transaction extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'borrower_id',
        'borrower_name',
        'borrower_email',
        'borrower_contact',
        'laboratory_id',
        'borrow_date',
        'return_date',
        'notes',
        'status',
        'accepted_at',
        'accepted_by_id',
        'issued_at',
        'issued_by_id',
        'issued_by_name',
        'issue_notes',
        'returned_at',
        'returned_by_id',
        'rejected_at',
        'rejected_by_id',
        'accepted_by_name',
        'returned_by_name',
        'rejected_by_name',
        'rejection_reason',
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'borrow_date' => 'datetime',
        'return_date' => 'datetime',
        'accepted_at' => 'datetime',
        'issued_at' => 'datetime',
        'returned_at' => 'datetime',
        'rejected_at' => 'datetime',
        'status' => 'string',
    ];

    /**
     * Mutator: Store borrow_date as start of day (00:00:00)
     */
    public function setBorrowDateAttribute($value)
    {
        $this->attributes['borrow_date'] = $value
            ? Carbon::parse($value)->startOfDay()
            : null;
    }

    /**
     * Mutator: Store return_date as end of day (23:59:59)
     * This ensures the item is considered due until the very end of the selected date.
     */
    public function setReturnDateAttribute($value)
    {
        $this->attributes['return_date'] = $value
            ? Carbon::parse($value)->endOfDay()
            : null;
    }

    /**
     * Accessor: Return only the date (Y-m-d) in API responses
     */
    public function getBorrowDateAttribute($value)
    {
        if (! $value) {
            return null;
        }

        // Handle both Carbon instance and raw string
        return Carbon::parse($value)->format('Y-m-d');
    }

    /**
     * Accessor: Return only the date (Y-m-d) in API responses
     */
    public function getReturnDateAttribute($value)
    {
        if (! $value) {
            return null;
        }

        return Carbon::parse($value)->format('Y-m-d');
    }

    /**
     * Get the borrower (user) who made the transaction.
     */
    public function borrower(): BelongsTo
    {
        return $this->belongsTo(User::class, 'borrower_id');
    }

    /**
     * Get the laboratory where equipment was borrowed.
     */
    public function laboratory(): BelongsTo
    {
        return $this->belongsTo(Laboratory::class);
    }

    /**
     * Get all assigned individual equipment items (specific physical units).
     */
    public function assignedItems(): BelongsToMany
    {
        return $this->belongsToMany(EquipmentItem::class, 'transaction_equipment_items')
            ->withPivot([
                'id',
                'issued_at',
                'condition_at_issue',
                'returned_at',
                'condition_at_return',
                'return_notes',
                'returned_by_id',
                'returned_by_name',
            ])
            ->withTimestamps();
    }

    /** Each physical-unit custody record for this transaction. */
    public function assignments(): HasMany
    {
        return $this->hasMany(TransactionEquipmentItem::class);
    }

    public function maintenanceWorkOrders(): HasMany
    {
        return $this->hasMany(MaintenanceWorkOrder::class, 'source_transaction_id');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'accepted_by_id');
    }

    public function issuedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'issued_by_id');
    }

    public function returnedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'returned_by_id');
    }

    public function rejectedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rejected_by_id');
    }

    /** Get the requested equipment types and quantities. */
    public function equipment(): BelongsToMany
    {
        return $this->belongsToMany(Equipment::class, 'transaction_items')
            ->withPivot('quantity')
            ->withTimestamps();
    }

    /**
     * Scope: Pending transactions
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope: Borrowed (active) transactions
     */
    public function scopeBorrowed($query)
    {
        return $query->where('status', 'borrowed');
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    /**
     * Scope: Returned transactions
     */
    public function scopeReturned($query)
    {
        return $query->where('status', 'returned');
    }

    /**
     * Scope: Rejected transactions
     */
    public function scopeRejected($query)
    {
        return $query->where('status', 'rejected');
    }

    /**
     * Check if the transaction is overdue.
     * Works correctly because return_date is stored as end of day (23:59:59).
     */
    public function isOverdue(): bool
    {
        return $this->status === 'borrowed'
            && $this->issued_at !== null
            && $this->return_date !== null
            && $this->assignments()->whereNotNull('issued_at')->whereNull('returned_at')->exists()
            && now()->greaterThan(Carbon::parse($this->return_date)->endOfDay());
    }
}
