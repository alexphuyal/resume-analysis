import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Search, ChevronRight, Trash2, Calendar, Target, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import toast from 'react-hot-toast'

export default function HistoryPage() {
  const { user } = useAuth()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('date')
  const [deletingId, setDeletingId] = useState(null)

  const fetchHistory = async () => {
    try {
      setLoading(true)
      setError(null)
      const params = user?.id ? { userId: user.id } : {}
      const res = await api.get('/resumes', { params })
      setHistory(res.data || [])
    } catch (err) {
      setError('Failed to load history')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [user])

  const handleDelete = async (e, id) => {
    e.preventDefault()
    e.stopPropagation()
    if (!window.confirm('Delete this analysis? This cannot be undone.')) return
    try {
      setDeletingId(id)
      await api.delete(`/resumes/${id}`)
      setHistory(prev => prev.filter(h => h.id !== id))
      toast.success('Analysis deleted')
    } catch {
      toast.error('Failed to delete')
    } finally {
      setDeletingId(null)
    }
  }

  const filtered = history
    .filter(h =>
      h.fileName.toLowerCase().includes(search.toLowerCase()) ||
      h.jobRole.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) =>
      sortBy === 'date'
        ? new Date(b.createdAt) - new Date(a.createdAt)
        : b.overallScore - a.overallScore
    )

  const formatDate = (iso) => {
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  function timeAgo(iso) {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days < 30) return `${days}d ago`
    return formatDate(iso)
  }

  if (loading) {
    return (
      <div className="pt-24 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={40} className="text-primary-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading your history...</p>
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
          <button onClick={fetchHistory} className="glow-button text-sm flex items-center gap-2 mx-auto">
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="pt-24 pb-16 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-white mb-1">
                Analysis <span className="gradient-text">History</span>
              </h1>
              <p className="text-gray-500 text-sm">
                {history.length > 0 ? `${history.length} total ${history.length === 1 ? 'analysis' : 'analyses'}` : 'All your previous resume analyses'}
              </p>
            </div>
            <button
              onClick={fetchHistory}
              className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all"
              title="Refresh"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </motion.div>

        {/* Filters */}
        {history.length > 0 && (
          <div className="flex gap-3 mb-6">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search by filename or role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field w-full pl-9"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="input-field"
            >
              <option value="date">Sort by Date</option>
              <option value="score">Sort by Score</option>
            </select>
          </div>
        )}

        {/* Empty state — no history at all */}
        {history.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-16 text-center"
          >
            <FileText size={48} className="text-gray-700 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">No analyses yet</h2>
            <p className="text-gray-500 mb-6">Your resume analysis history will appear here</p>
            <Link to="/analyze" className="glow-button inline-flex items-center gap-2 text-sm">
              Start First Analysis
            </Link>
          </motion.div>
        )}

        {/* Empty state — no search results */}
        {history.length > 0 && filtered.length === 0 && (
          <div className="text-center py-20">
            <Search size={40} className="text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500">No results for "{search}"</p>
            <button onClick={() => setSearch('')} className="text-primary-400 text-sm mt-2 hover:text-primary-300">Clear search</button>
          </div>
        )}

        {/* List */}
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  to={`/result/${item.id}`}
                  className="glass-card p-5 flex items-center gap-5 hover:border-primary-500/20 transition-all duration-300 group block"
                >
                  {/* Icon */}
                  <div className="w-12 h-12 rounded-xl bg-primary-600/20 border border-primary-500/20 flex items-center justify-center flex-shrink-0">
                    <FileText size={20} className="text-primary-400" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm group-hover:text-primary-300 transition-colors truncate">{item.fileName}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="flex items-center gap-1 text-gray-500 text-xs">
                        <Target size={11} /> {item.jobRole}
                      </span>
                      <span className="flex items-center gap-1 text-gray-500 text-xs">
                        <Calendar size={11} /> {timeAgo(item.createdAt)}
                      </span>
                      {item.status !== 'COMPLETED' && (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          item.status === 'FAILED' ? 'bg-red-500/10 text-red-400' :
                          item.status === 'PROCESSING' ? 'bg-yellow-400/10 text-yellow-400' :
                          'bg-gray-500/10 text-gray-400'
                        }`}>
                          {item.status}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Scores */}
                  <div className="flex items-center gap-4 flex-shrink-0">
                    {item.status === 'COMPLETED' ? (
                      <>
                        <div className="text-right hidden sm:block">
                          <p className="text-gray-500 text-xs">ATS</p>
                          <p className="text-accent-cyan font-bold text-sm">{item.atsScore}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-gray-500 text-xs">Overall</p>
                          <p className={`font-black text-lg ${
                            item.overallScore >= 80 ? 'text-accent-green' :
                            item.overallScore >= 60 ? 'text-accent-orange' :
                            'text-red-400'
                          }`}>{item.overallScore}</p>
                        </div>
                      </>
                    ) : (
                      <div className="text-right">
                        <p className="text-gray-600 text-xs">Score</p>
                        <p className="text-gray-600 font-black text-lg">—</p>
                      </div>
                    )}

                    {/* Delete button */}
                    <button
                      onClick={(e) => handleDelete(e, item.id)}
                      disabled={deletingId === item.id}
                      className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                      title="Delete"
                    >
                      {deletingId === item.id
                        ? <Loader2 size={14} className="animate-spin" />
                        : <Trash2 size={14} />
                      }
                    </button>

                    <ChevronRight size={16} className="text-gray-600 group-hover:text-gray-400" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
