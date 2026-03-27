import { Link } from 'react-router-dom'

const navActions = [
  {
    key: 'new_booking_trade',
    title: 'New Booking',
    subtitle: 'Trade & Commission',
    mode: 'trade_commission',
  },
  {
    key: 'new_booking_qc',
    title: 'QC Services',
    subtitle: 'QC Services',
    mode: 'qc_services',
  },
  { key: 'all_transactions', title: 'All Transactions', subtitle: 'Track and verify' },
  { key: 'follow_up', title: 'Follow Up', subtitle: 'Shipments' },
  { key: 'master_list', title: 'Master List', subtitle: 'TycMail' },
]

function AdminTopNav({ activeKey, onAction, onLogout }) {
  return (
    <header className="modern-top-nav" aria-label="Admin navigation">
      <Link to="/dashboard" className="brand-btn" aria-label="Go to home">
        <img
          className="modern-dashboard-logo"
          src="https://www.alkamaris.com/images/header/header-logo.png"
          alt="Alkamaris"
        />
      </Link>
      <nav className="modern-primary-nav">
        {navActions.map((action) => (
          <button
            type="button"
            key={action.key}
            className={`modern-nav-item ${activeKey === action.key ? 'active' : ''}`.trim()}
            onClick={() => onAction(action)}
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
  )
}

export default AdminTopNav
