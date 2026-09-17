<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class ProfileController extends Controller
{
    /**
     * Update user profile information
     */
    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'address' => 'nullable|string|max:500',
            'avatar' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:4096',
        ]);
        $oldAvatar = null;

        // Handle avatar upload
        if ($request->hasFile('avatar')) {
            $oldAvatar = $user->avatar;
            $path = $request->file('avatar')->store('avatars', 'public');
            $validated['avatar'] = $path;
        }

        // Update user
        $user->update([
            'name' => $validated['name'],
            'address' => $validated['address'] ?? $user->address,
            'avatar' => $validated['avatar'] ?? $user->avatar,
        ]);

        if ($oldAvatar) {
            Storage::disk('public')->delete($oldAvatar);
        }

        return response()->json([
            'message' => 'Profile updated successfully',
            'user' => $user,
        ], 200);
    }

    /**
     * Update user password
     */
    public function updatePassword(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'current_password' => 'required|string',
            'new_password' => ['required', 'string', 'confirmed', Password::min(8)->letters()->numbers()],
        ]);

        // Check if current password is correct
        if (! Hash::check($validated['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The provided password does not match our records.'],
            ]);
        }

        // Update password
        $user->update([
            'password' => Hash::make($validated['new_password']),
        ]);
        $user->tokens()->delete();

        if ($request->hasSession()) {
            Auth::guard('web')->login($user->fresh());
            $request->session()->regenerate();
        }

        return response()->json([
            'message' => 'Password updated successfully',
        ], 200);
    }
}
