<?php

namespace App\Models;

use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Database\Eloquent\Model;

class AiSetting extends Model
{
    protected $fillable = [
        'provider',
        'api_key',
        'model',
        'image_model',
        'is_enabled',
        'updated_by',
    ];

    protected $hidden = [
        'api_key',
    ];

    protected $appends = [
        'has_key',
    ];

    protected function casts(): array
    {
        return [
            'api_key' => 'encrypted',
            'is_enabled' => 'boolean',
        ];
    }

    /**
     * There's always exactly one settings row. Not firstOrCreate(['id' =>
     * 1]) — see BrandSetting::current() for why relying on a specific id
     * breaks permanently the moment that row is ever gone.
     */
    public static function current(): self
    {
        return static::query()->first() ?? static::create([]);
    }

    public function getHasKeyAttribute(): bool
    {
        return ! empty($this->attributes['api_key'] ?? null);
    }

    public function updatedBy()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * The real key can fail to decrypt if APP_KEY changed since it was
     * saved — callers that need the actual key (not just "is one set")
     * should use this rather than the raw attribute, and treat null the
     * same as "not configured" rather than letting a 500 bubble up.
     */
    public function getDecryptedApiKey(): ?string
    {
        try {
            return $this->api_key;
        } catch (DecryptException) {
            return null;
        }
    }
}
