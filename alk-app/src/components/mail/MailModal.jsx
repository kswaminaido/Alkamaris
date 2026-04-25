import { useEffect, useState } from 'react'
import './MailModal.css'

function MailModal({ isOpen, authFetch, onClose }) {
  const [step, setStep] = useState('filters') // filters, list, compose
  const [customers, setCustomers] = useState([])
  const [vendors, setVendors] = useState([])
  const [selectedRecipients, setSelectedRecipients] = useState([])
  const [filtering, setFiltering] = useState(false)
  const [sending, setSending] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [filters, setFilters] = useState({
    recipientType: 'customers',
    fromDate: '',
    toDate: '',
  })
  const [mailData, setMailData] = useState({
    from: '',
    to: '',
    subject: '',
    body: '',
  })
  const [uploadedFile, setUploadedFile] = useState(null)

  async function loadRecipients() {
    setFiltering(true)
    setError('')
    try {
      const params = new URLSearchParams()
      params.append('type', filters.recipientType)
      if (filters.fromDate) params.append('from_date', filters.fromDate)
      if (filters.toDate) params.append('to_date', filters.toDate)

      const response = await authFetch(`/mail/recipients?${params.toString()}`)
      const payload = await response.json()

      if (!response.ok) {
        const message = payload?.message ?? 'Unable to load recipients'
        setError(message)
        return
      }

      if (filters.recipientType === 'customers') {
        setCustomers(payload?.data ?? [])
        setVendors([])
      } else {
        setVendors(payload?.data ?? [])
        setCustomers([])
      }
      setSelectedRecipients([])
      setStep('list')
    } catch (err) {
      setError('Unable to load recipients')
    } finally {
      setFiltering(false)
    }
  }

  function handleRecipientToggle(id) {
    setSelectedRecipients((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  async function handleFileUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xls|xlsx)$/i)) {
      setError('Please upload a valid Excel file (.xls or .xlsx)')
      return
    }

    setUploadingFile(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await authFetch('/mail/upload-excel', {
        method: 'POST',
        body: formData,
      })

      const payload = await response.json()
      if (!response.ok) {
        const message = payload?.message ?? 'Unable to upload file'
        setError(message)
        return
      }

      const uploadedRecipients = payload?.data ?? []
      if (uploadedRecipients.length === 0) {
        setError('No email addresses found in the uploaded file')
        return
      }

      setUploadedFile({
        name: file.name,
        recipients: uploadedRecipients,
      })
      setSelectedRecipients(uploadedRecipients.map((_, index) => index))
      setSuccess(`Loaded ${uploadedRecipients.length} email(s) from file`)
    } catch (err) {
      setError('Unable to upload file')
    } finally {
      setUploadingFile(false)
      event.target.value = ''
    }
  }

  async function handleSendMail() {
    if (!mailData.from || !mailData.subject || !mailData.body) {
      setError('Please fill all fields')
      return
    }

    if (!uploadedFile && selectedRecipients.length === 0) {
      setError('Please select at least one recipient or upload a file')
      return
    }

    setSending(true)
    setError('')
    setSuccess('')
    try {
      const payload = {
        from: mailData.from,
        subject: mailData.subject,
        body: mailData.body,
      }

      if (uploadedFile) {
        payload.recipients = uploadedFile.recipients.filter((_, index) => selectedRecipients.includes(index))
        payload.source = 'excel'
      } else {
        payload.recipients = selectedRecipients
        payload.recipient_type = filters.recipientType
        payload.source = 'db'
      }

      const response = await authFetch('/mail/send', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      const responsePayload = await response.json()
      if (!response.ok) {
        const message = responsePayload?.message ?? 'Unable to send mail'
        setError(message)
        return
      }

      setSuccess('Email sent successfully to ' + selectedRecipients.length + ' recipient(s)')
      setTimeout(() => {
        setStep('filters')
        setMailData({ from: '', to: '', subject: '', body: '' })
        setSelectedRecipients([])
        setUploadedFile(null)
        onClose()
      }, 1500)
    } catch (err) {
      setError('Unable to send mail')
    } finally {
      setSending(false)
    }
  }

  if (!isOpen) return null

  const recipients = filters.recipientType === 'customers' ? customers : vendors

  return (
    <div className="mail-modal-overlay" onClick={() => step === 'filters' && onClose()}>
      <div className="mail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="mail-modal-header">
          <h2>Mail Center</h2>
          <button
            type="button"
            className="mail-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {error && <p className="message error">{error}</p>}
        {success && <p className="message success">{success}</p>}

        {step === 'filters' && (
          <div className="mail-modal-content">
            <div className="mail-filters">
              <h3>Select Recipients</h3>
              <div className="mail-filter-row">
                <div className="mail-filter-group">
                  <label htmlFor="recipient-type">Recipient Type:</label>
                  <select
                    id="recipient-type"
                    value={filters.recipientType}
                    onChange={(e) => setFilters({ ...filters, recipientType: e.target.value })}
                    disabled={filtering}
                  >
                    <option value="customers">Customers</option>
                    <option value="vendors">Vendors</option>
                  </select>
                </div>

                <div className="mail-filter-group">
                  <label htmlFor="from-date">From Date:</label>
                  <input
                    id="from-date"
                    type="date"
                    value={filters.fromDate}
                    onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
                    disabled={filtering}
                  />
                </div>

                <div className="mail-filter-group">
                  <label htmlFor="to-date">To Date:</label>
                  <input
                    id="to-date"
                    type="date"
                    value={filters.toDate}
                    onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
                    disabled={filtering}
                  />
                </div>

                <button
                  type="button"
                  className="mail-submit-btn"
                  onClick={loadRecipients}
                  disabled={filtering}
                >
                  {filtering ? 'Loading...' : 'Submit'}
                </button>
              </div>

              <div className="mail-divider">OR</div>

              <div className="mail-file-upload-group">
                <h3 style={{ marginBottom: '12px' }}>Upload Excel File</h3>
                <div className="mail-file-upload-wrapper">
                  <label htmlFor="excel-file" className="mail-file-label">
                    <span className="mail-file-icon">📎</span>
                    <span className="mail-file-text">
                      {uploadedFile ? uploadedFile.name : 'Choose Excel file (.xls or .xlsx)'}
                    </span>
                  </label>
                  <input
                    id="excel-file"
                    type="file"
                    accept=".xls,.xlsx"
                    onChange={handleFileUpload}
                    disabled={uploadingFile}
                    style={{ display: 'none' }}
                  />
                  {uploadedFile && (
                    <button
                      type="button"
                      className="mail-file-clear-btn"
                      onClick={() => {
                        setUploadedFile(null)
                        setSelectedRecipients([])
                        setSuccess('')
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>
                {uploadingFile && <p className="mail-uploading-text">Uploading file...</p>}
                {uploadedFile && (
                  <p className="mail-file-info">
                    ✓ {uploadedFile.recipients.length} email(s) loaded
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 'list' && (
          <div className="mail-modal-content">
            <div className="mail-list-container">
              <h3>
                {uploadedFile ? 'Email Addresses' : filters.recipientType === 'customers' ? 'Customers' : 'Vendors'} (
                {recipients.length})
              </h3>
              <div className="mail-recipients-list">
                {recipients.length === 0 ? (
                  <p className="mail-no-results">
                    No {uploadedFile ? 'emails' : filters.recipientType} found
                  </p>
                ) : uploadedFile ? (
                  uploadedFile.recipients.map((recipient, index) => (
                    <label key={index} className="mail-recipient-item">
                      <input
                        type="checkbox"
                        checked={selectedRecipients.includes(index)}
                        onChange={() => handleRecipientToggle(index)}
                      />
                      <span className="mail-recipient-email">{recipient}</span>
                    </label>
                  ))
                ) : (
                  recipients.map((recipient) => (
                    <label key={recipient.id} className="mail-recipient-item">
                      <input
                        type="checkbox"
                        checked={selectedRecipients.includes(recipient.id)}
                        onChange={() => handleRecipientToggle(recipient.id)}
                      />
                      <span className="mail-recipient-name">{recipient.name}</span>
                      <span className="mail-recipient-email">{recipient.email}</span>
                    </label>
                  ))
                )}
              </div>

              <div className="mail-list-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setStep('filters')}
                >
                  Back
                </button>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => {
                    if (selectedRecipients.length > 0) {
                      if (uploadedFile) {
                        const selectedEmails = uploadedFile.recipients
                          .filter((_, index) => selectedRecipients.includes(index))
                          .join('; ')
                        setMailData({ ...mailData, to: selectedEmails })
                      } else {
                        const selectedEmails = recipients
                          .filter((r) => selectedRecipients.includes(r.id))
                          .map((r) => r.email)
                          .join('; ')
                        setMailData({ ...mailData, to: selectedEmails })
                      }
                      setStep('compose')
                    } else {
                      setError('Please select at least one recipient')
                    }
                  }}
                  disabled={selectedRecipients.length === 0}
                >
                  Mail ({selectedRecipients.length})
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'compose' && (
          <div className="mail-modal-content">
            <div className="mail-compose-container">
              <h3>Compose Email</h3>
              <form className="mail-form">
                <div className="mail-form-group">
                  <label htmlFor="mail-from">From Email:</label>
                  <input
                    id="mail-from"
                    type="email"
                    value={mailData.from}
                    onChange={(e) => setMailData({ ...mailData, from: e.target.value })}
                    placeholder="sender@example.com"
                    disabled={sending}
                  />
                </div>

                <div className="mail-form-group">
                  <label htmlFor="mail-to">To Email(s):</label>
                  <textarea
                    id="mail-to"
                    value={mailData.to}
                    readOnly
                    className="mail-to-field"
                    rows={3}
                  />
                </div>

                <div className="mail-form-group">
                  <label htmlFor="mail-subject">Subject:</label>
                  <input
                    id="mail-subject"
                    type="text"
                    value={mailData.subject}
                    onChange={(e) => setMailData({ ...mailData, subject: e.target.value })}
                    placeholder="Email subject"
                    disabled={sending}
                  />
                </div>

                <div className="mail-form-group">
                  <label htmlFor="mail-body">Body:</label>
                  <textarea
                    id="mail-body"
                    value={mailData.body}
                    onChange={(e) => setMailData({ ...mailData, body: e.target.value })}
                    placeholder="Email body"
                    rows={10}
                    disabled={sending}
                  />
                </div>
              </form>

              <div className="mail-compose-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setStep('list')}
                  disabled={sending}
                >
                  Back
                </button>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={handleSendMail}
                  disabled={sending}
                >
                  {sending ? 'Sending...' : 'Mail Send'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default MailModal
