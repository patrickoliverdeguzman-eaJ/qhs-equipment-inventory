<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

class Laboratory extends Model
{
    use HasFactory;

    protected $table = 'laboratories';

    protected $fillable = [
        'name',
        'location',
        'description',
        'isActive',
        'gallery',
    ];

    protected $casts = [
        'isActive' => 'boolean',
    ];

    public function custodians(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'custodian_laboratory')
            ->withTimestamps();
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }

    public function equipment(): HasMany
    {
        return $this->hasMany(Equipment::class);
    }

    public function items(): HasManyThrough
    {
        return $this->hasManyThrough(
            EquipmentItem::class,
            Equipment::class,
            'laboratory_id',
            'equipment_id',
        );
    }

    public function maintenanceWorkOrders(): HasMany
    {
        return $this->hasMany(MaintenanceWorkOrder::class);
    }
}
