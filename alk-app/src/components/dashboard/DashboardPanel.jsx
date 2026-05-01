import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function DashboardPanel({ currentUser }) {
  const navigate = useNavigate()
  const [placeholderMessage, setPlaceholderMessage] = useState('')

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
                  onClick={() =>
                    item === 'All Transactions'
                      ? navigate('/transactions')
                      : setPlaceholderMessage(`${item} is a placeholder for now.`)
                  }
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
                  onClick={() => setPlaceholderMessage(`${item} is a placeholder for now.`)}
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
  )
}

export default DashboardPanel
