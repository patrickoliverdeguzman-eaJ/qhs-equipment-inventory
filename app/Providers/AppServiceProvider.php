<?php

namespace App\Providers;

use App\Models\Equipment;
use App\Models\Laboratory;
use App\Models\Transaction;
use App\Policies\EquipmentPolicy;
use App\Policies\LaboratoryPolicy;
use App\Policies\TransactionPolicy;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Gate::policy(Equipment::class, EquipmentPolicy::class);
        Gate::policy(Laboratory::class, LaboratoryPolicy::class);
        Gate::policy(Transaction::class, TransactionPolicy::class);

        RateLimiter::for('auth', function (Request $request): Limit {
            return Limit::perMinute(6)->by(strtolower((string) $request->input('email')).'|'.$request->ip());
        });

        RateLimiter::for('verification', fn (Request $request): Limit => Limit::perMinute(6)->by($request->ip()));
    }
}
