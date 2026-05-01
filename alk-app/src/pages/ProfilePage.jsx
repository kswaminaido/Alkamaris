import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminSidebarLayout from '../components/layout/AdminSidebarLayout'
import TopNav from '../components/layout/TopNav'
import { useAuth } from '../context/AuthContext'
import { getUserIdentifierLabel } from '../utils/userType'

function ProfilePage() {
  const navigate = useNavigate()
  const { currentUser, logout, authFetch, syncCurrentUser } = useAuth()
  const [profileForm, setProfileForm] = useState({
    name: '',
    phone_number: '',
    email: '',
    address: '',
    registration_number: '',
  })
  const [passwordForm, setPasswordForm] = useState({
    password: '',
    password_confirmation: '',
  })
  const [profileSaving, setProfileSaving] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!currentUser) return
    setProfileForm({
      name: currentUser.name ?? '',
      phone_number: currentUser.phone_number ?? '',
      email: currentUser.email ?? '',
      address: currentUser.address ?? '',
      registration_number: currentUser.registration_number ?? '',
    })
  }, [currentUser])

  async function handleLogout() {
    await logout()
    navigate('/', { replace: true })
  }

  if (!currentUser) {
    return null
  }

  const identifierLabel = getUserIdentifierLabel(currentUser.role)

  function updateProfileField(field, value) {
    setProfileForm((previous) => ({ ...previous, [field]: value }))
  }

  function updatePasswordField(field, value) {
    setPasswordForm((previous) => ({ ...previous, [field]: value }))
  }

  async function handleProfileSubmit(event) {
    event.preventDefault()
    setProfileSaving(true)
    setMessage('')
    setError('')

    try {
      const response = await authFetch('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify(profileForm),
        loadingLabel: 'Updating profile...',
      })
      const payload = await response.json()

      if (!response.ok) {
        setError(firstError(payload) ?? payload?.message ?? 'Unable to update profile.')
        return
      }

      syncCurrentUser(payload?.data ?? null)
      setMessage(payload?.message ?? 'Profile updated successfully.')
    } catch {
      setError('Unable to update profile right now.')
    } finally {
      setProfileSaving(false)
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault()
    setPasswordSaving(true)
    setMessage('')
    setError('')

    try {
      const response = await authFetch('/auth/password', {
        method: 'PATCH',
        body: JSON.stringify(passwordForm),
        loadingLabel: 'Updating password...',
      })
      const payload = await response.json()

      if (!response.ok) {
        setError(firstError(payload) ?? payload?.message ?? 'Unable to update password.')
        return
      }

      setPasswordForm({
        password: '',
        password_confirmation: '',
      })
      setMessage(payload?.message ?? 'Password updated successfully.')
    } catch {
      setError('Unable to update password right now.')
    } finally {
      setPasswordSaving(false)
    }
  }

  const content = (
    <section className="transaction-page profile-app-page">
      <section className="txn-panel txn-top profile-summary-panel">
        <div className="profile-summary-copy">
          <h5>My Profile</h5>
          <p className="dashboard-footnote">
            Manage your account details and keep your password up to date.
          </p>
        </div>
      </section>

      {message ? <p className="message success">{message}</p> : null}
      {error ? <p className="message error">{error}</p> : null}

      <div className="profile-content-grid">
        <section className="txn-panel profile-password-panel">
          <div className="profile-panel-head">
            <h5>Profile Details</h5>
            <p className="dashboard-footnote">Update the personal information shown across the app.</p>
          </div>

          <form className="form-grid register-grid profile-form-grid" onSubmit={handleProfileSubmit}>
            <div className="register-field">
              <label htmlFor="profile-name">Name</label>
              <input
                id="profile-name"
                type="text"
                value={profileForm.name}
                onChange={(event) => updateProfileField('name', event.target.value)}
                required
              />
            </div>

            <div className="register-field">
              <label htmlFor="profile-phone">Phone Number</label>
              <input
                id="profile-phone"
                type="text"
                value={profileForm.phone_number}
                onChange={(event) => updateProfileField('phone_number', event.target.value)}
                required
              />
            </div>

            <div className="register-field">
              <label htmlFor="profile-email">Email</label>
              <input
                id="profile-email"
                type="email"
                value={profileForm.email}
                onChange={(event) => updateProfileField('email', event.target.value)}
                required
              />
            </div>

            <div className="register-field">
              <label htmlFor="profile-registration">{identifierLabel}</label>
              <input
                id="profile-registration"
                type="text"
                value={profileForm.registration_number}
                onChange={(event) => updateProfileField('registration_number', event.target.value)}
                required
              />
            </div>

            <div className="register-field profile-address-field">
              <label htmlFor="profile-address">Address</label>
              <textarea
                id="profile-address"
                value={profileForm.address}
                onChange={(event) => updateProfileField('address', event.target.value)}
                required
              />
            </div>

            <div className="admin-form-actions profile-form-actions">
              <button type="submit" className="primary-btn" disabled={profileSaving}>
                {profileSaving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </section>

        <section className="txn-panel">
          <div className="profile-panel-head">
            <h5>Update Password</h5>
            <p className="dashboard-footnote">Set a new password for your account.</p>
          </div>

          <form className="form-grid profile-password-grid" onSubmit={handlePasswordSubmit}>
            <div className="register-field">
              <label htmlFor="new-password">New Password</label>
              <input
                id="new-password"
                type="password"
                value={passwordForm.password}
                onChange={(event) => updatePasswordField('password', event.target.value)}
                required
              />
            </div>

            <div className="register-field">
              <label htmlFor="confirm-password">Confirm New Password</label>
              <input
                id="confirm-password"
                type="password"
                value={passwordForm.password_confirmation}
                onChange={(event) => updatePasswordField('password_confirmation', event.target.value)}
                required
              />
            </div>

            <div className="admin-form-actions profile-form-actions">
              <button type="submit" className="primary-btn" disabled={passwordSaving}>
                {passwordSaving ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </section>
  )

  if (currentUser.role === 'admin') {
    return (
      <AdminSidebarLayout currentUser={currentUser} title="Profile" activeKey="" onLogout={handleLogout} authFetch={authFetch}>
        {content}
      </AdminSidebarLayout>
    )
  }

  return (
    <>
      <TopNav currentUser={currentUser} onLogout={handleLogout} />
      <section className="dashboard-wrap">
        {content}
      </section>
    </>
  )
}

function formatRole(role) {
  if (typeof role !== 'string' || !role.trim()) return 'User'
  return role
    .trim()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function firstError(payload) {
  return payload?.errors ? Object.values(payload.errors)?.[0]?.[0] : null
}

export default ProfilePage
