import { useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import { getMe, logout } from './api/authApi.js';
import Header from './components/Header.jsx';
import AdminPage from './pages/AdminPage.jsx';
import BrowsePage from './pages/BrowsePage.jsx';
import BulletinsPage from './pages/BulletinsPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import EditProfilePage from './pages/EditProfilePage.jsx';
import FriendsPage from './pages/FriendsPage.jsx';
import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import NotificationsPage from './pages/NotificationsPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import WelcomePage from './pages/WelcomePage.jsx';

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
        <Route
          path="/"
          element={currentUser ? <DashboardPage currentUser={currentUser} /> : <LandingPage />}
        />
        <Route path="/admin" element={<AdminPage currentUser={currentUser} />} />
        <Route path="/browse" element={<BrowsePage currentUser={currentUser} />} />
        <Route path="/bulletins" element={<BulletinsPage currentUser={currentUser} />} />
        <Route path="/friends" element={<FriendsPage currentUser={currentUser} />} />
        <Route path="/profile/edit" element={<EditProfilePage currentUser={currentUser} />} />
        <Route path="/settings" element={<SettingsPage currentUser={currentUser} />} />
        <Route path="/profile/:username" element={<ProfilePage currentUser={currentUser} />} />
        <Route path="/notifications" element={<NotificationsPage currentUser={currentUser} />} />
        <Route path="/welcome" element={<WelcomePage currentUser={currentUser} />} />
        <Route path="/login" element={<LoginPage onAuth={setCurrentUser} />} />
        <Route path="/register" element={<RegisterPage onAuth={setCurrentUser} />} />
      </Routes>
    </>
  );
}
