<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreEquipmentRequest;
use App\Http\Requests\UpdateEquipmentRequest;
use App\Http\Resources\EquipmentResource;
use App\Models\Category;
use App\Models\Equipment;
use App\Models\Laboratory;
use App\Traits\ActionLogger;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class EquipmentController extends Controller
{
    use ActionLogger;

    public function data(Request $request): array
    {
        $equipment = $this->visibleQuery($request)
            ->with(['categories:id,name', 'items:id,equipment_id,unit_id,condition,isBorrowed'])
            ->latest('id')
            ->limit(500)
            ->get();

        $laboratories = Laboratory::query()->select('id', 'name');

        if ($request->user()->isCustodian()) {
            $laboratories->whereHas('custodians', fn (Builder $query) => $query->whereKey($request->user()->id));
        } elseif ($request->user()->role === 'user') {
            $laboratories->where('isActive', true);
        }

        return [
            'equipment' => EquipmentResource::collection($equipment)->resolve(),
            'laboratories' => $laboratories->orderBy('name')->get(),
            'categories' => Category::query()->select('id', 'name')->orderBy('name')->get(),
        ];
    }

    public function index(Request $request)
    {
        $query = $this->visibleQuery($request)
            ->with(['categories:id,name', 'items:id,equipment_id,unit_id,condition,isBorrowed']);

        if ($request->filled('laboratory_id')) {
            $query->where('laboratory_id', $request->integer('laboratory_id'));
        }

        return EquipmentResource::collection($query->orderBy('name')->limit(500)->get());
    }

    public function show(Request $request, Equipment $equipment)
    {
        $this->authorize('view', $equipment);

        return new EquipmentResource($equipment->load(['categories:id,name', 'items']));
    }

    public function store(StoreEquipmentRequest $request)
    {
        $data = $request->validated();
        $categoryIds = Arr::pull($data, 'category_ids', []);
        $laboratory = Laboratory::findOrFail($data['laboratory_id']);

        if (! $request->user()->managesLaboratory($laboratory->id)) {
            abort(403, 'You may only add equipment to a laboratory assigned to you.');
        }

        $this->storeImage($request, $data);
        $data['image'] ??= 'itemImage/No-image-default.png';

        $equipment = DB::transaction(function () use ($data, $categoryIds) {
            $equipment = Equipment::create($data);
            $equipment->categories()->sync($categoryIds);

            return $equipment;
        });

        $this->logAction('equipment_created', ['equipment_id' => $equipment->id]);

        return (new EquipmentResource($equipment->load(['categories', 'items'])))
            ->response()
            ->setStatusCode(201);
    }

    public function update(UpdateEquipmentRequest $request, Equipment $equipment)
    {
        $data = $request->validated();
        $hasCategories = array_key_exists('category_ids', $data);
        $categoryIds = Arr::pull($data, 'category_ids', []);
        $removeImage = (bool) Arr::pull($data, 'remove_image', false);
        $oldImage = null;

        if (isset($data['laboratory_id']) && ! $request->user()->managesLaboratory((int) $data['laboratory_id'])) {
            abort(403, 'You may only move equipment to a laboratory assigned to you.');
        }

        if ($request->hasFile('image')) {
            $oldImage = $equipment->image;
            $this->storeImage($request, $data);
        } elseif ($removeImage) {
            $oldImage = $equipment->image;
            $data['image'] = null;
        }

        DB::transaction(function () use ($equipment, $data, $hasCategories, $categoryIds) {
            $equipment->update($data);

            if ($hasCategories) {
                $equipment->categories()->sync($categoryIds);
            }
        });

        $this->deleteManagedImage($oldImage);

        $this->logAction('equipment_updated', ['equipment_id' => $equipment->id]);

        return new EquipmentResource($equipment->fresh()->load(['categories', 'items']));
    }

    public function destroy(Equipment $equipment)
    {
        $this->authorize('delete', $equipment);

        if ($equipment->items()->exists() || $equipment->transactions()->exists()) {
            throw ValidationException::withMessages([
                'equipment' => ['Archive this equipment instead; it has inventory units or transaction history.'],
            ]);
        }

        $this->deleteManagedImage($equipment->image);
        $equipment->delete();
        $this->logAction('equipment_deleted', ['equipment_id' => $equipment->id]);

        return response()->noContent();
    }

    public function toggleActive(Equipment $equipment)
    {
        $this->authorize('delete', $equipment);

        if ($equipment->items()->where('isBorrowed', true)->exists()) {
            throw ValidationException::withMessages([
                'equipment' => ['Equipment with borrowed units cannot be archived.'],
            ]);
        }

        $equipment->update(['isActive' => ! $equipment->isActive]);
        $this->logAction('equipment_toggled_active', [
            'equipment_id' => $equipment->id,
            'isActive' => $equipment->isActive,
        ]);

        return response()->json([
            'message' => 'Equipment status updated.',
            'isActive' => $equipment->isActive,
        ]);
    }

    private function visibleQuery(Request $request): Builder
    {
        $query = Equipment::query();
        $user = $request->user();

        if ($user->isCustodian()) {
            $query->whereHas('laboratory.custodians', fn (Builder $builder) => $builder->whereKey($user->id));
        } elseif ($user->role === 'user') {
            $query->where('isActive', true)->whereHas('laboratory', fn (Builder $builder) => $builder->where('isActive', true));
        }

        return $query;
    }

    private function storeImage(Request $request, array &$data): void
    {
        if (! $request->hasFile('image')) {
            return;
        }

        $file = $request->file('image');
        $data['image'] = $file->storeAs('itemImage', Str::random(32).'.'.$file->extension(), 'public');
    }

    private function deleteManagedImage(?string $path): void
    {
        if ($path && $path !== 'itemImage/No-image-default.png') {
            Storage::disk('public')->delete($path);
        }
    }
}
