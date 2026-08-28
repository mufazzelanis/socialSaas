import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../api/client';

const TABS = [
  { key: 'users', label: 'Users' },
  { key: 'activity', label: 'Activity Logs' },
  { key: 'credentials', label: 'Platform Credentials' },
  { key: 'ads', label: 'Ads' },
  { key: 'promote', label: 'Promote' },
];

const AD_PLACEMENT_LABELS = {
  dashboard_top: 'Dashboard — top banner',
  sidebar: 'Sidebar (desktop)',
  post_history: 'Post History — top banner',
  create_post: 'Create Post — below preview',
  global_footer: 'Every page — bottom of content',
};

const AD_NETWORKS = ['adsense', 'adsterra', 'custom'];
const AD_NETWORK_LABELS = {
  adsense: 'Google AdSense',
  adsterra: 'Adsterra',
  custom: 'Custom / other',
};

const ALL_PLATFORMS = ['telegram', 'facebook', 'instagram', 'linkedin', 'tiktok'];

const PLATFORM_LABELS = {
  telegram: 'Telegram',
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
};

const EVENT_LABELS = {
  register: 'Registered',
  login: 'Logged in',
  login_failed: 'Failed login',
  logout: 'Logged out',
  post_created: 'Created post',
  post_published: 'Post published',
  post_partial: 'Post partially published',
  post_failed: 'Post failed',
  account_connected: 'Connected account',
  account_disconnected: 'Disconnected account',
  branding_updated: 'Updated branding',
  user_created_by_admin: 'User created (by admin)',
  permissions_updated: 'Permissions updated',
  profile_updated: 'Updated profile',
};

const LOGIN_EVENT_GROUP = 'login,login_failed,logout';

function fmt(dt) {
  return dt ? new Date(dt).toLocaleString() : '—';
}

export default function AdminDashboard() {
  const [tab, setTab] = useState('users');
  const [loginHistoryTarget, setLoginHistoryTarget] = useState(null); // { id, name } | null

  // A plain tab click always starts fresh — only the "Login History" button
  // (below) should carry a filter into the Activity Logs tab.
  const selectTab = (key) => {
    setLoginHistoryTarget(null);
    setTab(key);
  };

  const viewLoginHistory = (user) => {
    setLoginHistoryTarget({ id: user.id, name: user.name });
    setTab('activity');
  };

  return (
    <Layout>
      <h1>Admin</h1>
      <p className="page-subtitle">Super admin only — users, activity, platform credentials, and ads.</p>

      <div className="admin-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={'admin-tab' + (tab === t.key ? ' active' : '')}
            onClick={() => selectTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'users' && <UsersPanel onViewLoginHistory={viewLoginHistory} />}
      {tab === 'activity' && (
        <ActivityPanel
          presetUserId={loginHistoryTarget?.id}
          presetUserName={loginHistoryTarget?.name}
          onClearPreset={() => setLoginHistoryTarget(null)}
        />
      )}
      {tab === 'credentials' && <CredentialsPanel />}
      {tab === 'ads' && <AdsPanel />}
      {tab === 'promote' && <PromotePanel />}
    </Layout>
  );
}

function PlatformCheckboxes({ value, onChange }) {
  const toggle = (platform) => {
    onChange(
      value.includes(platform) ? value.filter((p) => p !== platform) : [...value, platform]
    );
  };

  return (
    <div className="platform-checkboxes">
      {ALL_PLATFORMS.map((p) => (
        <label key={p} className="checkbox-pill">
          <input type="checkbox" checked={value.includes(p)} onChange={() => toggle(p)} />
          {PLATFORM_LABELS[p]}
        </label>
      ))}
    </div>
  );
}

