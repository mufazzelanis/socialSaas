<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SiteSetting extends Model
{
    protected $fillable = [
        'telegram_channel_url',
        'telegram_button_enabled',
        'facebook_pixel_id',
        'facebook_pixel_enabled',
        'shop_whatsapp_number',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'telegram_button_enabled' => 'boolean',
            'facebook_pixel_enabled' => 'boolean',
        ];
    }

    /**
     * There's always exactly one settings row — everything here is
     * site-wide, not per-user.
     */
    public static function current(): self
    {
        // Not firstOrCreate(['id' => 1]) — relying on id=1 specifically
        // breaks permanently the moment that exact row is ever gone (a
        // stray cascade delete, a migrate:fresh, ...): nothing would ever
        // match id=1 again, silently creating a fresh, empty row on every
        // single call forever after, with saved settings orphaned and
        // unreachable. There's always at most one row anyway, so just take
        // whichever one actually exists.
        //
        // ->fresh() on the newly-created branch ensures DB-level column
        // defaults (e.g. is_enabled=false) are actually loaded — a model
        // just created only has the attributes it explicitly set in memory,
        // not every column's default value, until re-fetched.
        return static::query()->first() ?? static::create([])->fresh();
    }
}
