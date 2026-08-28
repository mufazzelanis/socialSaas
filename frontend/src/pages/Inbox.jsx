import { useCallback, useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';
import Icon from '../components/Icon';
import api from '../api/client';

const PLATFORM_LABELS = {
  telegram: 'Telegram',
  facebook: 'Facebook',
  instagram: 'Instagram',
  whatsapp: 'WhatsApp',
};

// No platform here pushes updates to the browser directly (no WebSocket
// server in this app) — the inbox just quietly re-checks for anything new
// on this interval instead. Frequent enough to feel responsive without
// hammering the API.
const POLL_INTERVAL_MS = 15000;

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

function timeAgo(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString();
}

export default function Inbox() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [thread, setThread] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const threadEndRef = useRef(null);

  const loadConversations = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    return api
      .get('/conversations')
      .then((res) => setConversations(res.data))
      .finally(() => setLoading(false));
  }, []);

  const loadThread = useCallback((id, silent = false) => {
    return api.get(`/conversations/${id}`).then((res) => {
      setThread(res.data);
      // Opening/refreshing a thread marks it read server-side — reflect
      // that locally too instead of waiting for the next list poll.
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, unread_count: 0 } : c))
      );
    });
  }, []);

  useEffect(() => {
    loadConversations();
    const interval = setInterval(() => loadConversations(true), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadConversations]);

  useEffect(() => {
    if (!activeId) return undefined;
    loadThread(activeId);
    const interval = setInterval(() => loadThread(activeId, true), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [activeId, loadThread]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ block: 'end' });
  }, [thread?.messages?.length]);

  const handleSelect = (id) => {
    setActiveId(id);
    setThread(null);
    setError('');
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !activeId) return;

    setSending(true);
    setError('');
    try {
      await api.post(`/conversations/${activeId}/reply`, { content: replyText.trim() });
      setReplyText('');
      await loadThread(activeId, true);
      loadConversations(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send that reply.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Layout>
      <h1>Inbox</h1>
      <p className="page-subtitle">
        Messages from your connected accounts, all in one place.
      </p>

      <div className="inbox-layout">
        <div className="inbox-list">
          {loading ? (
            <p className="muted" style={{ padding: '1rem' }}>
              Loading...
            </p>
          ) : conversations.length === 0 ? (
            <p className="muted" style={{ padding: '1rem' }}>
              No messages yet — once someone messages one of your connected accounts, it'll
              show up here.
            </p>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                type="button"
                className={'inbox-list-item' + (activeId === c.id ? ' active' : '')}
                onClick={() => handleSelect(c.id)}
              >
                <span className={`inbox-avatar platform-${c.social_account.platform}`}>
                  {initials(c.participant_name)}
                </span>
                <span className="inbox-list-item-body">
                  <span className="inbox-list-item-top">
                    <strong>{c.participant_name || 'Unknown'}</strong>
                    <span className="inbox-list-item-time">{timeAgo(c.last_message_at)}</span>
                  </span>
                  <span className="inbox-list-item-preview">
                    {c.latest_message?.direction === 'outbound' ? 'You: ' : ''}
                    {c.latest_message?.content || '(no text)'}
                  </span>
                  <span className={`platform-badge platform-${c.social_account.platform} inbox-platform-tag`}>
                    {PLATFORM_LABELS[c.social_account.platform] || c.social_account.platform}
                    {' · '}
                    {c.social_account.account_name}
                  </span>
                </span>
                {c.unread_count > 0 && <span className="inbox-unread-dot">{c.unread_count}</span>}
              </button>
            ))
          )}
        </div>

        <div className="inbox-thread">
          {!activeId || !thread ? (
            <div className="inbox-thread-empty">
              <Icon name="inbox" size={32} />
              <p className="muted">Select a conversation to view messages.</p>
            </div>
          ) : (
            <>
              <div className="inbox-thread-header">
                <strong>{thread.participant_name || 'Unknown'}</strong>
                <span className={`platform-badge platform-${thread.social_account.platform}`}>
                  {PLATFORM_LABELS[thread.social_account.platform] || thread.social_account.platform}
                </span>
              </div>

              <div className="inbox-thread-messages">
                {thread.messages.map((m) => (
                  <div key={m.id} className={'inbox-bubble-row ' + m.direction}>
                    <div className={'inbox-bubble ' + m.direction}>
                      {m.content}
                      {m.status === 'failed' && (
                        <div className="inbox-bubble-error">
                          <Icon name="alert" size={12} /> {m.error_message || 'Failed to send'}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={threadEndRef} />
              </div>

              {error && <div className="alert alert-error">{error}</div>}

              <form className="inbox-reply-box" onSubmit={handleReply}>
                <input
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type a reply..."
                  disabled={sending}
                />
                <button className="btn btn-primary" disabled={sending || !replyText.trim()}>
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
