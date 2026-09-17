<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected $table = 'users';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'avatar',
        'isActive',
        'address',
        'phone_number',
        'email_verified_at',
        'email_verification_token',
        'email_verification_expires_at',
        'reset_token',
        'reset_token_expires_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'email_verification_token',
        'reset_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'isActive' => 'boolean',
            'reset_token_expires_at' => 'datetime',
            'email_verification_expires_at' => 'datetime',
        ];
    }

    public function laboratories(): BelongsToMany
    {
        return $this->belongsToMany(Laboratory::class, 'custodian_laboratory')
            ->withTimestamps();
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class, 'borrower_id');
    }

    public function assignedMaintenanceWorkOrders(): HasMany
    {
        return $this->hasMany(MaintenanceWorkOrder::class, 'assigned_to_id');
    }

    public function reportedMaintenanceWorkOrders(): HasMany
    {
        return $this->hasMany(MaintenanceWorkOrder::class, 'reported_by_id');
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isCustodian(): bool
    {
        return $this->role === 'custodian';
    }

    public function managesLaboratory(int $laboratoryId): bool
    {
        return $this->isAdmin()
            || ($this->isCustodian() && $this->laboratories()->whereKey($laboratoryId)->exists());
    }
}
