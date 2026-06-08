function LoginPanel({ loginForm, onFieldChange, onSubmit, loading, message, error }) {
  return (
    <section className="login-wrap">
      <article className="login-card" aria-label="Alkamaris login">
        <div className="login-visual">
          <div className="login-brand-panel">
            <img
              src="https://www.alkamaris.com/images/header/header-logo.png"
              alt="Alkamaris logo"
              className="login-banner-logo"
            />
            <div>
              <p className="login-eyebrow">Operations Portal</p>
              <h1>Welcome back</h1>
              <p className="login-copy">
                Secure workspace for Alkamaris teams.
              </p>
            </div>
          </div>
        </div>

        <div className="login-form-panel">
          <div className="login-form-header">
            <img
              src="https://www.alkamaris.com/images/header/header-logo.png"
              alt="Alkamaris logo"
              className="login-form-logo"
            />
            <h2>Log in</h2>
            <p>Enter your account details to continue.</p>
          </div>

          <form className="login-form" onSubmit={onSubmit}>
            <label htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              type="email"
              placeholder="name@company.com"
              value={loginForm.email}
              onChange={(event) => onFieldChange('email', event.target.value)}
              required
            />

            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              placeholder="Enter password"
              value={loginForm.password}
              onChange={(event) => onFieldChange('password', event.target.value)}
              required
            />

            <button type="submit" className="primary-btn login-submit-btn" disabled={loading}>
              {loading ? 'Signing in...' : 'Log in'}
            </button>
          </form>

          {message && <p className="message success">{message}</p>}
          {error && <p className="message error">{error}</p>}
        </div>
      </article>
    </section>
  )
}

export default LoginPanel
