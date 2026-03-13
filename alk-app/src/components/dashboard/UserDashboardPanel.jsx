function UserDashboardPanel({ currentUser, dashboardTitle }) {
  return (
    <section className="dashboard-wrap">
      <article className="dashboard-panel">
        <h2>{dashboardTitle}</h2>
        <p>
          Welcome, <strong>{currentUser.name}</strong> ({currentUser.role})
        </p>

        <div className="dashboard-cards">
          {currentUser.role === 'sales' && (
            <section className="dash-card">
              <h3>Sales Workspace</h3>
              <p>View your profile and sales-specific modules.</p>
              <code>GET /api/auth/me</code>
            </section>
          )}

          {currentUser.role === 'vendor' && (
            <section className="dash-card">
              <h3>Vendor Workspace</h3>
              <p>Track your profile, registration details, and account information.</p>
              <code>GET /api/auth/me</code>
            </section>
          )}

          {currentUser.role === 'customer' && (
            <section className="dash-card">
              <h3>Customer Workspace</h3>
              <p>Track your profile, registration and account details.</p>
              <code>GET /api/auth/me</code>
            </section>
          )}
        </div>
      </article>
    </section>
  )
}

export default UserDashboardPanel
