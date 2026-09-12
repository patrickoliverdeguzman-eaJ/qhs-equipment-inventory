<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Equipment extends Model
{
    use HasFactory;

    protected $table = 'equipment';

    protected $casts = [
        'isActive' => 'boolean',
    ];

    protected $fillable = [
        'name',
        'image',
        'description',
        'laboratory_id',
        'isActive',
    ];

    public function categories(): BelongsToMany
    {
        return $this->belongsToMany(
            Category::class,
            'equipment_categories',
            'equipment_id',
            'category_id'
        );
    }

    public function items(): HasMany
    {
        return $this->hasMany(EquipmentItem::class, 'equipment_id');
    }

    public function transactions(): BelongsToMany
    {
        return $this->belongsToMany(Transaction::class, 'transaction_items')
            ->withPivot('quantity')
            ->withTimestamps();
    }

    public function laboratory(): BelongsTo
    {
        return $this->belongsTo(Laboratory::class);
    }
}
