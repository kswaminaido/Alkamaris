import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminSidebarLayout from '../../components/layout/AdminSidebarLayout'
import { useAuth } from '../../context/AuthContext'

function MasterData() {
  const navigate = useNavigate()
  const { currentUser, dashboardTitle, logout, authFetch } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState(null)

  useEffect(() => {
    if (!currentUser) return
    loadUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser])

  async function loadUsers() {
    setLoading(true)
    setError('')
    try {
      const response = await authFetch('/users')
      const payload = await response.json()
      if (response.ok) {
        setUsers(payload?.data ?? [])
      } else {
        setError(payload?.message ?? 'Failed to load users')
      }
    } catch (err) {
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  async function toggleUserStatus(userId, currentStatus) {
    setUpdating(userId)
    try {
      const response = await authFetch(`/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: !currentStatus }),
      })
      if (response.ok) {
        setUsers(users.map(u => u.id === userId ? { ...u, is_active: !currentStatus } : u))
      } else {
        setError('Failed to update user status')
      }
    } catch (err) {
      setError('Failed to update user status')
    } finally {
      setUpdating(null)
    }
  }

  async function handleLogout() {
    await logout()
    navigate('/', { replace: true })
  }

  if (!currentUser) {
    return null
  }

  return (
    <AdminSidebarLayout currentUser={currentUser} title={dashboardTitle} activeKey="" onLogout={handleLogout}>
      <div className="transactions-page">
        <div className="transactions-toolbar">
          <h5>Master Data &gt; Users</h5>
        </div>

        {error && <p className="message error">{error}</p>}

        <div className="transactions-table-wrap">
          <table className="transactions-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Registration Number</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {!loading && users.length === 0 && (
                <tr><td colSpan={7}>No users found.</td></tr>
              )}
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.phone_number}</td>
                  <td>{user.role}</td>
                  <td>{user.registration_number}</td>
                  <td>
                    <span className={`status-badge ${user.is_active ? 'active' : 'inactive'}`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`status-toggle-btn ${user.is_active ? 'deactivate' : 'activate'}`}
                      onClick={() => toggleUserStatus(user.id, user.is_active)}
                      disabled={updating === user.id}
                      title={user.is_active ? 'Deactivate user' : 'Activate user'}
                    >
                      {updating === user.id ? 'Updating...' : (user.is_active ? 'Deactivate' : 'Activate')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminSidebarLayout>
  )
}

export default MasterData
