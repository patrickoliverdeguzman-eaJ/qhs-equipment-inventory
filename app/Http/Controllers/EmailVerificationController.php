<?php

namespace App\Http\Controllers;

use App\Mail\VerifyEmailMail;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;

class EmailVerificationController extends Controller
{
    public function verifySigned(Request $request, int $id)
    {
        if (! $request->hasValidSignature()) {
            return response()->json(['message' => 'Invalid or expired verification link.'], 403);
        }

        $user = User::findOrFail($id);
        $status = $user->email_verified_at ? 'already_verified' : 'success';

        if (! $user->email_verified_at) {
            $user->update([
                'email_verified_at' => now(),
                'email_verification_token' => null,
                'email_verification_expires_at' => null,
            ]);
        }

        return redirect(rtrim(config('app.frontend_url'), '/').'/verify-email?status='.$status);
    }

    public function resendVerificationEmail(Request $request)
    {
        $validated = $request->validate(['email' => ['required', 'email', 'max:255']]);
        $user = User::where('email', $validated['email'])->first();

        if ($user && ! $user->email_verified_at) {
            try {
                $url = URL::temporarySignedRoute(
                    'verification.verify',
                    now()->addHours(24),
                    ['id' => $user->id],
                );
                Mail::to($user->email)->send(new VerifyEmailMail($user, $url));
            } catch (\Throwable $exception) {
                Log::error('Verification email resend failed.', [
                    'user_id' => $user->id,
                    'exception' => $exception,
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'If that account needs verification, a new email will be sent.',
        ]);
    }

    public function checkVerificationStatus(Request $request)
    {
        return response()->json([
            'verified' => $request->user()->email_verified_at !== null,
            'email' => $request->user()->email,
            'verified_at' => $request->user()->email_verified_at,
        ]);
    }
}
