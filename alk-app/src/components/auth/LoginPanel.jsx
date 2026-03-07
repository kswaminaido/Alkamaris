function LoginPanel({ loginForm, onFieldChange, onSubmit, loading, message, error }) {
  return (
    <section className="login-wrap">
      <article className="login-card">
        <div className="login-banner" aria-label="Brand logo">
          <img
            src="https://www.alkamaris.com/images/header/header-logo.png"
            alt="Alkamaris logo"
            className="login-banner-logo"
          />
        </div>

        <form className="login-form" onSubmit={onSubmit}>
          <label htmlFor="login-email">Email address</label>
          <input
            id="login-email"
            type="email"
            placeholder="Email address"
            value={loginForm.email}
            onChange={(event) => onFieldChange('email', event.target.value)}
            required
          />

          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            placeholder="Password"
            value={loginForm.password}
            onChange={(event) => onFieldChange('password', event.target.value)}
            required
          />

          <button type="submit" className="primary-btn login-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Log in'}
          </button>
        </form>

        {message && <p className="message success">{message}</p>}
        {error && <p className="message error">{error}</p>}
      </article>
    </section>
  )
}

export default LoginPanel
