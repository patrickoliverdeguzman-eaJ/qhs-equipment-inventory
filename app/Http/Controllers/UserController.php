<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Traits\ActionLogger;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class UserController extends Controller
{
    use ActionLogger;

    /**
     * Display a listing of the users.
     *
     * @return AnonymousResourceCollection
     */
    public function index(Request $request)
    {
        $query = User::query()->orderBy('id', 'desc');

        if ($request->user()->isCustodian()) {
            $query->where('role', 'user')->where('isActive', true);
        } elseif ($request->filled('role')) {
            $request->validate(['role' => 'in:admin,custodian,user']);
            $query->where('role', $request->string('role'));
        }

        return UserResource::collection($query->paginate(min(100, max(1, $request->integer('per_page', 50)))));
    }

    /**
     * Store a newly created user in storage.
     *
     * @return Response
     */
    public function store(StoreUserRequest $request)
    {
        $data = $request->validated();

        // Hash the password if it exists in the request
        if (isset($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        }

        // Handle avatar file upload
        if ($request->hasFile('avatar')) {
            $avatar = $request->file('avatar');
            $avatarName = Str::random(32).'.'.$avatar->extension();
            $data['avatar'] = $avatar->storeAs('avatars', $avatarName, 'public');
        }

        $data['isActive'] ??= true;

        // Auto-verify email for users created by admin
        $data['email_verified_at'] = now();

        // Create the user
        $user = User::create($data);

        $this->logAction('user_created', ['user_id' => $user->id]);

        return response(new UserResource($user), 201);
    }

    /**
     * Display the specified user.
     *
     * @return UserResource
     */
    public function show(User $user)
    {
        return new UserResource($user);
    }

    /**
     * Update the specified user in storage.
     *
     * @return UserResource
     */
    public function update(UpdateUserRequest $request, User $user)
    {
        $data = $request->validated();
        $oldAvatar = null;

        $willRemainActiveAdmin = ($data['role'] ?? $user->role) === 'admin'
            && (bool) ($data['isActive'] ?? $user->isActive);

        if (! $willRemainActiveAdmin && ! User::query()
            ->whereKeyNot($user->id)
            ->where('role', 'admin')
            ->where('isActive', true)
            ->exists()) {
            throw ValidationException::withMessages([
                'user' => ['At least one active administrator account is required.'],
            ]);
        }

        // Hash the password if it exists in the request
        if (isset($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        }

        // Handle avatar file upload
        if ($request->hasFile('avatar')) {
            $oldAvatar = $user->avatar;
            $avatar = $request->file('avatar');
            $avatarName = Str::random(32).'.'.$avatar->extension();
            $data['avatar'] = $avatar->storeAs('avatars', $avatarName, 'public');
        }

        // Update the user
        $user->update($data);

        if ($oldAvatar) {
            Storage::disk('public')->delete($oldAvatar);
        }

        if (array_key_exists('isActive', $data) && ! $data['isActive']) {
            $user->tokens()->delete();
        }

        $this->logAction('user_updated', ['user_id' => $user->id]);

        return new UserResource($user);
    }

    /**
     * Remove the specified user from storage.
     *
     * @return Response
     */
    public function destroy(User $user)
    {
        if (auth()->id() === $user->id) {
            return response()->json(['message' => 'You cannot delete your own account.'], 422);
        }

        if ($user->role === 'admin' && ! User::query()
            ->whereKeyNot($user->id)
            ->where('role', 'admin')
            ->where('isActive', true)
            ->exists()) {
            return response()->json(['message' => 'The final active administrator account cannot be deleted.'], 422);
        }

        // Delete the user's avatar if it exists
        if ($user->avatar) {
            Storage::disk('public')->delete($user->avatar);
        }

        // Delete the user
        $user->delete();

        $this->logAction('user_deleted', ['user_id' => $user->id]);

        return response()->noContent();
    }
}
