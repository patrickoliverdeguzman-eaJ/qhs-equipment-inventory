<?php

namespace App\Http\Controllers;

use App\Enums\EquipmentCondition;
use App\Models\ActionLog;
use App\Models\EquipmentItem;
use App\Models\Laboratory;
use App\Models\MaintenanceWorkOrder;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function users(Request $request)
    {
        $days = in_array($request->integer('days'), [7, 30], true)
            ? $request->integer('days')
            : 7;
        $start = now()->subDays($days - 1)->startOfDay();
        $end = now()->endOfDay();

        $registrations = User::query()
            ->selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->whereBetween('created_at', [$start, $end])
            ->groupBy('date')
            ->orderBy('date')
            ->pluck('count', 'date');

        return response()->json(collect(range(0, $days - 1))->map(function (int $offset) use ($start, $registrations) {
            $date = $start->copy()->addDays($offset);

            return [
                'date' => $date->format('M j'),
                'count' => (int) ($registrations[$date->format('Y-m-d')] ?? 0),
            ];
        }));
    }

    public function labs()
    {
        return response()->json(
            Laboratory::query()
                ->withCount([
                    'items as total_items',
                    'items as available_items' => fn ($query) => $query
                        ->where('isBorrowed', false)
                        ->whereNotIn('condition', EquipmentCondition::unavailableValues()),
                ])
                ->orderByDesc('total_items')
                ->get()
                ->map(fn (Laboratory $laboratory) => [
                    'name' => $laboratory->name,
                    'total' => $laboratory->total_items,
                    'available' => $laboratory->available_items,
                ])
        );
    }

    public function equipment()
    {
        return response()->json(
            EquipmentItem::query()
                ->selectRaw('`condition`, COUNT(*) as count')
                ->groupBy('condition')
                ->orderBy('condition')
                ->get()
                ->map(fn (EquipmentItem $item) => [
                    'status' => $item->condition,
                    'count' => (int) $item->count,
                ])
        );
    }

    public function activity()
    {
        $transactions = Transaction::query()
            ->with(['borrower:id,name,avatar', 'laboratory:id,name'])
            ->latest('updated_at')
            ->limit(8)
            ->get()
            ->map(fn (Transaction $transaction) => [
                'id' => $transaction->id,
                'user' => $transaction->borrower?->name ?? $transaction->borrower_name,
                'avatar' => $transaction->borrower?->avatar,
                'action' => $transaction->status,
                'item' => 'Borrow request #'.$transaction->id,
                'lab' => $transaction->laboratory?->name ?? 'Unknown laboratory',
                'time' => $transaction->updated_at->diffForHumans(),
            ]);

        return response()->json(['data' => $transactions]);
    }

    public function summary()
    {
        $unavailable = EquipmentCondition::unavailableValues();
        $outstanding = fn ($query) => $query->whereNotNull('issued_at')->whereNull('returned_at');
        $partiallyReturned = Transaction::query()
            ->borrowed()
            ->whereHas('assignments', fn ($query) => $query->whereNotNull('returned_at'))
            ->whereHas('assignments', $outstanding)
            ->count();

        return response()->json([
            'users' => [
                'total' => User::count(),
                'active' => User::where('isActive', true)->count(),
                'new_7d' => User::where('created_at', '>=', now()->subDays(7))->count(),
            ],
            'labs' => Laboratory::count(),
            'equipment' => [
                'total' => EquipmentItem::count(),
                'available' => EquipmentItem::where('isBorrowed', false)->whereNotIn('condition', $unavailable)->count(),
                'borrowed' => EquipmentItem::where('isBorrowed', true)->count(),
            ],
            'pending_requests' => Transaction::pending()->count(),
            'approved_requests' => Transaction::approved()->count(),
            'overdue_requests' => Transaction::query()
                ->borrowed()
                ->whereDate('return_date', '<', today())
                ->whereHas('assignments', $outstanding)
                ->count(),
            'partial_returns' => $partiallyReturned,
            'maintenance_open' => MaintenanceWorkOrder::query()->active()->count(),
            'maintenance_overdue' => MaintenanceWorkOrder::query()->active()->where('due_at', '<', now())->count(),
            'maintenance_due_soon' => MaintenanceWorkOrder::query()->active()->whereBetween('due_at', [now(), now()->addDays(7)])->count(),
            'recent_actions' => ActionLog::where('created_at', '>=', now()->subDay())->count(),
        ]);
    }
}
