import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Auth context
const AuthContext = createContext();

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth provider component
export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null); // { id, username } or null
  const [loading, setLoading] = useState(true);

  // Check for existing token on load (e.g., from cookie)
  // We'll rely on the backend to validate the token via /me endpoint
  // We'll check the token by making a request to /auth/me
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = document.cookie
          .split('; ')
          .find(row => row.startsWith('access_token='))
          ?.split('=')[1];
        if (token) {
          const response = await fetch('/auth/me', {
            credentials: 'include', // Important for cookies
            headers: {
              'Content-Type': 'application/json',
            },
          });
          if (response.ok) {
            const userData = await response.json();
            setUser({ id: userData.id, username: userData.username });
          } else {
            // Clear invalid token
            document.cookie = 'access_token=; Max-Age=0; Path=/;';
          }
        }
      } catch (err) {
        console.error('Auth check failed', err);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = async (username, password) => {
    try {
      const response = await fetch('/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ username, password }),
      });
      if (response.ok) {
        const userData = await response.json();
        setUser({ id: userData.user_id, username: userData.username });
        navigate('/dashboard');
        return { success: true };
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.detail || 'Login failed' };
      }
    } catch (err) {
      console.error('Login error', err);
      return { success: false, error: 'Network error' };
    }
  };

  const register = async (username, password) => {
    try {
      const response = await fetch('/auth/register', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ username, password }),
      });
      if (response.ok) {
        const userData = await response.json();
        setUser({ id: userData.user_id, username: userData.username });
        navigate('/dashboard');
        return { success: true };
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.detail || 'Registration failed' };
      }
    } catch (err) {
      console.error('Register error', err);
      return { success: false, error: 'Network error' };
    }
  };

  const logout = async () => {
    try {
      const response = await fetch('/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      if (response.ok) {
        setUser(null);
        navigate('/login');
        return { success: true };
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.detail || 'Logout failed' };
      }
    } catch (err) {
      console.error('Logout error', err);
      return { success: false, error: 'Network error' };
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      const response = await fetch('/auth/change-password', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ current_password: currentPassword, new_password: newPassword }),
      });
      if (response.ok) {
        return { success: true };
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.detail || 'Password change failed' };
      }
    } catch (err) {
      console.error('Change password error', err);
      return { success: false, error: 'Network error' };
    }
  };

  const deleteAccount = async (password) => {
    try {
      const response = await fetch('/auth/me', {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ password }),
      });
      if (response.ok) {
        setUser(null);
        navigate('/login');
        return { success: true };
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.detail || 'Account deletion failed' };
      }
    } catch (err) {
      console.error('Delete account error', err);
      return { success: false, error: 'Network error' };
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    changePassword,
    deleteAccount,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};