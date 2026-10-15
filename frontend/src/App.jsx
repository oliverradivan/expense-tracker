import { useAuth } from './context/authContext'
import { Routes, Route, Navigate } from 'react-router-dom'
import React, { Suspense } from 'react'
import Layout from './components/layout'

// Lazy-loaded page components
const LoginPage = React.lazy(() => import('./pages/Login.jsx'))
const RegisterPage = React.lazy(() => import('./pages/Register.jsx'))

// Helper component for protected routes
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) return <div>Loading...</div>

  return user ? children : <Navigate to="/login" replace />
}

// Helper component for redirecting authenticated users away from auth pages
const GuestRoute = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) return <div>Loading...</div>

  return !user ? children : <Navigate to="/dashboard" replace />
}

function App() {
  return (
    <Suspense fallback={<div>Loading page...</div>}>
      <Routes>
        {/* Auth routes - guest only */}
        <Route
          path="/login"
          element={
            <GuestRoute>
              <LoginPage />
            </GuestRoute>
          }
        />

        <Route
          path="/register"
          element={
            <GuestRoute>
              <RegisterPage />
            </GuestRoute>
          }
        />

        {/* Protected routes */}
        <Route
          path="/:page"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        />

        {/* Redirect root to dashboard */}
        <Route
          path="/"
          element={<Navigate to="/dashboard" replace />}
        />

        {/* Fallback for 404 */}
        <Route
          path="*"
          element={<div>404 - Page not found</div>}
        />
      </Routes>
    </Suspense>
  )
}

export default App