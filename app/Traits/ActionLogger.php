<?php

namespace App\Traits;

use App\Models\ActionLog;
use App\Models\Category;
use App\Models\Equipment;
use App\Models\EquipmentItem;
use App\Models\Laboratory;
use App\Models\Transaction;
use App\Models\User;

trait ActionLogger
{
    protected function logAction(string $action, array $meta = [])
    {
        try {
            $req = request();

            // Enrich meta with friendly names where possible to avoid later lookups
            $enriched = $meta;

            if (! empty($meta['category_id'])) {
                try {
                    $enriched['category_name'] = Category::find($meta['category_id'])->name ?? null;
                } catch (\Exception $e) {
                }
            }
            if (! empty($meta['equipment_id'])) {
                try {
                    $enriched['equipment_name'] = Equipment::find($meta['equipment_id'])->name ?? null;
                } catch (\Exception $e) {
                }
            }
            if (! empty($meta['item_id'])) {
                try {
                    $enriched['item_unit'] = EquipmentItem::find($meta['item_id'])->unit_id ?? null;
                } catch (\Exception $e) {
                }
            }
            if (! empty($meta['laboratory_id'])) {
                try {
                    $enriched['laboratory_name'] = Laboratory::find($meta['laboratory_id'])->name ?? null;
                } catch (\Exception $e) {
                }
            }
            if (! empty($meta['user_id'])) {
                try {
                    $enriched['user_name'] = User::find($meta['user_id'])->name ?? null;
                } catch (\Exception $e) {
                }
            }
            if (! empty($meta['transaction_id'])) {
                try {
                    $enriched['transaction_borrower'] = Transaction::find($meta['transaction_id'])->borrower_name ?? null;
                } catch (\Exception $e) {
                }
            }

            ActionLog::create([
                'user_id' => auth()->id(),
                'action' => $action,
                'method' => $req->method(),
                'route' => $req->path(),
                'ip' => $req->ip(),
                'user_agent' => substr($req->userAgent() ?? '', 0, 1000),
                'meta' => $enriched,
            ]);
        } catch (\Exception $e) {
            \Log::warning('ActionLogger failed: '.$e->getMessage());
        }
    }
}
