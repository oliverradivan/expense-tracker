import React from 'react';
import { useAuth } from './context/authContext';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Helper component for protected routes
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  return user ? children : <Navigate to="/login" replace />;
};

// Helper component for redirecting authenticated users away from auth pages
const GuestRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  return !user ? children : <Navigate to="/dashboard" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth routes - guest only */}
        <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
        
        /* Protected routes */
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
        <Route path="/log" element={<ProtectedRoute><LogPage /></ProtectedRoute>} />
        <Route path="/review" element={<ProtectedRoute><ReviewPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        
        /* Redirect root to dashboard */
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        /* Fallback for 404 */
        <Route path="*" element={<div>404 - Page not found</div>} />
      </Routes>
    </BrowserRouter>
  );
}

// Lazy load page components to reduce initial bundle size
const LoginPage = React.lazy(() => import('./pages/login/LoginPage.jsx'));
const RegisterPage = React.lazy(() => import('./pages/register/RegisterPage.jsx'));
const DashboardPage = React.lazy(() => import('./pages/dashboard/DashboardPage.jsx'));
const HistoryPage = React.lazy(() => import('./pages/history/HistoryPage.jsx'));
const LogPage = React.lazy(() => import('./pages/logexpense/LogPage.jsx'));
const ReviewPage = React.lazy(() => import('./pages/analysis/ReviewPage.jsx'));
const SettingsPage = React.lazy(() => import('./pages/settings/SettingsPage.jsx'));

export default App;