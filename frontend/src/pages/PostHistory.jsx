import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../api/client';

const PLATFORM_LABELS = {
  telegram: 'Telegram',
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
};

const STATUS_LABELS = {
  draft: 'Draft',
  publishing: 'Publishing...',
  published: 'Published',
  partial: 'Partially Published',
  failed: 'Failed',
  pending: 'Pending',
};

export default function PostHistory() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState(null);

  const loadPosts = () => {
    setLoading(true);
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
      loadPosts();
    } finally {
      setBusyKey(null);
    }
  };

  const deletePost = async (postId) => {
    if (!window.confirm('Delete this post?')) return;
    await api.delete(`/posts/${postId}`);
    loadPosts();
  };

  return (
    <Layout>
      <h1>Post History</h1>
      <p className="page-subtitle">Track every post across every platform.</p>

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
                  {new Date(post.created_at).toLocaleString()}
                </span>
                <button
                  className="btn btn-ghost btn-danger btn-small"
                  onClick={() => deletePost(post.id)}
                >
                  Delete
                </button>
              </div>

              <p className="post-content">{post.content}</p>

              {post.media_path && (
                <img
                  src={`${import.meta.env.VITE_API_URL.replace('/api', '')}/storage/${post.media_path}`}
                  alt=""
                  className="post-media"
                />
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
