<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SiteSetting extends Model
{
    protected $fillable = [
        'telegram_channel_url',
        'telegram_button_enabled',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'telegram_button_enabled' => 'boolean',
        ];
    }

    /**
     * There's always exactly one settings row — everything here is
     * site-wide, not per-user.
     */
    public static function current(): self
    {
        // ->fresh() ensures DB-level column defaults (e.g. is_enabled=false)
        // are actually loaded — a model just created via firstOrCreate only
        // has the attributes it explicitly set in memory, not every column's
        // default value, until re-fetched.
        return static::firstOrCreate(['id' => 1])->fresh();
    }
}
