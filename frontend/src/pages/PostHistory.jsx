import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import AdSlot from '../components/AdSlot';
import api from '../api/client';

const PLATFORM_LABELS = {
  telegram: 'Telegram',
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
};

const STATUS_LABELS = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  publishing: 'Publishing...',
  published: 'Published',
  partial: 'Partially Published',
  failed: 'Failed',
  pending: 'Pending',
};

// <input type="datetime-local"> takes local time with no timezone suffix.
function toDatetimeLocalValue(isoString) {
  const d = new Date(isoString);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function PostHistory() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [editMedia, setEditMedia] = useState(null);
  const [editRemoveMedia, setEditRemoveMedia] = useState(false);
  const [editError, setEditError] = useState('');
  const [reschedulingId, setReschedulingId] = useState(null);
  const [rescheduleValue, setRescheduleValue] = useState('');
  const [scheduleError, setScheduleError] = useState('');

  // `silent` skips the loading spinner — used after retry/delete/save so the
  // list just quietly updates in place instead of flashing blank first.
  const loadPosts = (silent = false) => {
    if (!silent) setLoading(true);
    api
      .get('/posts')
      .then((res) => setPosts(res.data.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const retryPlatform = async (postId, platformId) => {
    setBusyKey(`${postId}-${platformId}`);
    try {
      await api.post(`/posts/${postId}/platforms/${platformId}/retry`);
      loadPosts(true);
    } finally {
      setBusyKey(null);
    }
  };

  const deletePost = async (postId) => {
    if (!window.confirm('Delete this post?')) return;
    await api.delete(`/posts/${postId}`);
    loadPosts(true);
  };

  const publishNow = async (postId) => {
    const key = `publish-${postId}`;
    setBusyKey(key);
    try {
      await api.post(`/posts/${postId}/publish`);
      loadPosts(true);
    } finally {
      setBusyKey(null);
    }
  };

  const startReschedule = (post) => {
    setReschedulingId(post.id);
    setRescheduleValue(post.scheduled_at ? toDatetimeLocalValue(post.scheduled_at) : '');
    setScheduleError('');
  };

  const cancelReschedule = () => {
    setReschedulingId(null);
    setScheduleError('');
  };

  const saveReschedule = async (post) => {
    if (!rescheduleValue) {
      setScheduleError('Pick a date and time first.');
      return;
    }
    const key = `schedule-${post.id}`;
    setBusyKey(key);
    setScheduleError('');
    try {
      await api.post(`/posts/${post.id}`, {
        scheduled_at: new Date(rescheduleValue).toISOString(),
      });
      setReschedulingId(null);
      loadPosts(true);
    } catch (err) {
      setScheduleError(err.response?.data?.message || 'Could not reschedule this post.');
    } finally {
      setBusyKey(null);
    }
  };

  // Drops a scheduled post back to a draft instead of publishing it.
  const cancelSchedule = async (post) => {
    const key = `schedule-${post.id}`;
    setBusyKey(key);
    try {
      await api.post(`/posts/${post.id}`, { scheduled_at: null });
      loadPosts(true);
    } finally {
      setBusyKey(null);
    }
  };

  const startEdit = (post) => {
    setEditingId(post.id);
    setEditContent(post.content);
    setEditMedia(null);
    setEditRemoveMedia(false);
    setEditError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditMedia(null);
    setEditRemoveMedia(false);
    setEditError('');
  };

  // Saves the edited content/media, then automatically retries every
  // platform that's currently failed for this post — that's the whole
  // point of editing (e.g. attaching an image so Instagram stops rejecting
  // a text-only post), so the user shouldn't have to click Retry per
  // platform again after fixing it.
  const saveEdit = async (post) => {
    const key = `edit-${post.id}`;
    setBusyKey(key);
    setEditError('');
    try {
      const form = new FormData();
      form.append('content', editContent);
      if (editMedia) form.append('media', editMedia);
      if (editRemoveMedia) form.append('remove_media', '1');

      await api.post(`/posts/${post.id}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const failedPlatformIds = post.platforms.filter((p) => p.status === 'failed').map((p) => p.id);
      for (const platformId of failedPlatformIds) {
        await api.post(`/posts/${post.id}/platforms/${platformId}/retry`);
      }

      setEditingId(null);
      loadPosts(true);
    } catch (err) {
      const errors = err.response?.data?.errors;
      const firstError = errors ? Object.values(errors)[0]?.[0] : null;
      setEditError(firstError || err.response?.data?.message || 'Could not save changes.');
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <Layout>
      <h1>Post History</h1>
      <p className="page-subtitle">Track every post across every platform.</p>

      <AdSlot placement="post_history" />

      {loading ? (
        <p>Loading...</p>
      ) : posts.length === 0 ? (
        <div className="card">
          <p className="muted">No posts yet. Create your first post!</p>
        </div>
      ) : (
        <div className="post-list">
          {posts.map((post) => (
            <div className="card post-card" key={post.id}>
              <div className="post-card-header">
                <span className={`status-badge status-${post.status}`}>
                  {STATUS_LABELS[post.status] || post.status}
                </span>
                <span className="muted small">
                  {post.status === 'scheduled' && post.scheduled_at
                    ? `Scheduled for ${new Date(post.scheduled_at).toLocaleString()}`
                    : new Date(post.created_at).toLocaleString()}
                </span>
                {(post.status === 'draft' || post.status === 'scheduled') && (
                  <button
                    className="btn btn-ghost btn-small"
                    disabled={busyKey === `publish-${post.id}`}
                    onClick={() => publishNow(post.id)}
                  >
                    {busyKey === `publish-${post.id}` ? 'Publishing...' : 'Publish Now'}
                  </button>
                )}
                {(post.status === 'draft' || post.status === 'scheduled') && reschedulingId !== post.id && (
                  <button className="btn btn-ghost btn-small" onClick={() => startReschedule(post)}>
                    {post.status === 'scheduled' ? 'Reschedule' : 'Schedule'}
                  </button>
                )}
                {post.status === 'scheduled' && (
                  <button
                    className="btn btn-ghost btn-small"
                    disabled={busyKey === `schedule-${post.id}`}
                    onClick={() => cancelSchedule(post)}
                  >
                    Cancel schedule
                  </button>
                )}
                {editingId !== post.id && (
                  <button
                    className="btn btn-ghost btn-small"
                    onClick={() => startEdit(post)}
                  >
                    Edit
                  </button>
                )}
                <button
                  className="btn btn-ghost btn-danger btn-small"
                  onClick={() => deletePost(post.id)}
                >
                  Delete
                </button>
              </div>

              {reschedulingId === post.id && (
                <div className="post-edit-form">
                  {scheduleError && <div className="alert alert-error">{scheduleError}</div>}
                  <label className="field">
                    <span>Publish at</span>
                    <input
                      type="datetime-local"
                      min={toDatetimeLocalValue(new Date(Date.now() + 60 * 1000).toISOString())}
                      value={rescheduleValue}
                      onChange={(e) => setRescheduleValue(e.target.value)}
                    />
                  </label>
                  <div className="post-edit-actions">
                    <button
                      className="btn btn-primary btn-small"
                      disabled={busyKey === `schedule-${post.id}`}
                      onClick={() => saveReschedule(post)}
                    >
                      {busyKey === `schedule-${post.id}` ? 'Saving...' : 'Save Schedule'}
                    </button>
                    <button className="btn btn-ghost btn-small" onClick={cancelReschedule}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {editingId === post.id ? (
                <div className="post-edit-form">
                  {editError && <div className="alert alert-error">{editError}</div>}

                  <label className="field">
                    <span>Content</span>
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={4}
                    />
                  </label>

                  {post.media_path && !editRemoveMedia && !editMedia && (
                    <div className="field">
                      <img
                        src={`${import.meta.env.VITE_API_URL.replace('/api', '')}/storage/${post.media_path}`}
                        alt=""
                        className="post-media"
                      />
                      <button
                        type="button"
                        className="btn btn-ghost btn-small"
                        onClick={() => setEditRemoveMedia(true)}
                      >
                        Remove media
                      </button>
                    </div>
                  )}

                  <label className="field">
                    <span>{post.media_path ? 'Replace image/video' : 'Attach image or video'}</span>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={(e) => {
                        setEditMedia(e.target.files?.[0] || null);
                        setEditRemoveMedia(false);
                      }}
                    />
                    <span className="muted small">
                      Failed platforms (e.g. Instagram needing an image) are automatically
                      retried after you save.
                    </span>
                  </label>

                  <div className="post-edit-actions">
                    <button
                      className="btn btn-primary btn-small"
                      disabled={busyKey === `edit-${post.id}`}
                      onClick={() => saveEdit(post)}
                    >
                      {busyKey === `edit-${post.id}` ? 'Saving...' : 'Save & Retry Failed'}
                    </button>
                    <button className="btn btn-ghost btn-small" onClick={cancelEdit}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="post-content">{post.content}</p>

                  {post.media_path && (
                    <img
                      src={`${import.meta.env.VITE_API_URL.replace('/api', '')}/storage/${post.media_path}`}
                      alt=""
                      className="post-media"
                    />
                  )}
                </>
              )}

              <ul className="platform-results">
                {post.platforms.map((p) => (
                  <li key={p.id} className="platform-result-item">
                    <span className={`platform-badge platform-${p.platform}`}>
                      {PLATFORM_LABELS[p.platform] || p.platform}
                    </span>
                    <span className={`status-pill status-${p.status}`}>
                      {p.status === 'published' ? '✓ Published' : p.status === 'failed' ? '✕ Failed' : '… Pending'}
                    </span>
                    {p.post_url && (
                      <a href={p.post_url} target="_blank" rel="noreferrer">
                        View Post →
                      </a>
                    )}
                    {p.status === 'failed' && (
                      <>
                        <span className="error-text">{p.error_message}</span>
                        <button
                          className="btn btn-ghost btn-small"
                          disabled={busyKey === `${post.id}-${p.id}`}
                          onClick={() => retryPlatform(post.id, p.id)}
                        >
                          {busyKey === `${post.id}-${p.id}` ? 'Retrying...' : 'Retry'}
                        </button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
