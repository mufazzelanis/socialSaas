<?php

namespace App\Models;

use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Database\Eloquent\Model;

class PaymentSetting extends Model
{
    protected $fillable = [
        'store_id',
        'store_password',
        'is_sandbox',
        'is_enabled',
        'updated_by',
    ];

    protected $hidden = [
        'store_password',
    ];

    protected $appends = [
        'has_password',
    ];

    protected function casts(): array
    {
        return [
            'store_password' => 'encrypted',
            'is_sandbox' => 'boolean',
            'is_enabled' => 'boolean',
        ];
    }

    /**
     * Always exactly one settings row — same current() pattern as
     * AiSetting/BrandSetting/SiteSetting (see BrandSetting::current() for
     * why this isn't firstOrCreate(['id' => 1])).
     */
    public static function current(): self
    {
        return static::query()->first() ?? static::create([]);
    }

    public function getHasPasswordAttribute(): bool
    {
        return ! empty($this->attributes['store_password'] ?? null);
    }

    public function getDecryptedPassword(): ?string
    {
        try {
            return $this->store_password;
        } catch (DecryptException) {
            return null;
        }
    }

    public function updatedBy()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
