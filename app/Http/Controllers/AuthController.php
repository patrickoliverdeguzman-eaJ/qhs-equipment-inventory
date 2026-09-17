<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Mail\PasswordResetMail;
use App\Mail\VerifyEmailMail;
use App\Models\User;
use App\Support\SensitiveMailTransport;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    public function login(LoginRequest $request)
    {
        $credentials = $request->validated();
        $user = User::where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            return response()->json(['message' => 'Email or password is incorrect.'], 401);
        }

        if (! $user->isActive) {
            return response()->json([
                'message' => 'Your account is inactive. Please contact an administrator.',
            ], 403);
        }

        if (! $user->email_verified_at) {
            return response()->json([
                'message' => 'Verify your email address before signing in.',
                'email_verified' => false,
                'needs_verification' => true,
            ], 403);
        }

        if (! $request->hasSession()) {
            return response()->json([
                'message' => 'A secure browser session is required. Refresh the page and try again.',
            ], 419);
        }

        $user->tokens()->delete();
        Auth::guard('web')->login($user);
        $request->session()->regenerate();

        return response()->json([
            'user' => $user,
            'session_authenticated' => true,
            'redirectUrl' => match ($user->role) {
                'admin' => '/admin',
                'custodian' => '/custodian',
                default => '/',
            },
        ]);
    }

    public function register(RegisterRequest $request)
    {
        $data = $request->validated();
        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'isActive' => true,
            'role' => 'user',
        ]);

        $emailSent = $this->sendVerificationEmail($user);

        return response()->json([
            'success' => true,
            'message' => 'Registration complete. Verify your email before signing in.',
            'redirectUrl' => '/auth',
            'email_sent' => $emailSent,
            'email_error' => $emailSent ? null : 'The account was created, but the verification email could not be sent.',
        ], 201);
    }

    public function logout(Request $request)
    {
        $accessToken = $request->user()->currentAccessToken();

        if ($accessToken && method_exists($accessToken, 'delete')) {
            $accessToken->delete();
        }

        Auth::guard('web')->logout();

        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->noContent();
    }

    public function forgotPassword(Request $request)
    {
        $validated = $request->validate(['email' => ['required', 'email', 'max:255']]);
        $user = User::where('email', $validated['email'])->first();

        if ($user) {
            try {
                SensitiveMailTransport::assertSafe();
                $plainToken = Str::random(64);
                $user->update([
                    'reset_token' => hash('sha256', $plainToken),
                    'reset_token_expires_at' => now()->addHour(),
                ]);
                Mail::to($user->email)->send(new PasswordResetMail($user, $plainToken));
            } catch (\Throwable $exception) {
                Log::error('Password reset email failed.', [
                    'user_id' => $user->id,
                    'exception' => $exception,
                ]);
            }
        }

        return response()->json([
            'message' => 'If this email exists in our system, you will receive a password reset link.',
        ]);
    }

    public function resetPassword(Request $request)
    {
        $validated = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()],
        ]);
        $user = User::where('email', $validated['email'])->first();
        $hashedToken = hash('sha256', $validated['token']);

        if (! $user || ! hash_equals((string) $user->reset_token, $hashedToken)) {
            return response()->json(['message' => 'Invalid token or email.'], 422);
        }

        if (! $user->reset_token_expires_at || $user->reset_token_expires_at->isPast()) {
            return response()->json(['message' => 'Password reset link has expired.'], 422);
        }

        $user->update([
            'password' => Hash::make($validated['password']),
            'reset_token' => null,
            'reset_token_expires_at' => null,
        ]);
        $user->tokens()->delete();

        return response()->json(['message' => 'Password has been reset.']);
    }

    private function sendVerificationEmail(User $user): bool
    {
        try {
            SensitiveMailTransport::assertSafe();
            $url = URL::temporarySignedRoute(
                'verification.verify',
                now()->addHours(24),
                ['id' => $user->id],
            );
            Mail::to($user->email)->send(new VerifyEmailMail($user, $url));

            return true;
        } catch (\Throwable $exception) {
            Log::error('Verification email failed.', [
                'user_id' => $user->id,
                'exception' => $exception,
            ]);

            return false;
        }
    }
}
