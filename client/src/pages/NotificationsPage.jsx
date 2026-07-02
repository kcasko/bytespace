import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from '../api/notificationApi.js';

function formatDate(value) {
  if (!value) return '';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value));
}

function notifyUnreadCountChanged() {
  window.dispatchEvent(new Event('bytespace:notifications-changed'));
}

function NotificationLink({ notification, onOpen }) {
  const content = notification.linkUrl ? (
    <Link to={notification.linkUrl} onClick={onOpen}>Open</Link>
  ) : null;

  return content;
}

export default function NotificationsPage({ currentUser }) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [status, setStatus] = useState(currentUser ? 'loading' : 'logged-out');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadNotifications() {
    if (!currentUser) {
      setStatus('logged-out');
      return;
    }

    setStatus('loading');
    setError('');

    try {
      const data = await getNotifications();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
      setStatus('ready');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }

  useEffect(() => {
    loadNotifications();
  }, [currentUser]);

  async function markRead(notificationId, { quiet = false } = {}) {
    setMessage('');
    setError('');

    const wasUnread = notifications.some((notification) => (
      notification.id === notificationId && !notification.readAt
    ));

    try {
      const updated = await markNotificationRead(notificationId);
      setNotifications((current) => current.map((notification) => (
        notification.id === updated.id ? updated : notification
      )));

      if (wasUnread) {
        setUnreadCount((current) => Math.max(0, current - 1));
      }

      notifyUnreadCountChanged();

      if (!quiet) {
        setMessage('Notification marked as read. The blinking light calmed down.');
      }

      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }

  async function openNotification(event, notification) {
    if (!notification.linkUrl || notification.readAt) {
      return;
    }

    event.preventDefault();
    const marked = await markRead(notification.id, { quiet: true });

    if (marked) {
      navigate(notification.linkUrl);
    }
  }

  async function markAllRead() {
    setMessage('');
    setError('');

    try {
      await markAllNotificationsRead();
      setNotifications((current) => current.map((notification) => ({
        ...notification,
        readAt: notification.readAt || new Date().toISOString()
      })));
      setUnreadCount(0);
      notifyUnreadCountChanged();
      setMessage('All notifications marked as read. Inbox goblin contained.');
    } catch (err) {
      setError(err.message);
    }
  }

  if (!currentUser || status === 'logged-out') {
    return (
      <main className="page-shell auth-shell">
        <section className="auth-panel">
          <h1>Notifications Locked</h1>
          <p className="auth-note">Log in to check who is rattling your ByteSpace mailbox.</p>
          <p className="auth-switch"><Link to="/login">Login</Link> or <Link to="/register">Register</Link></p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell notifications-shell">
      <section className="notifications-panel">
        <header className="notifications-header">
          <div>
            <p className="dashboard-kicker">Inbox Blinker</p>
            <h1>Notifications</h1>
            <p>{unreadCount} unread notification{unreadCount === 1 ? '' : 's'}</p>
          </div>
          <button type="button" onClick={markAllRead} disabled={unreadCount === 0 || status === 'loading'}>
            Mark All Read
          </button>
        </header>

        {message && <div className="editor-success">{message}</div>}
        {error && <div className="auth-error">{error}</div>}
        {status === 'loading' && <div className="retro-state">Loading notification static...</div>}

        {status !== 'loading' && notifications.length === 0 && (
          <div className="friend-empty-note">No notifications yet. The inbox light is dark and dramatic.</div>
        )}

        <div className="notification-list">
          {notifications.map((notification) => (
            <article
              className={`notification-card ${notification.readAt ? 'notification-card--read' : 'notification-card--unread'}`}
              key={notification.id}
            >
              <header>
                <div>
                  <strong>{notification.title}</strong>
                  <span>{formatDate(notification.createdAt)}</span>
                </div>
                {!notification.readAt && <span className="notification-unread-dot">Unread</span>}
              </header>
              {notification.body && <p>{notification.body}</p>}
              <div className="notification-actions">
                <NotificationLink notification={notification} onOpen={(event) => openNotification(event, notification)} />
                {!notification.readAt && (
                  <button type="button" onClick={() => markRead(notification.id)}>Mark Read</button>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
