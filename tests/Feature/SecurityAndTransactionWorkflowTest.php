<?php

namespace Tests\Feature;

use App\Models\Equipment;
use App\Models\EquipmentItem;
use App\Models\Laboratory;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SecurityAndTransactionWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_sensitive_routes_require_authentication_and_admin_role(): void
    {
        $this->getJson('/api/users')
            ->assertUnauthorized()
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'SAMEORIGIN');

        Sanctum::actingAs($this->user(), ['app:use']);

        $this->getJson('/api/logs')->assertForbidden();
        $this->getJson('/api/admin/dashboard/summary')->assertForbidden();
        $this->postJson('/api/categories', ['name' => 'Restricted'])->assertForbidden();
    }

    public function test_inactive_accounts_cannot_use_an_existing_token(): void
    {
        Sanctum::actingAs($this->user(['isActive' => false]), ['app:use']);

        $this->getJson('/api/user')
            ->assertForbidden()
            ->assertJsonPath('message', 'Your account is inactive. Please contact an administrator.');
    }

    public function test_login_rejects_unverified_and_inactive_accounts(): void
    {
        $unverified = $this->user(['email_verified_at' => null]);
        $inactive = $this->user(['email' => 'inactive@example.test', 'isActive' => false]);

        $this->postJson('/api/login', ['email' => $unverified->email, 'password' => 'password'])
            ->assertForbidden()
            ->assertJsonPath('needs_verification', true);

        $this->postJson('/api/login', ['email' => $inactive->email, 'password' => 'password'])
            ->assertForbidden();
    }

    public function test_unsigned_email_verification_endpoint_is_not_available(): void
    {
        $this->postJson('/api/email/verify', [
            'email' => 'victim@example.test',
            'token' => 'not-a-signed-link',
        ])->assertStatus(405);
    }

    public function test_borrower_identity_cannot_be_spoofed_and_units_are_reserved_atomically(): void
    {
        [$borrower, $laboratory, $equipment, $items] = $this->inventory();
        $victim = $this->user(['email' => 'victim@example.test']);
        Sanctum::actingAs($borrower, ['app:use']);

        $response = $this->postJson('/api/transactions', [
            'borrower_id' => $victim->id,
            'borrower_name' => 'Spoofed Name',
            'laboratory_id' => $laboratory->id,
            'borrow_date' => now()->toDateString(),
            'equipment' => [[
                'equipment_id' => $equipment->id,
                'quantity' => 2,
            ]],
        ])->assertCreated();

        $transactionId = $response->json('data.id');
        $this->assertDatabaseHas('transactions', [
            'id' => $transactionId,
            'borrower_id' => $borrower->id,
            'borrower_name' => $borrower->name,
            'status' => 'pending',
        ]);
        $this->assertDatabaseCount('transaction_equipment_items', 2);
        $this->assertTrue($items[0]->fresh()->isBorrowed);
        $this->assertTrue($items[1]->fresh()->isBorrowed);
    }

    public function test_transaction_access_is_scoped_and_only_assigned_staff_can_process_it(): void
    {
        [$borrower, $laboratory, $equipment] = $this->inventory();
        Sanctum::actingAs($borrower, ['app:use']);
        $transactionId = $this->postJson('/api/transactions', [
            'laboratory_id' => $laboratory->id,
            'borrow_date' => now()->toDateString(),
            'equipment' => [['equipment_id' => $equipment->id, 'quantity' => 1]],
        ])->assertCreated()->json('data.id');

        Sanctum::actingAs($this->user(['email' => 'other@example.test']), ['app:use']);
        $this->getJson("/api/transactions/{$transactionId}")->assertForbidden();

        $custodian = $this->user(['email' => 'custodian@example.test', 'role' => 'custodian']);
        Sanctum::actingAs($custodian, ['app:use']);
        $this->postJson("/api/transactions/{$transactionId}/accept")->assertForbidden();

        $custodian->laboratories()->attach($laboratory);
        $this->postJson("/api/transactions/{$transactionId}/accept")
            ->assertOk()
            ->assertJsonPath('data.status', 'borrowed');
    }

    public function test_return_workflow_releases_units_and_prevents_duplicate_transitions(): void
    {
        [$borrower, $laboratory, $equipment, $items] = $this->inventory();
        $admin = $this->user(['email' => 'admin@example.test', 'role' => 'admin']);

        Sanctum::actingAs($borrower, ['app:use']);
        $transactionId = $this->postJson('/api/transactions', [
            'laboratory_id' => $laboratory->id,
            'borrow_date' => now()->toDateString(),
            'equipment' => [['equipment_id' => $equipment->id, 'quantity' => 1]],
        ])->assertCreated()->json('data.id');

        Sanctum::actingAs($admin, ['app:use']);
        $this->postJson("/api/transactions/{$transactionId}/accept")->assertOk();
        $this->postJson("/api/transactions/{$transactionId}/accept")->assertUnprocessable();
        $this->postJson("/api/transactions/{$transactionId}/return")
            ->assertOk()
            ->assertJsonPath('data.status', 'returned');

        $this->assertFalse($items[0]->fresh()->isBorrowed);
        $this->assertSame('returned', Transaction::findOrFail($transactionId)->status);
        $this->deleteJson("/api/transactions/{$transactionId}")->assertForbidden();
    }

    public function test_borrower_can_edit_a_pending_request_without_submitting_identity_fields(): void
    {
        [$borrower, $laboratory, $equipment] = $this->inventory();
        Sanctum::actingAs($borrower, ['app:use']);

        $transactionId = $this->postJson('/api/transactions', [
            'laboratory_id' => $laboratory->id,
            'borrow_date' => now()->toDateString(),
            'equipment' => [['equipment_id' => $equipment->id, 'quantity' => 1]],
        ])->assertCreated()->json('data.id');

        $this->putJson("/api/transactions/{$transactionId}", [
            'laboratory_id' => $laboratory->id,
            'borrow_date' => now()->toDateString(),
            'notes' => 'Updated by the borrower',
            'equipment' => [['equipment_id' => $equipment->id, 'quantity' => 1]],
        ])->assertOk()
            ->assertJsonPath('data.borrower_id', $borrower->id)
            ->assertJsonPath('data.notes', 'Updated by the borrower');
    }

    public function test_final_active_administrator_cannot_be_demoted_or_deactivated(): void
    {
        $admin = $this->user(['email' => 'admin@example.test', 'role' => 'admin']);
        Sanctum::actingAs($admin, ['app:use']);

        $this->putJson("/api/users/{$admin->id}", ['role' => 'user'])
            ->assertUnprocessable();
        $this->putJson("/api/users/{$admin->id}", ['isActive' => false])
            ->assertUnprocessable();

        $this->assertDatabaseHas('users', [
            'id' => $admin->id,
            'role' => 'admin',
            'isActive' => true,
        ]);
    }

    /**
     * @return array{User,Laboratory,Equipment,array<int,EquipmentItem>}
     */
    private function inventory(): array
    {
        $borrower = $this->user(['address' => '1 School Road', 'phone_number' => '09170000000']);
        $laboratory = Laboratory::create([
            'name' => 'Science Laboratory',
            'location' => 'Building A',
            'description' => 'Test laboratory',
            'isActive' => true,
        ]);
        $equipment = Equipment::create([
            'name' => 'Microscope',
            'laboratory_id' => $laboratory->id,
            'description' => 'Compound microscope',
            'isActive' => true,
        ]);
        $items = [
            EquipmentItem::create(['equipment_id' => $equipment->id, 'condition' => 'Good']),
            EquipmentItem::create(['equipment_id' => $equipment->id, 'condition' => 'New']),
        ];

        return [$borrower, $laboratory, $equipment, $items];
    }

    private function user(array $attributes = []): User
    {
        return User::factory()->create(array_merge([
            'role' => 'user',
            'isActive' => true,
            'email_verified_at' => now(),
            'password' => Hash::make('password'),
        ], $attributes));
    }
}
