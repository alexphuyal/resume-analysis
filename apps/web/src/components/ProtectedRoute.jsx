import { Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} className="text-primary-400 animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading session...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to={`/signin?next=${encodeURIComponent(location.pathname)}`} replace />
  }

  return children
}
