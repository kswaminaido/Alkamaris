import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SignupPanel from '../components/auth/SignupPanel'
import TopNav from '../components/layout/TopNav'
import { useAuth } from '../context/AuthContext'
import { PASSWORD_REQUIRED_USER_ROLES, USER_ROLES, isAdminRole } from '../utils/userRoles'

const DEFAULT_SIGNUP_USER_TYPE = USER_ROLES.PACKER

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
    if (!currentUser) {
      navigate('/', { replace: true })
      return
    }
    if (!isAdminRole(currentUser.role)) {
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
    setForm((previous) => {
      if (field !== 'user_type') {
        return { ...previous, [field]: value }
      }

      const nextForm = { ...previous, user_type: value }
      if (!PASSWORD_REQUIRED_USER_ROLES.includes(value)) {
        nextForm.password = ''
        nextForm.password_confirmation = ''
      }
      if (value !== USER_ROLES.PACKER) {
        nextForm.firm_name = ''
      }

      return nextForm
    })
  }

  async function handleLogout() {
    await logout()
    navigate('/', { replace: true })
  }

  const content = (
    <SignupPanel
      registerForm={form}
      userTypeOptions={userTypeOptions}
      onFieldChange={onFieldChange}
      onSubmit={handleSubmit}
      loading={loading}
      message={message}
      error={error}
    />
  )

  if (isAdminRole(currentUser?.role)) {
    return (
      <AdminSidebarLayout currentUser={currentUser} activeKey="" onLogout={handleLogout}>
        {content}
      </AdminSidebarLayout>
    )
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