function CreateUserForm({ onCreated, onCancel }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [platforms, setPlatforms] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await api.post('/admin/users', {
        name,
        email,
        phone: phone || undefined,
        password: password || undefined,
        role,
        allowed_platforms: platforms,
      });
      setResult(res.data);
      onCreated();
    } catch (err) {
      const errors = err.response?.data?.errors;
      const firstError = errors ? Object.values(errors)[0]?.[0] : null;
      setError(firstError || err.response?.data?.message || 'Could not create user.');
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    return (
      <div className="card">
        <h2>User created ✓</h2>
        <p>
          <strong>{result.name}</strong> ({result.email}) has been created.
        </p>
        {result.email_sent ? (
          <div className="alert alert-success">
            📧 An email with their login details was sent to {result.email}.
          </div>
        ) : (
          <div className="alert alert-error">
            Couldn't send the welcome email — share their login details manually.
          </div>
        )}
        {result.generated_password && (
          <div className="alert alert-info">
            No password was set, so one was generated:{' '}
            <code className="generated-password">{result.generated_password}</code>
            <br />
            This is also a fallback in case the email above didn't arrive — it will not be shown
            again after you close this.
          </div>
        )}
        <button className="btn btn-ghost" onClick={onCancel}>
          Close
        </button>
      </div>
    );
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2>Create User</h2>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="form-row">
        <label className="field">
          <span>Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="field">
          <span>Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
      </div>

      <div className="form-row">
        <label className="field">
          <span>Phone (optional)</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <label className="field">
          <span>Password (leave blank to auto-generate)</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
          />
        </label>
      </div>

      <label className="field">
        <span>Role</span>
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="user">User</option>
          <option value="super_admin">Super Admin</option>
        </select>
      </label>

      <label className="field">
        <span>Platform Permissions</span>
        <PlatformCheckboxes value={platforms} onChange={setPlatforms} />
      </label>

      <div className="form-actions">
        <button className="btn btn-primary" disabled={busy}>
          {busy ? 'Creating...' : 'Create User'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function UsersPanel({ onViewLoginHistory }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState([]);

  // `silent` skips the loading spinner — used after any save so the table
  // just quietly updates in place instead of flashing blank first.
  const load = (silent = false) => {
    if (!silent) setLoading(true);
    api
      .get('/admin/users')
      .then((res) => setUsers(res.data.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const toggleRole = async (user) => {
    const newRole = user.role === 'super_admin' ? 'user' : 'super_admin';
    if (!window.confirm(`Set ${user.name} as ${newRole === 'super_admin' ? 'Super Admin' : 'regular User'}?`)) return;
    setBusyId(user.id);
    try {
      await api.patch(`/admin/users/${user.id}`, { role: newRole });
      load(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Could not update role.');
    } finally {
      setBusyId(null);
    }
  };

  const startEditingPermissions = (user) => {
    setEditingId(user.id);
    setEditDraft(user.allowed_platforms || []);
  };

  const savePermissions = async (user) => {
    setBusyId(user.id);
    try {
      await api.patch(`/admin/users/${user.id}`, { allowed_platforms: editDraft });
      setEditingId(null);
      load(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Could not update permissions.');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <>
      <div className="panel-header">
        <h2 className="panel-title-inline">All Users ({users.length})</h2>
        {!showCreate && (
          <button className="btn btn-primary btn-small" onClick={() => setShowCreate(true)}>
            + Create User
          </button>
        )}
      </div>

      {showCreate && (
        <CreateUserForm
          onCreated={() => load(true)}
          onCancel={() => setShowCreate(false)}
        />
      )}

      <div className="card">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Platform Access</th>
                <th>Accounts</th>
                <th>Last Login</th>
                <th>Last Login IP</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.phone || '—'}</td>
                  <td>
                    <span className={'role-badge' + (u.role === 'super_admin' ? ' role-admin' : '')}>
                      {u.role === 'super_admin' ? 'Super Admin' : 'User'}
                    </span>
                  </td>
                  <td className="platforms-cell">
                    {u.role === 'super_admin' ? (
                      <span className="muted small">All (admin)</span>
                    ) : editingId === u.id ? (
                      <div className="permission-editor">
                        <PlatformCheckboxes value={editDraft} onChange={setEditDraft} />
                        <div className="form-actions">
                          <button
                            className="btn btn-primary btn-small"
                            disabled={busyId === u.id}
                            onClick={() => savePermissions(u)}
                          >
                            Save
                          </button>
                          <button className="btn btn-ghost btn-small" onClick={() => setEditingId(null)}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {(u.allowed_platforms || []).length === 0 ? (
                          <span className="muted small">None</span>
                        ) : (
                          u.allowed_platforms.map((p) => (
                            <span key={p} className={`platform-badge platform-${p}`}>
                              {PLATFORM_LABELS[p] || p}
                            </span>
                          ))
                        )}
                        <button
                          className="btn btn-ghost btn-small"
                          onClick={() => startEditingPermissions(u)}
                        >
                          Edit
                        </button>
                      </>
                    )}
                  </td>
                  <td>{u.social_accounts_count}</td>
                  <td className="nowrap">{fmt(u.last_login_at)}</td>
                  <td>{u.last_login_ip || '—'}</td>
                  <td className="nowrap">
                    <button
                      className="btn btn-ghost btn-small"
                      onClick={() => onViewLoginHistory(u)}
                    >
                      Login History
                    </button>{' '}
                    <button
                      className="btn btn-ghost btn-small"
                      disabled={busyId === u.id}
                      onClick={() => toggleRole(u)}
                    >
                      {u.role === 'super_admin' ? 'Revoke Admin' : 'Make Admin'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function ActivityPanel({ presetUserId, presetUserName, onClearPreset }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [eventFilter, setEventFilter] = useState(presetUserId ? LOGIN_EVENT_GROUP : '');
  const [userIdFilter, setUserIdFilter] = useState(presetUserId ? String(presetUserId) : '');

  const load = (p = page, event = eventFilter, userId = userIdFilter) => {
    setLoading(true);
    api
      .get('/admin/activity-logs', {
        params: { page: p, event: event || undefined, user_id: userId || undefined },
      })
      .then((res) => {
        setLogs(res.data.data);
        setPagination(res.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(1, eventFilter, userIdFilter);
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventFilter, userIdFilter]);

  const goPage = (p) => {
    setPage(p);
    load(p, eventFilter, userIdFilter);
  };

  const clearUserFilter = () => {
    setUserIdFilter('');
    setEventFilter('');
    onClearPreset?.();
  };

  return (
    <div className="card">
      <div className="panel-header">
        <h2>Activity Log</h2>
        <select value={eventFilter} onChange={(e) => setEventFilter(e.target.value)}>
          <option value="">All events</option>
          <option value={LOGIN_EVENT_GROUP}>Login activity (login/failed/logout)</option>
          {Object.entries(EVENT_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {userIdFilter && (
        <div className="alert alert-info">
          Showing only <strong>{presetUserName || `user #${userIdFilter}`}</strong>'s activity.{' '}
          <button className="btn btn-ghost btn-small" onClick={clearUserFilter}>
            Clear filter
          </button>
        </div>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>User</th>
                  <th>Event</th>
                  <th>Description</th>
                  <th>IP</th>
                  <th>Location</th>
                  <th>Device</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="nowrap">{fmt(log.created_at)}</td>
                    <td>
                      {log.user ? (
                        <>
                          <div>{log.user.name}</div>
                          <div className="muted small">{log.user.email}</div>
                        </>
                      ) : (
                        <span className="muted">Unknown</span>
                      )}
                    </td>
                    <td>
                      <span className={'event-badge event-' + log.event}>
                        {EVENT_LABELS[log.event] || log.event}
                      </span>
                    </td>
                    <td>{log.description || '—'}</td>
                    <td>{log.ip_address || '—'}</td>
                    <td>{[log.city, log.country].filter(Boolean).join(', ') || '—'}</td>
                    <td>
                      {log.device_type || '—'}
                      {log.browser ? ` · ${log.browser}` : ''}
                      {log.platform ? ` · ${log.platform}` : ''}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="muted">
                      No activity yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {pagination && pagination.last_page > 1 && (
            <div className="pagination">
              <button
                className="btn btn-ghost btn-small"
                disabled={page <= 1}
                onClick={() => goPage(page - 1)}
              >
                ← Prev
              </button>
              <span className="muted small">
                Page {pagination.current_page} of {pagination.last_page}
              </span>
              <button
                className="btn btn-ghost btn-small"
                disabled={page >= pagination.last_page}
                onClick={() => goPage(page + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CredentialsPanel() {
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState({});
  const [busyPlatform, setBusyPlatform] = useState(null);
  const [message, setMessage] = useState('');

  // `silent` skips the loading spinner — used after Save so the form just
  // quietly updates in place instead of flashing blank first.
  const load = (silent = false) => {
    if (!silent) setLoading(true);
    api
      .get('/admin/platform-credentials')
      .then((res) => setCredentials(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const setDraft = (platform, field, value) => {
    setDrafts((d) => ({ ...d, [platform]: { ...d[platform], [field]: value } }));
  };

  const save = async (cred) => {
    const draft = drafts[cred.platform] || {};
    setBusyPlatform(cred.platform);
    setMessage('');
    try {
      await api.post(`/admin/platform-credentials/${cred.platform}`, {
        client_id: draft.client_id ?? cred.client_id,
        client_secret: draft.client_secret || undefined,
        config_id: draft.config_id ?? cred.config_id,
        is_enabled: draft.is_enabled ?? cred.is_enabled,
      });
      setMessage(`${PLATFORM_LABELS[cred.platform]} credentials saved.`);
      load(true);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not save credentials.');
    } finally {
      setBusyPlatform(null);
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="card">
      <h2>Platform App Credentials</h2>
      <p className="muted">
        These are your SaaS's own OAuth developer app keys for each platform (used to let users
        connect their accounts) — not any individual user's password.
      </p>

      {message && <div className="alert alert-info">{message}</div>}

      <div className="credentials-grid">
        {credentials.map((cred) => {
          const draft = drafts[cred.platform] || {};
          return (
            <div className="credential-card" key={cred.platform}>
              <div className="credential-header">
                <span className={`platform-badge platform-${cred.platform}`}>
                  {PLATFORM_LABELS[cred.platform]}
                </span>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={draft.is_enabled ?? cred.is_enabled}
                    onChange={(e) => setDraft(cred.platform, 'is_enabled', e.target.checked)}
                  />
                  Enabled
                </label>
              </div>

              <label className="field">
                <span>
                  {cred.platform === 'telegram'
                    ? 'Bot Username'
                    : cred.platform === 'tiktok'
                      ? 'Client Key'
                      : 'Client ID / App ID'}
                </span>
                <input
                  value={draft.client_id ?? cred.client_id ?? ''}
                  onChange={(e) => setDraft(cred.platform, 'client_id', e.target.value)}
                  placeholder={cred.platform === 'telegram' ? '@MySaaSBot' : undefined}
                />
              </label>

              <label className="field">
                <span>{cred.platform === 'telegram' ? 'Bot Token' : 'Client Secret'}</span>
                <input
                  type="password"
                  value={draft.client_secret ?? ''}
                  onChange={(e) => setDraft(cred.platform, 'client_secret', e.target.value)}
                  placeholder={
                    cred.has_secret
                      ? cred.client_secret_masked
                      : cred.platform === 'telegram'
                        ? '123456789:ABCdefGhIJKlmNoPQRstuVWXyz'
                        : 'Not set'
                  }
                />
              </label>
              {cred.platform === 'telegram' && (
                <p className="muted small">
                  Create this bot once with{' '}
                  <a href="https://t.me/BotFather" target="_blank" rel="noreferrer">
                    @BotFather
                  </a>{' '}
                  — every user will add it as admin to their own channel/group. Saving here also
                  registers this bot's webhook automatically (for the Inbox feature) — no extra
                  setup needed.
                </p>
              )}

              {cred.platform === 'facebook' && (
                <>
                  <label className="field">
                    <span>Login Configuration ID</span>
                    <input
                      value={draft.config_id ?? cred.config_id ?? ''}
                      onChange={(e) => setDraft(cred.platform, 'config_id', e.target.value)}
                      placeholder="e.g. 1234567890123456"
                    />
                  </label>
                  <p className="muted small">
                    Required if your app uses "Facebook Login for Business" (Meta shows this
                    on Business-type apps instead of classic Facebook Login). Find/create it
                    under <strong>Facebook Login for Business → Configurations</strong> in the
                    Meta Developer Console, then paste the Configuration ID here.
                  </p>
                  {cred.webhook_secret && (
                    <p className="muted small">
                      For the Inbox feature (Messenger + Instagram DMs): in Meta Developer
                      Console → your app → <strong>Webhooks</strong>, add Callback URL{' '}
                      <code>https://api.socialsaas.a-haque.com/api/webhooks/meta</code> and
                      Verify Token <code>{cred.webhook_secret}</code>, then subscribe to the{' '}
                      <code>messages</code> field for both the Page and Instagram objects.
                    </p>
                  )}
                </>
              )}

              {cred.platform === 'tiktok' && (
                <p className="muted small">
                  From TikTok Developer Portal → your app → <strong>Login Kit</strong> Redirect
                  URI, add the exact URL{' '}
                  <code>https://api.socialsaas.a-haque.com/api/social-accounts/oauth/tiktok/callback</code>{' '}
                  (must match exactly, including the trailing path). While the app is a
                  Sandbox/unaudited app, only TikTok accounts added there as "Target users" can
                  actually connect and post.
                </p>
              )}

              <button
                className="btn btn-primary btn-small"
                disabled={busyPlatform === cred.platform}
                onClick={() => save(cred)}
              >
                {busyPlatform === cred.platform ? 'Saving...' : 'Save'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AdsPanel() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState({});
  const [busyPlacement, setBusyPlacement] = useState(null);
  const [message, setMessage] = useState('');

  // `silent` skips the loading spinner — used after Save so the form just
  // quietly updates in place instead of flashing blank first.
  const load = (silent = false) => {
    if (!silent) setLoading(true);
    api
      .get('/admin/ad-slots')
      .then((res) => setSlots(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const setDraft = (placement, field, value) => {
    setDrafts((d) => ({ ...d, [placement]: { ...d[placement], [field]: value } }));
  };

  const save = async (slot) => {
    const draft = drafts[slot.placement] || {};
    setBusyPlacement(slot.placement);
    setMessage('');
    try {
      await api.post(`/admin/ad-slots/${slot.placement}`, {
        network: draft.network ?? slot.network,
        code: draft.code ?? slot.code ?? '',
        no_visible_output: draft.no_visible_output ?? slot.no_visible_output,
        is_enabled: draft.is_enabled ?? slot.is_enabled,
      });
      setMessage(`${AD_PLACEMENT_LABELS[slot.placement]} ad saved.`);
      load(true);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not save this ad slot.');
    } finally {
      setBusyPlacement(null);
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="card">
      <h2>Ad Slots</h2>
      <p className="muted">
        Paste your Google AdSense ad-unit code or Adsterra embed code (or any other ad network's
        script) into a slot below and enable it — it renders live for every logged-in user on
        that page. Leave a slot's code empty and disabled to hide it. Ads are your own revenue
        integration; keep the codes and account usage compliant with each network's policies
        (e.g. never ask or incentivize users to click).
      </p>

      {message && <div className="alert alert-info">{message}</div>}

      {slots.map((slot) => {
        const draft = drafts[slot.placement] || {};
        return (
          <div className="ad-slot-card" key={slot.placement}>
            <div className="ad-slot-header">
              <div>
                <strong>{AD_PLACEMENT_LABELS[slot.placement] || slot.placement}</strong>
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={draft.is_enabled ?? slot.is_enabled}
                  onChange={(e) => setDraft(slot.placement, 'is_enabled', e.target.checked)}
                />
                Enabled
              </label>
            </div>

            <label className="field">
              <span>Ad Network</span>
              <select
                value={draft.network ?? slot.network ?? 'custom'}
                onChange={(e) => setDraft(slot.placement, 'network', e.target.value)}
              >
                {AD_NETWORKS.map((n) => (
                  <option key={n} value={n}>
                    {AD_NETWORK_LABELS[n]}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Embed Code</span>
              <textarea
                className="ad-slot-code"
                rows={5}
                value={draft.code ?? slot.code ?? ''}
                onChange={(e) => setDraft(slot.placement, 'code', e.target.value)}
                placeholder={'<ins class="adsbygoogle" ...></ins>\n<script>...</script>'}
                spellCheck={false}
              />
            </label>

            <label className="toggle mb-3.5">
              <input
                type="checkbox"
                checked={draft.no_visible_output ?? slot.no_visible_output ?? false}
                onChange={(e) => setDraft(slot.placement, 'no_visible_output', e.target.checked)}
              />
              This ad has no visible box (Adsterra Social Bar / Popunder / Direct Link) — don't
              auto-hide it
            </label>

            <button
              className="btn btn-primary btn-small"
              disabled={busyPlacement === slot.placement}
              onClick={() => save(slot)}
            >
              {busyPlacement === slot.placement ? 'Saving...' : 'Save'}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function PromotePanel() {
  return (
    <>
      <FacebookPixelPanel />
      <TelegramButtonPanel />
      <ServicesPanel />
    </>
  );
}

function FacebookPixelPanel() {
  const [settings, setSettings] = useState(null);
  const [pixelId, setPixelId] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = () => {
    api.get('/site-settings').then((res) => {
      setSettings(res.data);
      setPixelId(res.data.facebook_pixel_id || '');
      setEnabled(!!res.data.facebook_pixel_enabled);
    });
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await api.post('/admin/site-settings', {
        facebook_pixel_id: pixelId,
        facebook_pixel_enabled: enabled,
      });
      setMessage('Facebook Pixel saved.');
      load();
    } catch (err) {
      const errors = err.response?.data?.errors;
      const firstError = errors ? Object.values(errors)[0]?.[0] : null;
      setError(firstError || err.response?.data?.message || 'Could not save.');
    } finally {
      setBusy(false);
    }
  };

  if (!settings) return <p>Loading...</p>;

  return (
    <div className="card">
      <h2>Facebook Pixel</h2>
      <p className="muted">
        Loads Meta's tracking pixel on every page — including the logged-out Login/Register
        screens, so ad campaigns can measure the full signup funnel. Fires a{' '}
        <code>PageView</code> on every page, plus <code>CompleteRegistration</code> on signup and{' '}
        <code>Lead</code> whenever someone clicks a service's "Contact on WhatsApp" button.
      </p>

      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-info">{message}</div>}

      <label className="field">
        <span>Pixel ID</span>
        <input
          value={pixelId}
          onChange={(e) => setPixelId(e.target.value)}
          placeholder="123456789012345"
          inputMode="numeric"
        />
        <span className="muted small">
          Found in Meta Events Manager → Data Sources → your pixel → Settings.
        </span>
      </label>

      <label className="toggle mb-3.5">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        Enable the pixel site-wide
      </label>

      <button className="btn btn-primary btn-small" disabled={busy} onClick={save}>
        {busy ? 'Saving...' : 'Save'}
      </button>
    </div>
  );
}

function TelegramButtonPanel() {
  const [settings, setSettings] = useState(null);
  const [url, setUrl] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = () => {
    api.get('/site-settings').then((res) => {
      setSettings(res.data);
      setUrl(res.data.telegram_channel_url || '');
      setEnabled(!!res.data.telegram_button_enabled);
    });
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setBusy(true);
    setMessage('');
    try {
      await api.post('/admin/site-settings', {
        telegram_channel_url: url,
        telegram_button_enabled: enabled,
      });
      setMessage('Telegram button saved.');
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not save.');
    } finally {
      setBusy(false);
    }
  };

  if (!settings) return <p>Loading...</p>;

  return (
    <div className="card">
      <h2>Floating "Join Telegram Channel" Button</h2>
      <p className="muted">
        Shows as a floating button on every page for every logged-in user, linking straight to
        your channel — a simple way to funnel your existing traffic there.
      </p>

      {message && <div className="alert alert-info">{message}</div>}

      <label className="field">
        <span>Telegram Channel URL</span>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://t.me/yourchannel"
        />
      </label>

      <label className="toggle mb-3.5">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        Show the floating button
      </label>

      <button className="btn btn-primary btn-small" disabled={busy} onClick={save}>
        {busy ? 'Saving...' : 'Save'}
      </button>
    </div>
  );
}

function ServiceForm({ initial, onSaved, onCancel }) {
  const isEdit = !!initial;
  const [title, setTitle] = useState(initial?.title || '');
  const [shortDescription, setShortDescription] = useState(initial?.short_description || '');
  const [details, setDetails] = useState(initial?.details || '');
  const [whatsappNumber, setWhatsappNumber] = useState(initial?.whatsapp_number || '');
  const [whatsappMessage, setWhatsappMessage] = useState(initial?.whatsapp_message || '');
  const [sortOrder, setSortOrder] = useState(initial?.sort_order ?? 0);
  const [isEnabled, setIsEnabled] = useState(initial?.is_enabled ?? true);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(initial?.image_url || null);
  const [removeImage, setRemoveImage] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0] || null;
    setImageFile(file);
    setRemoveImage(false);
    if (file) setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const form = new FormData();
      form.append('title', title);
      form.append('short_description', shortDescription || '');
      form.append('details', details || '');
      form.append('whatsapp_number', whatsappNumber || '');
      form.append('whatsapp_message', whatsappMessage || '');
      form.append('sort_order', sortOrder);
      form.append('is_enabled', isEnabled ? '1' : '0');
      if (imageFile) form.append('image', imageFile);
      if (removeImage) form.append('remove_image', '1');

      if (isEdit) {
        await api.post(`/admin/services/${initial.id}`, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post('/admin/services', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      onSaved();
    } catch (err) {
      const errors = err.response?.data?.errors;
      const firstError = errors ? Object.values(errors)[0]?.[0] : null;
      setError(firstError || err.response?.data?.message || 'Could not save this service.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2>{isEdit ? 'Edit Service' : 'Add Service'}</h2>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="upload-box mb-4">
        <h3>Image</h3>
        <p className="upload-hint">Shown as the card thumbnail. Square-ish images look best.</p>
        <div className="upload-preview">
          {imagePreview ? (
            <img src={imagePreview} alt="Preview" />
          ) : (
            <span className="upload-preview-empty">No image set</span>
          )}
        </div>
        <div className="upload-actions">
          <label className="file-input-label">
            📤 Upload Image
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageChange} />
          </label>
          {imagePreview && (
            <button
              type="button"
              className="btn btn-ghost btn-danger btn-small"
              onClick={() => {
                setImageFile(null);
                setImagePreview(null);
                setRemoveImage(true);
              }}
            >
              Remove
            </button>
          )}
        </div>
      </div>

      <div className="form-row">
        <label className="field">
          <span>Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label className="field">
          <span>Short Description (shown on the card)</span>
          <input
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
            placeholder="One line summary"
          />
        </label>
      </div>

      <label className="field">
        <span>Details (shown when a user clicks the service)</span>
        <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={4} />
      </label>

      <div className="form-row">
        <label className="field">
          <span>WhatsApp Number</span>
          <input
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
            placeholder="+8801XXXXXXXXX"
          />
        </label>
        <label className="field">
          <span>WhatsApp Message (optional)</span>
          <input
            value={whatsappMessage}
            onChange={(e) => setWhatsappMessage(e.target.value)}
            placeholder={`Hi, I'm interested in ${title || 'this service'}.`}
          />
        </label>
      </div>

      <div className="form-row">
        <label className="field">
          <span>Sort Order (lower shows first)</span>
          <input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          />
        </label>
        <label className="toggle self-end mb-4">
          <input type="checkbox" checked={isEnabled} onChange={(e) => setIsEnabled(e.target.checked)} />
          Enabled (visible to users)
        </label>
      </div>

      <div className="form-actions">
        <button className="btn btn-primary" disabled={busy}>
          {busy ? 'Saving...' : 'Save Service'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function ServicesPanel() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = (silent = false) => {
    if (!silent) setLoading(true);
    api
      .get('/admin/services')
      .then((res) => setServices(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (service) => {
    if (!window.confirm(`Delete "${service.title}"?`)) return;
    setBusyId(service.id);
    try {
      await api.delete(`/admin/services/${service.id}`);
      load(true);
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="card">
      <div className="panel-header">
        <h2 className="panel-title-inline">Services ({services.length})</h2>
        {!showCreate && (
          <button className="btn btn-primary btn-small" onClick={() => setShowCreate(true)}>
            + Add Service
          </button>
        )}
      </div>
      <p className="muted">
        Shown as clickable cards on every user's Dashboard, with a WhatsApp button to turn
        interest into a direct conversation.
      </p>

      {showCreate && (
        <ServiceForm
          onSaved={() => {
            setShowCreate(false);
            load(true);
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {services.length === 0 ? (
        <p className="muted">No services yet.</p>
      ) : (
        <div className="service-grid">
          {services.map((service) =>
            editingId === service.id ? (
              <div key={service.id} className="col-span-full">
                <ServiceForm
                  initial={service}
                  onSaved={() => {
                    setEditingId(null);
                    load(true);
                  }}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            ) : (
              <div className="service-card" key={service.id}>
                <div className="service-card-image !cursor-default">
                  {service.image_url ? (
                    <img src={service.image_url} alt={service.title} />
                  ) : (
                    <span className="service-card-image-empty">{service.title[0]}</span>
                  )}
                </div>
                <div className="service-card-body">
                  <strong>{service.title}</strong>
                  {!service.is_enabled && <span className="status-badge status-draft">Disabled</span>}
                  {service.short_description && <p className="muted small">{service.short_description}</p>}
                  <div className="form-actions mt-auto">
                    <button className="btn btn-ghost btn-small" onClick={() => setEditingId(service.id)}>
                      Edit
                    </button>
                    <button
                      className="btn btn-ghost btn-danger btn-small"
                      disabled={busyId === service.id}
                      onClick={() => remove(service)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
