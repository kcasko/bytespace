import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { deleteMessage, getConversations, getMessages, sendMessage, startConversation } from '../api/dmApi.js';
import ReportAction from '../components/ReportAction.jsx';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '');

function toAssetUrl(url) {
  if (!url) return '';
  return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
}

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleString();
}

function ConversationButton({ conversation, selected, onSelect }) {
  const other = conversation.otherUser;
  const latest = conversation.latestMessage;

  return (
    <button type="button" className={selected ? 'dm-conversation is-active' : 'dm-conversation'} onClick={() => onSelect(conversation.id)}>
      {other.profileImageUrl ? <img src={toAssetUrl(other.profileImageUrl)} alt="" /> : <span>{other.displayName.slice(0, 2).toUpperCase()}</span>}
      <div>
        <strong>{other.displayName}</strong>
        <small>@{other.username}</small>
        <p>{latest ? latest.body : 'No messages yet.'}</p>
      </div>
    </button>
  );
}

export default function MessagesPage({ currentUser }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedUser = searchParams.get('user') || '';
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [recipientUsername, setRecipientUsername] = useState(requestedUser);
  const [body, setBody] = useState('');
  const [status, setStatus] = useState(currentUser ? 'loading' : 'logged-out');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const selectedConversation = useMemo(() => conversations.find((item) => item.id === selectedId) || conversation, [conversations, selectedId, conversation]);

  async function loadConversations(nextSelectedId = selectedId) {
    setError('');
    const data = await getConversations();
    const loaded = data.conversations || [];
    setConversations(loaded);

    const idToSelect = nextSelectedId || loaded[0]?.id || null;
    if (idToSelect) {
      setSelectedId(idToSelect);
      await loadMessages(idToSelect);
    } else {
      setConversation(null);
      setMessages([]);
    }
  }

  async function loadMessages(conversationId) {
    const data = await getMessages(conversationId);
    setConversation(data.conversation);
    setMessages(data.messages || []);
  }

  useEffect(() => {
    let ignore = false;

    async function load() {
      if (!currentUser) {
        setStatus('logged-out');
        return;
      }

      setStatus('loading');
      setError('');

      try {
        const data = await getConversations();
        if (ignore) return;
        const loaded = data.conversations || [];
        setConversations(loaded);
        setStatus('ready');

        if (requestedUser) {
          setRecipientUsername(requestedUser);
        } else if (loaded[0]) {
          setSelectedId(loaded[0].id);
          await loadMessages(loaded[0].id);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message);
          setStatus('ready');
        }
      }
    }

    load();
    return () => { ignore = true; };
  }, [currentUser]);

  async function handleStart(event) {
    event.preventDefault();
    setMessage('');
    setError('');

    try {
      const data = await startConversation(recipientUsername);
      setMessage(`Conversation with @${data.conversation.otherUser.username} ready.`);
      setSearchParams(new URLSearchParams());
      setSelectedId(data.conversation.id);
      await loadConversations(data.conversation.id);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSelect(id) {
    setSelectedId(id);
    setMessage('');
    setError('');
    try {
      await loadMessages(id);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSend(event) {
    event.preventDefault();
    if (!selectedId) return;
    setMessage('');
    setError('');

    try {
      const data = await sendMessage(selectedId, body);
      setBody('');
      setConversation(data.conversation);
      setMessages(data.messages || []);
      await loadConversations(selectedId);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    setMessage('');
    setError('');

    try {
      await deleteMessage(id);
      setMessage('Message deleted. The paper shredder coughed politely.');
      if (selectedId) await loadMessages(selectedId);
      await loadConversations(selectedId);
    } catch (err) {
      setError(err.message);
    }
  }

  if (!currentUser || status === 'logged-out') {
    return (
      <main className="page-shell auth-shell">
        <section className="auth-panel">
          <h1>Messages</h1>
          <div className="auth-error">Log in to use friends-only direct messages.</div>
          <p className="auth-switch"><Link to="/login">Login</Link> or <Link to="/register">Register</Link></p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell messages-shell">
      <section className="messages-panel">
        <h1>Direct Messages</h1>
        <p className="auth-note">Friends-only, text-only, no attachments. The tiny mailbox has boundaries.</p>
        {message && <div className="editor-success">{message}</div>}
        {error && <div className="auth-error">{error}</div>}
        {status === 'loading' && <div className="retro-state">Loading the message drawer...</div>}

        <form className="dm-start-form" onSubmit={handleStart}>
          <label>
            Start with friend username
            <input value={recipientUsername} onChange={(event) => setRecipientUsername(event.target.value)} placeholder="friend username" />
          </label>
          <button type="submit">Start Conversation</button>
          <button type="button" onClick={() => loadConversations(selectedId)}>Refresh</button>
        </form>

        <div className="messages-layout">
          <aside className="dm-sidebar" aria-label="Conversations">
            <h2>Conversations</h2>
            {conversations.length === 0 ? (
              <div className="friend-empty-note">No DMs yet. Find a friend and send a tiny envelope.</div>
            ) : conversations.map((item) => (
              <ConversationButton key={item.id} conversation={item} selected={item.id === selectedId} onSelect={handleSelect} />
            ))}
          </aside>

          <section className="dm-thread" aria-label="Message thread">
            {selectedConversation ? (
              <>
                <header>
                  <h2>{selectedConversation.otherUser.displayName}</h2>
                  <Link to={`/profile/${selectedConversation.otherUser.username}`}>@{selectedConversation.otherUser.username}</Link>
                  {selectedConversation.isBlocked && <div className="auth-error">This conversation is blocked.</div>}
                  {!selectedConversation.isFriend && <div className="auth-error">You must be friends to send new messages.</div>}
                </header>

                <div className="dm-message-list">
                  {messages.length === 0 ? (
                    <div className="friend-empty-note">No messages yet. Type something normal-ish.</div>
                  ) : messages.map((item) => (
                    <article className={item.senderId === currentUser.id ? 'dm-message is-own' : 'dm-message'} key={item.id}>
                      <header>
                        <strong>@{item.senderUsername}</strong>
                        <span>{formatDate(item.createdAt)}</span>
                      </header>
                      <p>{item.body}</p>
                      {!item.isDeleted && (
                        <div className="dm-message-actions">
                          {item.canDelete && <button type="button" onClick={() => handleDelete(item.id)}>Delete</button>}
                          <ReportAction currentUser={currentUser} targetType="dm_message" targetId={item.id} label="Report" />
                        </div>
                      )}
                    </article>
                  ))}
                </div>

                <form className="dm-compose" onSubmit={handleSend}>
                  <label>
                    Message
                    <textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength="1000" placeholder="Type a private message..." />
                  </label>
                  <button type="submit" disabled={selectedConversation.isBlocked || !selectedConversation.isFriend}>Send Message</button>
                </form>
              </>
            ) : (
              <div className="friend-empty-note">Choose a conversation or start one with a friend.</div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
