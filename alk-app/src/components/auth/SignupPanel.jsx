function SignupPanel({
  registerForm,
  userTypeOptions,
  onFieldChange,
  onSubmit,
  loading,
  message,
  error,
}) {
  const nameLabel = registerForm.user_type === 'customer' ? 'Customer Name' : 'Name'
  const shouldShowFirmName = registerForm.user_type === 'packer'
  const shouldShowPasswordFields = ['admin', 'logistics', 'accounts'].includes(registerForm.user_type)

  return (
    <section className="signup-wrap">
      <article className="signup-card">
        <div className="signup-card-head">
          <span>Master Access</span>
          <h3 className="signup-title">Create Account</h3>
        </div>

        <form className="form-grid register-grid signup-form-grid" onSubmit={onSubmit}>
          <div className="register-field">
            <label htmlFor="name">{nameLabel}</label>
            <input
              id="name"
              type="text"
              value={registerForm.name}
              onChange={(event) => onFieldChange('name', event.target.value)}
              required
            />
          </div>

          <div className="register-field">
            <label htmlFor="contact_name">Contact Name</label>
            <input
              id="contact_name"
              type="text"
              value={registerForm.contact_name}
              onChange={(event) => onFieldChange('contact_name', event.target.value)}
              required
            />
          </div>

          {shouldShowFirmName && (
            <div className="register-field">
              <label htmlFor="firm_name">Firm Name</label>
              <input
                id="firm_name"
                type="text"
                value={registerForm.firm_name}
                onChange={(event) => onFieldChange('firm_name', event.target.value)}
                required
              />
            </div>
          )}

          <div className="register-field">
            <label htmlFor="phone_number">Phone Number</label>
            <input
              id="phone_number"
              type="text"
              value={registerForm.phone_number}
              onChange={(event) => onFieldChange('phone_number', event.target.value)}
              required
            />
          </div>

          <div className="register-field">
            <label htmlFor="user_type">User Type</label>
            <select
              id="user_type"
              value={registerForm.user_type}
              onChange={(event) => onFieldChange('user_type', event.target.value)}
              required
            >
              {userTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="register-field">
            <label htmlFor="email">Email ID</label>
            <input
              id="email"
              type="email"
              value={registerForm.email}
              onChange={(event) => onFieldChange('email', event.target.value)}
              required
            />
          </div>

          <div className="register-field register-field-full">
            <label htmlFor="address">Address</label>
            <textarea
              id="address"
              value={registerForm.address}
              onChange={(event) => onFieldChange('address', event.target.value)}
              required
            />
          </div>

          {shouldShowPasswordFields && (
            <div className="register-password-section">
              <div className="register-section-title">
                <span>Account Access</span>
              </div>

              <div className="register-field">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  value={registerForm.password}
                  onChange={(event) => onFieldChange('password', event.target.value)}
                  minLength={8}
                  required
                />
              </div>

              <div className="register-field">
                <label htmlFor="password_confirmation">Confirm Password</label>
                <input
                  id="password_confirmation"
                  type="password"
                  value={registerForm.password_confirmation}
                  onChange={(event) => onFieldChange('password_confirmation', event.target.value)}
                  minLength={8}
                  required
                />
              </div>
            </div>
          )}

          <div className="signup-form-actions">
            <button type="submit" className="primary-btn" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </div>
        </form>

        {message && <p className="message success">{message}</p>}
        {error && <p className="message error">{error}</p>}
      </article>
    </section>
  )
}

export default SignupPanel
