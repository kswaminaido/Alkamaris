import { Link } from 'react-router-dom'

function TopNav({ currentUser, showSignupLink, showLoginLink, onLogout }) {
  return (
    <header className="top-nav">
      <Link className="brand-btn" to={currentUser ? '/dashboard' : '/'}>
        <img
          className="brand-logo"
          src="https://www.alkamaris.com/images/header/header-logo.png"
          alt="Alkamaris"
        />
      </Link>

      {!currentUser && showSignupLink && <Link to="/signup" className="nav-link-btn">Sign up</Link>}

      {!currentUser && showLoginLink && <Link to="/" className="nav-link-btn">Log in</Link>}

      {currentUser && (
        <div className="top-nav-actions">
          <Link to="/profile" className="nav-link-btn">
            Profile
          </Link>
          <button type="button" className="nav-link-btn" onClick={onLogout}>
            Logout
          </button>
        </div>
      )}
    </header>
  )
}

export default TopNav
