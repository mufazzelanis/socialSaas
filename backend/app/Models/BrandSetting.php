<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BrandSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'brand_name',
        'logo_path',
        'favicon_path',
        'primary_color',
    ];

    protected $appends = [
        'logo_url',
        'favicon_url',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
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
