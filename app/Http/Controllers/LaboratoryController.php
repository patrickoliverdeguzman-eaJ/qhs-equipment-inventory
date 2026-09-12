<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreLaboratoryRequest;
use App\Http\Requests\UpdateLaboratoryRequest;
use App\Http\Resources\LaboratoryResource;
use App\Models\Laboratory;
use App\Models\User;
use App\Traits\ActionLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LaboratoryController extends Controller
{
    use ActionLogger;

    public function index(Request $request)
    {
        $query = Laboratory::query()->with('custodians:id,name,email,role');
        $user = $request->user();

        if ($user->isCustodian()) {
            $query->whereHas('custodians', fn ($builder) => $builder->whereKey($user->id));
        } elseif ($user->role === 'user') {
            $query->where('isActive', true);
        } elseif ($request->filled('custodian_id')) {
            $query->whereHas('custodians', fn ($builder) => $builder->whereKey($request->integer('custodian_id')));
        }

        return LaboratoryResource::collection($query->orderBy('name')->get());
    }

    public function store(StoreLaboratoryRequest $request)
    {
        $data = $request->validated();
        $custodianId = Arr::pull($data, 'custodianID');

        $this->validateCustodian($custodianId);
        $this->storeGallery($request, $data);

        $laboratory = DB::transaction(function () use ($data, $custodianId) {
            $laboratory = Laboratory::create($data);
            $laboratory->custodians()->sync($custodianId ? [$custodianId] : []);

            return $laboratory;
        });

        $this->logAction('laboratory_created', ['laboratory_id' => $laboratory->id]);

        return (new LaboratoryResource($laboratory->load('custodians')))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Request $request, Laboratory $laboratory)
    {
        $this->authorize('view', $laboratory);

        return new LaboratoryResource($laboratory->load('custodians:id,name,email,role'));
    }

    public function update(UpdateLaboratoryRequest $request, Laboratory $laboratory)
    {
        $data = $request->validated();
        $oldGallery = null;
        $hasCustodian = array_key_exists('custodianID', $data);
        $custodianId = Arr::pull($data, 'custodianID');

        if ($hasCustodian) {
            $this->validateCustodian($custodianId);
        }

        if ($request->hasFile('gallery')) {
            $oldGallery = $laboratory->gallery;
            $this->storeGallery($request, $data);
        } else {
            unset($data['gallery']);
        }

        DB::transaction(function () use ($laboratory, $data, $hasCustodian, $custodianId) {
            $laboratory->update($data);

            if ($hasCustodian) {
                $laboratory->custodians()->sync($custodianId ? [$custodianId] : []);
            }
        });

        if ($oldGallery) {
            Storage::disk('public')->delete($oldGallery);
        }

        $this->logAction('laboratory_updated', ['laboratory_id' => $laboratory->id]);

        return new LaboratoryResource($laboratory->fresh()->load('custodians'));
    }

    public function destroy(Laboratory $laboratory)
    {
        $this->authorize('delete', $laboratory);

        if ($laboratory->equipment()->exists() || $laboratory->transactions()->exists()) {
            throw ValidationException::withMessages([
                'laboratory' => ['Archive this laboratory instead; it still has equipment or transaction history.'],
            ]);
        }

        if ($laboratory->gallery) {
            Storage::disk('public')->delete($laboratory->gallery);
        }

        $laboratory->delete();
        $this->logAction('laboratory_deleted', ['laboratory_id' => $laboratory->id]);

        return response()->noContent();
    }

    private function validateCustodian(?int $custodianId): void
    {
        if (! $custodianId) {
            return;
        }

        if (! User::whereKey($custodianId)->where('role', 'custodian')->exists()) {
            throw ValidationException::withMessages([
                'custodianID' => ['The selected user is not a custodian.'],
            ]);
        }
    }

    private function storeGallery(Request $request, array &$data): void
    {
        if (! $request->hasFile('gallery')) {
            return;
        }

        $file = $request->file('gallery');
        $name = Str::random(32).'.'.$file->extension();
        $data['gallery'] = $file->storeAs('gallery', $name, 'public');
    }
}
