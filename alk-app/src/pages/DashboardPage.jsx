import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminUsersPanel from '../components/admin/AdminUsersPanel'
import DashboardPanel from '../components/dashboard/DashboardPanel'
import TopNav from '../components/layout/TopNav'
import { useAuth } from '../context/AuthContext'

const defaultAdminForm = {
  name: '',
  phone_number: '',
  email: '',
  address: '',
  user_type: 'sales',
  registration_number: '',
  password: '',
  password_confirmation: '',
}

function DashboardPage() {
  const navigate = useNavigate()
  const { currentUser, dashboardTitle, logout, authFetch, userTypeOptions } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [editingUserId, setEditingUserId] = useState(null)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [deleteCandidate, setDeleteCandidate] = useState(null)
  const [form, setForm] = useState({
    ...defaultAdminForm,
    user_type: userTypeOptions[0] ?? 'sales',
  })

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      loadUsers()
    }
  }, [currentUser])

  useEffect(() => {
    setForm((previous) => ({
      ...previous,
      user_type: previous.user_type || userTypeOptions[0] || 'sales',
    }))
  }, [userTypeOptions])

  async function handleLogout() {
    await logout()
    navigate('/', { replace: true })
  }

  function onFieldChange(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }))
  }

  async function loadUsers() {
    setLoading(true)
    setError('')
    try {
      const response = await authFetch('/users')
      const payload = await response.json()
      if (!response.ok) {
        setError(payload?.message ?? 'Unable to load users.')
        return
      }
      setUsers(payload?.data ?? [])
    } catch {
      setError('Unable to load users.')
    } finally {
      setLoading(false)
    }
  }

  function startEdit(user) {
    setEditingUserId(user.id)
    setMessage('')
    setError('')
    setIsFormModalOpen(true)
    setForm({
      name: user.name ?? '',
      phone_number: user.phone_number ?? '',
      email: user.email ?? '',
      address: user.address ?? '',
      user_type: user.role ?? userTypeOptions[0] ?? 'sales',
      registration_number: user.registration_number ?? '',
      password: '',
      password_confirmation: '',
    })
  }

  function cancelEdit() {
    setEditingUserId(null)
    setIsFormModalOpen(false)
    setForm({
      ...defaultAdminForm,
      user_type: userTypeOptions[0] ?? 'sales',
    })
  }

  function openCreateModal() {
    setMessage('')
    setError('')
    setEditingUserId(null)
    setForm({
      ...defaultAdminForm,
      user_type: userTypeOptions[0] ?? 'sales',
    })
    setIsFormModalOpen(true)
  }

  async function saveUser(event) {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')

    if (form.password !== form.password_confirmation) {
      setError('Password and confirm password must match.')
      setSaving(false)
      return
    }

    const payload = {
      name: form.name,
      phone_number: form.phone_number,
      email: form.email,
      address: form.address,
      user_type: form.user_type,
      registration_number: form.registration_number,
      ...(form.password ? { password: form.password } : {}),
    }

    try {
      const isUpdate = Boolean(editingUserId)
      const response = await authFetch(isUpdate ? `/users/${editingUserId}` : '/users', {
        method: isUpdate ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      })
      const body = await response.json()
      if (!response.ok) {
        const firstValidationMessage = body?.errors ? Object.values(body.errors)?.[0]?.[0] : null
        setError(firstValidationMessage ?? body?.message ?? 'Unable to save user.')
        return
      }

      setMessage(isUpdate ? 'User updated successfully.' : 'User created successfully.')
      cancelEdit()
      await loadUsers()
    } catch {
      setError('Unable to save user.')
    } finally {
      setSaving(false)
    }
  }

  function requestDeleteUser(user) {
    setDeleteCandidate(user)
  }

  function cancelDeleteUser() {
    setDeleteCandidate(null)
  }

  async function confirmDeleteUser() {
    if (!deleteCandidate?.id) return
    const userId = deleteCandidate.id
    setMessage('')
    setError('')
    try {
      const response = await authFetch(`/users/${userId}`, { method: 'DELETE' })
      const payload = await response.json()
      if (!response.ok) {
        setError(payload?.message ?? 'Unable to delete user.')
        return
      }
      setMessage('User deleted successfully.')
      if (editingUserId === userId) {
        cancelEdit()
      }
      setDeleteCandidate(null)
      await loadUsers()
    } catch {
      setError('Unable to delete user.')
    }
  }

  if (!currentUser) {
    return null
  }

  return (
    <>
      {currentUser.role === 'admin' ? (
        <AdminUsersPanel
          currentUser={currentUser}
          onLogout={handleLogout}
          form={form}
          userTypeOptions={userTypeOptions}
          users={users}
          loading={loading}
          saving={saving}
          message={message}
          error={error}
          editingUserId={editingUserId}
          isFormModalOpen={isFormModalOpen}
          deleteCandidate={deleteCandidate}
          onOpenCreateModal={openCreateModal}
          onOpenEditModal={startEdit}
          onCloseFormModal={cancelEdit}
          onFieldChange={onFieldChange}
          onSubmit={saveUser}
          onRequestDelete={requestDeleteUser}
          onCancelDelete={cancelDeleteUser}
          onConfirmDelete={confirmDeleteUser}
        />
      ) : (
        <>
          <TopNav currentUser={currentUser} onLogout={handleLogout} />
          <DashboardPanel currentUser={currentUser} dashboardTitle={dashboardTitle} />
        </>
      )}
    </>
  )
}

export default DashboardPage
