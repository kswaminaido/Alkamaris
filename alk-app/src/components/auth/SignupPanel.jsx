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

  return (
    <section className="signup-wrap">
      <article className="signup-card">
        <h3 className="signup-title">Create Account</h3>

        <form className="form-grid register-grid" onSubmit={onSubmit}>
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
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={registerForm.email}
              onChange={(event) => onFieldChange('email', event.target.value)}
              required
            />
          </div>

          <div className="register-field">
            <label htmlFor="address">Address</label>
            <textarea
              id="address"
              value={registerForm.address}
              onChange={(event) => onFieldChange('address', event.target.value)}
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

          <button type="submit" className="primary-btn" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        {message && <p className="message success">{message}</p>}
        {error && <p className="message error">{error}</p>}
      </article>
    </section>
  )
}

export default SignupPanel
