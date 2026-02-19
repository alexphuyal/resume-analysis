import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Brain, Zap, Target, TrendingUp, Shield, Star,
  ArrowRight, CheckCircle, Upload, ChevronRight,
  BarChart3, FileText, Sparkles, Users
} from 'lucide-react'

const FEATURES = [
  {
    icon: <Brain size={24} />,
    title: 'AI-Powered Analysis',
    description: 'Fine-tuned HuggingFace NLP model analyzes your resume against industry standards and job requirements.',
    color: 'from-primary-500 to-primary-700',
    glow: 'shadow-glow',
  },
  {
    icon: <Target size={24} />,
    title: 'ATS Optimization',
    description: 'Check your resume against Applicant Tracking Systems and optimize keywords for 3x better pass rates.',
    color: 'from-accent-cyan to-primary-600',
    glow: 'shadow-glow-cyan',
  },
  {
    icon: <TrendingUp size={24} />,
    title: 'Skill Gap Analysis',
    description: 'Identify missing skills for your target role with personalized learning recommendations.',
    color: 'from-accent-purple to-accent-pink',
    glow: 'shadow-glow-purple',
  },
  {
    icon: <BarChart3 size={24} />,
    title: 'Score Breakdown',
    description: 'Get detailed scoring across 8 dimensions: content, format, impact, keywords, and more.',
    color: 'from-accent-green to-accent-cyan',
    glow: 'shadow-glow-cyan',
  },
  {
    icon: <Shield size={24} />,
    title: 'Privacy First',
    description: 'Your resume data is encrypted and never shared. Processed securely on our private infrastructure.',
    color: 'from-accent-orange to-accent-pink',
    glow: 'shadow-glow',
  },
  {
    icon: <Sparkles size={24} />,
    title: 'Smart Suggestions',
    description: 'AI generates specific, actionable rewrites for your bullet points using industry-proven templates.',
    color: 'from-primary-600 to-accent-purple',
    glow: 'shadow-glow-purple',
  },
]

const STATS = [
  { value: '50K+', label: 'Resumes Analyzed', icon: <FileText size={20} /> },
  { value: '94%', label: 'Interview Rate Boost', icon: <TrendingUp size={20} /> },
  { value: '8.2s', label: 'Analysis Time', icon: <Zap size={20} /> },
  { value: '200+', label: 'Job Categories', icon: <Target size={20} /> },
]

const STEPS = [
  { step: '01', title: 'Upload Resume', desc: 'Drop your PDF or Word resume. Supports all formats.' },
  { step: '02', title: 'AI Processes', desc: 'Our fine-tuned NLP model extracts and analyzes every detail.' },
  { step: '03', title: 'Get Results', desc: 'Receive a 360° score report with actionable improvements.' },
  { step: '04', title: 'Land the Job', desc: 'Apply with confidence using your optimized resume.' },
]

const TESTIMONIALS = [
  {
    name: 'Sarah Chen',
    role: 'Software Engineer @ Google',
    avatar: 'SC',
    text: 'ResumeAI helped me identify keyword gaps I never noticed. Got 3 interview calls within a week of updating my resume.',
    score: 94,
    stars: 5,
  },
  {
    name: 'Marcus Johnson',
    role: 'Product Manager @ Meta',
    avatar: 'MJ',
    text: 'The ATS optimization feature is a game-changer. My application success rate went from 5% to 40%.',
    score: 88,
    stars: 5,
  },
  {
    name: 'Priya Patel',
    role: 'Data Scientist @ Netflix',
    avatar: 'PP',
    text: 'Incredibly detailed analysis. The skill gap insights pointed me to exactly what I needed to learn.',
    score: 91,
    stars: 5,
  },
]

