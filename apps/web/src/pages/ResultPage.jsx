import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Brain, ArrowLeft, Download, CheckCircle, AlertTriangle, XCircle,
  TrendingUp, Target, Zap, Star, BookOpen, Code2, Award, FileText,
  BarChart3, Upload, Sparkles, ExternalLink, GraduationCap, ArrowUpRight, Wand2,
  ScrollText, Eye
} from 'lucide-react'
import api from '../services/api'

const PLATFORM_COLORS = {
  Coursera: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  Udemy: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  YouTube: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
  freeCodeCamp: { bg: 'bg-accent-green/10', text: 'text-accent-green', border: 'border-accent-green/20' },
  Google: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' },
  Microsoft: { bg: 'bg-blue-600/10', text: 'text-blue-300', border: 'border-blue-600/20' },
  'LinkedIn Learning': { bg: 'bg-blue-400/10', text: 'text-blue-300', border: 'border-blue-400/20' },
}

const ScoreCircle = ({ score }) => {
  const r = 54
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'

  return (
    <div className="relative w-40 h-40">
      <svg width="160" height="160" viewBox="0 0 120 120" className="-rotate-90 score-ring">
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
        <motion.circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          initial={{ strokeDasharray: `0 ${circ}` }}
          animate={{ strokeDasharray: `${dash} ${circ}` }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span className="text-4xl font-black text-white" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          {score}
        </motion.span>
        <span className="text-gray-400 text-xs">/ 100</span>
      </div>
    </div>
  )
}

const CategoryBar = ({ label, score, icon, delay = 0 }) => {
  const color = score >= 80 ? 'bg-accent-green' : score >= 60 ? 'bg-accent-orange' : 'bg-red-500'
  const textColor = score >= 80 ? 'text-accent-green' : score >= 60 ? 'text-accent-orange' : 'text-red-400'
  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay }}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-primary-400">{icon}</span>
          <span className="text-gray-300 text-sm">{label}</span>
        </div>
        <span className={`text-sm font-bold ${textColor}`}>{score}%</span>
      </div>
      <div className="h-2 bg-dark-500 rounded-full overflow-hidden">
        <motion.div className={`h-full ${color} rounded-full`} initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ duration: 1, delay, ease: 'easeOut' }} />
      </div>
    </motion.div>
  )
}

function AnimatedTab({ children, active }) {
  if (!active) return null
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {children}
    </motion.div>
  )
}

