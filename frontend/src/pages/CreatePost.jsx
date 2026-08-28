import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import AdSlot from '../components/AdSlot';
import api from '../api/client';
import RichTextEditor from '../components/RichTextEditor';
import DateTimePicker from '../components/DateTimePicker';
import PlatformPreview from '../components/PlatformPreview';
import Icon from '../components/Icon';

const PLATFORM_LABELS = {
  telegram: 'Telegram',
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
};

// Order the preview tabs read in, independent of PLATFORM_LABELS' own order.
const PLATFORM_PREVIEW_ORDER = ['facebook', 'telegram', 'instagram', 'linkedin', 'tiktok'];

const PREVIEW_NAME_FALLBACK = {
  facebook: 'Your Facebook Page',
  telegram: 'Your Telegram Channel',
  instagram: 'your_instagram',
  linkedin: 'Your LinkedIn Profile',
  tiktok: 'your_tiktok',
};

// Each platform's own real posting rules — not cosmetic differences, these
// are what actually differs about publishing to each one, surfaced here so
// the composer feels tailored per platform instead of one shared form.
const PLATFORM_RULES = {
  facebook: {
    limit: 63206,
    mediaRequired: false,
    note: "Facebook only shows the first couple of lines before \"See more\" — lead with your hook.",
  },
  instagram: {
    limit: 2200,
    mediaRequired: true,
    note: 'Instagram requires at least one image or video attached — text-only posts are rejected.',
  },
  telegram: {
    limit: 4096,
    limitWithMedia: 1024, // Telegram's own cap on a caption once media is attached
    mediaRequired: false,
    note: null,
  },
  linkedin: {
    limit: 3000,
    mediaRequired: false,
    note: "LinkedIn also truncates to a couple of lines before \"...see more\" — keep the opener tight.",
  },
  tiktok: {
    limit: 2200,
    mediaRequired: true,
    note: 'TikTok posts through this app need a video attached — image-only or text-only posts aren’t supported yet.',
  },
};

