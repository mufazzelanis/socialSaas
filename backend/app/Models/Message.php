<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Message extends Model
{
    protected $fillable = [
        'conversation_id',
        'direction',
        'content',
        'media_url',
        'external_message_id',
        'sent_by',
        'status',
        'error_message',
    ];

    public function conversation()
    {
        return $this->belongsTo(Conversation::class);
    }

    public function sentBy()
    {
        return $this->belongsTo(User::class, 'sent_by');
    }
}
