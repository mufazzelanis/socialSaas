import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const PLATFORM_LABELS = {
  telegram: 'Telegram',
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
};

const ALL_PLATFORMS = ['telegram', 'facebook', 'instagram', 'linkedin', 'tiktok'];

function OAuthResultBanner() {
  const [searchParams, setSearchParams] = useSearchParams();
  const connected = searchParams.get('connected');
  const count = Number(searchParams.get('count') || 0);
  const found = Number(searchParams.get('found') || 0);
  const oauthError = searchParams.get('oauth_error');
  const platform = searchParams.get('platform');

  if (!connected && !oauthError) return null;

  const dismiss = () => {
    searchParams.delete('connected');
    searchParams.delete('count');
    searchParams.delete('found');
    searchParams.delete('oauth_error');
    searchParams.delete('platform');
    setSearchParams(searchParams, { replace: true });
  };

  if (oauthError) {
    return (
      <div className="alert alert-error alert-dismissible" onClick={dismiss} title="Click to dismiss">
        Couldn't connect {PLATFORM_LABELS[platform] || platform}: {oauthError}
      </div>
    );
  }

  if (count === 0) {
    return (
      <div className="alert alert-info alert-dismissible" onClick={dismiss} title="Click to dismiss">
        {found > 0
          ? `Found ${found} ${PLATFORM_LABELS[connected] || connected} account(s), but you don't have permission for them yet — ask your admin.`
          : `No ${PLATFORM_LABELS[connected] || connected} Pages/accounts were found for that login.`}
      </div>
    );
  }

  return (
    <div className="alert alert-success alert-dismissible" onClick={dismiss} title="Click to dismiss">
      ✓ Connected {count} account{count === 1 ? '' : 's'} via {PLATFORM_LABELS[connected] || connected}.
    </div>
  );
}

