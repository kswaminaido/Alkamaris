function UserDashboardPanel({ currentUser, dashboardTitle }) {
  const workspace = getWorkspace(currentUser.role)

  return (
    <section className="dashboard-wrap">
      <article className="dashboard-panel">
        <div className="user-dashboard-hero">
          <div>
            <span className="dashboard-kicker">{workspace.kicker}</span>
            <h2>{dashboardTitle}</h2>
            <p>
              Welcome, <strong>{currentUser.name}</strong> ({formatRole(currentUser.role)})
            </p>
          </div>
          <div className="dashboard-user-summary" aria-label="Signed in user">
            <span>{currentUser.name?.charAt(0)?.toUpperCase() || 'U'}</span>
            <div>
              <strong>{currentUser.name}</strong>
              <small>{formatRole(currentUser.role)}</small>
            </div>
          </div>
        </div>

        <div className="dashboard-cards">
          {currentUser.role === 'sales' && (
            <section className="dash-card sales">
              <span className="dash-card-icon" aria-hidden="true">
                <WorkspaceIcon type="sales" />
              </span>
              <h3>Sales Workspace</h3>
              <p>View your profile and sales-specific modules.</p>
              <code>GET /api/auth/me</code>
            </section>
          )}

          {(currentUser.role === 'packer' || currentUser.role === 'vendor') && (
            <section className="dash-card packer">
              <span className="dash-card-icon" aria-hidden="true">
                <WorkspaceIcon type="packer" />
              </span>
              <h3>Packer Workspace</h3>
              <p>Track your profile, registration details, and account information.</p>
              <code>GET /api/auth/me</code>
            </section>
          )}

          {currentUser.role === 'customer' && (
            <section className="dash-card customer">
              <span className="dash-card-icon" aria-hidden="true">
                <WorkspaceIcon type="customer" />
              </span>
              <h3>Customer Workspace</h3>
              <p>Track your profile, registration and account details.</p>
              <code>GET /api/auth/me</code>
            </section>
          )}

          {currentUser.role === 'logistics' && (
            <section className="dash-card logistics">
              <span className="dash-card-icon" aria-hidden="true">
                <WorkspaceIcon type="logistics" />
              </span>
              <h3>Logistics Workspace</h3>
              <p>Create new bookings and review booking-related account information.</p>
              <code>POST /api/transactions</code>
            </section>
          )}
        </div>
      </article>
    </section>
  )
}

export default UserDashboardPanel

function formatRole(role) {
  if (role === 'packer' || role === 'vendor') return 'packer'
  return role
}

function getWorkspace(role) {
  if (role === 'sales') return { kicker: 'Sales Dashboard' }
  if (role === 'packer' || role === 'vendor') return { kicker: 'Packer Dashboard' }
  if (role === 'customer') return { kicker: 'Customer Dashboard' }
  if (role === 'logistics') return { kicker: 'Logistics Dashboard' }
  return { kicker: 'Workspace Dashboard' }
}

function WorkspaceIcon({ type }) {
  switch (type) {
    case 'sales':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 19V5" />
          <path d="M4 19h17" />
          <path d="m7 15 4-4 3 3 6-7" />
        </svg>
      )
    case 'packer':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m3 7 9-4 9 4-9 4Z" />
          <path d="M3 7v10l9 4 9-4V7" />
          <path d="M12 11v10" />
        </svg>
      )
    case 'customer':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20 21a8 8 0 1 0-16 0" />
          <path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
        </svg>
      )
    default:
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 17 12 3l8 14Z" />
          <path d="M12 17v4" />
          <path d="M8 21h8" />
        </svg>
      )
  }
}
