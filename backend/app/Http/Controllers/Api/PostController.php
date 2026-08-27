<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Post;
use App\Models\PostPlatform;
use App\Models\SocialAccount;
use App\Services\ActivityLogger;
use App\Services\PostPublishingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class PostController extends Controller
{
    public function __construct(protected PostPublishingService $publishingService)
    {
    }

    // Matches the `mimes:` list below. Deciding "is this a video" from the
    // file extension rather than the sniffed MIME type is deliberate — PHP's
    // fileinfo detection is inconsistent across containers/codecs (some MP4s
    // sniff as `application/mp4`, some MKVs as `application/octet-stream`,
    // never `video/*`), which previously made large legitimate videos get
    // silently measured against the 10MB *image* cap instead of the correct
    // one. The `mimes:` rule already separately guards against a spoofed
    // extension (e.g. a renamed .exe), so this is safe to rely on.
    //
    // Deliberately NOT literally "any format" — that would accept scripts/
    // executables renamed with a fake extension into public storage. This
    // covers every video container in common real-world use instead.
    protected const VIDEO_EXTENSIONS = [
        'mp4', 'm4v', 'mov', 'avi', 'wmv', 'flv', 'webm', 'mkv', '3gp', '3g2',
        'mpeg', 'mpg', 'm2v', 'ts', 'mts', 'm2ts', 'vob', 'ogv', 'asf', 'f4v', 'divx', 'mxf',
    ];

    protected function isVideoUpload($file): bool
    {
        return in_array(strtolower($file->getClientOriginalExtension()), self::VIDEO_EXTENSIONS, true);
    }

    /**
     * Shared per-file validation rules for a single media upload — used for
     * both a lone file and each item of a multi-file upload alike.
     */
    protected function mediaItemRules(): array
    {
        return [
            'file',
            'mimes:jpg,jpeg,png,gif,webp,bmp,'.implode(',', self::VIDEO_EXTENSIONS),
            function ($attribute, $value, $fail) {
                $isVideo = $this->isVideoUpload($value);
                $maxKb = $isVideo ? 2097152 : 10240; // 2GB video, 10MB image
                if ($value->getSize() > $maxKb * 1024) {
                    $fail($isVideo
                        ? 'Videos must be 2GB or smaller.'
                        : 'Images must be 10MB or smaller.');
                }
            },
        ];
    }

    /**
     * Persists uploaded files as ordered post_media rows — 1 file behaves
     * exactly like the old single-attachment posts, 2+ becomes a carousel/
     * album/media-group depending on what each platform's Publisher does
     * with multiple items.
     *
     * @param  \Illuminate\Http\UploadedFile[]  $files
     */
    protected function storeMedia(Post $post, array $files): void
    {
        foreach (array_values($files) as $position => $file) {
            $post->media()->create([
                'path' => $file->store('posts', 'public'),
                'type' => $this->isVideoUpload($file) ? 'video' : 'image',
                'position' => $position,
            ]);
        }
    }

    /**
     * Removes every media item a post has — post_media rows (new posts) and
     * the legacy media_path column (posts from before that table existed)
     * alike — deleting the underlying files, not just the DB rows.
     */
    protected function deleteAllMedia(Post $post): void
    {
        foreach ($post->media as $item) {
            Storage::disk('public')->delete($item->path);
        }
        $post->media()->delete();

        if ($post->media_path) {
            Storage::disk('public')->delete($post->media_path);
            $post->update(['media_path' => null, 'media_type' => null]);
        }
    }

    public function index(Request $request)
    {
        $posts = $request->user()->posts()
            ->with('platforms.socialAccount', 'media')
            ->latest()
            ->paginate(15);

        return response()->json($posts);
    }

    public function show(Request $request, Post $post)
    {
        abort_unless($post->user_id === $request->user()->id, 403);

        return response()->json($post->load('platforms.socialAccount', 'media'));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            // The composer sends rich HTML from its editor as content_html;
            // plain `content` still works too (e.g. direct API use) — if
            // both are missing or produce empty text, this fails below.
            'content' => ['nullable', 'string'],
            'content_html' => ['nullable', 'string'],
            'social_account_ids' => ['required', 'array', 'min:1'],
            'social_account_ids.*' => ['integer', 'exists:social_accounts,id'],
            // 1 file behaves exactly as a single image/video always did; 2+
            // becomes a carousel/album/media-group. Capped at 10 — the
            // ceiling every platform here already imposes on its own
            // carousel/media-group (Instagram, Telegram), so nothing
            // gets accepted here only to fail once publishing is attempted.
            'media' => ['sometimes', 'array', 'max:10'],
            'media.*' => $this->mediaItemRules(),
            'publish_now' => ['sometimes', 'boolean'],
            // A future timestamp to auto-publish at instead of right now.
            // When present it always wins over publish_now — you can't both
            // schedule and immediately publish the same post.
            'scheduled_at' => ['nullable', 'date', 'after:now'],
            // Optional per-platform caption overrides, keyed by
            // social_account_id (as sent in social_account_ids[] above).
            // A platform without an entry here — or with an empty one —
            // just uses the shared content above.
            'platform_content' => ['sometimes', 'array'],
            'platform_content.*' => ['nullable', 'string'],
        ]);

        $accounts = SocialAccount::whereIn('id', $data['social_account_ids'])
            ->where('user_id', $request->user()->id)
            ->get()
            ->filter(fn (SocialAccount $account) => $request->user()->hasPlatformPermission($account->platform));

        abort_if($accounts->isEmpty(), 422, 'No valid, permitted social accounts selected.');

        // None of Facebook/Instagram/LinkedIn render HTML in a post body —
        // they show it as literal tags — so the rich editor's HTML is
        // converted to clean plain text (line breaks preserved) here. It's
        // the one thing every platform can actually display correctly.
        $content = ! empty($data['content_html'])
            ? $this->htmlToPlainText($data['content_html'])
            : trim($data['content'] ?? '');

        abort_if($content === '', 422, 'Post content cannot be empty.');

        $scheduledAt = $data['scheduled_at'] ?? null;

        $post = $request->user()->posts()->create([
            'content' => $content,
            'status' => $scheduledAt ? 'scheduled' : 'draft',
            'scheduled_at' => $scheduledAt,
        ]);

        if ($request->hasFile('media')) {
            $this->storeMedia($post, $request->file('media'));
        }

        $platformContent = $data['platform_content'] ?? [];

        foreach ($accounts as $account) {
            // The override arrives as plain text from the composer's simple
            // per-platform textarea (unlike the main content, it doesn't go
            // through the rich-text editor, so no HTML-to-text conversion
            // is needed here — just trim it).
            $override = trim((string) ($platformContent[$account->id] ?? ''));

            $post->platforms()->create([
                'social_account_id' => $account->id,
                'platform' => $account->platform,
                'content_override' => $override !== '' ? $override : null,
                'status' => 'pending',
            ]);
        }

        ActivityLogger::log($request->user(), 'post_created', "Created post #{$post->id}.", ['post_id' => $post->id]);

        // A schedule always wins — even if the composer somehow also sent
        // publish_now, we never publish immediately once a future time is set.
        if (! $scheduledAt && $request->boolean('publish_now', true)) {
            $this->publishingService->publishPost($post);
        }

        return response()->json($post->load('platforms.socialAccount', 'media'), 201);
    }

    public function publish(Request $request, Post $post)
    {
        abort_unless($post->user_id === $request->user()->id, 403);

        $this->publishingService->publishPost($post);

        return response()->json($post->load('platforms.socialAccount', 'media'));
    }

    /**
     * Edit a post's content/media after the fact — mainly for fixing why a
     * platform failed (e.g. Instagram rejecting a text-only post) so the
     * user can attach media and retry, without recreating the whole post
     * and losing the platforms that already succeeded.
     */
    public function update(Request $request, Post $post)
    {
        abort_unless($post->user_id === $request->user()->id, 403);

        $data = $request->validate([
            'content' => ['nullable', 'string'],
            'content_html' => ['nullable', 'string'],
            // Uploading here REPLACES the post's entire media set (matches
            // the old single-attachment "Replace image/video" behaviour),
            // not appends to it.
            'media' => ['sometimes', 'array', 'max:10'],
            'media.*' => $this->mediaItemRules(),
            // Lets the "Edit" form clear all attached media without
            // uploading a replacement.
            'remove_media' => ['sometimes', 'boolean'],
            // Reschedule a scheduled/draft post, or pass null to cancel the
            // schedule and drop it back to a draft. `sometimes` so posts
            // that aren't touching their schedule don't need to send this.
            'scheduled_at' => ['sometimes', 'nullable', 'date', 'after:now'],
            // Per-platform caption edits, keyed by post_platform id (not
            // social_account_id — unlike store(), the platforms already
            // exist here). An empty string clears back to the shared content.
            'platform_content' => ['sometimes', 'array'],
            'platform_content.*' => ['nullable', 'string'],
        ]);

        $updates = [];

        if (array_key_exists('scheduled_at', $data)) {
            abort_unless(
                in_array($post->status, ['draft', 'scheduled'], true),
                422,
                'Only a draft or scheduled post can have its schedule changed.'
            );
            $updates['scheduled_at'] = $data['scheduled_at'];
            $updates['status'] = $data['scheduled_at'] ? 'scheduled' : 'draft';
        }

        if (array_key_exists('content_html', $data) && $data['content_html'] !== null) {
            $updates['content'] = $this->htmlToPlainText($data['content_html']);
        } elseif (array_key_exists('content', $data) && $data['content'] !== null) {
            $updates['content'] = trim($data['content']);
        }

        if (isset($updates['content']) && $updates['content'] === '') {
            abort(422, 'Post content cannot be empty.');
        }

        $mediaChanged = false;

        if ($request->hasFile('media')) {
            $this->deleteAllMedia($post);
            $this->storeMedia($post, $request->file('media'));
            $mediaChanged = true;
        } elseif ($request->boolean('remove_media')) {
            $this->deleteAllMedia($post);
            $mediaChanged = true;
        }

        if (! empty($updates)) {
            $post->update($updates);
        }
        if (! empty($updates) || $mediaChanged) {
            ActivityLogger::log($request->user(), 'post_edited', "Edited post #{$post->id}.", ['post_id' => $post->id]);
        }

        if (array_key_exists('platform_content', $data)) {
            foreach ($data['platform_content'] as $postPlatformId => $override) {
                $postPlatform = $post->platforms->firstWhere('id', (int) $postPlatformId);
                if (! $postPlatform) {
                    continue;
                }
                $override = trim((string) $override);
                $postPlatform->update(['content_override' => $override !== '' ? $override : null]);
            }
        }

        return response()->json($post->load('platforms.socialAccount', 'media'));
    }

    public function retryPlatform(Request $request, Post $post, PostPlatform $postPlatform)
    {
        abort_unless($post->user_id === $request->user()->id, 403);
        abort_unless($postPlatform->post_id === $post->id, 404);

        $this->publishingService->publishToOnePlatform($postPlatform);
        $this->publishingService->refreshPostStatus($post);

        return response()->json($post->load('platforms.socialAccount', 'media'));
    }

    /**
     * Convert the composer's rich-text HTML into clean plain text, keeping
     * paragraph/line breaks so multi-line posts stay readable.
     */
    protected function htmlToPlainText(string $html): string
    {
        $withBreaks = preg_replace('/<(br|\/p|\/div|\/li|\/h[1-6])\s*\/?>/i', "\n", $html);
        $text = html_entity_decode(strip_tags($withBreaks), ENT_QUOTES);
        $text = preg_replace('/\n{3,}/', "\n\n", $text);

        return trim($text);
    }

    public function destroy(Request $request, Post $post)
    {
        abort_unless($post->user_id === $request->user()->id, 403);

        $this->deleteAllMedia($post);
        $post->delete();

        return response()->json(['message' => 'Post deleted.']);
    }
}
