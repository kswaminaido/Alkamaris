import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const API_BASE = 'http://localhost:8000/api'
const TOKEN_KEY = 'alkamaris_access_token'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY) ?? '')
  const [currentUser, setCurrentUser] = useState(null)
  const [userTypeOptions, setUserTypeOptions] = useState(['admin', 'sales', 'customer'])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadUserTypeOptions()
  }, [])

  useEffect(() => {
    if (!token) {
      setCurrentUser(null)
      return
    }
    fetchMe(token)
  }, [token])

  const dashboardTitle = useMemo(() => {
    if (!currentUser?.role) return 'User Dashboard'
    if (currentUser.role === 'admin') return 'Admin Dashboard'
    if (currentUser.role === 'sales') return 'Sales Dashboard'
    return 'Customer Dashboard'
  }, [currentUser])

  async function loadUserTypeOptions() {
    try {
      const response = await fetch(`${API_BASE}/configs/roles/options`)
      const payload = await response.json()
      const options = payload?.data?.options ?? []
      if (options.length > 0) {
        setUserTypeOptions(options)
      }
    } catch {
      setUserTypeOptions(['admin', 'sales', 'customer'])
    }
  }

  async function fetchMe(accessToken) {
    try {
      const response = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      })

      if (!response.ok) {
        clearSession()
        return
      }

      const payload = await response.json()
      setCurrentUser(payload?.data ?? null)
    } catch {
      clearSession()
    }
  }

  async function login(credentials) {
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(credentials),
      })
      const payload = await response.json()

      if (!response.ok) {
        setError(payload?.message ?? 'Login failed. Please check credentials.')
        return false
      }

      const accessToken = payload?.data?.access_token ?? ''
      const user = payload?.data?.user ?? null
      if (!accessToken || !user) {
        setError('Login response is incomplete.')
        return false
      }

      localStorage.setItem(TOKEN_KEY, accessToken)
      setToken(accessToken)
      setCurrentUser(user)
      setMessage('Login successful.')
      return true
    } catch {
      setError('Unable to connect to the API.')
      return false
    } finally {
      setLoading(false)
    }
  }

  async function register(payload) {
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      })
      const body = await response.json()

      if (!response.ok) {
        const firstValidationMessage = body?.errors ? Object.values(body.errors)?.[0]?.[0] : null
        setError(firstValidationMessage ?? body?.message ?? 'Registration failed.')
        return false
      }

      const accessToken = body?.data?.access_token ?? ''
      const user = body?.data?.user ?? null
      if (!accessToken || !user) {
        setError('Registration response is incomplete.')
        return false
      }

      localStorage.setItem(TOKEN_KEY, accessToken)
      setToken(accessToken)
      setCurrentUser(user)
      setMessage('Registration successful.')
      return true
    } catch {
      setError('Unable to connect to the API.')
      return false
    } finally {
      setLoading(false)
    }
  }

  async function logout() {
    if (token) {
      try {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        })
      } catch {
        // best effort
      }
    }
    clearSession()
    setMessage('Logged out successfully.')
  }

  async function authFetch(path, options = {}) {
    const headers = {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers ?? {}),
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    return fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    })
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY)
    setToken('')
    setCurrentUser(null)
  }

  function clearFeedback() {
    setMessage('')
    setError('')
  }

  const value = {
    currentUser,
    userTypeOptions,
    dashboardTitle,
    loading,
    message,
    error,
    login,
    register,
    logout,
    authFetch,
    clearFeedback,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
