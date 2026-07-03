import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PaginationBar from '../../components/common/PaginationBar'
import AdminSidebarLayout from '../../components/layout/AdminSidebarLayout'
import { useAuth } from '../../context/AuthContext'

function ShowIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d="M12 5c5 0 8.5 4.6 9.7 6.4.2.4.2.8 0 1.2C20.5 14.4 17 19 12 19s-8.5-4.6-9.7-6.4a1.1 1.1 0 0 1 0-1.2C3.5 9.6 7 5 12 5zm0 2c-3.5 0-6.2 3-7.6 5 1.4 2 4.1 5 7.6 5s6.2-3 7.6-5C18.2 10 15.5 7 12 7zm0 2.2a2.8 2.8 0 1 1 0 5.6 2.8 2.8 0 0 1 0-5.6z"
        fill="currentColor"
      />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d="M4 16.5V20h3.5L18 9.5 14.5 6 4 16.5zM19.7 7.8c.4-.4.4-1 0-1.4l-2.1-2.1c-.4-.4-1-.4-1.4 0L14.8 5.7 18.3 9.2l1.4-1.4z"
        fill="currentColor"
      />
    </svg>
  )
}

function StatusIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d={active
          ? 'M7 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm2.4 5.2L8 11.6l3.1 3.1L16.7 9l-1.4-1.4-4.2 4.2-1.7-1.6z'
          : 'M7 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm2.7 3.3L8.3 9.7 10.6 12l-2.3 2.3 1.4 1.4 2.3-2.3 2.3 2.3 1.4-1.4-2.3-2.3 2.3-2.3-1.4-1.4-2.3 2.3-2.3-2.3z'}
        fill="currentColor"
      />
    </svg>
  )
}

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
  const [viewingUser, setViewingUser] = useState(null)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [bulkFile, setBulkFile] = useState(null)
  const [bulkUploading, setBulkUploading] = useState(false)
  const [bulkSampleDownloading, setBulkSampleDownloading] = useState(false)
  const [bulkError, setBulkError] = useState('')
  const [bulkSummary, setBulkSummary] = useState(null)

  useEffect(() => {
    if (!currentUser) return
    // Require min 3 characters for free-text name filter before calling API
    const nameVal = (searchFilters.name ?? '').trim()
    if (nameVal !== '' && nameVal.length < 4) return

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
    if (currentUser?.role !== 'admin') return
    setError('')
    setEditingUser({ ...user, password: '', password_confirmation: '' })
    setShowEditModal(true)
  }

  function openDetailsModal(user) {
    setViewingUser(user)
  }

  function closeEditModal() {
    setShowEditModal(false)
    setEditingUser(null)
  }

  function closeDetailsModal() {
    setViewingUser(null)
  }

  function openBulkModal() {
    setBulkFile(null)
    setBulkError('')
    setBulkSummary(null)
    setShowBulkModal(true)
  }

  function closeBulkModal() {
    if (bulkUploading) return
    setShowBulkModal(false)
    setBulkFile(null)
    setBulkError('')
    setBulkSummary(null)
  }

  async function submitBulkUpload(event) {
    event.preventDefault()
    if (currentUser?.role !== 'admin') return
    if (!bulkFile) {
      setBulkError('Please choose a CSV or XLSX file.')
      return
    }

    const formData = new FormData()
    formData.append('file', bulkFile)

    setBulkUploading(true)
    setBulkError('')
    setBulkSummary(null)
    try {
      const response = await authFetch('/users/bulk', {
        method: 'POST',
        body: formData,
        loadingLabel: 'Creating users...',
      })
      const body = await response.json().catch(() => null)
      if (response.ok) {
        setBulkSummary(body?.data ?? null)
        setBulkFile(null)
        await loadUsers(searchFilters, page)
      } else {
        const firstValidationMessage = body?.errors ? Object.values(body.errors)?.[0]?.[0] : null
        setBulkError(firstValidationMessage ?? body?.message ?? 'Bulk user creation failed.')
      }
    } catch {
      setBulkError('Bulk user creation failed.')
    } finally {
      setBulkUploading(false)
    }
  }

  async function downloadSampleCsv() {
    if (currentUser?.role !== 'admin' || bulkSampleDownloading) return

    setBulkSampleDownloading(true)
    setBulkError('')
    try {
      const response = await authFetch('/users/bulk/sample-template', {
        headers: { Accept: 'text/csv' },
        loadingLabel: 'Downloading sample CSV...',
      })

      if (!response.ok) {
        setBulkError('Unable to download the sample CSV.')
        return
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'sample_user_creation_template.csv'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch {
      setBulkError('Unable to download the sample CSV.')
    } finally {
      setBulkSampleDownloading(false)
    }
  }

  async function saveUserChanges() {
    if (currentUser?.role !== 'admin') return
    if (!editingUser) return

    setError('')
    const nextPassword = editingUser.password ?? ''
    const nextPasswordConfirmation = editingUser.password_confirmation ?? ''
    if (nextPassword || nextPasswordConfirmation) {
      if (nextPassword.length < 8) {
        setError('Password must be at least 8 characters.')
        return
      }
      if (nextPassword !== nextPasswordConfirmation) {
        setError('Password confirmation does not match.')
        return
      }
    }

    const payload = {
      name: editingUser.name,
      contact_name: editingUser.contact_name,
      email: editingUser.email,
      phone_number: editingUser.phone_number,
      address: editingUser.address,
      user_type: editingUser.role,
      is_active: editingUser.is_active,
    }
    if (nextPassword) {
      payload.password = nextPassword
      payload.password_confirmation = nextPasswordConfirmation
    }

    setUpdating(editingUser.id)
    try {
      const response = await authFetch(`/users/${editingUser.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
      const body = await response.json().catch(() => null)
      if (response.ok) {
        const updatedUser = body?.data ?? editingUser
        setUsers(users.map(u => u.id === editingUser.id ? updatedUser : u))
        closeEditModal()
      } else {
        const firstValidationMessage = body?.errors ? Object.values(body.errors)?.[0]?.[0] : null
        setError(firstValidationMessage ?? body?.message ?? 'Failed to update user')
      }
    } catch {
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
    } catch {
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  async function toggleUserStatus(userId, currentStatus) {
    if (currentUser?.role !== 'admin') return
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
    } catch {
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

  const isAdmin = currentUser.role === 'admin'
  const canAddUsers = ['admin', 'logistics'].includes(currentUser.role)
  const tableColumnCount = isAdmin ? 6 : 5
  const currentPage = pagination.current_page ?? page
  const lastPage = Math.max(1, pagination.last_page ?? 1)
  const totalRecords = pagination.total ?? 0

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
                  <option value="admin">Admin</option>
                  <option value="sales">Sales</option>
                  <option value="packer">Packer</option>
                  <option value="logistics">Logistics</option>
                  <option value="accounts">Accounts</option>
                  <option value="customer">Customer</option>
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

          {canAddUsers && (
            <div className="master-toolbar-actions">
              {isAdmin ? (
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={openBulkModal}
                  title="Create users from CSV or XLSX"
                >
                  Bulk User Creation
                </button>
              ) : null}
              <button
                type="button"
                className="primary-btn"
                onClick={() => navigate('/signup')}
                title="Add new user"
              >
                Add User
              </button>
            </div>
          )}
        </div>

        {error && <p className="message error">{error}</p>}

        <PaginationBar
          currentPage={currentPage}
          lastPage={lastPage}
          totalRecords={totalRecords}
          onPageChange={handlePageChange}
          disabled={loading}
        />

        <div className="transactions-table-wrap">
          <table className="transactions-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Status</th>
                {isAdmin ? <th>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={tableColumnCount} className="loading-row">Loading users...</td></tr>
              )}
              {!loading && users.length === 0 && (
                <tr><td colSpan={tableColumnCount}>No users found.</td></tr>
              )}
              {!loading && users.map((user) => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.phone_number}</td>
                  <td>{formatRole(user.role)}</td>
                  <td>
                    <span className={`status-badge ${user.is_active ? 'active' : 'inactive'}`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  {isAdmin ? (
                    <td>
                      <div className="action-buttons">
                        <button
                          type="button"
                          className="icon-btn show"
                          onClick={() => openDetailsModal(user)}
                          title="Show user details"
                          aria-label={`Show details for ${user.name}`}
                        >
                          <ShowIcon />
                        </button>
                        <button
                          type="button"
                          className="icon-btn edit"
                          onClick={() => openEditModal(user)}
                          title="Edit user"
                          aria-label={`Edit ${user.name}`}
                        >
                          <EditIcon />
                        </button>
                        <button
                          type="button"
                          className={`icon-btn ${user.is_active ? 'deactivate' : 'activate'}`}
                          onClick={() => toggleUserStatus(user.id, user.is_active)}
                          disabled={updating === user.id}
                          title={user.is_active ? 'Deactivate user' : 'Activate user'}
                          aria-label={user.is_active ? `Deactivate ${user.name}` : `Activate ${user.name}`}
                        >
                          <StatusIcon active={user.is_active} />
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <PaginationBar
          currentPage={currentPage}
          lastPage={lastPage}
          totalRecords={totalRecords}
          onPageChange={handlePageChange}
          disabled={loading}
          className="compact-pagination-bottom"
        />

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
                <DetailItem label="Email" value={viewingUser.email} />
                <DetailItem label="Phone" value={viewingUser.phone_number} />
                <DetailItem label="Role" value={formatRole(viewingUser.role)} />
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

        {isAdmin && showBulkModal && (
          <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Bulk user creation">
            <div className="modal-content p-4 bulk-user-modal">
              <div className="modal-header p-0">
                <h3>Bulk User Creation</h3>
                <button type="button" className="close-btn" onClick={closeBulkModal} disabled={bulkUploading}>x</button>
              </div>
              <form className="bulk-user-form" onSubmit={submitBulkUpload}>
                <div className="bulk-upload-panel">
                  <div className="bulk-template-panel">
                    <span className="bulk-panel-label">Template</span>
                    <h4>Start with the sample CSV</h4>
                    <p>Use the sample file to keep column names and user details in the expected order.</p>
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={downloadSampleCsv}
                      disabled={bulkUploading || bulkSampleDownloading}
                    >
                      {bulkSampleDownloading ? 'Downloading...' : 'Download Sample CSV'}
                    </button>
                  </div>

                  <div className="bulk-file-panel">
                    <span className="bulk-panel-label">Upload</span>
                    <div className="form-group bulk-file-input">
                      <label htmlFor="bulk-user-file">Select CSV or XLSX file</label>
                      <input
                        id="bulk-user-file"
                        type="file"
                        accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        onChange={(event) => {
                          setBulkError('')
                          setBulkSummary(null)
                          setBulkFile(event.target.files?.[0] ?? null)
                        }}
                      />
                    </div>
                    <div className="bulk-selected-file">
                      <span>Selected file</span>
                      <strong>{bulkFile?.name ?? 'No file selected'}</strong>
                    </div>
                  </div>
                </div>

                {bulkError && <p className="message error">{bulkError}</p>}

                {bulkSummary && (
                  <div className="bulk-summary">
                    <div className="bulk-summary-stats">
                      <DetailItem label="Total Records Processed" value={bulkSummary.total_records} />
                      <DetailItem label="Successfully Created Users" value={bulkSummary.successful_users} />
                      <DetailItem label="Failed Users" value={bulkSummary.failed_users?.length ?? 0} />
                    </div>

                    {(bulkSummary.failed_users?.length ?? 0) > 0 && (
                      <div className="bulk-failures">
                        <strong>Failed users</strong>
                        <PaginationBar totalRecords={bulkSummary.failed_users.length} />
                        <div className="transactions-table-wrap">
                          <table className="transactions-table">
                            <thead>
                              <tr>
                                <th>Row</th>
                                <th>Email</th>
                                <th>Reason</th>
                              </tr>
                            </thead>
                            <tbody>
                              {bulkSummary.failed_users.map((failure, index) => (
                                <tr key={`${failure.row}-${failure.email || index}`}>
                                  <td>{failure.row}</td>
                                  <td>{failure.email || '-'}</td>
                                  <td>{failure.reason || 'Unable to create user.'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <PaginationBar totalRecords={bulkSummary.failed_users.length} className="compact-pagination-bottom" />
                      </div>
                    )}
                  </div>
                )}

                <div className="modal-footer">
                  <button type="button" className="secondary-btn" onClick={closeBulkModal} disabled={bulkUploading}>Close</button>
                  <button type="submit" className="primary-btn" disabled={bulkUploading || !bulkFile}>
                    {bulkUploading ? 'Creating...' : 'Create Users'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isAdmin && showEditModal && editingUser && (
          <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Edit user">
            <div className="modal-content p-4">
              <div className="modal-header p-0">
                <h3>Edit User</h3>
                <button type="button" className="close-btn" onClick={closeEditModal}>x</button>
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
                  <label htmlFor="edit-role">Role:</label>
                  <select
                    id="edit-role"
                    value={editingUser.role || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  >
                    <option value="admin">Admin</option>
                    <option value="sales">Sales</option>
                    <option value="packer">Packer</option>
                    <option value="logistics">Logistics</option>
                    <option value="accounts">Accounts</option>
                    <option value="customer">Customer</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="edit-status">Status:</label>
                  <select
                    id="edit-status"
                    value={editingUser.is_active ? 'active' : 'inactive'}
                    onChange={(e) => setEditingUser({ ...editingUser, is_active: e.target.value === 'active' })}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="edit-password">New Password:</label>
                  <input
                    id="edit-password"
                    type="password"
                    value={editingUser.password || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                    autoComplete="new-password"
                    minLength={8}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="edit-password-confirmation">Confirm New Password:</label>
                  <input
                    id="edit-password-confirmation"
                    type="password"
                    value={editingUser.password_confirmation || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, password_confirmation: e.target.value })}
                    autoComplete="new-password"
                    minLength={8}
                  />
                </div>
                <div className="user-edit-meta">
                  <DetailItem label="ID" value={editingUser.id} />
                  <DetailItem label="Created At" value={formatDateTime(editingUser.created_at)} />
                  <DetailItem label="Updated At" value={formatDateTime(editingUser.updated_at)} />
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

function formatRole(role) {
  if (role === 'packer' || role === 'vendor') return 'Packer'
  if (!role) return ''
  return role.charAt(0).toUpperCase() + role.slice(1)
}

function DetailItem({ label, value, wide = false }) {
  return (
    <div className={`user-detail-item ${wide ? 'wide' : ''}`}>
      <span>{label}</span>
      <strong>{value || '-'}</strong>
    </div>
  )
}

function formatDateTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleString()
}
