<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureActiveUser
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user()?->isActive) {
            $request->user()?->currentAccessToken()?->delete();

            return response()->json([
                'message' => 'Your account is inactive. Please contact an administrator.',
            ], Response::HTTP_FORBIDDEN);
        }

        return $next($request);
    }
}
