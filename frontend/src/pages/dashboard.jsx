import { ArrowUpRight, Plus, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/authContext'
import './dashboard.css'
export default function Dashboard() {
  const { space } = useAuth()
  return <section className="page dashboard-page"><div className="page-kicker"><span className="kicker-dot" /> YOUR MONEY, IN VIEW</div><div className="dashboard-heading"><div><h1>A calmer way<br />to <em>keep track.</em></h1><p className="page-intro">Everything you need to stay on top of your spending.</p></div><div className="dashboard-stamp"><Sparkles size={17} /><span>Simple by design</span></div></div><div className="welcome-card"><div className="welcome-copy"><span className="eyebrow">CURRENT SPACE</span><h2>{space.name}</h2><p>Your financial space is ready when you are.</p><Link to="/log" className="text-link">Add a transaction <ArrowUpRight size={15} /></Link></div><div className="welcome-symbol"><span>₪</span><div className="symbol-orbit orbit-one"/><div className="symbol-orbit orbit-two"/></div></div><div className="dashboard-foot"><span className="section-marker">01</span><span>GOOD FINANCES START WITH A CLEAR PICTURE</span><Link aria-label="Add transaction" className="quick-add" to="/log"><Plus size={18}/></Link></div></section>
}
