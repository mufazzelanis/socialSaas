<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class Post extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'content',
        'media_path',
        'media_type',
        'status',
        'scheduled_at',
        'published_at',
    ];

    // media_items is computed (see getMediaItemsAttribute below) so the API
    // always hands the frontend one ready-to-render list — url included —
    // whether this post used the old single-attachment columns or the newer
    // post_media table, without the frontend needing to know which.
    protected $appends = ['media_items'];

    protected function casts(): array
    {
        return [
            'scheduled_at' => 'datetime',
            'published_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function platforms()
    {
        return $this->hasMany(PostPlatform::class);
    }

    public function media()
    {
        return $this->hasMany(PostMedia::class)->orderBy('position');
    }

    /**
     * Normalized media list for this post as [['path' => ..., 'type' =>
     * 'image'|'video'], ...], in display/attach order — every publisher
     * reads media through this instead of post_media or media_path/
     * media_type directly, so the "old vs new storage" branch lives in one
     * place. Posts created before the post_media table existed only have
     * the single legacy media_path/media_type pair; posts created after
     * always go through post_media, even for a single attachment.
     */
    public function mediaItems(): \Illuminate\Support\Collection
    {
        $items = $this->relationLoaded('media') ? $this->media : $this->media()->get();

        if ($items->isNotEmpty()) {
            return $items->map(fn (PostMedia $m) => ['path' => $m->path, 'type' => $m->type]);
        }

        if ($this->media_path) {
            return collect([['path' => $this->media_path, 'type' => $this->media_type ?? 'image']]);
        }

        return collect();
    }

    /**
     * JSON-ready version of mediaItems() — adds the public URL each item
     * needs to actually render. This is what the frontend should use
     * (post.media_items), rather than reimplementing the old/new fallback.
     */
    public function getMediaItemsAttribute(): array
    {
        return $this->mediaItems()
            ->map(fn (array $item) => [
                'path' => $item['path'],
                'type' => $item['type'],
                'url' => Storage::disk('public')->url($item['path']),
            ])
            ->values()
            ->all();
    }
}
