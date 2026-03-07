import { useState } from 'react'

function DashboardPanel({ currentUser, onLogout }) {
  const [placeholderMessage, setPlaceholderMessage] = useState('')

  function handlePlaceholderClick(itemName) {
    setPlaceholderMessage(`${itemName} is a placeholder for now.`)
  }

  const topActions = [
    { title: 'New Booking', subtitle: 'Trade & Commission' },
    { title: 'New Booking', subtitle: 'QC Services' },
    { title: 'All Transactions', subtitle: 'Track and verify' },
    { title: 'Follow Up', subtitle: 'Shipments' },
    { title: 'Master List', subtitle: 'TycMail' },
  ]

  const transactionLinks = [
    'All Transactions',
    'Specs',
    'Special Notes',
    'QC Inspection Date',
    'Payment Request',
    'Payment Request List',
    'Overdue Invoice',
  ]

  const reportLinks = [
    'Order Progress Report',
    'Report on Container',
    'Item Report',
    'Statement of Account',
  ]

  return (
    <section className="modern-dashboard">
      <header className="modern-top-nav" aria-label="Admin navigation">
        <img
          className="modern-dashboard-logo"
          src="https://www.alkamaris.com/images/header/header-logo.png"
          alt="Alkamaris"
        />
        <nav className="modern-primary-nav">
          {topActions.map((action) => (
            <button
              type="button"
              key={`${action.title}-${action.subtitle}`}
              className="modern-nav-item"
              onClick={() => handlePlaceholderClick(action.title)}
            >
              <span>{action.title}</span>
              <small>{action.subtitle}</small>
            </button>
          ))}
        </nav>
        <button
          type="button"
          className="modern-logout-btn"
          aria-label="Logout"
          title="Logout"
          onClick={onLogout}
        >
          <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
            <path d="M10 17v-2h6V9h-6V7h6a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-6Z" />
            <path d="M13 12H4m0 0 3-3m-3 3 3 3" />
          </svg>
        </button>
      </header>

      <div className="modern-dashboard-main">
        <section className="modern-report-grid">
          <article className="module-card">
            <div className="module-card-head transaction">
              <h3>Transaction Data</h3>
            </div>
            <ul>
              {transactionLinks.map((item) => (
                <li key={item}>
                  <button
                    type="button"
                    className="module-link"
                    onClick={() => handlePlaceholderClick(item)}
                  >
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </article>

          <article className="module-card">
            <div className="module-card-head reports">
              <h3>Report</h3>
            </div>
            <ul>
              {reportLinks.map((item) => (
                <li key={item}>
                  <button
                    type="button"
                    className="module-link"
                    onClick={() => handlePlaceholderClick(item)}
                  >
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </article>
        </section>

        {placeholderMessage && <p className="dashboard-placeholder-note">{placeholderMessage}</p>}

        <p className="dashboard-footnote">
          Signed in as <strong>{currentUser.name}</strong> ({currentUser.role})
        </p>
      </div>
    </section>
  )
}

export default DashboardPanel
