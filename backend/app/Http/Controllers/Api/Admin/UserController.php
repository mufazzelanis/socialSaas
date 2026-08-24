<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Notifications\AdminCreatedAccountNotification;
use App\Services\ActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $users = User::withCount(['socialAccounts', 'posts'])
            ->with('platformPermissions')
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json($users);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')],
            'phone' => ['nullable', 'string', 'max:30'],
            'password' => ['nullable', 'string', 'min:8'],
            'role' => ['sometimes', Rule::in(['user', 'super_admin'])],
            'allowed_platforms' => ['sometimes', 'array'],
            'allowed_platforms.*' => [Rule::in(config('social.platforms'))],
        ]);

        // Admin-created accounts get a password set here rather than by the
        // user themself. If the admin doesn't set one, generate a strong
        // random one and hand it back once in this response — never logged
        // or stored anywhere in plaintext.
        $generatedPassword = null;
        if (empty($data['password'])) {
            $generatedPassword = Str::password(14);
        }
        $plainPassword = $data['password'] ?? $generatedPassword;

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'role' => $data['role'] ?? 'user',
            'password' => Hash::make($plainPassword),
        ]);

        $user->syncAllowedPlatforms($data['allowed_platforms'] ?? [], $request->user());

        ActivityLogger::log($request->user(), 'user_created_by_admin', "Created user account for {$user->email}.", ['created_user_id' => $user->id]);

        $emailSent = false;
        try {
            $user->notify(new AdminCreatedAccountNotification($plainPassword));
            $emailSent = true;
        } catch (\Throwable $e) {
            // Account creation still succeeds even if mail delivery fails —
            // the admin still sees the password in this response as a fallback.
            report($e);
        }

        $payload = $user->fresh(['platformPermissions'])->toArray();
        $payload['email_sent'] = $emailSent;

        if ($generatedPassword) {
            $payload['generated_password'] = $generatedPassword;
        }

        return response()->json($payload, 201);
    }

    public function update(Request $request, User $user)
    {
        $data = $request->validate([
            'role' => ['sometimes', Rule::in(['user', 'super_admin'])],
            'allowed_platforms' => ['sometimes', 'array'],
            'allowed_platforms.*' => [Rule::in(config('social.platforms'))],
        ]);

        if (isset($data['role']) && $user->id === $request->user()->id && $data['role'] !== 'super_admin') {
            abort(422, 'You cannot remove your own super admin access.');
        }

        if (isset($data['role'])) {
            $user->update(['role' => $data['role']]);
        }

        if (isset($data['allowed_platforms'])) {
            $user->syncAllowedPlatforms($data['allowed_platforms'], $request->user());
            ActivityLogger::log($request->user(), 'permissions_updated', "Updated platform permissions for {$user->email}.", [
                'target_user_id' => $user->id,
                'allowed_platforms' => $data['allowed_platforms'],
            ]);
        }

        return response()->json($user->fresh(['platformPermissions']));
    }
}
