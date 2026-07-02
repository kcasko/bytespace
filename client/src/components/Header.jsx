import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getUnreadNotificationCount } from '../api/notificationApi.js';

export default function Header({ currentUser, onLogout }) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let ignore = false;
    let intervalId;

    async function loadUnreadCount() {
      if (!currentUser) {
        setUnreadCount(0);
        return;
      }

      try {
        const count = await getUnreadNotificationCount();

        if (!ignore) {
          setUnreadCount(count);
        }
      } catch {
        if (!ignore) {
          setUnreadCount(0);
        }
      }
    }

    loadUnreadCount();

    if (currentUser) {
      intervalId = window.setInterval(loadUnreadCount, 60000);
    }

    return () => {
      ignore = true;
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [currentUser]);

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link className="logo" to="/">ByteSpace</Link>
        <nav className="main-nav" aria-label="Primary navigation">
          <Link to="/">Home</Link>
          <Link to="/browse">Browse</Link>
          {currentUser ? (
            <>
              <Link to="/friends">Friends</Link>
              <Link to="/bulletins">Bulletins</Link>
              <Link className="notification-nav-link" to="/notifications">
                Notifications
                {unreadCount > 0 && <span className="notification-nav-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
              </Link>
              <Link to="/profile/edit">Edit Profile</Link>
              <Link to="/settings">Settings</Link>
              {currentUser.isAdmin && <Link to="/admin">Admin</Link>}
              <Link to={`/profile/${currentUser.username}`}>@{currentUser.username}</Link>
              <button type="button" onClick={onLogout}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
