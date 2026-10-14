import React, { useState } from 'react';
import { useAuth } from '../../context/authContext';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';

const SettingsPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme || 'light';
  });

  // Initialize theme on load
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Toggle theme
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      const res = await logout();
      if (res.success) {
        navigate('/login');
      } else {
        setError(res.error || 'Logout failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);
    try {
      const res = await api.postForm('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      if (res.ok) {
        setSuccess('Password changed successfully');
        // Clear form
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const errorData = await res.json();
        setError(errorData.detail || 'Password change failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);
    try {
      const res = await api.deleteForm('/auth/me', {
        password: deletePassword,
      });
      if (res.ok) {
        setSuccess('Account deleted successfully');
        // Clear form
        setDeletePassword('');
        // Logout
        await logout();
        navigate('/login');
      } else {
        const errorData = await res.json();
        setError(errorData.detail || 'Account deletion failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-card">
        <h2>Settings</h2>
        <div className="settings-section">
          <h3>Account</h3>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
        <div className="settings-section">
          <h3>Change Password</h3>
          <form onSubmit={handleChangePassword}>
            <div>
              <label htmlFor="currentPassword">Current Password:</label>
              <input
                type="password"
                id="currentPassword"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="newPassword">New Password:</label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="confirmPassword">Confirm New Password:</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            {error && <div className="error">{error}</div>}
            {success && <div className="success">{success}</div>}
            <button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Change Password'}
            </button>
          </form>
        </div>
        <div className="settings-section">
          <h3>Delete Account</h3>
          <form onSubmit={handleDeleteAccount}>
            <div>
              <label htmlFor="deletePassword">Password:</label>
              <input
                type="password"
                id="deletePassword"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                required
              />
            </div>
            {error && <div className="error">{error}</div>}
            {success && <div className="success">{success}</div>}
            <button type="submit" disabled={loading}>
              {loading ? 'Deleting...' : 'Delete Account'}
            </button>
          </form>
        </div>
        <div className="settings-section">
          <h3>Theme</h3>
          <p>Current theme: {theme}</p>
          <button onClick={toggleTheme}>
            Switch to {theme === 'light' ? 'dark' : 'light'} theme
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;