import { useMemo, useState } from 'react'

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
      <path
        d="M4 16.5V20h3.5L18 9.5 14.5 6 4 16.5zM19.7 7.8c.4-.4.4-1 0-1.4l-2.1-2.1c-.4-.4-1-.4-1.4 0L14.8 5.7 18.3 9.2l1.4-1.4z"
        fill="currentColor"
      />
    </svg>
  )
}

function DeleteIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
      <path
        d="M7 21c-.6 0-1-.4-1-1V7h12v13c0 .6-.4 1-1 1H7zm3-3h2V10h-2v8zm4 0h2V10h-2v8zM15 4l-1-1h-4L9 4H5v2h14V4h-4z"
        fill="currentColor"
      />
    </svg>
  )
}

function AdminUsersPanel({
  currentUser,
  onLogout,
  form,
  userTypeOptions,
  users,
  loading,
  saving,
  message,
  error,
  editingUserId,
  isFormModalOpen,
  deleteCandidate,
  onOpenCreateModal,
  onOpenEditModal,
  onCloseFormModal,
  onFieldChange,
  onSubmit,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
}) {
  const [activeSection, setActiveSection] = useState('users')
  const menuItems = useMemo(() => [{ id: 'users', label: 'Users' }], [])

  return (
    <section className="admin-shell">
      <aside className="admin-side-nav">
        <div className="admin-side-brand">
          <span className="brand-badge">A</span>
          <span>Alkamaris</span>
        </div>

        <nav className="admin-side-menu">
          {menuItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`admin-side-item ${activeSection === item.id ? 'active' : ''}`}
              onClick={() => setActiveSection(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="admin-main-content">
        <div className="admin-main-header">
          <h2>User Management</h2>
          <div className="admin-user-chip">
            <span>{currentUser?.name ?? 'Admin'}</span>
            <button type="button" className="admin-logout-btn" onClick={onLogout}>
              Logout
            </button>
          </div>
        </div>

        {activeSection === 'users' && (
          <article className="dashboard-panel admin-main">
            <div className="users-toolbar">
              <h3>All Users</h3>
              <button type="button" className="primary-btn create-user-btn" onClick={onOpenCreateModal}>
                Create User
              </button>
            </div>

            {message && <p className="message success">{message}</p>}
            {error && <p className="message error">{error}</p>}

            <div className="admin-users-list">
              {loading && <p>Loading users...</p>}
              {!loading && (
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Role</th>
                      <th>Reg. No.</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td>{user.name}</td>
                        <td>{user.email}</td>
                        <td>{user.phone_number}</td>
                        <td>{user.role}</td>
                        <td>{user.registration_number}</td>
                        <td>
                          <div className="users-actions">
                            <button
                              type="button"
                              className="icon-btn edit"
                              title="Edit user"
                              onClick={() => onOpenEditModal(user)}
                            >
                              <EditIcon />
                            </button>
                            <button
                              type="button"
                              className="icon-btn delete"
                              title="Delete user"
                              onClick={() => onRequestDelete(user)}
                            >
                              <DeleteIcon />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan="6">No users found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </article>
        )}
      </main>

      {isFormModalOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <div className="modal-header">
              <h3>{editingUserId ? 'Update User' : 'Create User'}</h3>
              <button type="button" className="modal-close-btn" onClick={onCloseFormModal}>
                x
              </button>
            </div>

            <form className="form-grid register-grid" onSubmit={onSubmit}>
              <div className="register-field">
                <label htmlFor="admin-name">Name</label>
                <input
                  id="admin-name"
                  type="text"
                  value={form.name}
                  onChange={(event) => onFieldChange('name', event.target.value)}
                  required
                />
              </div>

              <div className="register-field">
                <label htmlFor="admin-phone">Phone Number</label>
                <input
                  id="admin-phone"
                  type="text"
                  value={form.phone_number}
                  onChange={(event) => onFieldChange('phone_number', event.target.value)}
                  required
                />
              </div>

              <div className="register-field">
                <label htmlFor="admin-email">Email</label>
                <input
                  id="admin-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => onFieldChange('email', event.target.value)}
                  required
                />
              </div>

              <div className="register-field">
                <label htmlFor="admin-address">Address</label>
                <input
                  id="admin-address"
                  type="text"
                  value={form.address}
                  onChange={(event) => onFieldChange('address', event.target.value)}
                  required
                />
              </div>

              <div className="register-field">
                <label htmlFor="admin-registration">Registration Number</label>
                <input
                  id="admin-registration"
                  type="text"
                  value={form.registration_number}
                  onChange={(event) => onFieldChange('registration_number', event.target.value)}
                  required
                />
              </div>

              <div className="register-field">
                <label htmlFor="admin-role">User Type</label>
                <select
                  id="admin-role"
                  value={form.user_type}
                  onChange={(event) => onFieldChange('user_type', event.target.value)}
                  required
                >
                  {userTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="register-field">
                <label htmlFor="admin-password">
                  Password {editingUserId ? '(leave blank to keep current)' : ''}
                </label>
                <input
                  id="admin-password"
                  type="password"
                  value={form.password}
                  onChange={(event) => onFieldChange('password', event.target.value)}
                  required={!editingUserId}
                />
              </div>

              <div className="register-field">
                <label htmlFor="admin-password-confirmation">Confirm Password</label>
                <input
                  id="admin-password-confirmation"
                  type="password"
                  value={form.password_confirmation}
                  onChange={(event) => onFieldChange('password_confirmation', event.target.value)}
                  required={!editingUserId}
                />
              </div>

              <div className="admin-form-actions">
                <button type="submit" className="primary-btn" disabled={saving}>
                  {saving ? 'Saving...' : editingUserId ? 'Update User' : 'Create User'}
                </button>
                <button type="button" className="secondary-btn" onClick={onCloseFormModal}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteCandidate && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="confirm-card">
            <h3>Delete User</h3>
            <p>
              Are you sure you want to delete <strong>{deleteCandidate.name}</strong>?
            </p>
            <div className="confirm-actions">
              <button type="button" className="secondary-btn" onClick={onCancelDelete}>
                Cancel
              </button>
              <button type="button" className="danger-btn" onClick={onConfirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default AdminUsersPanel
