<?php

namespace App\Http\Controllers;

use App\Models\Equipment;
use App\Models\InventorySnapshot;
use App\Models\SystemSetting;
use App\Services\InventorySnapshotService;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class InventorySnapshotController extends Controller
{
    public function __construct(private readonly InventorySnapshotService $snapshots) {}

    public function getSnapshotsByDateRange(Request $request)
    {
        $validated = $this->validateSnapshotRange($request, withLaboratory: true);
        $query = InventorySnapshot::query()
            ->whereBetween('snapshot_date', [$validated['start_date'], $validated['end_date']])
            ->with(['equipment', 'laboratory'])
            ->orderByDesc('snapshot_date')
            ->orderBy('equipment_id');

        $laboratoryId = isset($validated['laboratory_id'])
            ? (int) $validated['laboratory_id']
            : null;
        $this->scopeToUser($query, $request, $laboratoryId);

        return response()->json($query->limit(50_000)->get());
    }

    public function getEquipmentTrend(Request $request, Equipment $equipment)
    {
        $validated = $this->validateSnapshotRange($request);

        if ($request->user()->isCustodian() && ! $request->user()->managesLaboratory($equipment->laboratory_id)) {
            abort(403);
        }

        $data = InventorySnapshot::query()
            ->where('equipment_id', $equipment->id)
            ->whereBetween('snapshot_date', [$validated['start_date'], $validated['end_date']])
            ->with('laboratory')
            ->orderBy('snapshot_date')
            ->get()
            ->groupBy(fn (InventorySnapshot $snapshot) => $snapshot->laboratory->name);

        $result = [];
        foreach ($data as $labName => $snapshots) {
            $result[$labName] = $snapshots->map(fn (InventorySnapshot $snapshot) => [
                'date' => $snapshot->snapshot_date->format('Y-m-d'),
                'total_items' => $snapshot->total_items,
                'borrowed_count' => $snapshot->borrowed_count,
                'available_count' => $snapshot->available_count,
            ])->values();
        }

        return response()->json($result);
    }

    public function exportCSV(Request $request)
    {
        try {
            $validated = $this->validateSnapshotRange($request, withLaboratory: true);
            $query = DB::table('inventory_snapshots as snapshots')
                ->join('equipment', 'equipment.id', '=', 'snapshots.equipment_id')
                ->join('laboratories', 'laboratories.id', '=', 'snapshots.laboratory_id')
                ->whereBetween('snapshots.snapshot_date', [$validated['start_date'], $validated['end_date']])
                ->select([
                    'snapshots.snapshot_date',
                    'laboratories.name as laboratory_name',
                    'equipment.name as equipment_name',
                    'snapshots.total_items',
                    'snapshots.borrowed_count',
                    'snapshots.available_count',
                ])
                ->orderByDesc('snapshots.snapshot_date')
                ->orderBy('laboratories.name')
                ->orderBy('equipment.name');

            if ($request->user()->isCustodian()) {
                $query->whereExists(function ($subquery) use ($request) {
                    $subquery->selectRaw('1')
                        ->from('custodian_laboratory')
                        ->whereColumn('custodian_laboratory.laboratory_id', 'snapshots.laboratory_id')
                        ->where('custodian_laboratory.user_id', $request->user()->id);
                });
            } elseif (! empty($validated['laboratory_id'])) {
                $query->where('snapshots.laboratory_id', $validated['laboratory_id']);
            }

            $recordCount = (clone $query)->count();
            if ($recordCount === 0) {
                return response()->json(['error' => 'No snapshots found for the given date range'], 404);
            }

            return response()->streamDownload(function () use ($query, $validated, $recordCount) {
                $output = fopen('php://output', 'wb');
                fwrite($output, "\xEF\xBB\xBF");
                fputcsv($output, ['Inventory Snapshots Report']);
                fputcsv($output, []);
                fputcsv($output, ['Date', 'Laboratory', 'Equipment', 'Total Items', 'Borrowed Count', 'Available Count']);

                foreach ($query->cursor() as $snapshot) {
                    $row = [
                        $snapshot->snapshot_date,
                        $snapshot->laboratory_name,
                        $snapshot->equipment_name,
                        $snapshot->total_items,
                        $snapshot->borrowed_count,
                        $snapshot->available_count,
                    ];
                    fputcsv($output, array_map(fn ($value) => $this->safeCsvValue($value), $row));
                }

                fputcsv($output, []);
                fputcsv($output, ['SUMMARY']);
                fputcsv($output, ['Total Records', $recordCount]);
                fputcsv($output, ['Date Range', "{$validated['start_date']} to {$validated['end_date']}"]);
                fclose($output);
            }, 'inventory_snapshots_'.now()->format('Y-m-d').'.csv', [
                'Content-Type' => 'text/csv; charset=utf-8',
            ]);
        } catch (ValidationException $exception) {
            throw $exception;
        } catch (\Throwable $exception) {
            Log::error('Inventory snapshot export failed.', ['exception' => $exception]);

            return response()->json(['error' => 'The report could not be exported.'], 500);
        }
    }

    public function getSnapshotSettings()
    {
        return response()->json([
            'snapshot_time' => SystemSetting::get('daily_inventory_snapshot_time', '23:59'),
        ]);
    }

    public function updateSnapshotSettings(Request $request)
    {
        $validated = $request->validate(['snapshot_time' => ['required', 'date_format:H:i']]);
        SystemSetting::set('daily_inventory_snapshot_time', $validated['snapshot_time']);

        return response()->json(['message' => 'Settings updated successfully']);
    }

    public function triggerSnapshot()
    {
        try {
            $count = $this->snapshots->capture();

            return response()->json(['message' => "Snapshot created with {$count} records."]);
        } catch (\Throwable $exception) {
            Log::error('Inventory snapshot trigger failed.', ['exception' => $exception]);

            return response()->json(['error' => 'The snapshot could not be created.'], 500);
        }
    }

    /** @return array<string, mixed> */
    private function validateSnapshotRange(Request $request, bool $withLaboratory = false): array
    {
        $rules = [
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
        ];
        if ($withLaboratory) {
            $rules['laboratory_id'] = ['nullable', 'integer', 'exists:laboratories,id'];
        }

        $validated = $request->validate($rules);
        if (Carbon::parse($validated['start_date'])->diffInDays(Carbon::parse($validated['end_date'])) > 366) {
            throw ValidationException::withMessages([
                'end_date' => ['Choose a date range of 366 days or less.'],
            ]);
        }

        return $validated;
    }

    private function scopeToUser(Builder $query, Request $request, ?int $laboratoryId): void
    {
        if ($request->user()->isCustodian()) {
            $query->whereHas(
                'laboratory.custodians',
                fn (Builder $builder) => $builder->whereKey($request->user()->id),
            );
        } elseif ($laboratoryId) {
            $query->where('laboratory_id', $laboratoryId);
        }
    }

    private function safeCsvValue(mixed $value): mixed
    {
        return is_string($value) && preg_match('/^[\s]*[=+\-@]/', $value)
            ? "'{$value}"
            : $value;
    }
}
