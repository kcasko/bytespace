import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { getMe, logout } from './api/authApi.js';
import Header from './components/Header.jsx';
import EditProfilePage from './pages/EditProfilePage.jsx';
import FriendsPage from './pages/FriendsPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    let ignore = false;

    async function loadCurrentUser() {
      try {
        const data = await getMe();

        if (!ignore) {
          setCurrentUser(data.user);
        }
      } catch {
        if (!ignore) {
          setCurrentUser(null);
        }
      }
    }

    loadCurrentUser();

    return () => {
      ignore = true;
    };
  }, []);

  async function handleLogout() {
    await logout();
    setCurrentUser(null);
  }

  return (
    <>
      <Header currentUser={currentUser} onLogout={handleLogout} />
      <Routes>
        <Route path="/" element={<Navigate to="/profile/keith" replace />} />
        <Route path="/friends" element={<FriendsPage currentUser={currentUser} />} />
        <Route path="/profile/edit" element={<EditProfilePage currentUser={currentUser} />} />
        <Route path="/profile/:username" element={<ProfilePage currentUser={currentUser} />} />
        <Route path="/login" element={<LoginPage onAuth={setCurrentUser} />} />
        <Route path="/register" element={<RegisterPage onAuth={setCurrentUser} />} />
      </Routes>
    </>
  );
}
