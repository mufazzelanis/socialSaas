<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Notifications\ResetPasswordNotification;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'password', 'phone', 'role'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected $appends = ['allowed_platforms'];

    public function socialAccounts()
    {
        return $this->hasMany(SocialAccount::class);
    }

    public function posts()
    {
        return $this->hasMany(Post::class);
    }

    public function activityLogs()
    {
        return $this->hasMany(ActivityLog::class);
    }

    public function platformPermissions()
    {
        return $this->hasMany(UserPlatformPermission::class);
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === 'super_admin';
    }

    /**
     * Override the framework default, which builds a link to a web route
     * that doesn't exist here (this backend is API-only) — point the reset
     * link at the React frontend instead.
     */
    public function sendPasswordResetNotification($token): void
    {
        $resetUrl = rtrim(config('app.frontend_url'), '/')
            .'/reset-password?token='.$token.'&email='.urlencode($this->email);

        $this->notify(new ResetPasswordNotification($resetUrl));
    }

    /**
     * Super admins implicitly have every platform; everyone else needs an
     * explicit grant in user_platform_permissions.
     */
    public function hasPlatformPermission(string $platform): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        return $this->platformPermissions()->where('platform', $platform)->exists();
    }

    public function getAllowedPlatformsAttribute(): array
    {
        if ($this->isSuperAdmin()) {
            return config('social.platforms');
        }

        if ($this->relationLoaded('platformPermissions')) {
            return $this->platformPermissions->pluck('platform')->all();
        }

        return $this->platformPermissions()->pluck('platform')->all();
    }

    /**
     * Replace this user's platform permissions with exactly the given set.
     */
    public function syncAllowedPlatforms(array $platforms, ?User $grantedBy = null): void
    {
        $valid = array_values(array_intersect($platforms, config('social.platforms')));

        $this->platformPermissions()->delete();

        foreach ($valid as $platform) {
            $this->platformPermissions()->create([
                'platform' => $platform,
                'granted_by' => $grantedBy?->id,
                'created_at' => now(),
            ]);
        }
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'last_login_at' => 'datetime',
        ];
    }
}
