import { USER_ROLES, displayUserRole, isPackerRole } from '../../utils/userRoles'

function UserDashboardPanel({ currentUser, dashboardTitle }) {
  return (
    <section className="dashboard-wrap">
      <article className="dashboard-panel">
        <h2>{dashboardTitle}</h2>
        <p>
          Welcome, <strong>{currentUser.name}</strong> ({displayUserRole(currentUser.role)})
        </p>

        <div className="dashboard-cards">
          {currentUser.role === USER_ROLES.SALES && (
            <section className="dash-card">
              <h3>Sales Workspace</h3>
              <p>View your profile and sales-specific modules.</p>
              <code>GET /api/auth/me</code>
            </section>
          )}

          {isPackerRole(currentUser.role) && (
            <section className="dash-card">
              <h3>Packer Workspace</h3>
              <p>Track your profile, registration details, and account information.</p>
              <code>GET /api/auth/me</code>
            </section>
          )}

          {currentUser.role === USER_ROLES.CUSTOMER && (
            <section className="dash-card">
              <h3>Customer Workspace</h3>
              <p>Track your profile, registration and account details.</p>
              <code>GET /api/auth/me</code>
            </section>
          )}

          {currentUser.role === USER_ROLES.LOGISTICS && (
            <section className="dash-card">
              <h3>Welcome to Alkamaris</h3>
            </section>
          )}
        </div>
      </article>
    </section>
  )
}

export default UserDashboardPanel
