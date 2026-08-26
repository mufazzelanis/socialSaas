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
     */
    public static function current(): self
    {
        return static::firstOrCreate(['id' => 1]);
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
