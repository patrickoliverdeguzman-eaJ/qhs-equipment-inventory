<?php

use App\Http\Controllers\ActionLogController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EmailVerificationController;
use App\Http\Controllers\EquipmentController;
use App\Http\Controllers\EquipmentImportController;
use App\Http\Controllers\EquipmentItemController;
use App\Http\Controllers\InventorySnapshotController;
use App\Http\Controllers\LaboratoryController;
use App\Http\Controllers\MaintenanceWorkOrderController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\TransactionController;
use App\Http\Controllers\UserController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::post('register', [AuthController::class, 'register'])->middleware('throttle:registration');
Route::post('login', [AuthController::class, 'login'])->middleware('throttle:login');
Route::post('forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:password-recovery');
Route::post('reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:password-reset');
Route::post('email/resend', [EmailVerificationController::class, 'resendVerificationEmail'])
    ->middleware('throttle:verification-resend')
    ->name('resend-verification-email');

Route::get('email/verify/{id}', [EmailVerificationController::class, 'verifySigned'])
    ->middleware(['signed', 'throttle:verification'])
    ->name('verification.verify');

Route::middleware(['auth:sanctum', 'abilities:app:use', 'active'])->group(function () {
    Route::post('logout', [AuthController::class, 'logout']);
    Route::get('user', fn (Request $request) => $request->user());
    Route::get('email/verification-status', [EmailVerificationController::class, 'checkVerificationStatus']);

    Route::post('profile/update', [ProfileController::class, 'updateProfile']);
    Route::post('profile/password', [ProfileController::class, 'updatePassword']);

    Route::get('laboratories', [LaboratoryController::class, 'index']);
    Route::get('laboratories/{laboratory}', [LaboratoryController::class, 'show']);
    Route::get('equipment-data', [EquipmentController::class, 'data']);
    Route::get('equipment', [EquipmentController::class, 'index']);
    Route::get('equipment/{equipment}', [EquipmentController::class, 'show']);
    Route::get('categories', [CategoryController::class, 'index']);
    Route::get('categories/{category}', [CategoryController::class, 'show']);
    Route::get('item', [EquipmentItemController::class, 'index']);
    Route::get('equipment/{equipment}/available-items', [EquipmentItemController::class, 'availableItems']);

    Route::apiResource('transactions', TransactionController::class);

    Route::middleware('role:admin,custodian')->group(function () {
        Route::get('users', [UserController::class, 'index']);
        Route::post('equipment', [EquipmentController::class, 'store']);
        Route::post('equipment/import', [EquipmentImportController::class, 'import'])->middleware('throttle:imports');
        Route::match(['put', 'patch', 'post'], 'equipment/{equipment}', [EquipmentController::class, 'update'])
            ->whereNumber('equipment');

        Route::post('item', [EquipmentItemController::class, 'store']);
        Route::get('item/{item}', [EquipmentItemController::class, 'show'])->whereNumber('item');
        Route::match(['put', 'patch'], 'item/{item}', [EquipmentItemController::class, 'update'])->whereNumber('item');
        Route::get('item/{unitId}/history', [TransactionController::class, 'itemHistory']);

        Route::post('transactions/{transaction}/accept', [TransactionController::class, 'accept']);
        Route::post('transactions/{transaction}/issue', [TransactionController::class, 'issue']);
        Route::post('transactions/{transaction}/decline', [TransactionController::class, 'decline']);
        Route::post('transactions/{transaction}/return-items', [TransactionController::class, 'returnItems']);
        Route::post('transactions/{transaction}/return', [TransactionController::class, 'return']);
        Route::post('transactions/{transaction}/update-assigned-items', [TransactionController::class, 'updateAssignedItems']);

        Route::post('maintenance-work-orders/{maintenanceWorkOrder}/start', [MaintenanceWorkOrderController::class, 'start']);
        Route::post('maintenance-work-orders/{maintenanceWorkOrder}/complete', [MaintenanceWorkOrderController::class, 'complete']);
        Route::post('maintenance-work-orders/{maintenanceWorkOrder}/cancel', [MaintenanceWorkOrderController::class, 'cancel']);
        Route::apiResource('maintenance-work-orders', MaintenanceWorkOrderController::class)
            ->parameters(['maintenance-work-orders' => 'maintenanceWorkOrder'])
            ->except('destroy');

        Route::get('inventory-snapshots/range', [InventorySnapshotController::class, 'getSnapshotsByDateRange']);
        Route::get('inventory-snapshots/equipment/{equipment}/trend', [InventorySnapshotController::class, 'getEquipmentTrend']);
        Route::get('inventory-snapshots/export', [InventorySnapshotController::class, 'exportCSV']);
    });

    Route::middleware('role:admin')->group(function () {
        Route::apiResource('users', UserController::class)->except('index');
        Route::post('laboratories', [LaboratoryController::class, 'store']);
        Route::match(['put', 'patch', 'post'], 'laboratories/{laboratory}', [LaboratoryController::class, 'update']);
        Route::delete('laboratories/{laboratory}', [LaboratoryController::class, 'destroy']);
        Route::post('categories', [CategoryController::class, 'store']);
        Route::match(['put', 'patch'], 'categories/{category}', [CategoryController::class, 'update']);
        Route::delete('categories/{category}', [CategoryController::class, 'destroy']);
        Route::delete('equipment/{equipment}', [EquipmentController::class, 'destroy']);
        Route::put('equipment/{equipment}/toggle-active', [EquipmentController::class, 'toggleActive']);
        Route::delete('item/{item}', [EquipmentItemController::class, 'destroy'])->whereNumber('item');
        Route::get('logs', [ActionLogController::class, 'index']);

        Route::prefix('admin/dashboard')->group(function () {
            Route::get('users', [DashboardController::class, 'users']);
            Route::get('labs', [DashboardController::class, 'labs']);
            Route::get('equipment', [DashboardController::class, 'equipment']);
            Route::get('activity', [DashboardController::class, 'activity']);
            Route::get('summary', [DashboardController::class, 'summary']);
        });

        Route::get('inventory-snapshots/settings', [InventorySnapshotController::class, 'getSnapshotSettings']);
        Route::post('inventory-snapshots/settings', [InventorySnapshotController::class, 'updateSnapshotSettings']);
        Route::post('inventory-snapshots/trigger', [InventorySnapshotController::class, 'triggerSnapshot']);
    });
});
