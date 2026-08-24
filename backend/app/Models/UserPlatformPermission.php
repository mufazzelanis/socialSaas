<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserPlatformPermission extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'platform',
        'granted_by',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
