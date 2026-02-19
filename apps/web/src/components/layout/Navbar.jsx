import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Brain, LayoutDashboard, History, Upload, Zap, LogOut, User, ChevronDown } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

export default function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [dropOpen, setDropOpen] = useState(false)
  const dropRef = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = () => {
    logout()
    toast.success('Logged out')
    navigate('/')
    setDropOpen(false)
  }

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/analyze', label: 'Analyze', icon: <Upload size={13} /> },
    { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={13} /> },
    { to: '/history', label: 'History', icon: <History size={13} /> },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 backdrop-blur-xl bg-dark-900/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="relative">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-lg flex items-center justify-center shadow-glow group-hover:shadow-glow-cyan transition-all duration-300">
                <Brain size={16} className="text-white" />
              </div>
            </div>
            <div>
              <span className="font-bold text-white text-lg leading-none">Resume</span>
              <span className="font-bold text-lg leading-none gradient-text">AI</span>
            </div>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link key={link.to} to={link.to}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  location.pathname === link.to
                    ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}>
                {link.icon}{link.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="relative" ref={dropRef}>
                <button onClick={() => setDropOpen(o => !o)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 hover:border-white/20 bg-dark-700/50 transition-all">
                  {user.avatar
                    ? <img src={user.avatar} alt={user.name} className="w-7 h-7 rounded-full object-cover" />
                    : <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-accent-cyan flex items-center justify-center text-xs font-bold text-white">
                        {user.name?.charAt(0).toUpperCase()}
                      </div>
                  }
                  <span className="text-white text-sm font-medium max-w-[100px] truncate hidden sm:block">{user.name}</span>
                  <ChevronDown size={14} className={`text-gray-400 transition-transform ${dropOpen ? 'rotate-180' : ''}`} />
                </button>
                {dropOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 glass-card py-2 shadow-card border border-white/10 rounded-xl z-50">
                    <div className="px-4 py-2 border-b border-white/5 mb-1">
                      <p className="text-white text-sm font-medium truncate">{user.name}</p>
                      <p className="text-gray-500 text-xs truncate">{user.email}</p>
                    </div>
                    <Link to="/dashboard" onClick={() => setDropOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:text-white hover:bg-white/5 text-sm transition-colors">
                      <LayoutDashboard size={14} /> Dashboard
                    </Link>
                    <Link to="/history" onClick={() => setDropOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:text-white hover:bg-white/5 text-sm transition-colors">
                      <History size={14} /> History
                    </Link>
                    <hr className="border-white/5 my-1" />
                    <button onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/5 text-sm transition-colors">
                      <LogOut size={14} /> Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/signin" className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors font-medium">
                  Sign In
                </Link>
                <Link to="/analyze" className="flex items-center gap-1.5 glow-button text-sm px-4 py-2">
                  <Zap size={13} /> Try Free
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
