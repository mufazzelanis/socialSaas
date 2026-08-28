<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Conversation extends Model
{
    protected $fillable = [
        'social_account_id',
        'participant_id',
        'participant_name',
        'participant_avatar_url',
        'last_message_at',
        'unread_count',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'meta' => 'array',
            'last_message_at' => 'datetime',
        ];
    }

    public function socialAccount()
    {
        return $this->belongsTo(SocialAccount::class);
    }

    public function messages()
    {
        return $this->hasMany(Message::class)->orderBy('created_at');
    }

    public function latestMessage()
    {
        return $this->hasOne(Message::class)->latestOfMany();
    }
}
