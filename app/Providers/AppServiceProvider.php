<?php

namespace App\Providers;

use App\Models\Equipment;
use App\Models\Laboratory;
use App\Models\MaintenanceWorkOrder;
use App\Models\Transaction;
use App\Policies\EquipmentPolicy;
use App\Policies\LaboratoryPolicy;
use App\Policies\MaintenanceWorkOrderPolicy;
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
        Gate::policy(MaintenanceWorkOrder::class, MaintenanceWorkOrderPolicy::class);
        Gate::policy(Transaction::class, TransactionPolicy::class);

        RateLimiter::for('login', fn (Request $request): array => [
            Limit::perMinute(5)->by('login-account:'.$this->emailKey($request).'|'.$request->ip()),
            Limit::perMinute(30)->by('login-network:'.$request->ip()),
        ]);

        RateLimiter::for('registration', fn (Request $request): array => [
            Limit::perHour(5)->by('registration-network:'.$request->ip()),
            Limit::perDay(20)->by('registration-network-daily:'.$request->ip()),
        ]);

        RateLimiter::for('password-recovery', fn (Request $request): array => [
            Limit::perHour(3)->by('password-account:'.$this->emailKey($request)),
            Limit::perHour(10)->by('password-network:'.$request->ip()),
        ]);

        RateLimiter::for('password-reset', fn (Request $request): array => [
            Limit::perMinute(5)->by('password-reset-account:'.$this->emailKey($request).'|'.$request->ip()),
            Limit::perMinute(30)->by('password-reset-network:'.$request->ip()),
        ]);

        RateLimiter::for('verification-resend', fn (Request $request): array => [
            Limit::perHour(3)->by('verification-account:'.$this->emailKey($request)),
            Limit::perHour(10)->by('verification-network:'.$request->ip()),
        ]);

        RateLimiter::for('verification', fn (Request $request): Limit => Limit::perMinute(12)->by($request->ip()));

        RateLimiter::for('imports', fn (Request $request): Limit => Limit::perMinute(2)
            ->by('equipment-import:'.($request->user()?->id ?? $request->ip())));
    }

    private function emailKey(Request $request): string
    {
        return hash('sha256', strtolower(trim((string) $request->input('email'))));
    }
}
