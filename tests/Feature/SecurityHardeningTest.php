<?php

namespace Tests\Feature;

use App\Models\Equipment;
use App\Models\EquipmentItem;
use App\Models\Laboratory;
use App\Models\User;
use App\Support\SensitiveMailTransport;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use RuntimeException;
use Tests\TestCase;

class SecurityHardeningTest extends TestCase
{
    use RefreshDatabase;

    public function test_browser_login_uses_an_encrypted_session_without_returning_a_bearer_token(): void
    {
        $user = $this->user();
        $origin = rtrim(config('app.url'), '/');

        $this->withHeader('Origin', $origin)
            ->get('/sanctum/csrf-cookie')
            ->assertNoContent();

        $this->withHeaders([
            'Origin' => $origin,
            'Referer' => $origin.'/auth',
        ])->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'password',
        ])->assertOk()
            ->assertJsonPath('session_authenticated', true)
            ->assertJsonMissingPath('token');

        $this->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('id', $user->id);

        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_login_rate_limit_blocks_repeated_guesses(): void
    {
        $user = $this->user(['email' => 'rate-limit@example.test']);

        foreach (range(1, 5) as $attempt) {
            $this->postJson('/api/login', [
                'email' => $user->email,
                'password' => 'wrong-password-'.$attempt,
            ])->assertUnauthorized();
        }

        $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'another-wrong-password',
        ])->assertTooManyRequests();
    }

    public function test_recovery_request_limits_do_not_block_a_valid_password_reset(): void
    {
        Mail::fake();
        $user = $this->user(['email' => 'password-recovery@example.test']);

        foreach (range(1, 3) as $attempt) {
            $this->postJson('/api/forgot-password', ['email' => $user->email])->assertOk();
        }

        $plainToken = 'known-valid-reset-token';
        $user->update([
            'reset_token' => hash('sha256', $plainToken),
            'reset_token_expires_at' => now()->addHour(),
        ]);

        $this->postJson('/api/reset-password', [
            'email' => $user->email,
            'token' => $plainToken,
            'password' => 'NewPassword123',
            'password_confirmation' => 'NewPassword123',
        ])->assertOk();

        $this->assertTrue(Hash::check('NewPassword123', $user->fresh()->password));
    }

    public function test_password_change_keeps_the_current_browser_session_authenticated(): void
    {
        $user = $this->user(['email' => 'session-password@example.test']);
        $origin = rtrim(config('app.url'), '/');

        $this->withHeaders([
            'Origin' => $origin,
            'Referer' => $origin.'/auth',
        ])->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'password',
        ])->assertOk();

        $this->postJson('/api/profile/password', [
            'current_password' => 'password',
            'new_password' => 'ChangedPassword123',
            'new_password_confirmation' => 'ChangedPassword123',
        ])->assertOk();

        $this->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('id', $user->id);
    }

    public function test_security_policy_blocks_untrusted_code_without_disabling_same_origin_camera(): void
    {
        $response = $this->getJson('/api/users')->assertUnauthorized();
        $policy = (string) $response->headers->get('Content-Security-Policy');

        $this->assertStringContainsString("default-src 'self'", $policy);
        $this->assertStringContainsString("script-src 'self'", $policy);
        $this->assertStringContainsString("object-src 'none'", $policy);
        $response->assertHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');
        $response->assertHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
        $response->assertHeader('X-Permitted-Cross-Domain-Policies', 'none');
        $this->assertStringContainsString('no-store', (string) $response->headers->get('Cache-Control'));
    }

    public function test_production_policy_upgrades_mixed_content_and_disallows_insecure_websockets(): void
    {
        $originalEnvironment = app()->environment();

        try {
            app()->detectEnvironment(fn (): string => 'production');
            $policy = (string) $this->get('/auth')->headers->get('Content-Security-Policy');

            $this->assertStringContainsString('upgrade-insecure-requests', $policy);
            $this->assertStringContainsString("connect-src 'self' https: wss:", $policy);
            $this->assertStringNotContainsString(' ws:', $policy);
        } finally {
            app()->detectEnvironment(fn (): string => $originalEnvironment);
        }
    }

    public function test_production_refuses_to_write_sensitive_account_links_to_log_mail(): void
    {
        $originalEnvironment = app()->environment();
        $originalMailer = config('mail.default');
        $blocked = false;

        try {
            app()->detectEnvironment(fn (): string => 'production');
            config(['mail.default' => 'log']);
            SensitiveMailTransport::assertSafe();
        } catch (RuntimeException) {
            $blocked = true;
        } finally {
            config(['mail.default' => $originalMailer]);
            app()->detectEnvironment(fn (): string => $originalEnvironment);
        }

        $this->assertTrue($blocked);
    }

    public function test_import_caps_total_work_and_keeps_normal_bulk_import_working(): void
    {
        $admin = $this->user(['role' => 'admin']);
        $laboratory = $this->laboratory();
        Sanctum::actingAs($admin, ['app:use']);

        $oversized = collect(range(1, 6))->map(fn (int $number): array => [
            'name' => "Bulk item {$number}",
            'laboratory_id' => $laboratory->id,
            'quantity' => 1000,
        ])->all();

        $this->postJson('/api/equipment/import', ['data' => $oversized])
            ->assertUnprocessable()
            ->assertJsonPath('success', false);

        $this->assertDatabaseCount('equipment', 0);
        $this->assertDatabaseCount('equipment_items', 0);

        $this->postJson('/api/equipment/import', ['data' => [[
            'name' => 'Imported microscope',
            'description' => 'Imported safely',
            'laboratory_id' => $laboratory->id,
            'quantity' => 3,
            'isActive' => true,
        ]]])->assertOk()
            ->assertJsonCount(1, 'success')
            ->assertJsonCount(0, 'failed');

        $this->assertDatabaseCount('equipment', 1);
        $this->assertDatabaseCount('equipment_items', 3);
    }

    public function test_students_cannot_discover_archived_laboratories_or_their_inventory_by_id(): void
    {
        $student = $this->user();
        $laboratory = $this->laboratory(['isActive' => false]);
        $equipment = Equipment::create([
            'name' => 'Archived microscope',
            'laboratory_id' => $laboratory->id,
            'description' => 'Not visible to students',
            'isActive' => true,
        ]);
        EquipmentItem::create(['equipment_id' => $equipment->id, 'condition' => 'Good']);

        Sanctum::actingAs($student, ['app:use']);

        $this->getJson("/api/laboratories/{$laboratory->id}")->assertNotFound();
        $this->getJson("/api/equipment/{$equipment->id}")->assertNotFound();
        $this->getJson("/api/equipment/{$equipment->id}/available-items")->assertNotFound();

        $this->getJson('/api/item')
            ->assertOk()
            ->assertJsonCount(0, 'data');
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

    private function laboratory(array $attributes = []): Laboratory
    {
        return Laboratory::create(array_merge([
            'name' => 'Science Laboratory',
            'location' => 'Building A',
            'description' => 'Test laboratory',
            'isActive' => true,
        ], $attributes));
    }
}