export default function LandingPage() {
  return (
    <div className="pt-16">
      {/* HERO */}
      <section className="min-h-screen flex items-center relative overflow-hidden">
        {/* Animated orbs */}
        <div className="absolute top-1/4 left-1/3 w-72 h-72 bg-primary-600/15 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-cyan/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 right-1/3 w-48 h-48 bg-accent-purple/10 rounded-full blur-2xl animate-pulse-slow" style={{ animationDelay: '2s' }} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center gap-2 bg-primary-600/10 border border-primary-500/30 rounded-full px-4 py-2 mb-6">
                <Sparkles size={14} className="text-primary-400" />
                <span className="text-sm text-primary-300 font-medium">Powered by Fine-tuned AI · HuggingFace NLP</span>
              </div>

              <h1 className="text-5xl lg:text-7xl font-black leading-tight mb-6">
                <span className="text-white">Your Resume,</span>
                <br />
                <span className="gradient-text">Perfected by AI</span>
              </h1>

              <p className="text-gray-400 text-lg leading-relaxed mb-8 max-w-xl">
                Get a comprehensive AI analysis of your resume in seconds. Identify gaps, optimize for ATS,
                and land 3x more interviews with data-driven recommendations.
              </p>

              <div className="flex flex-wrap gap-4 mb-10">
                <Link to="/analyze" className="glow-button flex items-center gap-2 text-base px-8 py-4">
                  <Upload size={18} />
                  Analyze My Resume Free
                  <ArrowRight size={16} />
                </Link>
                <Link
                  to="/dashboard"
                  className="flex items-center gap-2 px-8 py-4 rounded-xl border border-white/10 text-gray-300 hover:text-white hover:border-white/20 transition-all duration-300 font-semibold text-base"
                >
                  <BarChart3 size={18} />
                  View Dashboard
                </Link>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex -space-x-2">
                  {['SC', 'MJ', 'PP', 'AK'].map((a, i) => (
                    <div key={i} className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-accent-cyan flex items-center justify-center text-xs font-bold text-white border-2 border-dark-900">
                      {a}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex text-yellow-400 text-sm">
                    {[...Array(5)].map((_, i) => <Star key={i} size={14} fill="currentColor" />)}
                  </div>
                  <p className="text-gray-500 text-sm">Trusted by 50,000+ professionals</p>
                </div>
              </div>
            </motion.div>

            {/* Right - Mock Analysis Card */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="glass-card p-6 relative overflow-hidden">
                {/* Scan line animation */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-primary-400/50 to-transparent top-0 animate-scan" />
                </div>

                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-600/20 flex items-center justify-center border border-primary-500/30">
                      <Brain size={18} className="text-primary-400" />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">AI Analysis Complete</p>
                      <p className="text-gray-500 text-xs">John_Resume_2024.pdf</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-accent-green/10 border border-accent-green/30 rounded-full px-3 py-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
                    <span className="text-accent-green text-xs font-medium">Ready</span>
                  </div>
                </div>

                {/* Score Circle */}
                <div className="flex justify-center mb-6">
                  <div className="relative w-36 h-36">
                    <svg className="w-full h-full -rotate-90 score-ring" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(97,114,243,0.1)" strokeWidth="8" />
                      <circle cx="50" cy="50" r="42" fill="none" stroke="url(#scoreGrad)" strokeWidth="8"
                        strokeDasharray="264" strokeDashoffset="40" strokeLinecap="round" />
                      <defs>
                        <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#6172f3" />
                          <stop offset="100%" stopColor="#06b6d4" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-black text-white">85</span>
                      <span className="text-gray-400 text-xs">Overall Score</span>
                    </div>
                  </div>
                </div>

                {/* Category Scores */}
                <div className="space-y-3">
                  {[
                    { label: 'ATS Compatibility', score: 92, color: 'bg-accent-green' },
                    { label: 'Content Quality', score: 87, color: 'bg-primary-500' },
                    { label: 'Keywords Match', score: 78, color: 'bg-accent-cyan' },
                    { label: 'Impact Statements', score: 82, color: 'bg-accent-purple' },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">{item.label}</span>
                        <span className="text-white font-semibold">{item.score}%</span>
                      </div>
                      <div className="h-1.5 bg-dark-500 rounded-full overflow-hidden">
                        <div className={`h-full ${item.color} rounded-full progress-bar-animate`} style={{ width: `${item.score}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Suggestions */}
                <div className="mt-5 space-y-2">
                  {[
                    'Add quantified achievements to Software Engineer role',
                    'Include 3 missing React/TypeScript keywords',
                    'Improve action verbs in Leadership section',
                  ].map((s, i) => (
                    <div key={i} className="flex items-start gap-2 bg-dark-600/50 rounded-lg px-3 py-2">
                      <CheckCircle size={14} className="text-accent-green mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300 text-xs">{s}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating badges */}
              <motion.div
                animate={{ y: [-5, 5, -5] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute -top-4 -right-4 bg-accent-green/20 border border-accent-green/30 rounded-xl px-3 py-2 backdrop-blur"
              >
                <p className="text-accent-green text-xs font-bold">+40% ATS Score</p>
              </motion.div>
              <motion.div
                animate={{ y: [5, -5, 5] }}
                transition={{ duration: 3.5, repeat: Infinity }}
                className="absolute -bottom-4 -left-4 bg-primary-600/20 border border-primary-500/30 rounded-xl px-3 py-2 backdrop-blur"
              >
                <p className="text-primary-400 text-xs font-bold">AI Powered ✨</p>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="py-16 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {STATS.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="flex justify-center mb-3 text-primary-400">{stat.icon}</div>
                <p className="text-4xl font-black gradient-text mb-1">{stat.value}</p>
                <p className="text-gray-500 text-sm">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="text-4xl lg:text-5xl font-black text-white mb-4"
            >
              Everything You Need to <span className="gradient-text">Stand Out</span>
            </motion.h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Our fine-tuned AI model processes your resume through 50+ checkpoints for a comprehensive evaluation.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -5 }}
                className="glass-card p-6 group cursor-pointer hover:border-primary-500/30 transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center text-white mb-4 ${f.glow} group-hover:scale-110 transition-transform`}>
                  {f.icon}
                </div>
                <h3 className="text-white font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 bg-dark-800/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-black text-white mb-4">
              How It <span className="gradient-text">Works</span>
            </h2>
            <p className="text-gray-400 text-lg">From upload to actionable insights in under 10 seconds.</p>
          </div>

          <div className="grid md:grid-cols-4 gap-8 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-16 left-[12%] right-[12%] h-px bg-gradient-to-r from-transparent via-primary-500/30 to-transparent" />

            {STEPS.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15 }}
                className="text-center relative"
              >
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-600 to-accent-cyan flex items-center justify-center text-white font-black text-lg mx-auto mb-4 shadow-glow relative z-10">
                  {s.step}
                </div>
                <h3 className="text-white font-bold mb-2">{s.title}</h3>
                <p className="text-gray-400 text-sm">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-white mb-4">
              Loved by <span className="gradient-text">Professionals</span>
            </h2>
            <p className="text-gray-400">Join thousands who landed their dream jobs.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-6 hover:border-primary-500/20 transition-all duration-300"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-3 items-center">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-cyan flex items-center justify-center text-xs font-bold text-white">
                      {t.avatar}
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">{t.name}</p>
                      <p className="text-gray-500 text-xs">{t.role}</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <span className="text-2xl font-black gradient-text">{t.score}</span>
                    <p className="text-gray-600 text-xs">score</p>
                  </div>
                </div>
                <div className="flex text-yellow-400 mb-3">
                  {[...Array(t.stars)].map((_, i) => <Star key={i} size={12} fill="currentColor" />)}
                </div>
                <p className="text-gray-400 text-sm leading-relaxed">"{t.text}"</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="glass-card p-12 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary-600/10 to-accent-cyan/5 pointer-events-none" />
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-cyan mb-6 shadow-glow mx-auto">
                <Zap size={28} className="text-white" />
              </div>
              <h2 className="text-4xl lg:text-5xl font-black text-white mb-4">
                Ready to Get <span className="gradient-text">Hired?</span>
              </h2>
              <p className="text-gray-400 text-lg mb-8 max-w-xl mx-auto">
                Upload your resume now and get a detailed AI analysis with actionable improvements in seconds.
              </p>
              <Link to="/analyze" className="glow-button inline-flex items-center gap-2 text-lg px-10 py-4">
                <Upload size={20} />
                Start Free Analysis
                <ChevronRight size={18} />
              </Link>
              <p className="text-gray-600 text-sm mt-4">No signup required · Instant results · 100% private</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Brain size={18} className="text-primary-400" />
            <span className="text-gray-400 text-sm">ResumeAI — AI-Powered Career Intelligence</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600 text-xs">
            <Users size={12} />
            <span>50,000+ professionals trust ResumeAI</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
