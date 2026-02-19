import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Brain, Mail, Lock, Eye, EyeOff, User, Github, ArrowRight, CheckCircle, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

export default function SignUpPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState('')

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.password) { toast.error('All fields required'); return }
    if (form.password !== form.confirm) { toast.error('Passwords do not match'); return }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      const res = await api.post('/auth/register', { name: form.name, email: form.email, password: form.password })
      login(res.data.user, res.data.token)
      toast.success(`Account created! Welcome, ${res.data.user.name}!`)
      navigate('/analyze')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignUp = () => {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!googleClientId || googleClientId.includes('YOUR_GOOGLE')) {
      toast.error('Google Client ID not configured in .env')
      return
    }
    setOauthLoading('google')
    if (window.google) {
      window.google.accounts.oauth2.initTokenClient({
        client_id: googleClientId,
        scope: 'email profile',
        callback: async (tokenResponse) => {
          try {
            const res = await api.post('/auth/google', { accessToken: tokenResponse.access_token })
            login(res.data.user, res.data.token)
            toast.success(`Welcome, ${res.data.user.name}!`)
            navigate('/analyze')
          } catch (err) {
            toast.error(err.response?.data?.error || 'Google sign-up failed')
          } finally { setOauthLoading('') }
        },
      }).requestAccessToken()
    } else {
      toast.error('Google Sign-In not available. Please use email/password.')
      setOauthLoading('')
    }
  }

  const handleGithubSignUp = () => {
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID
    if (!clientId) { toast.error('GitHub OAuth not configured.'); return }
    setOauthLoading('github')
    window.open(`https://github.com/login/oauth/authorize?client_id=${clientId}&scope=user:email`, 'github_oauth', 'width=600,height=700')
    const handler = async (event) => {
      if (event.data?.type === 'github_oauth_code') {
        window.removeEventListener('message', handler)
        try {
          const res = await api.post('/auth/github', { code: event.data.code })
          login(res.data.user, res.data.token)
          toast.success(`Welcome, ${res.data.user.name}!`)
          navigate('/analyze')
        } catch (err) {
          toast.error(err.response?.data?.error || 'GitHub sign-up failed')
        } finally { setOauthLoading('') }
      }
    }
    window.addEventListener('message', handler)
  }

  const strength = form.password.length >= 8 && /[A-Z]/.test(form.password) && /[0-9]/.test(form.password)
    ? 'strong' : form.password.length >= 6 ? 'medium' : form.password ? 'weak' : ''

  return (
    <div className="min-h-screen flex items-center justify-center pt-16 px-4 py-8">
      <div className="fixed top-1/4 left-1/4 w-72 h-72 bg-primary-600/10 rounded-full blur-3xl" />
      <div className="fixed bottom-1/4 right-1/4 w-72 h-72 bg-accent-cyan/10 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="glass-card p-8">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-xl flex items-center justify-center shadow-glow">
                <Brain size={20} className="text-white" />
              </div>
              <span className="font-black text-xl text-white">Resume<span className="gradient-text">AI</span></span>
            </Link>
            <h1 className="text-2xl font-black text-white mb-1">Create your account</h1>
            <p className="text-gray-400 text-sm">Start analyzing resumes with AI in seconds</p>
          </div>

          {/* OAuth */}
          <div className="space-y-3 mb-6">
            <button onClick={handleGoogleSignUp} disabled={!!oauthLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-all disabled:opacity-50">
              {oauthLoading === 'google'
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>}
              Sign up with Google
            </button>
            <button onClick={handleGithubSignUp} disabled={!!oauthLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-all disabled:opacity-50">
              {oauthLoading === 'github' ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Github size={18} />}
              Sign up with GitHub
            </button>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-gray-500 text-xs">or with email</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-gray-400 text-xs font-medium mb-1.5 block">Full Name</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="John Doe" className="input-field w-full pl-10" autoComplete="name" />
              </div>
            </div>
            <div>
              <label className="text-gray-400 text-xs font-medium mb-1.5 block">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="you@example.com" className="input-field w-full pl-10" autoComplete="email" />
              </div>
            </div>
            <div>
              <label className="text-gray-400 text-xs font-medium mb-1.5 block">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type={showPw ? 'text' : 'password'} name="password" value={form.password} onChange={handleChange} placeholder="Min 6 characters" className="input-field w-full pl-10 pr-10" autoComplete="new-password" />
                <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {strength && (
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex gap-1">
                    {['weak', 'medium', 'strong'].map((s, i) => (
                      <div key={s} className={`h-1 w-8 rounded-full ${
                        (strength === 'weak' && i === 0) ? 'bg-red-400' :
                        (strength === 'medium' && i <= 1) ? 'bg-accent-orange' :
                        (strength === 'strong' && i <= 2) ? 'bg-accent-green' : 'bg-dark-500'
                      }`} />
                    ))}
                  </div>
                  <span className={`text-xs ${strength === 'strong' ? 'text-accent-green' : strength === 'medium' ? 'text-accent-orange' : 'text-red-400'}`}>
                    {strength}
                  </span>
                </div>
              )}
            </div>
            <div>
              <label className="text-gray-400 text-xs font-medium mb-1.5 block">Confirm Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type="password" name="confirm" value={form.confirm} onChange={handleChange} placeholder="Repeat password" className="input-field w-full pl-10" autoComplete="new-password" />
                {form.confirm && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {form.password === form.confirm
                      ? <CheckCircle size={16} className="text-accent-green" />
                      : <div className="w-4 h-4 rounded-full border-2 border-red-400" />
                    }
                  </div>
                )}
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="glow-button w-full py-3.5 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Create Account <ArrowRight size={16} /></>}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            Already have an account?{' '}
            <Link to="/signin" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">Sign in</Link>
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 mt-4 text-gray-600 text-xs">
          <Sparkles size={12} /><span>Free · No credit card needed</span>
        </div>
      </motion.div>
    </div>
  )
}
