import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Upload, FileText, X, Brain, Zap, CheckCircle,
  Loader2, Target, Briefcase, Link2, Key, Eye, EyeOff, Sparkles
} from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

const JOB_ROLES = [
  'Software Engineer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
  'Data Scientist', 'ML Engineer', 'DevOps Engineer', 'Product Manager',
  'UX Designer', 'Data Analyst', 'Cloud Architect', 'Cybersecurity Engineer',
]

// Per-provider config
const AI_PROVIDERS = [
  {
    id: 'gemini',
    label: 'Gemini',
    icon: '✦',
    color: 'from-blue-500 to-cyan-400',
    borderActive: 'border-cyan-500/60',
    bgActive: 'bg-cyan-500/10',
    textActive: 'text-cyan-300',
    model: 'gemini-2.5-flash',
    placeholder: 'AIzaSy...',
    keyUrl: 'https://aistudio.google.com/app/apikey',
    keyLabel: 'Get free Gemini key',
    description: 'Google Gemini 2.5 Flash · Free · Best quality',
    hint: 'Uses gemini-2.5-flash. 100% free at aistudio.google.com',
  },
  {
    id: 'groq',
    label: 'Groq',
    icon: '⚡',
    color: 'from-orange-500 to-yellow-400',
    borderActive: 'border-orange-500/60',
    bgActive: 'bg-orange-500/10',
    textActive: 'text-orange-300',
    model: 'llama-3.3-70b-versatile',
    placeholder: 'gsk_...',
    keyUrl: 'https://console.groq.com/keys',
    keyLabel: 'Get free Groq key',
    description: 'Llama 3.3 70B on Groq · Ultra-fast · Free',
    hint: 'Uses Llama 3.3 70B Versatile via Groq Cloud. Free tier available.',
  },
  {
    id: 'huggingface',
    label: 'HuggingFace',
    icon: '🤗',
    color: 'from-yellow-500 to-amber-400',
    borderActive: 'border-yellow-500/60',
    bgActive: 'bg-yellow-500/10',
    textActive: 'text-yellow-300',
    model: 'Mistral-7B-Instruct-v0.3',
    placeholder: 'hf_...',
    keyUrl: 'https://huggingface.co/settings/tokens',
    keyLabel: 'Get free HF token',
    description: 'Mistral 7B Instruct · HuggingFace Inference API',
    hint: 'Uses Mistral-7B-Instruct-v0.3. Free tier — model may take ~30s to warm up.',
  },
]

const ANALYSIS_STEPS = [
  { label: 'Parsing document structure...', icon: <FileText size={14} /> },
  { label: 'Extracting skills and experience...', icon: <Brain size={14} /> },
  { label: 'Running ATS compatibility check...', icon: <Target size={14} /> },
  { label: 'Analyzing keyword density...', icon: <Zap size={14} /> },
  { label: 'Generating AI recommendations...', icon: <Sparkles size={14} /> },
  { label: 'Building personalized learning resources...', icon: <CheckCircle size={14} /> },
]