// A rough client-side mirror of the backend's htmlToPlainText() (see
// PostController) — the preview should show what will actually get
// published (plain text, line breaks kept), not the rich-text HTML itself.
function stripHtmlForPreview(html) {
  const withBreaks = html.replace(/<(br|\/p|\/div|\/li|\/h[1-6])\s*\/?>/gi, '\n');
  const container = document.createElement('div');
  container.innerHTML = withBreaks;
  const text = container.textContent || '';
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

const MAX_VIDEO_MB = 2048; // 2GB — matches the backend cap
const MAX_IMAGE_MB = 10;
const MAX_FILES = 10; // matches the backend's `media' => ['array', 'max:10']`

function isTextEmpty(html) {
  return html.replace(/<[^>]*>/g, '').trim() === '';
}

// Minimum lead time before a schedule is accepted — matches the backend's
// `after:now` rule closely enough in spirit; a couple of minutes of slack
// avoids a round-trip failing just because a second ticked over in transit.
function minScheduleValue() {
  const d = new Date(Date.now() + 2 * 60 * 1000);
  d.setSeconds(0, 0);
  // <input type="datetime-local"> wants local time with no timezone suffix.
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CreatePost() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [selected, setSelected] = useState([]);
  const [contentHtml, setContentHtml] = useState('');
  // [{ file, kind: 'image'|'video', preview: objectURL }, ...] — 1 item
  // behaves exactly like the old single-attachment composer; 2+ becomes a
  // carousel/album/media-group depending on what each selected platform
  // supports (see each backend Publisher for the specifics).
  const [mediaFiles, setMediaFiles] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // 'now' | 'schedule' | 'draft'
  const [publishMode, setPublishMode] = useState('now');
  const [scheduledAt, setScheduledAt] = useState('');
  // Per-platform caption customization: which accounts have it turned on,
  // and what each one's override text currently is. Keyed by account id —
  // an account with customizing[id] off (or blank text) just uses the
  // shared content above, same as before this existed.
  const [customizing, setCustomizing] = useState({});
  const [overrides, setOverrides] = useState({});
  const [activePreview, setActivePreview] = useState('facebook');

  useEffect(() => {
    // WhatsApp is messaging-only (no concept of a broadcast "post" —
    // see /inbox instead), so it never appears as a platform to publish to
    // here, unlike every other connected account.
    api
      .get('/social-accounts')
      .then((res) => setAccounts(res.data.filter((acc) => acc.platform !== 'whatsapp')));
  }, []);

  const toggleAccount = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleCustomize = (id) => {
    setCustomizing((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Shared validation for one file becoming a media-thumb entry — used by
  // the file picker, and by paste/drag-drop below so a screenshot copied
  // from elsewhere gets exactly the same size/type checks a browsed file
  // would.
  const buildMediaEntry = (file) => {
    const kind = file.type.startsWith('video/') ? 'video' : 'image';
    const maxMb = kind === 'video' ? MAX_VIDEO_MB : MAX_IMAGE_MB;
    if (file.size > maxMb * 1024 * 1024) {
      const limitLabel = kind === 'video' ? '2GB' : `${maxMb}MB`;
      return { error: `"${file.name || 'pasted image'}" is too large — max ${limitLabel} for a ${kind}.` };
    }
    return { entry: { file, kind, preview: URL.createObjectURL(file) } };
  };

  // Picking files always replaces the current selection (native <input>
  // behaviour) — remove individual items with the × on each thumbnail
  // instead of re-picking to prune one out.
  const handleMediaChange = (e) => {
    const files = Array.from(e.target.files || []);
    setError('');

    if (files.length === 0) return;

    if (files.length > MAX_FILES) {
      setError(`You can attach up to ${MAX_FILES} files.`);
      e.target.value = '';
      return;
    }

    const next = [];
    for (const file of files) {
      const { entry, error: fileError } = buildMediaEntry(file);
      if (fileError) {
        setError(fileError);
        e.target.value = '';
        return;
      }
      next.push(entry);
    }

    setMediaFiles(next);
    e.target.value = ''; // lets picking the exact same file(s) again re-fire onChange
  };

  // Pasting (or dragging) an image in — from the RichTextEditor toolbar's
  // paste handler, or a per-platform caption textarea — ADDS to whatever's
  // already attached instead of replacing it, since it's normally one quick
  // image at a time rather than a deliberate "start over" pick.
  const addMediaFiles = (newFiles) => {
    const incoming = Array.from(newFiles || []);
    if (incoming.length === 0) return;

    setError('');
    setMediaFiles((prev) => {
      const next = [...prev];
      for (const file of incoming) {
        if (next.length >= MAX_FILES) {
          setError(`You can attach up to ${MAX_FILES} files.`);
          break;
        }
        const { entry, error: fileError } = buildMediaEntry(file);
        if (fileError) {
          setError(fileError);
          continue;
        }
        next.push(entry);
      }
      return next;
    });
  };

  const removeMediaFile = (index) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Shared by the per-platform caption textareas — a pasted image there
  // shouldn't just vanish into a field that can't hold it; redirect it to
  // the post's attachments instead, same as pasting in the main editor.
  const handleTextareaPaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const images = Array.from(items)
      .filter((item) => item.type.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter(Boolean);
    if (images.length > 0) {
      e.preventDefault();
      addMediaFiles(images);
    }
  };

  // What the preview should show for a given platform tab — the matching
  // selected account's own per-platform override if it has one, else the
  // shared content everyone else gets. Falls back to a generic name/handle
  // when no account for that platform is connected/selected yet, so the
  // tab still shows something useful before the user picks one.
  const previewContentFor = (platform) => {
    const acct = accounts.find((a) => a.platform === platform && selected.includes(a.id));
    if (acct && customizing[acct.id] && overrides[acct.id]?.trim()) {
      return overrides[acct.id].trim();
    }
    return stripHtmlForPreview(contentHtml);
  };

  const previewNameFor = (platform) => {
    const acct = accounts.find((a) => a.platform === platform && selected.includes(a.id));
    return acct?.account_name || PREVIEW_NAME_FALLBACK[platform] || 'Your Page';
  };

  // The actual character count + limit for one selected account's content —
  // its own override if it has one, else the shared content — against that
  // platform's real limit (Telegram's own is tighter once media is attached).
  const charInfoFor = (acc) => {
    const rules = PLATFORM_RULES[acc.platform];
    const text = customizing[acc.id] && overrides[acc.id]?.trim()
      ? overrides[acc.id].trim()
      : stripHtmlForPreview(contentHtml);
    const limit =
      acc.platform === 'telegram' && mediaFiles.length > 0 && rules.limitWithMedia
        ? rules.limitWithMedia
        : rules.limit;

    return { count: text.length, limit, over: text.length > limit, rules };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isTextEmpty(contentHtml)) {
      setError('Please write some content for your post.');
      return;
    }
    if (selected.length === 0) {
      setError('Select at least one platform to publish to.');
      return;
    }
    if (publishMode === 'schedule' && !scheduledAt) {
      setError('Pick a date and time to schedule this post for.');
      return;
    }

    setBusy(true);
    try {
      const form = new FormData();
      form.append('content_html', contentHtml);
      selected.forEach((id) => {
        form.append('social_account_ids[]', id);
        if (customizing[id] && overrides[id]?.trim()) {
          form.append(`platform_content[${id}]`, overrides[id]);
        }
      });
      mediaFiles.forEach((m) => form.append('media[]', m.file));

      if (publishMode === 'schedule') {
        form.append('publish_now', '0');
        // datetime-local has no timezone info — treat it as the browser's
        // local time and convert to a real instant (ISO/UTC) before sending.
        form.append('scheduled_at', new Date(scheduledAt).toISOString());
      } else {
        form.append('publish_now', publishMode === 'now' ? '1' : '0');
      }

      const res = await api.post('/posts', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      navigate(`/posts`, { state: { justPublished: res.data.id } });
    } catch (err) {
      const errors = err.response?.data?.errors;
      const firstError = errors ? Object.values(errors)[0]?.[0] : null;
      setError(firstError || err.response?.data?.message || 'Could not publish post.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout>
      <h1>Create Post</h1>
      <p className="page-subtitle">Write once, publish everywhere.</p>

      {accounts.length === 0 && (
        <div className="alert alert-info">
          You have no connected accounts yet. Go to{' '}
          <a href="/accounts">Social Accounts</a> to connect one first.
        </div>
      )}

      <div className="composer-grid">
        <form className="card" onSubmit={handleSubmit}>
          {error && <div className="alert alert-error">{error}</div>}

          <label className="field">
            <span>What's on your mind?</span>
            <RichTextEditor value={contentHtml} onChange={setContentHtml} onImagePaste={addMediaFiles} />
          </label>

          <label className="field">
            <span>Images or Video (optional)</span>
            <input type="file" accept="image/*,video/*" multiple onChange={handleMediaChange} />
            <span className="muted small">
              Up to {MAX_FILES} files — images up to {MAX_IMAGE_MB}MB each, videos up to 2GB (any
              common format — mp4, mov, avi, webm, mkv and more). 2+ files becomes a carousel/
              album where each platform supports one. Telegram itself only accepts files up to
              50MB no matter what's uploaded here. Instagram requires media (no text-only posts).
              You can also just paste (Ctrl/Cmd+V) or drag an image straight into the text box above.
            </span>
          </label>

          {mediaFiles.length > 0 && (
            <div className="media-thumb-grid">
              {mediaFiles.map((m, i) => (
                <div className="media-thumb" key={m.preview}>
                  {m.kind === 'video' ? (
                    <video src={m.preview} className="media-thumb-img" muted />
                  ) : (
                    <img src={m.preview} alt="" className="media-thumb-img" />
                  )}
                  <button
                    type="button"
                    className="media-thumb-remove"
                    onClick={() => removeMediaFile(i)}
                    aria-label="Remove this file"
                  >
                    <Icon name="x" size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="field">
            <span>Platforms</span>
            <div className="platform-checkboxes">
              {accounts.map((acc) => (
                <label key={acc.id} className="checkbox-pill">
                  <input
                    type="checkbox"
                    checked={selected.includes(acc.id)}
                    onChange={() => toggleAccount(acc.id)}
                  />
                  <span className={`platform-badge platform-${acc.platform}`}>
                    {PLATFORM_LABELS[acc.platform] || acc.platform}
                  </span>
                  {acc.account_name}
                </label>
              ))}
            </div>
          </div>

          {selected.length > 0 && (
            <div className="field">
              <span>Platform details</span>
              <div className="platform-override-list">
                {accounts
                  .filter((acc) => selected.includes(acc.id))
                  .map((acc) => {
                    const { count, limit, over, rules } = charInfoFor(acc);
                    const missingMedia = rules.mediaRequired && mediaFiles.length === 0;

                    return (
                      <div className="platform-override-item" key={acc.id}>
                        <div className="platform-detail-header">
                          <span className={`platform-badge platform-${acc.platform}`}>
                            {PLATFORM_LABELS[acc.platform] || acc.platform}
                          </span>
                          <span className="muted small">{acc.account_name}</span>
                          <span className={'platform-char-count' + (over ? ' over-limit' : '')}>
                            {count.toLocaleString()} / {limit.toLocaleString()}
                          </span>
                        </div>

                        {missingMedia && (
                          <div className="platform-detail-warning">
                            <Icon name="alert" size={14} />
                            Requires an image or video attached — this platform will fail without one.
                          </div>
                        )}
                        {rules.note && <p className="muted small platform-detail-note">{rules.note}</p>}

                        <label className="platform-override-toggle">
                          <input
                            type="checkbox"
                            checked={!!customizing[acc.id]}
                            onChange={() => toggleCustomize(acc.id)}
                          />
                          <span className="muted small">Write a different caption just for this platform</span>
                        </label>
                        {customizing[acc.id] && (
                          <textarea
                            rows={3}
                            placeholder="Write a caption just for this platform — leave blank to fall back to the main content above"
                            value={overrides[acc.id] || ''}
                            onChange={(e) =>
                              setOverrides((prev) => ({ ...prev, [acc.id]: e.target.value }))
                            }
                            onPaste={handleTextareaPaste}
                          />
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          <div className="field">
            <span>When?</span>
            <div className="publish-mode-tabs">
              <button
                type="button"
                className={'publish-mode-tab' + (publishMode === 'now' ? ' active' : '')}
                onClick={() => setPublishMode('now')}
              >
                Publish Now
              </button>
              <button
                type="button"
                className={'publish-mode-tab' + (publishMode === 'schedule' ? ' active' : '')}
                onClick={() => setPublishMode('schedule')}
              >
                Schedule
              </button>
              <button
                type="button"
                className={'publish-mode-tab' + (publishMode === 'draft' ? ' active' : '')}
                onClick={() => setPublishMode('draft')}
              >
                Save Draft
              </button>
            </div>

            {publishMode === 'schedule' && (
              <div className="mt-2">
                <DateTimePicker value={scheduledAt} onChange={setScheduledAt} min={minScheduleValue()} />
              </div>
            )}
          </div>

          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy
              ? 'Saving...'
              : publishMode === 'now'
                ? 'Publish Now'
                : publishMode === 'schedule'
                  ? 'Schedule Post'
                  : 'Save Draft'}
          </button>
        </form>

        <div className="card preview-card">
          <h2>Preview</h2>
          <div className="preview-tabs">
            {PLATFORM_PREVIEW_ORDER.map((p) => (
              <button
                type="button"
                key={p}
                className={'preview-tab' + (activePreview === p ? ' active' : '')}
                onClick={() => setActivePreview(p)}
              >
                {PLATFORM_LABELS[p]}
              </button>
            ))}
          </div>

          <PlatformPreview
            platform={activePreview}
            name={previewNameFor(activePreview)}
            content={isTextEmpty(contentHtml) ? '' : previewContentFor(activePreview)}
            mediaFiles={mediaFiles}
          />

          <p className="muted small mt-3">
            This is a close approximation of each platform's layout, not a pixel-perfect
            render — formatting (bold/lists/etc.) is for your writing comfort only, since none of
            these platforms render rich text in posts; what actually publishes is clean plain
            text with your line breaks kept.
          </p>

          <AdSlot placement="create_post" />
        </div>
      </div>
    </Layout>
  );
}
