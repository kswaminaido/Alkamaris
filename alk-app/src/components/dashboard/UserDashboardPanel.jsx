function UserDashboardPanel({ currentUser, dashboardTitle }) {
  const workspace = getWorkspace(currentUser.role)

  return (
    <section className="modern-dashboard-main">
      <section className="dashboard-hero-panel">
        <div>
          <span className="dashboard-kicker">{dashboardTitle}</span>
          <h1>Welcome back, {currentUser.name}</h1>
          <p>{workspace.summary}</p>
        </div>
        <div className="dashboard-hero-meta" aria-label="Signed in user">
          <span>Role</span>
          <strong>{formatRole(currentUser.role)}</strong>
        </div>
      </section>

      <article className="dashboard-panel user-dashboard-panel">
        <div className="module-card-head">
          <h3>{workspace.title}</h3>
          <span>{workspace.caption}</span>
        </div>

        <div className="dashboard-cards">
          {workspace.cards.map((card) => (
            <section className="dash-card" key={card.title}>
              <span className="dash-card-icon">{card.icon}</span>
              <h3>{card.title}</h3>
              <p>{card.text}</p>
            </section>
          ))}
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
  if (role === 'sales') {
    return {
      title: 'Sales Workspace',
      caption: 'Customer and sales activity',
      summary: 'Review your profile and keep sales-specific work moving.',
      cards: [
        { title: 'Account', text: 'Keep your profile information current.', icon: '01' },
        { title: 'Sales Modules', text: 'Access the sales tools assigned to your role.', icon: '02' },
      ],
    }
  }

  if (role === 'packer' || role === 'vendor') {
    return {
      title: 'Packer Workspace',
      caption: 'Vendor and account activity',
      summary: 'Track account details and packer-related workflow information.',
      cards: [
        { title: 'Profile', text: 'Review account and company details.', icon: '01' },
        { title: 'Operations', text: 'Follow the modules available for your role.', icon: '02' },
      ],
    }
  }

  if (role === 'customer') {
    return {
      title: 'Customer Workspace',
      caption: 'Customer account view',
      summary: 'Track profile and account details from your dashboard.',
      cards: [
        { title: 'Profile', text: 'Review personal and company information.', icon: '01' },
        { title: 'Account', text: 'Stay aligned with your account activity.', icon: '02' },
      ],
    }
  }

  if (role === 'logistics') {
    return {
      title: 'Logistics Workspace',
      caption: 'Booking and shipment activity',
      summary: 'Create new bookings and review booking-related account information.',
      cards: [
        { title: 'Bookings', text: 'Create and manage booking workflows.', icon: '01' },
        { title: 'Shipment Data', text: 'Keep logistics information organized.', icon: '02' },
      ],
    }
  }

  return {
    title: 'Workspace',
    caption: 'Account activity',
    summary: 'Review your profile and available modules.',
    cards: [
      { title: 'Profile', text: 'Keep account information current.', icon: '01' },
      { title: 'Modules', text: 'Use the tools assigned to your role.', icon: '02' },
    ],
  }
}
