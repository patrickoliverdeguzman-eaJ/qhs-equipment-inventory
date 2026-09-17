<?php

namespace App\Http\Controllers;

use App\Enums\MaintenanceStatus;
use App\Http\Requests\CancelMaintenanceWorkOrderRequest;
use App\Http\Requests\CompleteMaintenanceWorkOrderRequest;
use App\Http\Requests\StoreMaintenanceWorkOrderRequest;
use App\Http\Requests\UpdateMaintenanceWorkOrderRequest;
use App\Http\Resources\MaintenanceWorkOrderResource;
use App\Models\MaintenanceWorkOrder;
use App\Services\MaintenanceWorkOrderService;
use App\Traits\ActionLogger;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class MaintenanceWorkOrderController extends Controller
{
    use ActionLogger;

    public function __construct(private readonly MaintenanceWorkOrderService $maintenance) {}

    public function index(Request $request)
    {
        $this->authorize('viewAny', MaintenanceWorkOrder::class);
        $perPage = min(500, max(1, $request->integer('per_page', 25)));
        $query = MaintenanceWorkOrder::query()->with($this->relations());

        if ($request->user()->isCustodian()) {
            $query->whereHas('laboratory.custodians', fn (Builder $builder) => $builder->whereKey($request->user()->id));
        }

        $query
            ->when($request->filled('status'), fn (Builder $builder) => $builder->where('status', $request->string('status')->toString()))
            ->when($request->filled('type'), fn (Builder $builder) => $builder->where('type', $request->string('type')->toString()))
            ->when($request->filled('priority'), fn (Builder $builder) => $builder->where('priority', $request->string('priority')->toString()))
            ->when($request->filled('laboratory_id'), fn (Builder $builder) => $builder->where('laboratory_id', $request->integer('laboratory_id')))
            ->when($request->string('due')->toString() === 'overdue', fn (Builder $builder) => $builder
                ->whereIn('status', MaintenanceStatus::activeValues())
                ->where('due_at', '<', now()))
            ->when($request->string('due')->toString() === 'due_soon', fn (Builder $builder) => $builder
                ->whereIn('status', MaintenanceStatus::activeValues())
                ->whereBetween('due_at', [now(), now()->addDays(7)]))
            ->when($request->filled('search'), function (Builder $builder) use ($request) {
                $search = '%'.$request->string('search')->trim()->toString().'%';
                $builder->where(function (Builder $nested) use ($search) {
                    $nested->where('title', 'like', $search)
                        ->orWhereHas('item', fn (Builder $item) => $item->where('unit_id', 'like', $search))
                        ->orWhereHas('item.equipment', fn (Builder $equipment) => $equipment->where('name', 'like', $search));
                });
            });

        return MaintenanceWorkOrderResource::collection($query->latest()->paginate($perPage));
    }

    public function store(StoreMaintenanceWorkOrderRequest $request)
    {
        $workOrder = $this->maintenance->create($request->validated(), $request->user());
        $this->logAction('maintenance_created', $this->auditMeta($workOrder));

        return (new MaintenanceWorkOrderResource($workOrder))->response()->setStatusCode(201);
    }

    public function show(MaintenanceWorkOrder $maintenanceWorkOrder)
    {
        $this->authorize('view', $maintenanceWorkOrder);

        return new MaintenanceWorkOrderResource($maintenanceWorkOrder->load($this->relations()));
    }

    public function update(UpdateMaintenanceWorkOrderRequest $request, MaintenanceWorkOrder $maintenanceWorkOrder)
    {
        $updated = $this->maintenance->update($maintenanceWorkOrder, $request->validated());
        $this->logAction('maintenance_updated', $this->auditMeta($updated));

        return new MaintenanceWorkOrderResource($updated);
    }

    public function start(Request $request, MaintenanceWorkOrder $maintenanceWorkOrder)
    {
        $this->authorize('update', $maintenanceWorkOrder);
        $updated = $this->maintenance->start($maintenanceWorkOrder);
        $this->logAction('maintenance_started', $this->auditMeta($updated));

        return response()->json(['message' => 'Maintenance work started.', 'data' => new MaintenanceWorkOrderResource($updated)]);
    }

    public function complete(CompleteMaintenanceWorkOrderRequest $request, MaintenanceWorkOrder $maintenanceWorkOrder)
    {
        $updated = $this->maintenance->complete($maintenanceWorkOrder, $request->validated());
        $this->logAction('maintenance_completed', $this->auditMeta($updated));

        return response()->json(['message' => 'Maintenance completed and the unit condition was updated.', 'data' => new MaintenanceWorkOrderResource($updated)]);
    }

    public function cancel(CancelMaintenanceWorkOrderRequest $request, MaintenanceWorkOrder $maintenanceWorkOrder)
    {
        $updated = $this->maintenance->cancel($maintenanceWorkOrder, $request->validated('reason'));
        $this->logAction('maintenance_cancelled', $this->auditMeta($updated));

        return response()->json(['message' => 'Maintenance work order cancelled.', 'data' => new MaintenanceWorkOrderResource($updated)]);
    }

    /** @return list<string> */
    private function relations(): array
    {
        return [
            'item:id,equipment_id,unit_id,condition,isBorrowed',
            'item.equipment:id,name,laboratory_id',
            'laboratory:id,name,location',
            'assignedTo:id,name,email',
            'reportedBy:id,name,email',
        ];
    }

    private function auditMeta(MaintenanceWorkOrder $workOrder): array
    {
        return [
            'maintenance_id' => $workOrder->id,
            'item_id' => $workOrder->equipment_item_id,
            'laboratory_id' => $workOrder->laboratory_id,
            'status' => $workOrder->status->value,
            'type' => $workOrder->type->value,
        ];
    }
}
