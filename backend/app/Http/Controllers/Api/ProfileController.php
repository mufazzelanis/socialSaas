<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ProfileController extends Controller
{
    /**
     * Self-service profile update — every authenticated user can change
     * their own name/email/phone and password here. This is deliberately
     * separate from Admin\UserController::update, which handles role and
     * platform-permission changes that only a super admin may make.
     */
    public function update(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'phone' => ['nullable', 'string', 'max:30'],
            'current_password' => ['nullable', 'string', 'required_with:new_password'],
            'new_password' => ['nullable', 'string', 'min:8', 'confirmed'],
        ]);

        if (! empty($data['new_password'])) {
            if (! Hash::check($data['current_password'], $user->password)) {
                throw ValidationException::withMessages([
                    'current_password' => ['Your current password is incorrect.'],
                ]);
            }

            $user->password = Hash::make($data['new_password']);
        }

        $user->name = $data['name'];
        $user->email = $data['email'];
        $user->phone = $data['phone'] ?? null;
        $user->save();

        ActivityLogger::log($user, 'profile_updated', 'Updated their own profile.');

        return response()->json($user->fresh());
    }
}
