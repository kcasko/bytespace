import { Link } from 'react-router-dom';

export default function Header({ currentUser, onLogout }) {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link className="logo" to="/">ByteSpace</Link>
        <nav className="main-nav" aria-label="Primary navigation">
          <Link to="/">Home</Link>
          <a href="/browse">Browse</a>
          <a href="/search">Search</a>
          {currentUser ? (
            <>
              <Link to="/friends">Friends</Link>
              <Link to="/profile/edit">Edit Profile</Link>
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
