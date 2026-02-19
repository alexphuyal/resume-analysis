import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // AI provider selection — persisted in localStorage
  const [aiProvider, setAiProviderState] = useState(() => localStorage.getItem('ai_provider') || 'gemini')
  const [geminiKey, setGeminiKeyState] = useState(() => localStorage.getItem('gemini_key') || '')
  const [groqKey, setGroqKeyState] = useState(() => localStorage.getItem('groq_key') || '')
  const [hfKey, setHfKeyState] = useState(() => localStorage.getItem('hf_key') || '')

  // Restore session on load
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      api.get('/auth/me')
        .then(res => setUser(res.data))
        .catch(() => { localStorage.removeItem('token'); delete api.defaults.headers.common['Authorization'] })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = useCallback((userData, token) => {
    localStorage.setItem('token', token)
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    setUser(userData)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    delete api.defaults.headers.common['Authorization']
    setUser(null)
  }, [])

  const setGeminiKey = useCallback((key) => {
    localStorage.setItem('gemini_key', key)
    setGeminiKeyState(key)
  }, [])

  const setGroqKey = useCallback((key) => {
    localStorage.setItem('groq_key', key)
    setGroqKeyState(key)
  }, [])

  const setHfKey = useCallback((key) => {
    localStorage.setItem('hf_key', key)
    setHfKeyState(key)
  }, [])

  const setAiProvider = useCallback((provider) => {
    localStorage.setItem('ai_provider', provider)
    setAiProviderState(provider)
  }, [])

  return (
    <AuthContext.Provider value={{
      user, loading, login, logout,
      aiProvider, setAiProvider,
      geminiKey, setGeminiKey,
      groqKey, setGroqKey,
      hfKey, setHfKey,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
