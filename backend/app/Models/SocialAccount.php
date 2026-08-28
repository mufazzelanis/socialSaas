<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SocialAccount extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'platform',
        'account_id',
        'account_name',
        'access_token',
        'refresh_token',
        'token_expires_at',
        'meta',
        'status',
    ];

    protected $hidden = [
        'access_token',
        'refresh_token',
    ];

    protected function casts(): array
    {
        return [
            'access_token' => 'encrypted',
            'refresh_token' => 'encrypted',
            'meta' => 'array',
            'token_expires_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function postPlatforms()
    {
        return $this->hasMany(PostPlatform::class);
    }

    public function conversations()
    {
        return $this->hasMany(Conversation::class);
    }
}
