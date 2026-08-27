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
};

// Order the preview tabs read in, independent of PLATFORM_LABELS' own order.
const PLATFORM_PREVIEW_ORDER = ['facebook', 'telegram', 'instagram', 'linkedin'];

const PREVIEW_NAME_FALLBACK = {
  facebook: 'Your Facebook Page',
  telegram: 'Your Telegram Channel',
  instagram: 'your_instagram',
  linkedin: 'Your LinkedIn Profile',
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
    api.get('/social-accounts').then((res) => setAccounts(res.data));
  }, []);

  const toggleAccount = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleCustomize = (id) => {
    setCustomizing((prev) => ({ ...prev, [id]: !prev[id] }));
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
      const kind = file.type.startsWith('video/') ? 'video' : 'image';
      const maxMb = kind === 'video' ? MAX_VIDEO_MB : MAX_IMAGE_MB;

      if (file.size > maxMb * 1024 * 1024) {
        const limitLabel = kind === 'video' ? '2GB' : `${maxMb}MB`;
        setError(`"${file.name}" is too large — max ${limitLabel} for a ${kind}.`);
        e.target.value = '';
        return;
      }

      next.push({ file, kind, preview: URL.createObjectURL(file) });
    }

    setMediaFiles(next);
    e.target.value = ''; // lets picking the exact same file(s) again re-fire onChange
  };

  const removeMediaFile = (index) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
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
            <RichTextEditor value={contentHtml} onChange={setContentHtml} />
          </label>

          <label className="field">
            <span>Images or Video (optional)</span>
            <input type="file" accept="image/*,video/*" multiple onChange={handleMediaChange} />
            <span className="muted small">
              Up to {MAX_FILES} files — images up to {MAX_IMAGE_MB}MB each, videos up to 2GB (any
              common format — mp4, mov, avi, webm, mkv and more). 2+ files becomes a carousel/
              album where each platform supports one. Telegram itself only accepts files up to
              50MB no matter what's uploaded here. Instagram requires media (no text-only posts).
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
              <span>Customize per platform (optional)</span>
              <div className="platform-override-list">
                {accounts
                  .filter((acc) => selected.includes(acc.id))
                  .map((acc) => (
                    <div className="platform-override-item" key={acc.id}>
                      <label className="platform-override-toggle">
                        <input
                          type="checkbox"
                          checked={!!customizing[acc.id]}
                          onChange={() => toggleCustomize(acc.id)}
                        />
                        <span className={`platform-badge platform-${acc.platform}`}>
                          {PLATFORM_LABELS[acc.platform] || acc.platform}
                        </span>
                        <span className="muted small">Different caption for {acc.account_name}</span>
                      </label>
                      {customizing[acc.id] && (
                        <textarea
                          rows={3}
                          placeholder="Write a caption just for this platform — leave blank to fall back to the main content above"
                          value={overrides[acc.id] || ''}
                          onChange={(e) =>
                            setOverrides((prev) => ({ ...prev, [acc.id]: e.target.value }))
                          }
                        />
                      )}
                    </div>
                  ))}
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
