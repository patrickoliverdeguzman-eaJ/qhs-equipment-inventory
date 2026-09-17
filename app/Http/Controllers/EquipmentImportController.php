<?php

namespace App\Http\Controllers;

use App\Models\Equipment;
use App\Models\EquipmentItem;
use App\Traits\ActionLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class EquipmentImportController extends Controller
{
    use ActionLogger;

    private const MAX_ROWS = 500;

    private const MAX_TOTAL_UNITS = 5000;

    private const MAX_REQUEST_BYTES = 2_000_000;

    public function import(Request $request)
    {
        $contentLength = (int) $request->server('CONTENT_LENGTH', 0);

        if ($contentLength > self::MAX_REQUEST_BYTES) {
            return response()->json([
                'success' => false,
                'message' => 'Import requests are limited to 2 MB.',
            ], 413);
        }

        $data = $request->input('data', []);
        if (empty($data) || ! is_array($data)) {
            return response()->json([
                'success' => false,
                'message' => 'No valid data provided.',
            ], 400);
        }

        if (count($data) > self::MAX_ROWS) {
            return response()->json([
                'success' => false,
                'message' => 'Import files are limited to '.self::MAX_ROWS.' rows.',
            ], 422);
        }

        $requestedUnits = collect($data)->sum(function ($row): int {
            if (! is_array($row)) {
                return 0;
            }

            $quantity = filter_var($row['quantity'] ?? null, FILTER_VALIDATE_INT, [
                'options' => ['min_range' => 1, 'max_range' => 1000],
            ]);

            return $quantity === false ? 0 : $quantity;
        });

        if ($requestedUnits > self::MAX_TOTAL_UNITS) {
            return response()->json([
                'success' => false,
                'message' => 'One import can create at most '.self::MAX_TOTAL_UNITS.' inventory units.',
            ], 422);
        }

        // Custodian restriction: resolve their assigned lab once
        $custodianLabId = null;
        if (auth()->user()->role === 'custodian') {
            $lab = auth()->user()->laboratories()->first();
            if (! $lab) {
                return response()->json(['success' => false, 'message' => 'No laboratory is assigned to your account.'], 403);
            }
            $custodianLabId = $lab->id;
        }

        $success = [];
        $failed = [];

        DB::beginTransaction();
        try {
            foreach ($data as $index => $row) {
                $rowNumber = $index + 2; // Excel row (1-based + header)

                if (! is_array($row)) {
                    $failed[] = [
                        'row' => $rowNumber,
                        'data' => $row,
                        'errors' => ['Each import row must be an object.'],
                    ];

                    continue;
                }

                // Normalize input
                $payload = [
                    'name' => is_scalar($row['name'] ?? null) ? trim((string) $row['name']) : $row['name'] ?? null,
                    'description' => is_scalar($row['description'] ?? null) ? trim((string) $row['description']) : $row['description'] ?? null,
                    // Custodians: always force their own lab; admins: use value from file
                    'laboratory_id' => $custodianLabId ?? (int) ($row['laboratory_id'] ?? 0),
                    'quantity' => (int) ($row['quantity'] ?? 0),
                    'isActive' => filter_var($row['isActive'] ?? $row['is_active'] ?? true, FILTER_VALIDATE_BOOLEAN),
                    'category_ids' => [],
                ];

                // Parse category_ids (can be comma-separated string or array)
                $catInput = $row['category_ids'] ?? $row['categories'] ?? '';
                if (is_string($catInput) && ! empty(trim($catInput))) {
                    $payload['category_ids'] = array_filter(array_map('intval', explode(',', $catInput)));
                } elseif (is_array($catInput)) {
                    $payload['category_ids'] = array_filter(array_map('intval', $catInput));
                }

                // Validation
                $validator = Validator::make($payload, [
                    'name' => 'required|string|max:255',
                    'description' => 'nullable|string|max:2000',
                    'laboratory_id' => 'required|exists:laboratories,id',
                    'quantity' => 'required|integer|min:1|max:1000',
                    'isActive' => 'boolean',
                    'category_ids' => 'nullable|array|max:50',
                    'category_ids.*' => 'exists:categories,id',
                ]);

                if ($validator->fails()) {
                    $failed[] = [
                        'row' => $rowNumber,
                        'data' => $row,
                        'errors' => $validator->errors()->all(),
                    ];

                    continue;
                }

                // Create Equipment
                $equipment = Equipment::create([
                    'name' => $payload['name'],
                    'description' => $payload['description'],
                    'laboratory_id' => $payload['laboratory_id'],
                    'isActive' => $payload['isActive'],
                    'image' => 'itemImage/No-image-default.png',
                ]);

                // Sync categories
                if (! empty($payload['category_ids'])) {
                    $equipment->categories()->sync($payload['category_ids']);
                }

                // Insert unit records in bounded chunks instead of issuing one query per unit.
                $now = now();
                $items = [];

                for ($i = 1; $i <= $payload['quantity']; $i++) {
                    $items[] = [
                        'equipment_id' => $equipment->id,
                        'unit_id' => sprintf('EQ%02d-%04d', $equipment->id, $i),
                        'condition' => 'Good',
                        'isBorrowed' => false,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }

                foreach (array_chunk($items, 500) as $chunk) {
                    EquipmentItem::query()->insert($chunk);
                }

                $success[] = [
                    'row' => $rowNumber,
                    'id' => $equipment->id,
                    'name' => $equipment->name,
                ];
            }

            DB::commit();

            // Clear cache — make sure this matches your route cache key!
            Cache::forget('equipment_data');
            Cache::forget('equipment_list'); // if you have multiple

            Log::info('Equipment Import Completed', [
                'success_count' => count($success),
                'failed_count' => count($failed),
            ]);

            $this->logAction('equipment_import', ['success_count' => count($success), 'failed_count' => count($failed)]);

            return response()->json([
                'message' => 'Import completed',
                'success' => $success,
                'failed' => $failed,
                'total' => count($data),
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Equipment Import Failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'The import could not be completed. No rows were saved.',
            ], 500);
        }
    }
}
