import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminSidebarLayout from '../components/layout/AdminSidebarLayout'
import { useAuth } from '../context/AuthContext'
import { BACKEND_URL } from '../config/api'
import { getUserIdentifierLabel } from '../utils/userType'

function ProfilePage() {
  const navigate = useNavigate()
  const { currentUser, logout, authFetch, syncCurrentUser } = useAuth()
  const [profileForm, setProfileForm] = useState({
    name: '',
    firm_name: '',
    phone_number: '',
    email: '',
    address: '',
    registration_number: '',
  })
  const [passwordForm, setPasswordForm] = useState({
    password: '',
    password_confirmation: '',
  })
  const [authorizationForm, setAuthorizationForm] = useState({
    signature_image: null,
    stamp_image: null,
  })
  const [profileSaving, setProfileSaving] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [authorizationSaving, setAuthorizationSaving] = useState(false)
  const [authorizationImageVersion, setAuthorizationImageVersion] = useState('')
  const [authorizationPreviewOverrides, setAuthorizationPreviewOverrides] = useState({
    signature: '',
    stamp: '',
  })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const selectedSignaturePreviewUrl = useFilePreviewDataUrl(authorizationForm.signature_image)
  const selectedStampPreviewUrl = useFilePreviewDataUrl(authorizationForm.stamp_image)
  const savedImageVersion = authorizationImageVersion || currentUser?.updated_at || ''
  const signaturePreviewUrl = selectedSignaturePreviewUrl
    || authorizationPreviewOverrides.signature
    || authorizationImageUrl(currentUser?.authorization_signature_url, savedImageVersion)
  const stampPreviewUrl = selectedStampPreviewUrl
    || authorizationPreviewOverrides.stamp
    || authorizationImageUrl(currentUser?.authorization_stamp_url, savedImageVersion)

  useEffect(() => {
    if (!currentUser) return
    setProfileForm({
      name: currentUser.name ?? '',
      firm_name: currentUser.firm_name ?? '',
      phone_number: currentUser.phone_number ?? '',
      email: currentUser.email ?? '',
      address: currentUser.address ?? '',
      registration_number: currentUser.registration_number ?? '',
    })
  }, [currentUser])

  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(''), 2200)
    return () => window.clearTimeout(timer)
  }, [toast])

  async function handleLogout() {
    await logout()
    navigate('/', { replace: true })
  }

  if (!currentUser) {
    return null
  }

  const identifierLabel = getUserIdentifierLabel(currentUser.role)
  const isPacker = currentUser.role === 'packer'

  function updateProfileField(field, value) {
    setProfileForm((previous) => ({ ...previous, [field]: value }))
  }

  function updatePasswordField(field, value) {
    setPasswordForm((previous) => ({ ...previous, [field]: value }))
  }

  function updateAuthorizationField(field, value) {
    setAuthorizationForm((previous) => ({ ...previous, [field]: value }))
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

  async function handleAuthorizationSubmit(event) {
    event.preventDefault()
    const formElement = event.currentTarget
    setAuthorizationSaving(true)
    setMessage('')
    setError('')

    const formData = new FormData()
    if (authorizationForm.signature_image) {
      formData.append('signature_image', authorizationForm.signature_image)
    }
    if (authorizationForm.stamp_image) {
      formData.append('stamp_image', authorizationForm.stamp_image)
    }

    try {
      const response = await authFetch('/auth/profile/authorization', {
        method: 'POST',
        body: formData,
        loadingLabel: 'Updating authorization images...',
      })
      const payload = await response.json()

      if (!response.ok) {
        setError(firstError(payload) ?? payload?.message ?? 'Unable to update authorization images.')
        return
      }

      const [savedSignaturePreviewUrl, savedStampPreviewUrl] = await Promise.all([
        authorizationForm.signature_image ? fileToDataUrl(authorizationForm.signature_image) : Promise.resolve(''),
        authorizationForm.stamp_image ? fileToDataUrl(authorizationForm.stamp_image) : Promise.resolve(''),
      ])

      setAuthorizationForm({
        signature_image: null,
        stamp_image: null,
      })
      formElement.reset()
      const syncedUser = payload?.data ? syncCurrentUser(payload.data) : currentUser
      setAuthorizationImageVersion(syncedUser?.updated_at ?? String(Date.now()))
      setAuthorizationPreviewOverrides((previous) => ({
        signature: authorizationForm.signature_image ? savedSignaturePreviewUrl : previous.signature,
        stamp: authorizationForm.stamp_image ? savedStampPreviewUrl : previous.stamp,
      }))
      const successMessage = payload?.message ?? 'Authorization images updated successfully.'
      setMessage(successMessage)
      setToast(successMessage)
    } catch {
      setError('Unable to update authorization images right now.')
    } finally {
      setAuthorizationSaving(false)
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

      {toast ? <div className="data-toast">{toast}</div> : null}
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

            {isPacker ? (
              <div className="register-field">
                <label htmlFor="profile-firm-name">Firm Name</label>
                <input
                  id="profile-firm-name"
                  type="text"
                  value={profileForm.firm_name}
                  onChange={(event) => updateProfileField('firm_name', event.target.value)}
                  required
                />
              </div>
            ) : null}

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

        <section className="txn-panel profile-authorization-panel">
          <div className="profile-panel-head">
            <h5>Authorization</h5>
            <p className="dashboard-footnote">Upload the signature and stamp used on account documents.</p>
          </div>

          <form className="form-grid profile-authorization-grid" onSubmit={handleAuthorizationSubmit}>
            <div className="register-field authorization-upload-field">
              <label htmlFor="authorization-signature">Signature Image</label>
              <div className="authorization-preview">
                {signaturePreviewUrl ? (
                  <img key={signaturePreviewUrl} src={signaturePreviewUrl} alt="Signature preview" />
                ) : (
                  <span>No signature uploaded</span>
                )}
              </div>
              <input
                id="authorization-signature"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => updateAuthorizationField('signature_image', event.target.files?.[0] ?? null)}
              />
            </div>

            <div className="register-field authorization-upload-field">
              <label htmlFor="authorization-stamp">Stamp Image</label>
              <div className="authorization-preview">
                {stampPreviewUrl ? (
                  <img key={stampPreviewUrl} src={stampPreviewUrl} alt="Stamp preview" />
                ) : (
                  <span>No stamp uploaded</span>
                )}
              </div>
              <input
                id="authorization-stamp"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => updateAuthorizationField('stamp_image', event.target.files?.[0] ?? null)}
              />
            </div>

            <div className="admin-form-actions profile-form-actions">
              <button type="submit" className="primary-btn" disabled={authorizationSaving}>
                {authorizationSaving ? 'Saving...' : 'Save Authorization'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </section>
  )

  return (
    <AdminSidebarLayout currentUser={currentUser} title="Profile" activeKey="" onLogout={handleLogout} authFetch={authFetch}>
      {content}
    </AdminSidebarLayout>
  )
}

