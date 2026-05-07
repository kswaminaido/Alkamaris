import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useGlobalLoading } from './GlobalLoadingContext'
import { API_BASE } from '../config/api'

const TOKEN_KEY = 'alkamaris_access_token'
const DEFAULT_USER_TYPES = []
const SESSION_EXPIRED_ERROR = 'SESSION_EXPIRED'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const { trackGlobalLoad } = useGlobalLoading()
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY) ?? '')
  const [currentUser, setCurrentUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [userTypeOptions, setUserTypeOptions] = useState(DEFAULT_USER_TYPES)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadUserTypeOptions()
  }, [])

  useEffect(() => {
    if (!token) {
      setCurrentUser(null)
      setAuthReady(true)
      return
    }
    setAuthReady(false)
    fetchMe(token)
  }, [token])

  const dashboardTitle = useMemo(() => {
    if (!currentUser?.role) return 'User Dashboard'
    if (currentUser.role === 'admin') return 'Admin Dashboard'
    if (currentUser.role === 'sales') return 'Sales Dashboard'
    if (currentUser.role === 'packer' || currentUser.role === 'vendor') return 'Packer Dashboard'
    return 'Customer Dashboard'
  }, [currentUser])

  async function loadUserTypeOptions() {
    try {
      const response = await trackGlobalLoad(
        () => fetch(`${API_BASE}/configs/roles/options`),
        'Loading application data...',
      )
      const payload = await response.json()
      const options = payload?.data?.options ?? []
      if (options.length > 0) {
        setUserTypeOptions(mergeUserTypeOptions(options))
      }
    } catch {
      setUserTypeOptions(DEFAULT_USER_TYPES)
    }
  }

  async function fetchMe(accessToken) {
    try {
      const response = await trackGlobalLoad(
        () => fetch(`${API_BASE}/auth/me`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
        }),
        'Loading your session...',
      )

      if (!response.ok) {
        clearSession()
        return
      }

      const payload = await response.json()
      setCurrentUser(normalizeUser(payload?.data ?? null))
    } catch {
      clearSession()
    } finally {
      setAuthReady(true)
    }
  }

  async function login(credentials) {
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const response = await trackGlobalLoad(
        () => fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(credentials),
        }),
        'Signing in...',
      )
      const payload = await response.json()

      if (!response.ok) {
        setError(payload?.message ?? 'Login failed. Please check credentials.')
        return false
      }

      const accessToken = payload?.data?.access_token ?? ''
      const user = normalizeUser(payload?.data?.user ?? null)
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
      const response = await trackGlobalLoad(
        () => fetch(`${API_BASE}/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(payload),
        }),
        'Creating your account...',
      )
      const body = await response.json()

      if (!response.ok) {
        const firstValidationMessage = body?.errors ? Object.values(body.errors)?.[0]?.[0] : null
        setError(firstValidationMessage ?? body?.message ?? 'Registration failed.')
        return false
      }

      setMessage(body?.message ?? 'Registration successful.')
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
        await trackGlobalLoad(
          () => fetch(`${API_BASE}/auth/logout`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
          }),
          'Signing out...',
        )
      } catch {
        // best effort
      }
    }
    clearSession()
    setMessage('Logged out successfully.')
  }

  async function authFetch(path, options = {}) {
    const hasFormDataBody = typeof FormData !== 'undefined' && options.body instanceof FormData
    const headers = {
      Accept: 'application/json',
      ...(options.body && !hasFormDataBody ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers ?? {}),
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    const loaderLabel = typeof options.loadingLabel === 'string' && options.loadingLabel.trim()
      ? options.loadingLabel
      : 'Loading...'

    const { loadingLabel, ...requestOptions } = options

    const response = await trackGlobalLoad(
      () => fetch(`${API_BASE}${path}`, {
        ...requestOptions,
        headers,
      }),
      loaderLabel,
    )

    if (response.status === 401) {
      clearSession()
      throw new Error(SESSION_EXPIRED_ERROR)
    }

    return response
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY)
    setToken('')
    setCurrentUser(null)
    setAuthReady(true)
  }

  function clearFeedback() {
    setMessage('')
    setError('')
  }

  function syncCurrentUser(user) {
    const normalized = normalizeUser(user)
    setCurrentUser(normalized)
    return normalized
  }

  function normalizeUser(user) {
    if (!user) return null
    const normalizedRole = typeof user.role === 'string' ? user.role.trim().toLowerCase() : user.role
    return { ...user, role: normalizedRole }
  }

  function mergeUserTypeOptions(options) {
    const normalized = options
      .filter((option) => typeof option === 'string')
      .map((option) => option.trim().toLowerCase())
      .filter(Boolean)

    return [...new Set([...DEFAULT_USER_TYPES, ...normalized])]
  }

  const value = {
    currentUser,
    authReady,
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
    syncCurrentUser,
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
