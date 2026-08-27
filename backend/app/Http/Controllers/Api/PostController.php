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

    public function index(Request $request)
    {
        $posts = $request->user()->posts()
            ->with('platforms.socialAccount')
            ->latest()
            ->paginate(15);

        return response()->json($posts);
    }

    public function show(Request $request, Post $post)
    {
        abort_unless($post->user_id === $request->user()->id, 403);

        return response()->json($post->load('platforms.socialAccount'));
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
            'media' => [
                'nullable',
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
            ],
            'publish_now' => ['sometimes', 'boolean'],
            // A future timestamp to auto-publish at instead of right now.
            // When present it always wins over publish_now — you can't both
            // schedule and immediately publish the same post.
            'scheduled_at' => ['nullable', 'date', 'after:now'],
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

        $mediaPath = null;
        $mediaType = null;

        if ($request->hasFile('media')) {
            $file = $request->file('media');
            $mediaPath = $file->store('posts', 'public');
            $mediaType = $this->isVideoUpload($file) ? 'video' : 'image';
        }

        $scheduledAt = $data['scheduled_at'] ?? null;

        $post = $request->user()->posts()->create([
            'content' => $content,
            'media_path' => $mediaPath,
            'media_type' => $mediaType,
            'status' => $scheduledAt ? 'scheduled' : 'draft',
            'scheduled_at' => $scheduledAt,
        ]);

        foreach ($accounts as $account) {
            $post->platforms()->create([
                'social_account_id' => $account->id,
                'platform' => $account->platform,
                'status' => 'pending',
            ]);
        }

        ActivityLogger::log($request->user(), 'post_created', "Created post #{$post->id}.", ['post_id' => $post->id]);

        // A schedule always wins — even if the composer somehow also sent
        // publish_now, we never publish immediately once a future time is set.
        if (! $scheduledAt && $request->boolean('publish_now', true)) {
            $this->publishingService->publishPost($post);
        }

        return response()->json($post->load('platforms.socialAccount'), 201);
    }

    public function publish(Request $request, Post $post)
    {
        abort_unless($post->user_id === $request->user()->id, 403);

        $this->publishingService->publishPost($post);

        return response()->json($post->load('platforms.socialAccount'));
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
            'media' => [
                'nullable',
                'file',
                'mimes:jpg,jpeg,png,gif,webp,bmp,'.implode(',', self::VIDEO_EXTENSIONS),
                function ($attribute, $value, $fail) {
                    $isVideo = $this->isVideoUpload($value);
                    $maxKb = $isVideo ? 2097152 : 10240;
                    if ($value->getSize() > $maxKb * 1024) {
                        $fail($isVideo
                            ? 'Videos must be 2GB or smaller.'
                            : 'Images must be 10MB or smaller.');
                    }
                },
            ],
            // Lets the "Edit" form clear an attached image/video without
            // uploading a replacement.
            'remove_media' => ['sometimes', 'boolean'],
            // Reschedule a scheduled/draft post, or pass null to cancel the
            // schedule and drop it back to a draft. `sometimes` so posts
            // that aren't touching their schedule don't need to send this.
            'scheduled_at' => ['sometimes', 'nullable', 'date', 'after:now'],
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

        if ($request->hasFile('media')) {
            if ($post->media_path) {
                Storage::disk('public')->delete($post->media_path);
            }
            $file = $request->file('media');
            $updates['media_path'] = $file->store('posts', 'public');
            $updates['media_type'] = $this->isVideoUpload($file) ? 'video' : 'image';
        } elseif ($request->boolean('remove_media')) {
            if ($post->media_path) {
                Storage::disk('public')->delete($post->media_path);
            }
            $updates['media_path'] = null;
            $updates['media_type'] = null;
        }

        if (! empty($updates)) {
            $post->update($updates);
            ActivityLogger::log($request->user(), 'post_edited', "Edited post #{$post->id}.", ['post_id' => $post->id]);
        }

        return response()->json($post->load('platforms.socialAccount'));
    }

    public function retryPlatform(Request $request, Post $post, PostPlatform $postPlatform)
    {
        abort_unless($post->user_id === $request->user()->id, 403);
        abort_unless($postPlatform->post_id === $post->id, 404);

        $this->publishingService->publishToOnePlatform($postPlatform);
        $this->publishingService->refreshPostStatus($post);

        return response()->json($post->load('platforms.socialAccount'));
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

        if ($post->media_path) {
            Storage::disk('public')->delete($post->media_path);
        }

        $post->delete();

        return response()->json(['message' => 'Post deleted.']);
    }
}
