<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureActiveUser
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user()?->isActive) {
            $accessToken = $request->user()?->currentAccessToken();

            if ($accessToken && method_exists($accessToken, 'delete')) {
                $accessToken->delete();
            }

            Auth::guard('web')->logout();

            if ($request->hasSession()) {
                $request->session()->invalidate();
                $request->session()->regenerateToken();
            }

            return response()->json([
                'message' => 'Your account is inactive. Please contact an administrator.',
            ], Response::HTTP_FORBIDDEN);
        }

        return $next($request);
    }
}