export default function ConnectAccounts() {
  const { user } = useAuth();
  const allowed = user?.allowed_platforms || [];

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [oauthBusy, setOauthBusy] = useState(null);

  const [chatId, setChatId] = useState('');
  const [accountName, setAccountName] = useState('');
  const [telegramBot, setTelegramBot] = useState(null);

  // `silent` skips the loading spinner — used after connect/disconnect so
  // the list just quietly updates in place instead of flashing blank first.
  const loadAccounts = (silent = false) => {
    if (!silent) setLoading(true);
    api
      .get('/social-accounts')
      .then((res) => setAccounts(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAccounts();
    api
      .get('/social-accounts/telegram-bot-info')
      .then((res) => setTelegramBot(res.data))
      .catch(() => setTelegramBot({ configured: false, bot_username: null }));
  }, []);

  const handleConnectTelegram = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setBusy(true);
    try {
      await api.post('/social-accounts', {
        platform: 'telegram',
        chat_id: chatId,
        account_name: accountName || undefined,
      });
      setSuccess('Telegram account connected successfully.');
      setChatId('');
      setAccountName('');
      loadAccounts(true);
    } catch (err) {
      const errors = err.response?.data?.errors;
      const firstError = errors ? Object.values(errors)[0]?.[0] : null;
      setError(firstError || err.response?.data?.message || 'Could not connect account.');
    } finally {
      setBusy(false);
    }
  };

  const handleConnectOAuth = async (platform) => {
    setOauthBusy(platform);
    try {
      const res = await api.get(`/social-accounts/oauth/${platform}/redirect`);
      window.location.href = res.data.url;
    } catch (err) {
      alert(err.response?.data?.message || `Could not start the ${platform} connection.`);
      setOauthBusy(null);
    }
  };

  const handleDisconnect = async (id) => {
    if (!window.confirm('Disconnect this account?')) return;
    await api.delete(`/social-accounts/${id}`);
    loadAccounts(true);
  };

  return (
    <Layout>
      <h1>Social Accounts</h1>
      <p className="page-subtitle">Connect the accounts you want to publish to.</p>

      <OAuthResultBanner />

      <div className="card">
        <h2>What You Can Connect</h2>
        <p className="muted">
          Your admin decides which of these you can use. Contact them if something below is
          locked.
        </p>
        <div className="platform-access-row">
          {ALL_PLATFORMS.map((p) => (
            <span
              key={p}
              className={'access-badge' + (allowed.includes(p) ? ' access-granted' : ' access-locked')}
            >
              {allowed.includes(p) ? '✓' : '🔒'} {PLATFORM_LABELS[p]}
            </span>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>Connected Accounts</h2>
        {loading ? (
          <p>Loading...</p>
        ) : accounts.length === 0 ? (
          <p className="muted">No accounts connected yet.</p>
        ) : (
          <ul className="account-list">
            {accounts.map((acc) => (
              <li key={acc.id} className="account-item">
                <div>
                  <span className={`platform-badge platform-${acc.platform}`}>
                    {PLATFORM_LABELS[acc.platform] || acc.platform}
                  </span>
                  <strong>{acc.account_name}</strong>
                  <span className={`status-dot status-${acc.status}`} />
                </div>
                <button
                  className="btn btn-ghost btn-danger"
                  onClick={() => handleDisconnect(acc.id)}
                >
                  Disconnect
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h2>Facebook &amp; Instagram</h2>
        <p className="muted">
          Just log in with Facebook below — no technical setup needed. Your Facebook Page (and
          your Instagram, if it's connected to that Page) will be added automatically.
        </p>

        {!allowed.includes('facebook') ? (
          <div className="alert alert-info">
            🔒 Not available for your account yet. Ask your admin to turn it on for you.
          </div>
        ) : (
          <button
            className="btn btn-primary"
            disabled={oauthBusy === 'facebook'}
            onClick={() => handleConnectOAuth('facebook')}
          >
            {oauthBusy === 'facebook' ? 'Opening Facebook...' : '📘 Log in with Facebook'}
          </button>
        )}
      </div>

      <div className="card">
        <h2>LinkedIn</h2>
        <p className="muted">Just log in with LinkedIn below — no technical setup needed.</p>

        {!allowed.includes('linkedin') ? (
          <div className="alert alert-info">
            🔒 Not available for your account yet. Ask your admin to turn it on for you.
          </div>
        ) : (
          <button
            className="btn btn-primary"
            disabled={oauthBusy === 'linkedin'}
            onClick={() => handleConnectOAuth('linkedin')}
          >
            {oauthBusy === 'linkedin' ? 'Opening LinkedIn...' : '💼 Log in with LinkedIn'}
          </button>
        )}
      </div>

      <div className="card">
        <h2>TikTok</h2>
        <p className="muted">
          Just log in with TikTok below — no technical setup needed. Posts through this app are
          video-only, and (until this app passes TikTok's review) publish privately to your own
          account rather than publicly.
        </p>

        {!allowed.includes('tiktok') ? (
          <div className="alert alert-info">
            🔒 Not available for your account yet. Ask your admin to turn it on for you.
          </div>
        ) : (
          <button
            className="btn btn-primary"
            disabled={oauthBusy === 'tiktok'}
            onClick={() => handleConnectOAuth('tiktok')}
          >
            {oauthBusy === 'tiktok' ? 'Opening TikTok...' : '🎵 Log in with TikTok'}
          </button>
        )}
      </div>

      <div className="card">
        <h2>Connect Telegram</h2>

        {!allowed.includes('telegram') ? (
          <div className="alert alert-info">
            🔒 Not available for your account yet. Ask your admin to turn it on for you.
          </div>
        ) : !telegramBot ? (
          <p>Loading...</p>
        ) : !telegramBot.configured ? (
          <div className="alert alert-info">
            Telegram isn't set up yet — ask your admin to configure the bot in Platform
            Credentials first.
          </div>
        ) : (
          <>
            <p className="muted">
              Add{' '}
              <strong>{telegramBot.bot_username ? `@${telegramBot.bot_username.replace(/^@/, '')}` : 'our bot'}</strong>{' '}
              as admin to your Telegram channel/group, then paste the channel/chat ID below
              (e.g. <code>@yourchannel</code> or a numeric chat id). Have more than one
              channel/group? Connect this one, then just fill in the form again with the next
              chat ID — each one gets added separately, and you can pick any combination of them
              when publishing a post.
            </p>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <form onSubmit={handleConnectTelegram} className="form-grid">
              <label className="field">
                <span>Chat / Channel ID</span>
                <input
                  value={chatId}
                  onChange={(e) => setChatId(e.target.value)}
                  placeholder="@yourchannel or -1001234567890"
                  required
                />
              </label>

              <label className="field">
                <span>Label (optional)</span>
                <input
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="My Telegram Channel"
                />
              </label>

              <button className="btn btn-primary" disabled={busy}>
                {busy ? 'Connecting...' : 'Connect Telegram'}
              </button>
            </form>
          </>
        )}
      </div>
    </Layout>
  );
}
