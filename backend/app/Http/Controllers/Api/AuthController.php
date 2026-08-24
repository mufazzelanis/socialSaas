<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\ActivityLogger;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')],
            'phone' => ['nullable', 'string', 'max:30'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'password' => Hash::make($data['password']),
        ]);

        if (config('social.grant_all_platforms_on_registration')) {
            $user->syncAllowedPlatforms(config('social.platforms'));
        }

        $this->recordLogin($user);

        ActivityLogger::log($user, 'register', 'Account created.');

        $token = $user->createToken('social-saas')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
        ], 201);
    }

    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $data['email'])->first();

        // The reason is logged so an admin can tell "someone's guessing
        // random emails" apart from "a real user mistyped their password" —
        // never the attempted password itself, which is never logged or
        // stored anywhere after hashing, no matter what.
        if (! $user) {
            ActivityLogger::log(null, 'login_failed', "Login attempt for an email with no account [{$data['email']}].", [
                'reason' => 'no_account',
                'attempted_email' => $data['email'],
            ]);

            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if (! Hash::check($data['password'], $user->password)) {
            ActivityLogger::log($user, 'login_failed', "Wrong password entered for {$user->email}.", [
                'reason' => 'wrong_password',
            ]);

            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $this->recordLogin($user);

        ActivityLogger::log($user, 'login', 'Logged in.');

        $token = $user->createToken('social-saas')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
        ]);
    }

    public function logout(Request $request)
    {
        ActivityLogger::log($request->user(), 'logout', 'Logged out.');

        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out.']);
    }

    public function me(Request $request)
    {
        return response()->json($request->user());
    }

    public function forgotPassword(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'string', 'email'],
        ]);

        $status = Password::sendResetLink(['email' => $data['email']]);

        if ($status === Password::RESET_LINK_SENT) {
            ActivityLogger::log(User::where('email', $data['email'])->first(), 'password_reset_requested', 'Password reset link requested.');
        }

        // Always return the same generic message regardless of whether the
        // email is registered — otherwise this endpoint becomes a way to
        // check which emails have accounts here.
        return response()->json([
            'message' => 'If an account exists for that email, a password reset link has been sent.',
        ]);
    }

    public function resetPassword(Request $request)
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $status = Password::reset(
            $data,
            function (User $user, string $password) {
                $user->forceFill([
                    'password' => Hash::make($password),
                    'remember_token' => Str::random(60),
                ])->save();

                // A password reset invalidates any tokens issued before it —
                // if someone else had a stolen token, this locks them out too.
                $user->tokens()->delete();

                event(new PasswordReset($user));

                ActivityLogger::log($user, 'password_reset', 'Password was reset.');
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages([
                'email' => [__($status)],
            ]);
        }

        $user = User::where('email', $data['email'])->first();
        $token = $user->createToken('social-saas')->plainTextToken;

        return response()->json([
            'message' => 'Password reset successfully.',
            'user' => $user,
            'token' => $token,
        ]);
    }

    protected function recordLogin(User $user): void
    {
        $user->forceFill([
            'last_login_at' => now(),
            'last_login_ip' => request()->ip(),
        ])->save();
    }
}
