<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreTransactionRequest;
use App\Http\Requests\UpdateTransactionRequest;
use App\Http\Resources\TransactionResource;
use App\Models\EquipmentItem;
use App\Models\Transaction;
use App\Services\TransactionService;
use App\Traits\ActionLogger;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TransactionController extends Controller
{
    use ActionLogger;

    public function __construct(private readonly TransactionService $transactions) {}

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

    public function accept(Request $request, Transaction $transaction)
    {
        $this->authorize('process', $transaction);
        $updated = $this->transactions->accept($transaction, $request->user());
        $this->logAction('transaction_accepted', ['transaction_id' => $updated->id]);

        return response()->json(['message' => 'Request accepted.', 'data' => new TransactionResource($updated)]);
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
        $updated = $this->transactions->markReturned($transaction, $request->user());
        $this->logAction('transaction_returned', ['transaction_id' => $updated->id]);

        return response()->json(['message' => 'Items returned.', 'data' => new TransactionResource($updated)]);
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
                'transaction_equipment_items.created_at as assigned_at',
            ])
            ->orderByDesc('transaction_equipment_items.created_at')
            ->get();

        return response()->json([
            'data' => [
                'history' => $history,
                'current' => [
                    'id' => $item->id,
                    'unit_id' => $item->unit_id,
                    'condition' => $item->condition,
                    'isBorrowed' => $item->isBorrowed,
                ],
            ],
        ]);
    }
}