export default function AnalyzePage() {
  const navigate = useNavigate()
  const {
    user,
    aiProvider, setAiProvider,
    geminiKey, setGeminiKey,
    groqKey, setGroqKey,
    hfKey, setHfKey,
  } = useAuth()

  const [file, setFile] = useState(null)
  const [jobRole, setJobRole] = useState('')
  const [jobUrl, setJobUrl] = useState('')
  const [jobDescription, setJobDescription] = useState('')

  // Local key states (mirrors context, but allows editing without instant save)
  const [localGeminiKey, setLocalGeminiKey] = useState(geminiKey || '')
  const [localGroqKey, setLocalGroqKey] = useState(groqKey || '')
  const [localHfKey, setLocalHfKey] = useState(hfKey || '')

  const [showKey, setShowKey] = useState(false)
  const [scraping, setScraping] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisStep, setAnalysisStep] = useState(0)
  const [progress, setProgress] = useState(0)

  const activeProvider = AI_PROVIDERS.find(p => p.id === aiProvider) || AI_PROVIDERS[0]

  // Current key value for the active provider
  const currentKeyValue = aiProvider === 'groq' ? localGroqKey : aiProvider === 'huggingface' ? localHfKey : localGeminiKey
  const setCurrentKeyValue = aiProvider === 'groq'
    ? setLocalGroqKey
    : aiProvider === 'huggingface'
    ? setLocalHfKey
    : setLocalGeminiKey

  const onDrop = useCallback((accepted, rejected) => {
    if (rejected.length) { toast.error('Only PDF or Word documents supported.'); return }
    if (accepted.length) { setFile(accepted[0]); toast.success('Resume uploaded!') }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
  })

  const handleScrapeJob = async () => {
    if (!jobUrl.trim()) { toast.error('Please enter a job URL'); return }
    setScraping(true)
    try {
      const res = await api.post('/scrape/job', { url: jobUrl.trim() })
      setJobDescription(res.data.jobDescription)
      if (res.data.jobTitle && !jobRole) setJobRole(res.data.jobTitle)
      toast.success('Job description extracted successfully!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to scrape. Try pasting manually.')
    } finally { setScraping(false) }
  }

  const simulateProgress = async () => {
    for (let i = 0; i < ANALYSIS_STEPS.length; i++) {
      setAnalysisStep(i)
      setProgress(Math.round(((i + 1) / ANALYSIS_STEPS.length) * 100))
      await new Promise(r => setTimeout(r, 1400))
    }
  }

  const handleAnalyze = async () => {
    if (!file) { toast.error('Please upload your resume'); return }
    if (!jobRole.trim()) { toast.error('Please select or enter a target job role'); return }

    const key = currentKeyValue.trim()
    if (!key) {
      toast.error(`Please enter your ${activeProvider.label} API key`)
      return
    }

    // Persist the used key
    if (aiProvider === 'groq') setGroqKey(key)
    else if (aiProvider === 'huggingface') setHfKey(key)
    else setGeminiKey(key)

    setAnalyzing(true)
    setProgress(0)
    setAnalysisStep(0)

    try {
      const formData = new FormData()
      formData.append('resume', file)
      formData.append('jobRole', jobRole)
      formData.append('jobDescription', jobDescription)
      formData.append('aiProvider', aiProvider)
      formData.append('jobUrl', jobUrl)
      if (user?.id) formData.append('userId', user.id)

      // Append the correct key field
      if (aiProvider === 'groq') formData.append('groqKey', key)
      else if (aiProvider === 'huggingface') formData.append('hfKey', key)
      else formData.append('geminiKey', key)

      const [, response] = await Promise.all([
        simulateProgress(),
        api.post('/resumes/analyze', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
      ])
      toast.success('Analysis complete!')
      navigate('/result/' + response.data.id)
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.detail || `Analysis failed. Check your ${activeProvider.label} API key.`)
      setAnalyzing(false)
    }
  }

  const canAnalyze = file && jobRole.trim() && currentKeyValue.trim()

  return (
    <div className="pt-24 pb-16 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-600 to-accent-cyan mb-4 shadow-glow">
            <Brain size={24} className="text-white" />
          </div>
          <h1 className="text-4xl font-black text-white mb-2">
            Analyze Your <span className="gradient-text">Resume</span>
          </h1>
          <p className="text-gray-400 text-sm">Powered by AI · Real analysis, zero dummy data</p>
        </motion.div>

        <AnimatePresence mode="wait">
          {!analyzing ? (
            <motion.div key="upload" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-5">

              {/* ── AI Provider Selector ── */}
              <div className="glass-card p-5 border border-white/10">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles size={16} className="text-primary-400" />
                  <h3 className="text-white font-semibold">Choose AI Provider</h3>
                  <span className="text-red-400 text-xs">*required</span>
                </div>

                {/* Provider tabs */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {AI_PROVIDERS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setAiProvider(p.id)}
                      className={`relative flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border transition-all duration-200 text-center ${
                        aiProvider === p.id
                          ? `${p.borderActive} ${p.bgActive} ${p.textActive}`
                          : 'border-white/10 bg-dark-600/40 text-gray-500 hover:text-gray-300 hover:border-white/20'
                      }`}
                    >
                      <span className="text-xl leading-none">{p.icon}</span>
                      <span className="text-sm font-semibold">{p.label}</span>
                      <span className={`text-[10px] leading-tight ${aiProvider === p.id ? 'opacity-80' : 'opacity-50'}`}>
                        {p.model}
                      </span>
                      {aiProvider === p.id && (
                        <motion.div
                          layoutId="provider-indicator"
                          className="absolute -bottom-px left-4 right-4 h-0.5 rounded-full bg-current opacity-60"
                        />
                      )}
                    </button>
                  ))}
                </div>

                {/* Per-provider description */}
                <p className="text-xs text-gray-500 mb-4">{activeProvider.description}</p>

                {/* API Key input — changes based on active provider */}
                <div className="flex items-center gap-2 mb-2">
                  <Key size={14} className="text-gray-400" />
                  <span className="text-sm text-gray-300 font-medium">{activeProvider.label} API Key</span>
                  <a
                    href={activeProvider.keyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-auto text-xs text-primary-400 hover:text-primary-300 underline underline-offset-2"
                  >
                    {activeProvider.keyLabel} ↗
                  </a>
                </div>
                <div className="relative">
                  <input
                    key={aiProvider}  // remount on provider change to clear autofill
                    type={showKey ? 'text' : 'password'}
                    value={currentKeyValue}
                    onChange={e => setCurrentKeyValue(e.target.value)}
                    placeholder={activeProvider.placeholder}
                    className="input-field w-full pr-10 font-mono text-sm"
                  />
                  <button
                    onClick={() => setShowKey(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {currentKeyValue && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <CheckCircle size={11} className="text-accent-green" />
                    <span className="text-xs text-accent-green">Key saved locally in your browser</span>
                  </div>
                )}
                <p className="text-gray-600 text-xs mt-1.5">{activeProvider.hint}</p>
              </div>

              {/* ── Resume Upload ── */}
              <div {...getRootProps()}
                className={`glass-card p-10 text-center cursor-pointer transition-all duration-300 border-2 border-dashed ${
                  isDragActive ? 'border-primary-400 bg-primary-600/10 shadow-glow' :
                  file ? 'border-accent-green/50 bg-accent-green/5' :
                  'border-white/10 hover:border-primary-500/50 hover:bg-primary-600/5'
                }`}>
                <input {...getInputProps()} />
                <AnimatePresence mode="wait">
                  {file ? (
                    <motion.div key="file" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-accent-green/20 border border-accent-green/30 flex items-center justify-center">
                        <FileText size={26} className="text-accent-green" />
                      </div>
                      <div>
                        <p className="text-white font-semibold">{file.name}</p>
                        <p className="text-gray-500 text-sm">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button onClick={e => { e.stopPropagation(); setFile(null) }} className="flex items-center gap-1 text-red-400 hover:text-red-300 text-sm">
                        <X size={13} /> Remove
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3">
                      <motion.div animate={{ y: isDragActive ? -10 : 0 }} className="w-14 h-14 rounded-2xl bg-primary-600/20 border border-primary-500/30 flex items-center justify-center">
                        <Upload size={26} className={isDragActive ? 'text-primary-300' : 'text-primary-400'} />
                      </motion.div>
                      <div>
                        <p className="text-white font-semibold text-lg">{isDragActive ? 'Drop it here!' : 'Drop your resume here'}</p>
                        <p className="text-gray-500 text-sm mt-0.5">or <span className="text-primary-400 font-medium">click to browse</span></p>
                      </div>
                      <div className="flex gap-2">
                        {['PDF', 'DOC', 'DOCX'].map(e => <span key={e} className="text-xs bg-dark-600 text-gray-400 border border-white/10 rounded px-2 py-0.5">{e}</span>)}
                      </div>
                      <p className="text-gray-600 text-xs">Max 5MB</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── Target Role ── */}
              <div className="glass-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Briefcase size={15} className="text-primary-400" />
                  <h3 className="text-white font-semibold">Target Role</h3>
                  <span className="text-red-400 text-xs">*required</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                  {JOB_ROLES.map(role => (
                    <button key={role} onClick={() => setJobRole(role)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 text-left ${
                        jobRole === role
                          ? 'bg-primary-600/20 border border-primary-500/50 text-primary-300'
                          : 'bg-dark-600/50 border border-white/5 text-gray-400 hover:text-white hover:border-white/20'
                      }`}>
                      {role}
                    </button>
                  ))}
                </div>
                <input type="text" placeholder="Or type a custom role..." value={jobRole} onChange={e => setJobRole(e.target.value)} className="input-field w-full" />
              </div>

              {/* ── Job URL Scraper ── */}
              <div className="glass-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Link2 size={15} className="text-accent-cyan" />
                  <h3 className="text-white font-semibold">Job Posting URL</h3>
                  <span className="text-gray-500 text-xs">(auto-extracts job description)</span>
                </div>
                <div className="flex gap-2">
                  <input type="url" value={jobUrl} onChange={e => setJobUrl(e.target.value)}
                    placeholder="https://linkedin.com/jobs/... or indeed.com/..."
                    className="input-field flex-1 text-sm" />
                  <button onClick={handleScrapeJob} disabled={scraping || !jobUrl.trim()}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all whitespace-nowrap ${
                      jobUrl.trim() && !scraping
                        ? 'bg-accent-cyan/20 border border-accent-cyan/30 text-accent-cyan hover:bg-accent-cyan/30'
                        : 'bg-dark-600 text-gray-600 cursor-not-allowed border border-white/5'
                    }`}>
                    {scraping ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                    {scraping ? 'Fetching...' : 'Extract JD'}
                  </button>
                </div>
                <p className="text-gray-600 text-xs mt-1.5">Supports LinkedIn, Indeed, Glassdoor, Naukri, Dice and most job boards.</p>
              </div>

              {/* ── Job Description ── */}
              <div className="glass-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Target size={15} className="text-accent-cyan" />
                  <h3 className="text-white font-semibold">Job Description</h3>
                  <span className="text-gray-500 text-xs">(auto-filled · or paste manually)</span>
                </div>
                <textarea rows={5} value={jobDescription} onChange={e => setJobDescription(e.target.value)}
                  placeholder="Paste or auto-extract job description for precise keyword matching..."
                  className="input-field w-full resize-none font-mono text-sm" />
                {jobDescription && (
                  <p className="text-gray-600 text-xs mt-1">{jobDescription.length} chars · {activeProvider.label} will use this for keyword matching</p>
                )}
              </div>

              {/* ── Analyze CTA ── */}
              <button
                onClick={handleAnalyze}
                disabled={!canAnalyze}
                className={`w-full py-5 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all duration-300 ${
                  canAnalyze ? 'glow-button' : 'bg-dark-600 text-gray-600 cursor-not-allowed border border-white/5'
                }`}
              >
                <span className="text-xl">{activeProvider.icon}</span>
                Analyze with {activeProvider.label}
                <Zap size={18} />
              </button>

              <div className="flex items-center gap-6 justify-center text-xs text-gray-600">
                {['Privacy protected', 'Real AI analysis', 'Learning resources included'].map(t => (
                  <div key={t} className="flex items-center gap-1.5">
                    <CheckCircle size={11} className="text-accent-green" />{t}
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div key="analyzing" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-12 text-center">
              <div className="relative w-24 h-24 mx-auto mb-8">
                <div className="absolute inset-0 rounded-full bg-primary-600/20 animate-ping" />
                <div className="absolute inset-2 rounded-full bg-primary-600/30 animate-ping" style={{ animationDelay: '0.3s' }} />
                <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary-600 to-accent-cyan flex items-center justify-center shadow-glow">
                  <Brain size={36} className="text-white animate-pulse" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">{activeProvider.label} is Analyzing</h2>
              <p className="text-gray-400 text-sm mb-8">Processing your resume with {activeProvider.model}...</p>
              <div className="mb-8">
                <div className="flex justify-between text-xs text-gray-500 mb-2">
                  <span>Progress</span><span>{progress}%</span>
                </div>
                <div className="h-2 bg-dark-600 rounded-full overflow-hidden">
                  <motion.div className="h-full bg-gradient-to-r from-primary-600 to-accent-cyan rounded-full" style={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
                </div>
              </div>
              <div className="space-y-3 text-left max-w-sm mx-auto">
                {ANALYSIS_STEPS.map((step, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: i <= analysisStep ? 1 : 0.3, x: 0 }} className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                      i < analysisStep ? 'bg-accent-green/20 text-accent-green border border-accent-green/30' :
                      i === analysisStep ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30' :
                      'bg-dark-600 text-gray-600 border border-white/5'
                    }`}>
                      {i < analysisStep ? <CheckCircle size={12} /> : i === analysisStep ? <Loader2 size={12} className="animate-spin" /> : step.icon}
                    </div>
                    <span className={`text-xs ${i <= analysisStep ? 'text-gray-300' : 'text-gray-600'}`}>{step.label}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
