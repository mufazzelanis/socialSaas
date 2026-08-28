<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BrandSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'updated_by',
        'brand_name',
        'logo_path',
        'favicon_path',
        'primary_color',
    ];

    protected $appends = [
        'logo_url',
        'favicon_url',
    ];

    /**
     * There's always exactly one settings row — branding is site-wide (every
     * user's dashboard shows the same logo/favicon/color), not per-user.
     *
     * Deliberately not firstOrCreate(['id' => 1]) — relying on id=1
     * specifically breaks permanently the moment that exact row is ever
     * gone (this actually happened: a cascade delete from the old user_id
     * foreign key, before it was migrated to a nullable updated_by).
     * Nothing would ever match id=1 again, silently creating a fresh, empty
     * row on every single call forever after — the saved logo/favicon look
     * like they vanished, when they're really just orphaned in an
     * unreachable row. Just take whichever row actually exists instead.
     */
    public static function current(): self
    {
        return static::query()->first() ?? static::create([]);
    }

    public function updatedBy()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function getLogoUrlAttribute(): ?string
    {
        return $this->logo_path ? asset('storage/'.$this->logo_path) : null;
    }

    public function getFaviconUrlAttribute(): ?string
    {
        return $this->favicon_path ? asset('storage/'.$this->favicon_path) : null;
    }
}
