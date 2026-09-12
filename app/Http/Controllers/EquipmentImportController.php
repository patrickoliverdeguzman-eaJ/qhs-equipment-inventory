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

    public function import(Request $request)
    {
        $data = $request->input('data', []);
        if (empty($data) || ! is_array($data)) {
            return response()->json([
                'success' => false,
                'message' => 'No valid data provided.',
            ], 400);
        }

        if (count($data) > 500) {
            return response()->json([
                'success' => false,
                'message' => 'Import files are limited to 500 rows.',
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

                // Normalize input
                $payload = [
                    'name' => trim($row['name'] ?? ''),
                    'description' => trim($row['description'] ?? ''),
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
                    'laboratory_id' => 'required|exists:laboratories,id',
                    'quantity' => 'required|integer|min:1|max:1000',
                    'isActive' => 'boolean',
                    'category_ids' => 'nullable|array',
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

                // Create Equipment Items
                for ($i = 1; $i <= $payload['quantity']; $i++) {
                    EquipmentItem::create([
                        'equipment_id' => $equipment->id,
                        'unit_id' => EquipmentItem::generateUnitId($equipment->id),
                        'condition' => 'Good',
                        'isBorrowed' => false,
                    ]);
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
