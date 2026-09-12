<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

use function Laravel\Prompts\password;
use function Laravel\Prompts\text;

class CreateAdmin extends Command
{
    protected $signature = 'app:create-admin {email : The administrator email address}';

    protected $description = 'Create an administrator or promote an existing account';

    public function handle(): int
    {
        $email = strtolower(trim((string) $this->argument('email')));
        $validation = Validator::make(['email' => $email], ['email' => ['required', 'email']]);

        if ($validation->fails()) {
            $this->error($validation->errors()->first('email'));

            return self::FAILURE;
        }

        $user = User::where('email', $email)->first();
        if ($user) {
            $user->update([
                'role' => 'admin',
                'isActive' => true,
                'email_verified_at' => $user->email_verified_at ?? now(),
            ]);
            $user->tokens()->delete();
            $this->info("{$email} is now an active administrator.");

            return self::SUCCESS;
        }

        $name = text(label: 'Administrator name', required: true);
        $plainPassword = password(
            label: 'Password',
            required: true,
            validate: fn (string $value) => strlen($value) >= 12 ? null : 'Use at least 12 characters.',
        );

        User::create([
            'name' => $name,
            'email' => $email,
            'password' => Hash::make($plainPassword),
            'role' => 'admin',
            'isActive' => true,
            'email_verified_at' => now(),
        ]);

        $this->info("Administrator {$email} created.");

        return self::SUCCESS;
    }
}
