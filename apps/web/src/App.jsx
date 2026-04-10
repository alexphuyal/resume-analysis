import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import Navbar from './components/layout/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import LandingPage from './pages/LandingPage'
import AnalyzePage from './pages/AnalyzePage'
import ResultPage from './pages/ResultPage'
import DashboardPage from './pages/DashboardPage'
import HistoryPage from './pages/HistoryPage'
import SignInPage from './pages/SignInPage'
import SignUpPage from './pages/SignUpPage'
import JobsPage from './pages/JobsPage'

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-dark-900 relative">
        <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
        <div className="fixed top-0 left-1/4 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-accent-cyan/10 rounded-full blur-3xl pointer-events-none" />
        <Navbar />
        <main className="relative z-10">
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/signin" element={<SignInPage />} />
            <Route path="/signup" element={<SignUpPage />} />

            {/* Protected routes */}
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/analyze" element={<ProtectedRoute><AnalyzePage /></ProtectedRoute>} />
            <Route path="/result/:id" element={<ProtectedRoute><ResultPage /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
            <Route path="/jobs" element={<ProtectedRoute><JobsPage /></ProtectedRoute>} />
          </Routes>
        </main>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#1a1d35', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.1)' },
            success: { iconTheme: { primary: '#10b981', secondary: '#0a0b14' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#0a0b14' } },
          }}
        />
      </div>
    </AuthProvider>
  )
}