export default function ResultPage() {
  const { id } = useParams()
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [improveOpen, setImproveOpen] = useState(false)
  const [improveLoading, setImproveLoading] = useState(false)

  useEffect(() => {
    api.get('/resumes/' + id)
      .then(res => setResult(res.data))
      .catch(err => setError(err.response?.data?.error || 'Failed to load result'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="pt-24 flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-600 to-accent-cyan flex items-center justify-center mx-auto mb-4 shadow-glow animate-pulse">
          <Brain size={28} className="text-white" />
        </div>
        <p className="text-gray-400">Loading your results...</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="pt-24 flex items-center justify-center min-h-screen">
      <div className="text-center glass-card p-10 max-w-md">
        <XCircle size={40} className="text-red-400 mx-auto mb-4" />
        <p className="text-white font-semibold mb-2">Failed to load results</p>
        <p className="text-gray-400 text-sm mb-6">{error}</p>
        <Link to="/analyze" className="glow-button inline-flex items-center gap-2">
          <Upload size={16} /> Try Again
        </Link>
      </div>
    </div>
  )

  const TABS = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 size={14} /> },
    { id: 'keywords', label: 'Keywords', icon: <Target size={14} /> },
    { id: 'skills', label: 'Skills', icon: <Code2 size={14} /> },
    { id: 'enhance', label: 'Enhance', icon: <Wand2 size={14} /> },
    { id: 'learn', label: 'Learn', icon: <GraduationCap size={14} /> },
    { id: 'suggestions', label: 'Suggestions', icon: <Zap size={14} /> },
    { id: 'resume', label: 'View Resume', icon: <ScrollText size={14} /> },
  ]

  const categories = [
    { label: 'ATS Compatibility', score: result.atsScore, icon: <Target size={14} /> },
    { label: 'Content Quality', score: result.contentScore, icon: <FileText size={14} /> },
    { label: 'Keyword Match', score: result.keywordScore, icon: <TrendingUp size={14} /> },
    { label: 'Format & Layout', score: result.formatScore, icon: <Award size={14} /> },
    { label: 'Impact Statements', score: result.impactScore, icon: <Star size={14} /> },
    { label: 'Readability', score: result.readabilityScore, icon: <BookOpen size={14} /> },
    { label: 'Skills Match', score: result.skillsScore, icon: <Code2 size={14} /> },
    { label: 'Experience Depth', score: result.experienceScore, icon: <Brain size={14} /> },
  ]

  // Group learning resources by skill
  const resourcesBySkill = (result.learningResources || []).reduce((acc, r) => {
    if (!acc[r.skill]) acc[r.skill] = []
    acc[r.skill].push(r)
    return acc
  }, {})

  return (
    <div className="pt-24 pb-16 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/analyze" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
            <ArrowLeft size={16} /> New Analysis
          </Link>
          <div className="flex items-center gap-3">
            {result.hasFile && (
              <a
                href={`/api/resumes/${id}/file`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan hover:bg-accent-cyan/20 transition-all"
              >
                <Eye size={12} /> View File
              </a>
            )}
            <div className="flex items-center gap-2 text-xs text-gray-600 bg-dark-700/50 border border-white/5 rounded-lg px-3 py-1.5">
              <Sparkles size={12} className="text-accent-cyan" />
              Analyzed by <span className="text-accent-cyan font-medium">{result.aiModel || 'gemini-2.5-flash'}</span>
            </div>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-black text-white mb-1">Analysis <span className="gradient-text">Results</span></h1>
          <p className="text-gray-500 text-sm">
            <FileText size={12} className="inline mr-1" />
            {result.fileName} — {result.jobRole}
            {result.jobUrl && (
              <a href={result.jobUrl} target="_blank" rel="noreferrer" className="ml-2 text-accent-cyan hover:text-accent-cyan/80">
                <ExternalLink size={11} className="inline" /> view job
              </a>
            )}
          </p>
        </motion.div>

        {/* Score + Breakdown */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8 flex flex-col items-center">
            <p className="text-gray-400 text-sm mb-4">Overall Score</p>
            <ScoreCircle score={result.overallScore} />
            <div className="mt-4 text-center">
              <p className={`font-bold text-lg ${result.overallScore >= 80 ? 'text-accent-green' : result.overallScore >= 60 ? 'text-accent-orange' : 'text-red-400'}`}>
                {result.overallScore >= 80 ? 'Excellent' : result.overallScore >= 60 ? 'Good' : 'Needs Work'}
              </p>
              <p className="text-gray-500 text-xs">vs {result.jobRole}</p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6 col-span-2">
            <h3 className="text-white font-semibold mb-5">Score Breakdown</h3>
            <div className="space-y-4">
              {categories.map((cat, i) => <CategoryBar key={cat.label} {...cat} delay={i * 0.07} />)}
            </div>
          </motion.div>
        </div>

        {/* AI Summary */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-primary-600/20 flex items-center justify-center">
              <Brain size={14} className="text-primary-400" />
            </div>
            <h3 className="text-white font-semibold">Gemini AI Summary</h3>
          </div>
          <p className="text-gray-300 leading-relaxed">{result.summary}</p>
        </motion.div>

        {/* ── Improve This Resume CTA ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass-card p-5 mb-6 border border-accent-purple/20 hover:border-accent-purple/40 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-purple to-primary-600 flex items-center justify-center shadow-glow-purple flex-shrink-0">
                <Wand2 size={16} className="text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">✨ Improve This Resume</h3>
                <p className="text-gray-500 text-xs mt-0.5">See the top {Math.min(3, (result.suggestions || []).filter(s => s.type === 'critical' || s.type === 'warning').length) || 3} actions that will boost your score the most</p>
              </div>
            </div>
            <button
              onClick={() => {
                if (!improveOpen) {
                  setImproveLoading(true)
                  setTimeout(() => setImproveLoading(false), 800)
                }
                setImproveOpen(p => !p)
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                improveOpen
                  ? 'bg-accent-purple/20 border border-accent-purple/40 text-accent-purple'
                  : 'bg-gradient-to-r from-accent-purple to-primary-600 text-white hover:opacity-90 shadow-glow-purple'
              }`}
            >
              {improveLoading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Wand2 size={14} />
              )}
              {improveOpen ? 'Hide' : 'Show Improvements'}
            </button>
          </div>

          <AnimatePresence>
            {improveOpen && !improveLoading && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="mt-5 pt-5 border-t border-white/5 space-y-3">
                  {/* Critical suggestions first, then warnings */}
                  {[
                    ...(result.suggestions || []).filter(s => s.type === 'critical'),
                    ...(result.suggestions || []).filter(s => s.type === 'warning'),
                    ...(result.suggestions || []).filter(s => s.type === 'info'),
                  ].slice(0, 5).map((s, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border ${
                        s.type === 'critical' ? 'bg-red-500/5 border-red-500/20' :
                        s.type === 'warning' ? 'bg-accent-orange/5 border-accent-orange/20' :
                        'bg-primary-600/5 border-primary-500/20'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        s.type === 'critical' ? 'bg-red-500/20' :
                        s.type === 'warning' ? 'bg-accent-orange/20' :
                        'bg-primary-600/20'
                      }`}>
                        <span className="text-[10px] font-black">{i + 1}</span>
                      </div>
                      <div className="flex-1">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${
                          s.type === 'critical' ? 'text-red-400' :
                          s.type === 'warning'  ? 'text-accent-orange' : 'text-primary-400'
                        }`}>{s.type === 'critical' ? '🔴 Critical Fix' : s.type === 'warning' ? '🟡 Improvement' : '💡 Tip'} </span>
                        <p className="text-gray-200 text-sm mt-0.5 leading-relaxed">{s.text}</p>
                      </div>
                    </motion.div>
                  ))}
                  {(result.suggestions || []).length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      <CheckCircle size={24} className="text-accent-green mx-auto mb-2" />
                      <p className="text-sm">Your resume looks great! No critical improvements needed.</p>
                    </div>
                  )}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => { setActiveTab('suggestions'); setImproveOpen(false) }}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:text-white hover:border-white/20 transition-all text-sm"
                    >
                      View All Suggestions
                    </button>
                    <button
                      onClick={() => setActiveTab('enhance')}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accent-purple/15 border border-accent-purple/30 text-accent-purple hover:bg-accent-purple/25 transition-all text-sm font-medium"
                    >
                      <Wand2 size={13} /> See AI-Enhanced Bullets
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-primary-600/20 text-primary-300 border border-primary-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        <AnimatedTab active={activeTab === 'overview'}>
          <div className="glass-card p-6">
            <h3 className="text-white font-semibold mb-4">Performance Overview</h3>
            <div className="grid md:grid-cols-2 gap-3">
              {categories.map(cat => (
                <div key={cat.label} className="flex items-center justify-between bg-dark-600/50 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-primary-400">{cat.icon}</span>
                    <span className="text-gray-300 text-sm">{cat.label}</span>
                  </div>
                  <div className={`text-sm font-bold px-2 py-0.5 rounded ${
                    cat.score >= 80 ? 'bg-accent-green/10 text-accent-green' :
                    cat.score >= 60 ? 'bg-accent-orange/10 text-accent-orange' :
                    'bg-red-500/10 text-red-400'
                  }`}>{cat.score}</div>
                </div>
              ))}
            </div>
          </div>
        </AnimatedTab>

        {/* Keywords Tab */}
        <AnimatedTab active={activeTab === 'keywords'}>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="glass-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle size={16} className="text-accent-green" />
                <h3 className="text-white font-semibold">Matched Keywords</h3>
                <span className="text-xs bg-accent-green/10 text-accent-green border border-accent-green/20 rounded-full px-2 py-0.5">{result.keywords.matched.length}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {result.keywords.matched.map(kw => (
                  <span key={kw} className="text-xs bg-accent-green/10 text-accent-green border border-accent-green/20 rounded-lg px-3 py-1.5 font-medium">{kw}</span>
                ))}
              </div>
            </div>
            <div className="glass-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <XCircle size={16} className="text-red-400" />
                <h3 className="text-white font-semibold">Missing Keywords</h3>
                <span className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 rounded-full px-2 py-0.5">{result.keywords.missing.length} gaps</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {result.keywords.missing.map(kw => (
                  <span key={kw} className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg px-3 py-1.5 font-medium">+ {kw}</span>
                ))}
              </div>
            </div>
          </div>
        </AnimatedTab>

        {/* Skills Tab */}
        <AnimatedTab active={activeTab === 'skills'}>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="glass-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle size={16} className="text-accent-green" />
                <h3 className="text-white font-semibold">Skills Detected</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {result.skills.found.map(s => (
                  <span key={s} className="text-xs bg-primary-600/10 text-primary-300 border border-primary-500/20 rounded-lg px-3 py-1.5 font-medium">{s}</span>
                ))}
              </div>
            </div>
            <div className="glass-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={16} className="text-accent-orange" />
                <h3 className="text-white font-semibold">Skills to Add</h3>
              </div>
              <div className="space-y-2">
                {result.skills.missing.map(s => (
                  <div key={s} className="flex items-center justify-between bg-dark-600/50 rounded-lg px-3 py-2">
                    <span className="text-gray-300 text-sm">{s}</span>
                    <span className="text-xs text-accent-orange border border-accent-orange/20 bg-accent-orange/10 rounded px-2 py-0.5">High Priority</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </AnimatedTab>

        {/* Enhance Tab — Enhanced Bullets */}
        <AnimatedTab active={activeTab === 'enhance'}>
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-accent-purple/20 flex items-center justify-center">
                <Wand2 size={16} className="text-accent-purple" />
              </div>
              <div>
                <h3 className="text-white font-semibold">AI-Enhanced Bullet Points</h3>
                <p className="text-gray-500 text-xs">Gemini rewrote your bullet points for maximum impact</p>
              </div>
            </div>
            {result.enhancedBullets && result.enhancedBullets.length > 0 ? (
              <div className="space-y-4">
                {result.enhancedBullets.map((b, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                    className="rounded-xl overflow-hidden border border-white/5">
                    <div className="bg-red-500/5 border-b border-white/5 px-4 py-3">
                      <p className="text-xs text-red-400 font-semibold uppercase tracking-wider mb-1">Original</p>
                      <p className="text-gray-400 text-sm leading-relaxed">{b.original}</p>
                    </div>
                    <div className="bg-accent-green/5 px-4 py-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <ArrowUpRight size={12} className="text-accent-green" />
                        <p className="text-xs text-accent-green font-semibold uppercase tracking-wider">Enhanced</p>
                      </div>
                      <p className="text-gray-200 text-sm leading-relaxed font-medium">{b.improved}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-gray-500">
                <Wand2 size={32} className="mx-auto mb-3 opacity-30" />
                <p>No bullet point improvements returned for this resume.</p>
              </div>
            )}
          </div>
        </AnimatedTab>

        {/* Learn Tab — Learning Resources */}
        <AnimatedTab active={activeTab === 'learn'}>
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <GraduationCap size={18} className="text-accent-cyan" />
              <h3 className="text-white font-semibold">Learning Resources for Missing Skills</h3>
            </div>
            {Object.keys(resourcesBySkill).length > 0 ? (
              Object.entries(resourcesBySkill).map(([skill, resources]) => (
                <div key={skill} className="glass-card p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 rounded-md bg-accent-orange/20 flex items-center justify-center">
                      <Code2 size={12} className="text-accent-orange" />
                    </div>
                    <h4 className="text-white font-semibold">{skill}</h4>
                    <span className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 rounded px-2 py-0.5">Missing</span>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {resources.map((r, i) => {
                      const p = PLATFORM_COLORS[r.platform] || { bg: 'bg-primary-600/10', text: 'text-primary-400', border: 'border-primary-500/20' }
                      return (
                        <motion.a key={i} href={r.url} target="_blank" rel="noreferrer"
                          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                          className="flex items-start gap-3 bg-dark-600/50 rounded-xl p-4 hover:bg-dark-600 transition-all group border border-white/5 hover:border-white/10">
                          <div className={`flex-shrink-0 px-2 py-1 rounded-lg text-xs font-bold ${p.bg} ${p.text} border ${p.border}`}>
                            {r.platform}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-200 text-sm font-medium group-hover:text-white transition-colors line-clamp-2">{r.title}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              {r.isFree
                                ? <span className="text-xs text-accent-green font-semibold">FREE</span>
                                : <span className="text-xs text-gray-500">Paid</span>
                              }
                              <ExternalLink size={10} className="text-gray-600 group-hover:text-gray-400 transition-colors" />
                            </div>
                          </div>
                        </motion.a>
                      )
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="glass-card p-10 text-center text-gray-500">
                <GraduationCap size={32} className="mx-auto mb-3 opacity-30" />
                <p>No learning resources returned for this analysis.</p>
              </div>
            )}
          </div>
        </AnimatedTab>

        {/* Suggestions Tab */}
        <AnimatedTab active={activeTab === 'suggestions'}>
          <div className="glass-card p-6">
            <h3 className="text-white font-semibold mb-5">Gemini AI Recommendations</h3>
            <div className="space-y-3">
              {result.suggestions.map((s, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
                  className={`flex items-start gap-3 p-4 rounded-xl border ${
                    s.type === 'critical' ? 'bg-red-500/5 border-red-500/20' :
                    s.type === 'warning' ? 'bg-accent-orange/5 border-accent-orange/20' :
                    'bg-primary-600/5 border-primary-500/20'
                  }`}>
                  {s.type === 'critical' ? <XCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" /> :
                   s.type === 'warning' ? <AlertTriangle size={16} className="text-accent-orange mt-0.5 flex-shrink-0" /> :
                   <CheckCircle size={16} className="text-primary-400 mt-0.5 flex-shrink-0" />}
                  <div>
                    <span className={`text-xs font-bold uppercase tracking-wider mr-2 ${
                      s.type === 'critical' ? 'text-red-400' : s.type === 'warning' ? 'text-accent-orange' : 'text-primary-400'
                    }`}>{s.type}</span>
                    <span className="text-gray-300 text-sm">{s.text}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </AnimatedTab>

        {/* View Resume Tab */}
        <AnimatedTab active={activeTab === 'resume'}>
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-accent-cyan/20 flex items-center justify-center">
                  <ScrollText size={16} className="text-accent-cyan" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">Resume Content</h3>
                  <p className="text-gray-500 text-xs">{result.fileName} · {result.fileSize ? `${(result.fileSize / 1024).toFixed(1)} KB` : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {result.hasFile && (
                  <>
                    <a
                      href={`/api/resumes/${id}/file`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan hover:bg-accent-cyan/20 transition-all"
                    >
                      <Eye size={12} /> Open Original
                    </a>
                    <a
                      href={`/api/resumes/${id}/file`}
                      download={result.fileName}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary-600/10 border border-primary-500/20 text-primary-400 hover:bg-primary-600/20 transition-all"
                    >
                      <Download size={12} /> Download
                    </a>
                  </>
                )}
              </div>
            </div>

            {result.hasFile && (
              <div className="mb-5 rounded-xl overflow-hidden border border-white/10 bg-dark-800">
                <div className="bg-dark-700 px-4 py-2 flex items-center gap-2 border-b border-white/5">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/60" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                    <div className="w-3 h-3 rounded-full bg-green-500/60" />
                  </div>
                  <span className="text-gray-500 text-xs flex-1 text-center">{result.fileName}</span>
                  <a href={`/api/resumes/${id}/file`} target="_blank" rel="noreferrer" className="text-gray-600 hover:text-gray-400">
                    <ExternalLink size={12} />
                  </a>
                </div>
                {result.fileName?.endsWith('.pdf') ? (
                  <iframe
                    src={`/api/resumes/${id}/file`}
                    title="Resume Preview"
                    className="w-full h-[600px]"
                    style={{ border: 'none' }}
                  />
                ) : (
                  <div className="p-6 text-center text-gray-500">
                    <FileText size={32} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Word documents cannot be previewed inline.</p>
                    <a href={`/api/resumes/${id}/file`} download={result.fileName}
                      className="inline-flex items-center gap-2 mt-3 text-primary-400 hover:text-primary-300 text-sm">
                      <Download size={14} /> Download to view
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Extracted text (always shown as fallback / reference) */}
            {result.rawText ? (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <FileText size={14} className="text-gray-500" />
                  <h4 className="text-gray-400 text-sm font-medium">Extracted Text Content</h4>
                  <span className="text-xs text-gray-600">(used for AI analysis)</span>
                </div>
                <pre className="bg-dark-800/80 border border-white/5 rounded-xl p-5 text-gray-400 text-xs leading-relaxed whitespace-pre-wrap overflow-auto max-h-[400px] font-mono">
                  {result.rawText}
                </pre>
              </div>
            ) : (
              !result.hasFile && (
                <div className="text-center py-10 text-gray-500">
                  <ScrollText size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Resume content not available for this analysis.</p>
                  <p className="text-xs mt-1">New analyses will have full resume viewing enabled.</p>
                </div>
              )
            )}
          </div>
        </AnimatedTab>

        {/* Actions */}
        <div className="mt-8 flex gap-4">
          <Link to="/analyze" className="glow-button flex items-center gap-2 flex-1 justify-center py-4">
            <Upload size={18} /> Analyze Another Resume
          </Link>
          <Link to="/history" className="flex items-center gap-2 flex-1 justify-center py-4 rounded-xl border border-white/10 text-gray-300 hover:text-white hover:border-white/20 transition-all font-semibold">
            View History
          </Link>
        </div>
      </div>
    </div>
  )
}
