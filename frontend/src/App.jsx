import { Navigate, Route, Routes } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from './context/authContext'
import Layout from './components/layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import History from './pages/History'
import LogExpense from './pages/LogExpense'
import MIR from './pages/MIR'
import Settings from './pages/Settings'
import './App.css'

function Gate({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}
export default function App() {
  const { user, loading } = useAuth()
  const [introComplete, setIntroComplete] = useState(false)
  useEffect(() => { const timer = setTimeout(() => setIntroComplete(true), 620); return () => clearTimeout(timer) }, [])
  if (loading || !introComplete) return <div className="startup"><div className="startup-mark"><span className="brand-mark">₪</span><i/></div><p>Making room for a clearer picture</p><span className="startup-loader"/></div>
  return <Routes>
    <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
    <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
    <Route element={<Gate><Layout /></Gate>}>
      <Route index element={<Dashboard />} />
      <Route path="/history" element={<History />} />
      <Route path="/log" element={<LogExpense />} />
      <Route path="/review" element={<MIR />} />
      <Route path="/settings" element={<Settings />} />
    </Route>
    <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
  </Routes>
}