function useFilePreviewDataUrl(file) {
  const [preview, setPreview] = useState({ file: null, url: '' })

  useEffect(() => {
    let isActive = true

    if (!file) {
      return undefined
    }

    fileToDataUrl(file).then((dataUrl) => {
      if (isActive) {
        setPreview({ file, url: dataUrl })
      }
    })

    return () => {
      isActive = false
    }
  }, [file])

  return preview.file === file ? preview.url : ''
}

function fileToDataUrl(file) {
  return new Promise((resolve) => {
    if (!file || typeof FileReader === 'undefined') {
      resolve('')
      return
    }

    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => resolve('')
    reader.readAsDataURL(file)
  })
}

function authorizationImageUrl(url, version) {
  if (typeof url !== 'string' || !url.trim()) return ''

  const normalizedUrl = backendAssetUrl(url)
  if (!version) return normalizedUrl

  const separator = normalizedUrl.includes('?') ? '&' : '?'
  return `${normalizedUrl}${separator}v=${encodeURIComponent(version)}`
}

function backendAssetUrl(url) {
  const trimmedUrl = url.trim()

  if (/^(?:https?:|blob:|data:)/i.test(trimmedUrl)) {
    return trimmedUrl
  }

  if (trimmedUrl.startsWith('/')) {
    return `${BACKEND_URL}${trimmedUrl}`
  }

  return `${BACKEND_URL}/${trimmedUrl.replace(/^\/+/, '')}`
}

function firstError(payload) {
  return payload?.errors ? Object.values(payload.errors)?.[0]?.[0] : null
}

export default ProfilePage
