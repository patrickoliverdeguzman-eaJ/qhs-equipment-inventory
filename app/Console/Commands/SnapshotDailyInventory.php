<?php

namespace App\Console\Commands;

use App\Models\SystemSetting;
use App\Services\InventorySnapshotService;
use Illuminate\Console\Command;

class SnapshotDailyInventory extends Command
{
    protected $signature = 'inventory:snapshot {--force : Capture a snapshot regardless of the configured time}';

    protected $description = 'Capture the daily inventory snapshot';

    public function handle(InventorySnapshotService $snapshots): int
    {
        $configuredTime = SystemSetting::get('daily_inventory_snapshot_time', '23:59');

        if (! $this->option('force') && now()->format('H:i') !== $configuredTime) {
            return self::SUCCESS;
        }

        $count = $snapshots->capture();
        $this->info("Captured {$count} inventory snapshot records.");

        return self::SUCCESS;
    }
}
