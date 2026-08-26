import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import AdSlot from '../components/AdSlot';
import ServicesSection from '../components/ServicesSection';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

export default function Dashboard() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    api.get('/posts').then((res) => setPosts(res.data.data));
    api.get('/social-accounts').then((res) => setAccounts(res.data));
  }, []);

  const published = posts.filter((p) => p.status === 'published').length;
  const failed = posts.filter((p) => p.status === 'failed').length;

  return (
    <Layout>
      <h1>Good day, {user?.name?.split(' ')[0]} 👋</h1>
      <p className="page-subtitle">Here's what's happening with your social posts.</p>

      <AdSlot placement="dashboard_top" />

      <div className="stat-grid">
        <div className="card stat-card">
          <div className="stat-value">{posts.length}</div>
          <div className="stat-label">Total Posts</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{published}</div>
          <div className="stat-label">Published</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{failed}</div>
          <div className="stat-label">Failed</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{accounts.length}</div>
          <div className="stat-label">Connected Accounts</div>
        </div>
      </div>

      <div className="dashboard-actions">
        <Link to="/create" className="btn btn-primary">
          + Create Post
        </Link>
        <Link to="/accounts" className="btn btn-ghost">
          Manage Accounts
        </Link>
      </div>

      <ServicesSection />

      <div className="card">
        <h2>Recent Posts</h2>
        {posts.length === 0 ? (
          <p className="muted">No posts yet. Create your first one!</p>
        ) : (
          <ul className="account-list">
            {posts.slice(0, 5).map((post) => (
              <li key={post.id} className="account-item">
                <div>
                  <span className={`status-badge status-${post.status}`}>
                    {post.status}
                  </span>
                  <span className="post-snippet">{post.content.slice(0, 60)}</span>
                </div>
                <span className="muted small">
                  {new Date(post.created_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  );
}
