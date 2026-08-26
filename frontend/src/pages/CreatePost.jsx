import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import AdSlot from '../components/AdSlot';
import api from '../api/client';
import RichTextEditor from '../components/RichTextEditor';

const PLATFORM_LABELS = {
  telegram: 'Telegram',
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
};

const MAX_VIDEO_MB = 2048; // 2GB — matches the backend cap
const MAX_IMAGE_MB = 10;

function isTextEmpty(html) {
  return html.replace(/<[^>]*>/g, '').trim() === '';
}

export default function CreatePost() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [selected, setSelected] = useState([]);
  const [contentHtml, setContentHtml] = useState('');
  const [media, setMedia] = useState(null);
  const [mediaKind, setMediaKind] = useState(null); // 'image' | 'video'
  const [mediaPreview, setMediaPreview] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/social-accounts').then((res) => setAccounts(res.data));
  }, []);

  const toggleAccount = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleMediaChange = (e) => {
    const file = e.target.files?.[0] || null;
    setError('');

    if (!file) {
      setMedia(null);
      setMediaKind(null);
      setMediaPreview(null);
      return;
    }

    const kind = file.type.startsWith('video/') ? 'video' : 'image';
    const maxMb = kind === 'video' ? MAX_VIDEO_MB : MAX_IMAGE_MB;

    if (file.size > maxMb * 1024 * 1024) {
      const limitLabel = kind === 'video' ? '2GB' : `${maxMb}MB`;
      setError(`That ${kind} is too large — max ${limitLabel}.`);
      e.target.value = '';
      return;
    }

    setMedia(file);
    setMediaKind(kind);
    setMediaPreview(URL.createObjectURL(file));
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

    setBusy(true);
    try {
      const form = new FormData();
      form.append('content_html', contentHtml);
      form.append('publish_now', '1');
      selected.forEach((id) => form.append('social_account_ids[]', id));
      if (media) form.append('media', media);

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
            <span>Image or Video (optional)</span>
            <input type="file" accept="image/*,video/*" onChange={handleMediaChange} />
            <span className="muted small">
              Images up to {MAX_IMAGE_MB}MB, videos up to 2GB (any common format — mp4, mov, avi,
              webm, mkv and more). Note: Telegram itself only accepts files up to 50MB no matter
              what's uploaded here. Instagram requires media (no text-only posts there).
            </span>
          </label>

          {mediaPreview && (
            mediaKind === 'video' ? (
              <video src={mediaPreview} controls className="media-preview" />
            ) : (
              <img src={mediaPreview} alt="preview" className="media-preview" />
            )
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

          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Publishing...' : 'Publish Now'}
          </button>
        </form>

        <div className="card preview-card">
          <h2>Preview</h2>
          <div className="mock-post">
            <div className="mock-post-header">
              <div className="mock-avatar" />
              <div>
                <strong>Your Page</strong>
                <div className="muted small">Just now</div>
              </div>
            </div>
            {isTextEmpty(contentHtml) ? (
              <p className="mock-post-body muted">Your post content will appear here...</p>
            ) : (
              <div className="mock-post-body" dangerouslySetInnerHTML={{ __html: contentHtml }} />
            )}
            {mediaPreview && (
              mediaKind === 'video' ? (
                <video src={mediaPreview} controls className="mock-post-image" />
              ) : (
                <img src={mediaPreview} alt="preview" className="mock-post-image" />
              )
            )}
          </div>
          <p className="muted small">
            Formatting (bold/lists/etc.) is for your writing comfort — none of these platforms
            render rich text in posts, so what actually publishes is clean plain text with your
            line breaks kept.
          </p>

          <AdSlot placement="create_post" />
        </div>
      </div>
    </Layout>
  );
}
