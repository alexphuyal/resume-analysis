import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import {
  Brain, TrendingUp, FileText, Target, Zap, Award,
  BarChart3, Clock, ChevronRight, Loader2, AlertCircle
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-dark-700 border border-white/10 rounded-xl px-3 py-2">
        <p className="text-gray-400 text-xs">{label}</p>
        <p className="text-white font-bold">{payload[0].value}</p>
      </div>
    )
  }
  return null
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function getStatus(score) {
  if (score >= 80) return 'excellent'
  if (score >= 60) return 'good'
  return 'needs-work'
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [resumes, setResumes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchResumes = async () => {
      try {
        setLoading(true)
        const params = user?.id ? { userId: user.id } : {}
        const res = await api.get('/resumes', { params })
        setResumes(res.data || [])
      } catch (err) {
        setError('Failed to load dashboard data')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchResumes()
  }, [user])

  // Compute stats from real data
  const completed = resumes.filter(r => r.status === 'COMPLETED')
  const scores = completed.map(r => r.overallScore)
  const totalAnalyzed = resumes.length
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
  const bestScore = scores.length ? Math.max(...scores) : 0
  const worstScore = scores.length ? Math.min(...scores) : 0
  const improvement = scores.length >= 2 ? `+${bestScore - worstScore}pts` : scores.length === 1 ? 'First!' : 'N/A'

  // Score progression chart (chronological order)
  const scoreHistory = [...completed]
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .map(r => ({
      date: new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: r.overallScore,
    }))

  // Category averages from latest resume (if exists)
  const latest = completed[0]
  const categoryData = latest ? [
    { name: 'ATS', score: latest.atsScore ?? 0 },
    { name: 'Content', score: latest.contentScore ?? 0 },
    { name: 'Keywords', score: latest.keywordScore ?? 0 },
    { name: 'Format', score: latest.formatScore ?? 0 },
    { name: 'Impact', score: latest.impactScore ?? 0 },
    { name: 'Skills', score: latest.skillsScore ?? 0 },
  ] : []

  // Pie: critical/warning/info counts (approximated from score ranges)
  const pieData = completed.length ? [
    { name: 'Excellent (80+)', value: completed.filter(r => r.overallScore >= 80).length, color: '#10b981' },
    { name: 'Good (60-79)', value: completed.filter(r => r.overallScore >= 60 && r.overallScore < 80).length, color: '#f59e0b' },
    { name: 'Needs Work (<60)', value: completed.filter(r => r.overallScore < 60).length, color: '#ef4444' },
  ].filter(d => d.value > 0) : []

  const recentAnalyses = resumes.slice(0, 5)

  if (loading) {
    return (
      <div className="pt-24 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={40} className="text-primary-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="pt-24 min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 text-center max-w-md">
          <AlertCircle size={40} className="text-red-400 mx-auto mb-4" />
          <p className="text-white font-semibold mb-2">{error}</p>
          <p className="text-gray-500 text-sm mb-4">Make sure the API server is running.</p>
          <button onClick={() => window.location.reload()} className="glow-button text-sm">Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className="pt-24 pb-16 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-3xl font-black text-white mb-1">
              {user ? `Welcome, ${user.name.split(' ')[0]}` : 'Your'}{' '}
              <span className="gradient-text">Dashboard</span>
            </h1>
            <p className="text-gray-500 text-sm">Track your resume performance over time</p>
          </div>
          <Link to="/analyze" className="glow-button flex items-center gap-2 text-sm">
            <Zap size={14} />
            New Analysis
          </Link>
        </motion.div>

        {/* Empty state */}
        {totalAnalyzed === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-16 text-center mb-8"
          >
            <Brain size={48} className="text-gray-700 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">No analyses yet</h2>
            <p className="text-gray-500 mb-6">Upload your resume to get started with AI-powered analysis</p>
            <Link to="/analyze" className="glow-button inline-flex items-center gap-2">
              <Zap size={14} /> Analyze Your Resume
            </Link>
          </motion.div>
        )}

        {/* Stat Cards */}
        {totalAnalyzed > 0 && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Total Analyses', value: totalAnalyzed, icon: <FileText size={18} />, color: 'from-primary-500 to-primary-700' },
                { label: 'Average Score', value: avgScore || '—', icon: <BarChart3 size={18} />, color: 'from-accent-cyan to-primary-600' },
                { label: 'Best Score', value: bestScore || '—', icon: <Award size={18} />, color: 'from-accent-green to-accent-cyan' },
                { label: 'Improvement', value: improvement, icon: <TrendingUp size={18} />, color: 'from-accent-purple to-accent-pink' },
              ].map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-card p-5"
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-white mb-3 shadow-glow`}>
                    {s.icon}
                  </div>
                  <p className="text-2xl font-black gradient-text">{s.value}</p>
                  <p className="text-gray-500 text-xs mt-1">{s.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Charts Row */}
            <div className="grid lg:grid-cols-3 gap-6 mb-8">
              {/* Score Trend */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass-card p-6 col-span-2"
              >
                <h3 className="text-white font-semibold mb-5 flex items-center gap-2">
                  <TrendingUp size={16} className="text-accent-green" />
                  Score Progression
                </h3>
                {scoreHistory.length >= 2 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={scoreHistory}>
                      <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line
                        type="monotone" dataKey="score"
                        stroke="#6172f3" strokeWidth={2.5}
                        dot={{ fill: '#6172f3', strokeWidth: 0, r: 4 }}
                        activeDot={{ r: 6, fill: '#06b6d4' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center">
                    <p className="text-gray-600 text-sm">Need at least 2 analyses to show trend</p>
                  </div>
                )}
              </motion.div>

              {/* Pie — score distribution */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="glass-card p-6"
              >
                <h3 className="text-white font-semibold mb-5 flex items-center gap-2">
                  <Target size={16} className="text-accent-cyan" />
                  Score Distribution
                </h3>
                {pieData.length > 0 ? (
                  <>
                    <div className="flex justify-center mb-4">
                      <PieChart width={150} height={150}>
                        <Pie data={pieData} cx={75} cy={75} innerRadius={45} outerRadius={70} dataKey="value" strokeWidth={0}>
                          {pieData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </div>
                    <div className="space-y-2">
                      {pieData.map((d) => (
                        <div key={d.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                            <span className="text-gray-400 text-xs">{d.name}</span>
                          </div>
                          <span className="text-white text-xs font-semibold">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-[180px] flex items-center justify-center">
                    <p className="text-gray-600 text-sm text-center">No completed analyses yet</p>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Category Bar Chart — from latest resume */}
            {categoryData.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="glass-card p-6 mb-8"
              >
                <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
                  <BarChart3 size={16} className="text-primary-400" />
                  Category Performance
                </h3>
                <p className="text-gray-600 text-xs mb-5">From most recent analysis: <span className="text-gray-400">{latest?.jobRole}</span></p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={categoryData} barSize={32}>
                    <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="score" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
                    <defs>
                      <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6172f3" />
                        <stop offset="100%" stopColor="#3538cd" />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            )}

            {/* Recent Analyses */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="glass-card p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <Clock size={16} className="text-gray-400" />
                  Recent Analyses
                </h3>
                <Link to="/history" className="text-primary-400 text-sm hover:text-primary-300 flex items-center gap-1">
                  View All <ChevronRight size={14} />
                </Link>
              </div>
              <div className="space-y-3">
                {recentAnalyses.map((a) => {
                  const status = getStatus(a.overallScore)
                  return (
                    <Link
                      key={a.id}
                      to={`/result/${a.id}`}
                      className="flex items-center justify-between bg-dark-600/50 rounded-xl px-4 py-3 hover:bg-dark-600 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary-600/20 flex items-center justify-center">
                          <FileText size={14} className="text-primary-400" />
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium group-hover:text-primary-300 transition-colors truncate max-w-[180px]">{a.fileName}</p>
                          <p className="text-gray-500 text-xs">{a.jobRole} · {timeAgo(a.createdAt)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {a.status === 'COMPLETED' ? (
                          <div className={`text-sm font-bold px-2 py-0.5 rounded ${
                            status === 'excellent' ? 'bg-accent-green/10 text-accent-green' :
                            status === 'good' ? 'bg-primary-600/20 text-primary-400' :
                            'bg-red-500/10 text-red-400'
                          }`}>
                            {a.overallScore}
                          </div>
                        ) : (
                          <span className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded">{a.status}</span>
                        )}
                        <ChevronRight size={14} className="text-gray-600 group-hover:text-gray-400" />
                      </div>
                    </Link>
                  )
                })}
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  )
}
