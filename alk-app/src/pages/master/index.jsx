import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminSidebarLayout from '../../components/layout/AdminSidebarLayout'
import { useAuth } from '../../context/AuthContext'
import { MASTER_ROLE_OPTIONS, displayUserRole, isAdminRole, isPackerRole } from '../../utils/userRoles'

function MasterData() {
  const navigate = useNavigate()
  const { currentUser, dashboardTitle, logout, authFetch } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState(null)
  const [searchFilters, setSearchFilters] = useState({
    name: '',
    role: '',
    fromDate: '',
    toDate: ''
  })
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, per_page: 20, total: 0 })
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)

  useEffect(() => {
    if (!currentUser) return
    loadUsers(searchFilters, page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, searchFilters, page])

  function handleFilterChange(key, value) {
    setSearchFilters(prev => ({ ...prev, [key]: value }))
    setPage(1) // Reset to first page when filters change
  }

  function handlePageChange(newPage) {
    setPage(newPage)
  }

  function openEditModal(user) {
    if (!isAdminRole(currentUser?.role)) return
    setEditingUser({ ...user })
    setShowEditModal(true)
  }

  function closeEditModal() {
    setShowEditModal(false)
    setEditingUser(null)
  }

  async function saveUserChanges() {
    if (!isAdminRole(currentUser?.role)) return
    if (!editingUser) return
    setUpdating(editingUser.id)
    try {
      const response = await authFetch(`/users/${editingUser.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editingUser.name,
          phone_number: editingUser.phone_number,
          address: editingUser.address,
          registration_number: editingUser.registration_number,
          user_type: editingUser.role,
        }),
      })
      if (response.ok) {
        setUsers(users.map(u => u.id === editingUser.id ? editingUser : u))
        closeEditModal()
      } else {
        setError('Failed to update user')
      }
    } catch (err) {
      setError('Failed to update user')
    } finally {
      setUpdating(null)
    }
  }

  async function loadUsers(filters = {}, targetPage = 1) {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      params.append('page', targetPage)
      params.append('per_page', 20)
      if (filters.name) params.append('name', filters.name)
      if (filters.role) params.append('role', filters.role)
      if (filters.fromDate) params.append('from_date', filters.fromDate)
      if (filters.toDate) params.append('to_date', filters.toDate)
      
      const queryString = params.toString()
      const url = `/users?${queryString}`
      
      const response = await authFetch(url)
      const payload = await response.json()
      if (response.ok) {
        setUsers(payload?.data ?? [])
        setPagination(payload?.pagination ?? { current_page: 1, last_page: 1, per_page: 20, total: 0 })
        setPage(targetPage)
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
    if (!isAdminRole(currentUser?.role)) return
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

  const isAdmin = isAdminRole(currentUser.role)
  const tableColumnCount = isAdmin ? 7 : 6

  return (
    <AdminSidebarLayout currentUser={currentUser} title={dashboardTitle} activeKey="" onLogout={handleLogout} authFetch={authFetch}>
      <div className="transactions-page">
        <div className="transactions-toolbar">
          <div>
            <h5>Master Data &gt; Users</h5>
            
            <div className="search-filters">
              <div className="filter-group">
                <label htmlFor="name-filter">Name:</label>
                <input
                  id="name-filter"
                  type="text"
                  value={searchFilters.name}
                  onChange={(e) => handleFilterChange('name', e.target.value)}
                  placeholder="Search by name"
                />
              </div>
              
              <div className="filter-group">
                <label htmlFor="role-filter">Role:</label>
                <select
                  id="role-filter"
                  value={searchFilters.role}
                  onChange={(e) => handleFilterChange('role', e.target.value)}
                >
                  <option value="">All Roles</option>
                  {MASTER_ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              
              <div className="filter-group">
                <label htmlFor="from-date-filter">From Date:</label>
                <input
                  id="from-date-filter"
                  type="date"
                  value={searchFilters.fromDate}
                  onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                />
              </div>
              
              <div className="filter-group">
                <label htmlFor="to-date-filter">To Date:</label>
                <input
                  id="to-date-filter"
                  type="date"
                  value={searchFilters.toDate}
                  onChange={(e) => handleFilterChange('toDate', e.target.value)}
                />
              </div>
            </div>
          </div>

          <button 
            type="button"
            className="primary-btn"
            onClick={() => navigate('/signup')}
            title="Add new user"
          >
            + Add User
          </button>
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
              {loading && (
                <tr><td colSpan={7} className="loading-row">Loading users...</td></tr>
              )}
              {!loading && users.length === 0 && (
                <tr><td colSpan={7}>No users found.</td></tr>
              )}
              {!loading && users.map((user) => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.phone_number}</td>
                  <td>{displayUserRole(user.role)}</td>
                  <td>{displayRegistrationNumber(user)}</td>
                  <td>
                    <span className={`status-badge ${user.is_active ? 'active' : 'inactive'}`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        type="button"
                        className="edit-btn"
                        onClick={() => openEditModal(user)}
                        title="Edit user"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className={`status-toggle-btn ${user.is_active ? 'deactivate' : 'activate'}`}
                        onClick={() => toggleUserStatus(user.id, user.is_active)}
                        disabled={updating === user.id}
                        title={user.is_active ? 'Deactivate user' : 'Activate user'}
                      >
                        {updating === user.id ? 'Updating...' : (user.is_active ? 'Deactivate' : 'Activate')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="transactions-pagination">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => handlePageChange(page - 1)}
          >
            Previous
          </button>
          <span>Page {pagination.current_page} of {pagination.last_page} ({pagination.total} total)</span>
          <button
            type="button"
            disabled={page >= pagination.last_page}
            onClick={() => handlePageChange(page + 1)}
          >
            Next
          </button>
        </div>

        {viewingUser && (
          <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="User details">
            <div className="modal-content p-4 user-detail-modal">
              <div className="modal-header p-0">
                <h3>User Details</h3>
                <button type="button" className="close-btn" onClick={closeDetailsModal}>x</button>
              </div>
              <div className="modal-body user-detail-grid">
                <DetailItem label="ID" value={viewingUser.id} />
                <DetailItem label="Name" value={viewingUser.name} />
                <DetailItem label="Contact Name" value={viewingUser.contact_name} />
                <DetailItem label="Firm Name" value={viewingUser.firm_name} />
                <DetailItem label="Email" value={viewingUser.email} />
                <DetailItem label="Phone" value={viewingUser.phone_number} />
                <DetailItem label="Role" value={displayUserRole(viewingUser.role)} />
                <DetailItem label="Registration Number" value={displayRegistrationNumber(viewingUser)} />
                <DetailItem label="Status" value={viewingUser.is_active ? 'Active' : 'Inactive'} />
                <DetailItem label="Address" value={viewingUser.address} wide />
                <DetailItem label="Created At" value={formatDateTime(viewingUser.created_at)} />
                <DetailItem label="Updated At" value={formatDateTime(viewingUser.updated_at)} />
              </div>
              <div className="modal-footer">
                <button type="button" className="secondary-btn" onClick={closeDetailsModal}>Close</button>
                {isAdmin ? (
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={() => {
                      closeDetailsModal()
                      openEditModal(viewingUser)
                    }}
                  >
                    Edit User
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {isAdmin && showEditModal && editingUser && (
          <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Edit user">
            <div className="modal-content p-4">
              <div className="modal-header p-0">
                <h3>Edit User</h3>
                <button type="button" className="close-btn" onClick={closeEditModal}>×</button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="edit-name">Name:</label>
                  <input
                    id="edit-name"
                    type="text"
                    value={editingUser.name || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="edit-contact-name">Contact Name:</label>
                  <input
                    id="edit-contact-name"
                    type="text"
                    value={editingUser.contact_name || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, contact_name: e.target.value })}
                  />
                </div>
                {isPackerRole(editingUser.role) && (
                  <div className="form-group">
                    <label htmlFor="edit-firm-name">Firm Name:</label>
                    <input
                      id="edit-firm-name"
                      type="text"
                      value={editingUser.firm_name || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, firm_name: e.target.value })}
                    />
                  </div>
                )}
                <div className="form-group">
                  <label htmlFor="edit-email">Email:</label>
                  <input
                    id="edit-email"
                    type="email"
                    value={editingUser.email || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="edit-phone">Phone:</label>
                  <input
                    id="edit-phone"
                    type="text"
                    value={editingUser.phone_number || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, phone_number: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="edit-address">Address:</label>
                  <input
                    id="edit-address"
                    type="text"
                    value={editingUser.address || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, address: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="edit-reg-number">Registration Number:</label>
                  <input
                    id="edit-reg-number"
                    type="text"
                    value={editingUser.registration_number || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, registration_number: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="edit-role">Role:</label>
                  <select
                    id="edit-role"
                    value={editingUser.role || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  >
                    {MASTER_ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="secondary-btn" onClick={closeEditModal}>Cancel</button> &nbsp; &nbsp;
                <button type="button" className="save-btn primary-btn" onClick={saveUserChanges} disabled={updating === editingUser.id}>
                  {updating === editingUser.id ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminSidebarLayout>
  )
}

export default MasterData

function displayRegistrationNumber(user) {
  if (isPackerRole(user?.role) && user?.firm_name) {
    return user.firm_name
  }

  return user?.registration_number
} 

function formatDateTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleString()
}

function DetailItem({ label, value, wide = false }) {
  return (
    <div className={`user-detail-item ${wide ? 'wide' : ''}`}>
      <span>{label}</span>
      <strong>{value || '-'}</strong>
    </div>
  )
}
