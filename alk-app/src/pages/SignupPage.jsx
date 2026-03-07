import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SignupPanel from '../components/auth/SignupPanel'
import TopNav from '../components/layout/TopNav'
import { useAuth } from '../context/AuthContext'

function SignupPage() {
  const navigate = useNavigate()
  const {
    register,
    loading,
    message,
    error,
    currentUser,
    userTypeOptions,
    clearFeedback,
  } = useAuth()
  const [form, setForm] = useState({
    name: '',
    phone_number: '',
    email: '',
    address: '',
    user_type: userTypeOptions[0] ?? 'sales',
    registration_number: '',
    password: '',
    password_confirmation: '',
  })

  useEffect(() => {
    if (currentUser) {
      navigate('/dashboard', { replace: true })
    }
  }, [currentUser, navigate])

  useEffect(() => {
    clearFeedback()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setForm((previous) => ({
      ...previous,
      user_type: previous.user_type || userTypeOptions[0] || 'sales',
    }))
  }, [userTypeOptions])

  async function handleSubmit(event) {
    event.preventDefault()
    const ok = await register(form)
    if (ok) {
      navigate('/dashboard', { replace: true })
    }
  }

  function onFieldChange(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }))
  }

  return (
    <>
      <TopNav currentUser={currentUser} showLoginLink />
      <SignupPanel
        registerForm={form}
        userTypeOptions={userTypeOptions}
        onFieldChange={onFieldChange}
        onSubmit={handleSubmit}
        loading={loading}
        message={message}
        error={error}
      />
    </>
  )
}

export default SignupPage
