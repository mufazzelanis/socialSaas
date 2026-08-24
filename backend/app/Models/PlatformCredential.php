<?php

namespace App\Models;

use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Database\Eloquent\Model;

class PlatformCredential extends Model
{
    protected $fillable = [
        'platform',
        'client_id',
        'client_secret',
        'config_id',
        'is_enabled',
        'updated_by',
    ];

    protected $hidden = [
        'client_secret',
    ];

    protected $appends = [
        'has_secret',
        'client_secret_masked',
    ];

    protected function casts(): array
    {
        return [
            'client_secret' => 'encrypted',
            'is_enabled' => 'boolean',
        ];
    }

    public function getHasSecretAttribute(): bool
    {
        return ! empty($this->attributes['client_secret'] ?? null);
    }

    public function getClientSecretMaskedAttribute(): ?string
    {
        if (! $this->has_secret) {
            return null;
        }

        // The value can fail to decrypt if APP_KEY changed since it was
        // saved — treat that as "not set" rather than 500ing the whole
        // credentials list.
        try {
            return '••••••••' . substr($this->client_secret, -4);
        } catch (DecryptException) {
            return null;
        }
    }

    public function updatedBy()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
