<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class DigitalProduct extends Model
{
    protected $fillable = [
        'title',
        'description',
        'price',
        'image_path',
        'file_path',
        'file_name',
        'is_enabled',
        'sort_order',
        'updated_by',
    ];

    protected $hidden = [
        'file_path', // never expose the private storage path itself
    ];

    protected $appends = [
        'image_url',
        'price_bdt',
        'has_file',
    ];

    protected function casts(): array
    {
        return [
            'is_enabled' => 'boolean',
            'sort_order' => 'integer',
            'price' => 'integer',
        ];
    }

    public function getImageUrlAttribute(): ?string
    {
        return $this->image_path ? asset('storage/'.$this->image_path) : null;
    }

    // Stored as poisha (price * 100) to avoid float rounding on money —
    // this is what the storefront/admin UI actually displays and edits.
    public function getPriceBdtAttribute(): float
    {
        return round($this->price / 100, 2);
    }

    public function getHasFileAttribute(): bool
    {
        return ! empty($this->attributes['file_path'] ?? null);
    }

    public function fileExists(): bool
    {
        return $this->file_path && Storage::disk('local')->exists($this->file_path);
    }

    public function updatedBy()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function orders()
    {
        return $this->hasMany(Order::class);
    }
}
