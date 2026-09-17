<?php

namespace App\Http\Controllers;

use App\Http\Requests\ApproveTransactionRequest;
use App\Http\Requests\IssueTransactionRequest;
use App\Http\Requests\ReturnTransactionItemsRequest;
use App\Http\Requests\StoreTransactionRequest;
use App\Http\Requests\UpdateTransactionRequest;
use App\Http\Resources\TransactionResource;
use App\Models\EquipmentItem;
use App\Models\Transaction;
use App\Services\TransactionCustodyService;
use App\Services\TransactionService;
use App\Traits\ActionLogger;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TransactionController extends Controller
{
    use ActionLogger;

    public function __construct(
        private readonly TransactionService $transactions,
        private readonly TransactionCustodyService $custody,
    ) {}

    public function index(Request $request)
    {
        $this->authorize('viewAny', Transaction::class);
        $user = $request->user();
        $perPage = min(500, max(1, $request->integer('per_page', 25)));

        $query = Transaction::query()
            ->with([
                'borrower:id,name,email,avatar',
                'laboratory:id,name',
                'equipment:id,name',
                'assignedItems:id,equipment_id,unit_id,condition',
            ]);

        if ($user->role === 'user') {
            $query->where('borrower_id', $user->id);
        } elseif ($user->isCustodian()) {
            $query->whereHas('laboratory.custodians', fn (Builder $builder) => $builder->whereKey($user->id));
        }

        return TransactionResource::collection($query->latest()->paginate($perPage));
    }

    public function store(StoreTransactionRequest $request)
    {
        $this->authorize('create', Transaction::class);
        $transaction = $this->transactions->create($request->validated(), $request->user());

        $this->logAction('transaction_created', [
            'transaction_id' => $transaction->id,
            'borrower_id' => $transaction->borrower_id,
        ]);

        return (new TransactionResource($transaction))->response()->setStatusCode(201);
    }

    public function show(Transaction $transaction)
    {
        $this->authorize('view', $transaction);

        return new TransactionResource($transaction->load([
            'borrower:id,name,email,avatar',
            'laboratory:id,name',
            'equipment:id,name',
            'assignedItems:id,equipment_id,unit_id,condition',
        ]));
    }

    public function update(UpdateTransactionRequest $request, Transaction $transaction)
    {
        $updated = $transaction->status === 'pending'
            ? $this->transactions->updatePending($transaction, $request->validated(), $request->user())
            : $this->transactions->updateProcessed($transaction, $request->validated());

        $this->logAction('transaction_updated', ['transaction_id' => $updated->id]);

        return new TransactionResource($updated);
    }

    public function destroy(Transaction $transaction)
    {
        $this->authorize('delete', $transaction);
        $transactionId = $transaction->id;
        $this->transactions->delete($transaction);
        $this->logAction('transaction_deleted', ['transaction_id' => $transactionId]);

        return response()->noContent();
    }

    public function accept(ApproveTransactionRequest $request, Transaction $transaction)
    {
        $updated = $this->transactions->accept(
            $transaction,
            $request->user(),
            $request->validated('return_date'),
        );
        $this->logAction('transaction_approved', ['transaction_id' => $updated->id]);

        return response()->json(['message' => 'Request approved and ready for pickup.', 'data' => new TransactionResource($updated)]);
    }

    public function issue(IssueTransactionRequest $request, Transaction $transaction)
    {
        $updated = $this->custody->issue(
            $transaction,
            $request->user(),
            $request->validated('unit_ids'),
            $request->validated('notes'),
        );
        $this->logAction('transaction_issued', [
            'transaction_id' => $updated->id,
            'unit_ids' => $request->validated('unit_ids'),
        ]);

        return response()->json(['message' => 'All assigned equipment was issued.', 'data' => new TransactionResource($updated)]);
    }

    public function decline(Request $request, Transaction $transaction)
    {
        $this->authorize('process', $transaction);
        $validated = $request->validate([
            'rejection_reason' => ['nullable', 'string', 'max:1000'],
        ]);
        $updated = $this->transactions->decline(
            $transaction,
            $request->user(),
            $validated['rejection_reason'] ?? null,
        );
        $this->logAction('transaction_declined', ['transaction_id' => $updated->id]);

        return response()->json(['message' => 'Request declined.', 'data' => new TransactionResource($updated)]);
    }

    public function return(Request $request, Transaction $transaction)
    {
        $this->authorize('process', $transaction);
        $result = $this->custody->returnAllOutstanding($transaction, $request->user());
        $this->recordReturnActions($result);

        return response()->json([
            'message' => 'All outstanding items were returned through the compatibility workflow.',
            'deprecated' => true,
            'data' => new TransactionResource($result['transaction']),
        ]);
    }

    public function returnItems(ReturnTransactionItemsRequest $request, Transaction $transaction)
    {
        $result = $this->custody->returnItems($transaction, $request->user(), $request->validated('items'));
        $this->recordReturnActions($result);

        return response()->json([
            'message' => $result['completed']
                ? 'Final outstanding unit returned. The transaction is complete.'
                : "{$result['returned_count']} unit(s) returned. Outstanding units remain.",
            'data' => new TransactionResource($result['transaction']),
        ]);
    }

    public function updateAssignedItems(Request $request, Transaction $transaction)
    {
        $this->authorize('process', $transaction);
        $validated = $request->validate([
            'assigned_items' => ['required', 'array', 'min:1', 'max:50'],
            'assigned_items.*' => ['required', 'array', 'min:1', 'max:100'],
            'assigned_items.*.*' => ['required', 'string', 'max:100'],
        ]);

        $updated = $this->transactions->replaceAssignedItems($transaction, $validated['assigned_items']);
        $this->logAction('transaction_assigned_items_updated', ['transaction_id' => $updated->id]);

        return response()->json(['message' => 'Assigned units updated.', 'data' => new TransactionResource($updated)]);
    }

    public function itemHistory(Request $request, string $unitId)
    {
        $item = EquipmentItem::query()->with('equipment')->where('unit_id', $unitId)->firstOrFail();
        $this->authorize('manageItems', $item->equipment);

        $history = DB::table('transaction_equipment_items')
            ->join('transactions', 'transaction_equipment_items.transaction_id', '=', 'transactions.id')
            ->where('transaction_equipment_items.equipment_item_id', $item->id)
            ->select([
                'transactions.id',
                'transactions.borrower_name',
                'transactions.borrow_date',
                'transactions.return_date',
                'transactions.status',
                'transactions.notes',
                'transactions.accepted_at as approved_at',
                'transactions.accepted_by_name as approved_by_name',
                'transactions.issued_at as transaction_issued_at',
                'transactions.issued_by_name',
                'transaction_equipment_items.created_at as assigned_at',
                'transaction_equipment_items.issued_at',
                'transaction_equipment_items.condition_at_issue',
                'transaction_equipment_items.returned_at',
                'transaction_equipment_items.condition_at_return',
                'transaction_equipment_items.return_notes',
                'transaction_equipment_items.returned_by_name',
            ])
            ->orderByDesc('transaction_equipment_items.created_at')
            ->get();

        $maintenance = $item->maintenanceWorkOrders()
            ->with(['assignedTo:id,name', 'reportedBy:id,name'])
            ->latest()
            ->get()
            ->map(fn ($workOrder) => [
                'id' => $workOrder->id,
                'type' => $workOrder->type->value,
                'status' => $workOrder->status->value,
                'priority' => $workOrder->priority->value,
                'source_transaction_id' => $workOrder->source_transaction_id,
                'title' => $workOrder->title,
                'description' => $workOrder->description,
                'assigned_to_name' => $workOrder->assigned_to_name,
                'reported_by_name' => $workOrder->reported_by_name,
                'scheduled_at' => $workOrder->scheduled_at,
                'due_at' => $workOrder->due_at,
                'started_at' => $workOrder->started_at,
                'completed_at' => $workOrder->completed_at,
                'result_condition' => $workOrder->result_condition,
                'completion_notes' => $workOrder->completion_notes,
                'next_due_at' => $workOrder->next_due_at,
            ]);

        return response()->json([
            'data' => [
                'history' => $history,
                'maintenance' => $maintenance,
                'current' => [
                    'id' => $item->id,
                    'unit_id' => $item->unit_id,
                    'condition' => $item->condition,
                    'isBorrowed' => $item->isBorrowed,
                ],
            ],
        ]);
    }

    /** @param array{transaction:Transaction,returned_count:int,completed:bool,attention_conditions:list<string>,unit_ids:list<string>,work_order_ids:list<int>} $result */
    private function recordReturnActions(array $result): void
    {
        $meta = [
            'transaction_id' => $result['transaction']->id,
            'returned_count' => $result['returned_count'],
            'unit_ids' => $result['unit_ids'],
            'work_order_ids' => $result['work_order_ids'],
        ];

        $this->logAction('transaction_items_returned', $meta);

        if (in_array('Damaged', $result['attention_conditions'], true) || in_array('Under Repair', $result['attention_conditions'], true)) {
            $this->logAction('transaction_damaged_return', $meta);
        }

        if (in_array('Missing', $result['attention_conditions'], true)) {
            $this->logAction('transaction_missing_unit', $meta);
        }

        if ($result['completed']) {
            $this->logAction('transaction_returned', $meta);
        }
    }
}
