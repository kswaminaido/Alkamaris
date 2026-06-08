import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

function DashboardPanel({ currentUser, dashboardTitle }) {
  const navigate = useNavigate()
  const [placeholderMessage, setPlaceholderMessage] = useState('')

  const transactionLinks = useMemo(
    () => [
      { label: 'All Transactions' },
      { label: 'Specs' },
      { label: 'Special Notes' },
      { label: 'QC Inspection Date' },
      { label: 'Payment Request' },
      { label: 'Payment Request List' },
      { label: 'Overdue Invoice' },
    ],
    [],
  )

  const reportLinks = useMemo(
    () => [
      { label: 'Order Progress Report' },
      { label: 'Report on Container' },
      { label: 'Item Report' },
      { label: 'Statement of Account' },
    ],
    [],
  )

  function handleTransactionLink(item) {
    if (item.label === 'All Transactions') {
      navigate('/transactions')
      return
    }

    setPlaceholderMessage(`${item.label} is a placeholder for now.`)
  }

  return (
    <div className="modern-dashboard-main">
      {/* <section className="dashboard-hero-panel">
        <div>
          <span className="dashboard-kicker">Operations Dashboard</span>
          <h1>{dashboardTitle}</h1>
          <p>
            Manage transaction records, report views, and daily follow-ups from one workspace.
          </p>
        </div>
        <div className="dashboard-user-summary" aria-label="Signed in user">
          <span>{currentUser.name?.charAt(0)?.toUpperCase() || 'A'}</span>
          <div>
            <strong>{currentUser.name}</strong>
            <small>{currentUser.role}</small>
          </div>
        </div>
      </section> */}

      <section className="modern-report-grid">
        <article className="module-card module-card-transactions">
          <div className="module-card-head transaction">
            <span className="module-card-icon" aria-hidden="true">
              <DashboardIcon type="transactions" />
            </span>
            <div>
              <h3>Transaction Data</h3>
              <p>Booking, quality, payment, and invoice tasks.</p>
            </div>
          </div>
          <ul>
            {transactionLinks.map((item) => (
              <li key={item.label}>
                <button
                  type="button"
                  className="module-link"
                  onClick={() => handleTransactionLink(item)}
                >
                  <span>
                    <strong>{item.label}</strong>
                  </span>
                  <DashboardIcon type="arrow" />
                </button>
              </li>
            ))}
          </ul>
        </article>

        <article className="module-card module-card-reports">
          <div className="module-card-head reports">
            <span className="module-card-icon" aria-hidden="true">
              <DashboardIcon type="reports" />
            </span>
            <div>
              <h3>Report</h3>
              <p>Summary views for orders, containers, items, and accounts.</p>
            </div>
          </div>
          <ul>
            {reportLinks.map((item) => (
              <li key={item.label}>
                <button
                  type="button"
                  className="module-link"
                  onClick={() => setPlaceholderMessage(`${item.label} is a placeholder for now.`)}
                >
                  <span>
                    <strong>{item.label}</strong>
                  </span>
                  <DashboardIcon type="arrow" />
                </button>
              </li>
            ))}
          </ul>
        </article>
      </section>

      {placeholderMessage && (
        <p className="dashboard-placeholder-note">
          <DashboardIcon type="info" />
          {placeholderMessage}
        </p>
      )}

      <p className="dashboard-footnote">
        Signed in as <strong>{currentUser.name}</strong> ({currentUser.role})
      </p>
    </div>
  )
}

export default DashboardPanel

function DashboardIcon({ type }) {
  switch (type) {
    case 'transactions':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 3h7l5 5v13H7z" />
          <path d="M14 3v5h5" />
          <path d="M9 13h8M9 17h8M9 9h2" />
        </svg>
      )
    case 'reports':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 19V8M10 19V4M16 19v-7M22 19H2" />
        </svg>
      )
    case 'info':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 17v-6" />
          <path d="M12 7h.01" />
          <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      )
    default:
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m9 6 6 6-6 6" />
        </svg>
      )
  }
}
