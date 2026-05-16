import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SignupPanel from '../components/auth/SignupPanel'
import TopNav from '../components/layout/TopNav'
import { useAuth } from '../context/AuthContext'

const DEFAULT_SIGNUP_USER_TYPE = 'packer'

function initialSignupForm(userType = '') {
  return {
    name: '',
    phone_number: '',
    email: '',
    address: '',
    user_type: userType,
    registration_number: '',
    password: '',
    password_confirmation: '',
  }
}

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
  const [form, setForm] = useState(() => initialSignupForm(userTypeOptions[0] ?? ''))

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
      user_type: previous.user_type || userTypeOptions[0] || DEFAULT_SIGNUP_USER_TYPE,
    }))
  }, [userTypeOptions])

  async function handleSubmit(event) {
    event.preventDefault()
    const registered = await register(form)
    if (registered) {
      setForm(initialSignupForm(userTypeOptions[0] || DEFAULT_SIGNUP_USER_TYPE))
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
