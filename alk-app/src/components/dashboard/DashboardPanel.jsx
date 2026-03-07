function DashboardPanel({ currentUser, dashboardTitle }) {
  return (
    <section className="dashboard-wrap">
      <article className="dashboard-panel">
        <h2>{dashboardTitle}</h2>
        <p>
          Welcome, <strong>{currentUser.name}</strong> ({currentUser.role})
        </p>

        <div className="dashboard-cards">
          {currentUser.role === 'admin' && (
            <>
              <section className="dash-card">
                <h3>User Management</h3>
                <p>Access full user CRUD APIs from admin role only.</p>
                <code>GET/POST/PUT/DELETE /api/users</code>
              </section>
              <section className="dash-card">
                <h3>Config Management</h3>
                <p>Maintain role and config options centrally.</p>
                <code>GET/POST/PUT/DELETE /api/configs</code>
              </section>
            </>
          )}

          {currentUser.role === 'sales' && (
            <section className="dash-card">
              <h3>Sales Workspace</h3>
              <p>View your profile and sales-specific modules.</p>
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

export default DashboardPanel
