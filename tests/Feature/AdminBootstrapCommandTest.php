<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminBootstrapCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_an_admin_can_be_created_from_a_password_environment_variable(): void
    {
        $password = 'A-secure-initial-password-123!';
        putenv("TEST_BOOTSTRAP_ADMIN_PASSWORD={$password}");

        try {
            $this->artisan('app:create-admin', [
                'email' => 'admin@example.com',
                '--name' => 'Administrator',
                '--password-env' => 'TEST_BOOTSTRAP_ADMIN_PASSWORD',
            ])->assertSuccessful();
        } finally {
            putenv('TEST_BOOTSTRAP_ADMIN_PASSWORD');
        }

        $admin = User::where('email', 'admin@example.com')->firstOrFail();

        $this->assertSame('Administrator', $admin->name);
        $this->assertSame('admin', $admin->role);
        $this->assertTrue($admin->isActive);
        $this->assertNotNull($admin->email_verified_at);
        $this->assertTrue(Hash::check($password, $admin->password));
    }
}
