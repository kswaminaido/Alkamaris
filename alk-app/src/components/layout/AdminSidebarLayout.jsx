import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'

const SIDEBAR_STATE_KEY = 'alk-dashboard-sidebar-open'
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

function AdminSidebarLayout({ currentUser, title, activeKey = '', children, onLogout }) {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true
    const savedValue = window.localStorage.getItem(SIDEBAR_STATE_KEY)
    return savedValue === null ? true : savedValue === 'true'
  })
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const isCompactViewport = typeof window !== 'undefined' && window.innerWidth <= 980

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(SIDEBAR_STATE_KEY, String(sidebarOpen))
  }, [sidebarOpen])

  useEffect(() => {
    if (!mobileMenuOpen) return undefined

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false)
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [mobileMenuOpen])

  useEffect(() => {
    if (!profileMenuOpen) return undefined

    function handlePointerDown(event) {
      if (!event.target.closest('.dashboard-topbar-profile-menu-wrap')) {
        setProfileMenuOpen(false)
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setProfileMenuOpen(false)
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [profileMenuOpen])

  function closeMobileMenu() {
    setMobileMenuOpen(false)
  }

  function handleTopNavAction(action) {
    if (action.key === 'new_booking_trade' || action.key === 'new_booking_qc') {
      navigate(`/transactions/new?mode=${action.mode}`)
      return
    }
    if (action.key === 'all_transactions') {
      navigate('/transactions')
      return
    }
    if (action.key === 'master_list') {
        navigate('/master')
      return
    }
    navigate('/dashboard')
  }

  return (
    <section className={`dashboard-shell${sidebarOpen ? '' : ' sidebar-collapsed'}`}>
      <aside
        className={[
          'dashboard-sidebar',
          sidebarOpen ? '' : 'collapsed',
          mobileMenuOpen ? 'mobile-open' : '',
        ].filter(Boolean).join(' ')}
        aria-label="Dashboard sidebar"
      >
        <div className="dashboard-sidebar-brand">
          <Link className="brand-btn" to="/dashboard" aria-label="Go to dashboard" onClick={closeMobileMenu}>
            <img
              className="dashboard-sidebar-logo"
              src="https://www.alkamaris.com/images/header/header-logo.png"
              alt="Alkamaris"
            />
          </Link>
        </div>

        <nav className="dashboard-sidebar-nav">
          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            onClick={closeMobileMenu}
          >
            <SidebarIcon icon="dashboard" />
            <span className="sidebar-link-text">Dashboard</span>
            <span className="sidebar-link-end" />
          </NavLink>

          <NavLink
            to="/transactions"
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            onClick={closeMobileMenu}
          >
            <SidebarIcon icon="transactions" />
            <span className="sidebar-link-text">Transaction Data</span>
            <ChevronIcon className="sidebar-chevron" />
          </NavLink>

          <button type="button" className="sidebar-link sidebar-link-button" disabled>
            <SidebarIcon icon="reports" />
            <span className="sidebar-link-text">Report</span>
            <ChevronIcon className="sidebar-chevron" />
          </button>

          <button type="button" className="sidebar-link sidebar-link-button sidebar-link-spaced" disabled>
            <SidebarIcon icon="help" />
            <span className="sidebar-link-text">Contact Us</span>
            <span className="sidebar-link-end" />
          </button>

          <button type="button" className="sidebar-link sidebar-link-button" disabled>
            <SidebarIcon icon="request" />
            <span className="sidebar-link-text">Request</span>
            <span className="sidebar-link-end" />
          </button>
        </nav>

        <div className="dashboard-sidebar-footer">
          <button type="button" className="sidebar-link sidebar-link-button" onClick={onLogout}>
            <SidebarIcon icon="logout" />
            <span className="sidebar-link-text">Logout</span>
            <span className="sidebar-link-end" />
          </button>
        </div>
      </aside>

      {mobileMenuOpen && <button type="button" className="dashboard-sidebar-backdrop" onClick={closeMobileMenu} aria-label="Close sidebar" />}

      <div className="dashboard-content-shell">
        <header className="dashboard-topbar">
          <div className="dashboard-topbar-left">
            <button
              type="button"
              className="dashboard-menu-btn"
              onClick={() => {
                if (window.innerWidth <= 980) {
                  setMobileMenuOpen((value) => !value)
                  return
                }
                setSidebarOpen((value) => !value)
              }}
              aria-label="Toggle sidebar"
              aria-expanded={isCompactViewport ? mobileMenuOpen : sidebarOpen}
            >
              <MenuIcon />
            </button>
            <nav className="dashboard-topbar-nav" aria-label="Admin actions">
              {navActions.map((action) => (
                <button
                  type="button"
                  key={action.key}
                  className={`dashboard-topbar-nav-item ${activeKey === action.key ? 'active' : ''}`.trim()}
                  onClick={() => handleTopNavAction(action)}
                >
                  <span>{action.title}</span>
                  <small>{action.subtitle}</small>
                </button>
              ))}
            </nav>
          </div>
          <div className="dashboard-topbar-profile-menu-wrap">
            <button
              type="button"
              className="dashboard-topbar-profile"
              aria-label="Open profile menu"
              aria-expanded={profileMenuOpen}
              aria-haspopup="menu"
              onClick={() => setProfileMenuOpen((value) => !value)}
            >
              <span className="dashboard-topbar-profile-name">{currentUser.name}</span>
              <span className="dashboard-topbar-profile-icon">
                <ProfileIcon />
              </span>
            </button>

            {profileMenuOpen && (
              <div className="dashboard-topbar-profile-menu" role="menu" aria-label="Profile options">
                <button
                  type="button"
                  className="dashboard-topbar-profile-menu-item"
                  role="menuitem"
                  onClick={() => {
                    setProfileMenuOpen(false)
                    navigate('/dashboard')
                  }}
                >
                  Profile
                </button>
                <button
                  type="button"
                  className="dashboard-topbar-profile-menu-item"
                  role="menuitem"
                  onClick={() => {
                    setProfileMenuOpen(false)
                    onLogout()
                  }}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="dashboard-page-content">{children}</main>
      </div>
    </section>
  )
}

function SidebarIcon({ icon }) {
  switch (icon) {
    case 'dashboard':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 13h7V4H4zm9 7h7v-9h-7zM4 20h7v-5H4zm9-9h7V4h-7z" />
        </svg>
      )
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
          <path d="M4 20V8M10 20V4M16 20v-9M22 20H2" />
        </svg>
      )
    case 'help':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9.09 9a3 3 0 1 1 5.82 1c0 2-3 3-3 3" />
          <path d="M12 17h.01" />
        </svg>
      )
    case 'request':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m22 2-7 20-4-9-9-4Z" />
          <path d="M22 2 11 13" />
        </svg>
      )
    case 'logout':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
          <path d="M10 17l5-5-5-5" />
          <path d="M15 12H3" />
        </svg>
      )
    default:
      return null
  }
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 21a8 8 0 1 0-16 0" />
      <path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
    </svg>
  )
}

function ChevronIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  )
}

export default AdminSidebarLayout
