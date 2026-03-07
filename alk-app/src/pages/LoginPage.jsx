import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import LoginPanel from '../components/auth/LoginPanel'
import TopNav from '../components/layout/TopNav'
import { useAuth } from '../context/AuthContext'

const defaultLoginForm = {
  email: '',
  password: '',
}

function LoginPage() {
  const navigate = useNavigate()
  const { login, loading, message, error, currentUser, clearFeedback } = useAuth()
  const [loginForm, setLoginForm] = useState(defaultLoginForm)

  useEffect(() => {
    if (currentUser) {
      navigate('/dashboard', { replace: true })
    }
  }, [currentUser, navigate])

  useEffect(() => {
    clearFeedback()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    const ok = await login(loginForm)
    if (ok) {
      setLoginForm(defaultLoginForm)
      navigate('/dashboard', { replace: true })
    }
  }

  function onFieldChange(field, value) {
    setLoginForm((previous) => ({ ...previous, [field]: value }))
  }

  return (
    <>
      <TopNav currentUser={currentUser} showSignupLink />
      <LoginPanel
        loginForm={loginForm}
        onFieldChange={onFieldChange}
        onSubmit={handleSubmit}
        loading={loading}
        message={message}
        error={error}
      />
    </>
  )
}

export default LoginPage
