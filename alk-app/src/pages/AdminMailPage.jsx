import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminSidebarLayout from '../components/layout/AdminSidebarLayout'
import { useAuth } from '../context/AuthContext'

const CONTINENT_COUNTRIES = {
  Africa: ['Algeria', 'Angola', 'Benin', 'Botswana', 'Cameroon', 'Egypt', 'Ethiopia', 'Ghana', 'Kenya', 'Morocco', 'Nigeria', 'Senegal', 'South Africa', 'Tanzania', 'Tunisia', 'Uganda'],
  Asia: ['Bangladesh', 'China', 'India', 'Indonesia', 'Japan', 'Jordan', 'Malaysia', 'Philippines', 'Saudi Arabia', 'Singapore', 'South Korea', 'Sri Lanka', 'Thailand', 'United Arab Emirates', 'Vietnam'],
  Europe: ['Belgium', 'France', 'Germany', 'Greece', 'Italy', 'Netherlands', 'Norway', 'Poland', 'Portugal', 'Spain', 'Sweden', 'Switzerland', 'United Kingdom'],
  'North America': ['Canada', 'Costa Rica', 'Cuba', 'Dominican Republic', 'Guatemala', 'Jamaica', 'Mexico', 'Panama', 'United States'],
  Oceania: ['Australia', 'Fiji', 'New Zealand', 'Papua New Guinea'],
  'South America': ['Argentina', 'Brazil', 'Chile', 'Colombia', 'Ecuador', 'Peru', 'Uruguay', 'Venezuela'],
}

const initialFilters = {
  scol: true,
  exhibition: false,
  defaultMail: true,
  taxiMail: false,
  product: '',
  continents: [],
  countries: [],
  style: '',
  source: 'all_exhibition',
  rating: 'all',
  years: '1',
}

function AdminMailPage() {
  const navigate = useNavigate()
  const { currentUser, logout, authFetch } = useAuth()
  const [filters, setFilters] = useState(initialFilters)
  const [products, setProducts] = useState([])
  const [recipients, setRecipients] = useState([])
  const [selectedEmails, setSelectedEmails] = useState([])
  const [composeOpen, setComposeOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [mail, setMail] = useState({ title: '', subject: '', body: '' })
  const [attachments, setAttachments] = useState([])
  const bodyEditorRef = useRef(null)
  const attachmentInputRef = useRef(null)
  const imageInputRef = useRef(null)
  const colorInputRef = useRef(null)

  const availableCountries = useMemo(() => {
    const selected = filters.continents.length > 0 ? filters.continents : Object.keys(CONTINENT_COUNTRIES)
    return [...new Set(selected.flatMap((continent) => CONTINENT_COUNTRIES[continent] ?? []))].sort()
  }, [filters.continents])

  useEffect(() => {
    loadOptions()
  }, [])

  async function handleLogout() {
    await logout()
    navigate('/', { replace: true })
  }

  async function loadOptions() {
    try {
      const response = await authFetch('/mail/options')
      const payload = await response.json()
      if (response.ok) {
        setProducts(payload?.data?.products ?? [])
      }
    } catch {
      setProducts([])
    }
  }

  function updateFilter(key, value) {
    setFilters((current) => {
      const next = { ...current, [key]: value }
      if (key === 'continents') {
        next.countries = next.countries.filter((country) => value.some((continent) => CONTINENT_COUNTRIES[continent]?.includes(country)))
      }
      return next
    })
  }

  function toggleMulti(key, value) {
    updateFilter(key, filters[key].includes(value) ? filters[key].filter((item) => item !== value) : [...filters[key], value])
  }

  async function searchRecipients() {
    setLoading(true)
    setError('')
    setMessage('')
    setSelectedEmails([])
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach((item) => params.append(`${key}[]`, item))
        } else if (typeof value === 'boolean') {
          params.append(key, value ? '1' : '0')
        } else if (value) {
          params.append(key, value)
        }
      })

      const response = await authFetch(`/mail/recipients?${params.toString()}`)
      const payload = await response.json()
      if (!response.ok) {
        setError(payload?.message ?? 'Unable to search customers.')
        return
      }
      setRecipients(payload?.data ?? [])
    } catch {
      setError('Unable to search customers.')
    } finally {
      setLoading(false)
    }
  }

  function clearFilters() {
    setFilters(initialFilters)
    setRecipients([])
    setSelectedEmails([])
    setMessage('')
    setError('')
  }

  function toggleEmail(email) {
    setSelectedEmails((current) => current.includes(email) ? current.filter((item) => item !== email) : [...current, email])
  }

  function toggleSelectAll() {
    const emails = recipients.map((recipient) => recipient.email).filter(Boolean)
    setSelectedEmails(selectedEmails.length === emails.length ? [] : emails)
  }

  async function sendMail() {
    if (selectedEmails.length === 0) {
      setError('Select at least one customer.')
      return
    }
    const bodyText = bodyEditorRef.current?.innerText?.trim() ?? ''
    if (!mail.subject.trim() || !bodyText) {
      setError('Subject and body are required.')
      return
    }

    setSending(true)
    setError('')
    setMessage('')
    try {
      const formData = new FormData()
      selectedEmails.forEach((email) => formData.append('recipients[]', email))
      formData.append('title', mail.title)
      formData.append('subject', mail.subject)
      formData.append('body', mail.body)
      formData.append('body_html', '1')
      attachments.forEach((file) => formData.append('attachments[]', file))

      const response = await authFetch('/mail/send', {
        method: 'POST',
        body: formData,
      })
      const payload = await response.json()
      if (!response.ok) {
        setError(payload?.message ?? 'Unable to send mail.')
        return
      }
      setMessage(payload?.message ?? 'Mail sent successfully.')
      setComposeOpen(false)
      setMail({ title: '', subject: '', body: '' })
      setAttachments([])
    } catch {
      setError('Unable to send mail.')
    } finally {
      setSending(false)
    }
  }

  function focusBodyEditor() {
    bodyEditorRef.current?.focus()
  }

  function runEditorCommand(command, value = null) {
    focusBodyEditor()
    document.execCommand(command, false, value)
    syncBodyFromEditor()
  }

  function syncBodyFromEditor() {
    setMail((current) => ({ ...current, body: bodyEditorRef.current?.innerHTML ?? '' }))
  }

  function insertLink() {
    const url = window.prompt('Enter link URL')
    if (!url) return
    runEditorCommand('createLink', url)
  }

  function handleAttachmentFiles(event) {
    const files = Array.from(event.target.files ?? [])
    if (files.length > 0) {
      setAttachments((current) => [...current, ...files])
    }
    event.target.value = ''
  }

  function handleImageFiles(event) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      focusBodyEditor()
      document.execCommand('insertImage', false, reader.result)
      syncBodyFromEditor()
    }
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  function removeAttachment(index) {
    setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  function discardDraft() {
    setComposeOpen(false)
    setMail({ title: '', subject: '', body: '' })
    setAttachments([])
  }

  if (!currentUser) return null

  return (
    <AdminSidebarLayout currentUser={currentUser} activeKey="mail" onLogout={handleLogout} authFetch={authFetch}>
      <section className="admin-mail-page">
        <article className="admin-mail-filter-card">
          <div className="admin-mail-card-head">
            <h2>Mail</h2>
            <div className="admin-mail-actions">
              <button type="button" className="secondary-btn" onClick={clearFilters}>Clear Filter</button>
              <button type="button" className="primary-btn" onClick={searchRecipients} disabled={loading}>{loading ? 'Searching...' : 'Search'}</button>
            </div>
          </div>

          <div className="admin-mail-row check-row">
            {[
              ['scol', 'SCOL (Existing Buyers)'],
              ['exhibition', 'Exhibition (Potential Buyers)'],
              ['defaultMail', 'Default Mail'],
              ['taxiMail', 'Taxi Mail'],
            ].map(([key, label]) => (
              <label key={key} className="mail-check"><input type="checkbox" checked={filters[key]} onChange={(event) => updateFilter(key, event.target.checked)} />{label}</label>
            ))}
          </div>

          <div className="admin-mail-row cols-3">
            <Field label="Product"><input list="mail-products" value={filters.product} onChange={(event) => updateFilter('product', event.target.value)} /><datalist id="mail-products">{products.map((product) => <option key={product} value={product} />)}</datalist></Field>
            <Field label="Zone"><MultiSelect options={Object.keys(CONTINENT_COUNTRIES)} values={filters.continents} onToggle={(value) => toggleMulti('continents', value)} placeholder="Select continents" /></Field>
            <Field label="Country"><MultiSelect options={availableCountries} values={filters.countries} onToggle={(value) => toggleMulti('countries', value)} placeholder="Select countries" /></Field>
          </div>

          <div className="admin-mail-row cols-4">
            <Field label="Style"><input value={filters.style} onChange={(event) => updateFilter('style', event.target.value)} /></Field>
            <Field label="Source"><select value={filters.source} onChange={(event) => updateFilter('source', event.target.value)}><option value="all_exhibition">All Exhibition</option><option value="scol">SCOL</option></select></Field>
            <Field label="Rating"><select value={filters.rating} onChange={(event) => updateFilter('rating', event.target.value)}><option value="all">All</option></select></Field>
            <Field label="Time Frame"><div className="mail-years"><select value={filters.years} onChange={(event) => updateFilter('years', event.target.value)}>{Array.from({ length: 10 }, (_, index) => String(index + 1)).map((year) => <option key={year} value={year}>{year}</option>)}</select><span>years</span></div></Field>
          </div>
        </article>

        {error && <p className="message error">{error}</p>}
        {message && <p className="message success">{message}</p>}

        <article className="admin-mail-results">
          <div className="admin-mail-results-head">
            <h3>Customers List</h3>
            <button type="button" className="primary-btn" onClick={() => setComposeOpen(true)} disabled={selectedEmails.length === 0 || !filters.defaultMail}>Default Mail ({selectedEmails.length})</button>
          </div>
          <div className="users-table-wrap">
            <table className="users-table">
              <thead>
                <tr><th><input type="checkbox" aria-label="Select all customers" checked={recipients.length > 0 && selectedEmails.length === recipients.filter((item) => item.email).length} onChange={toggleSelectAll} /></th><th>Customer</th><th>Email</th><th>Country</th><th>Products</th><th>Last Booking</th></tr>
              </thead>
              <tbody>
                {recipients.map((recipient) => (
                  <tr key={recipient.email || recipient.name}>
                    <td><input type="checkbox" checked={selectedEmails.includes(recipient.email)} onChange={() => toggleEmail(recipient.email)} disabled={!recipient.email} /></td>
                    <td>{recipient.name}</td>
                    <td>{recipient.email || '-'}</td>
                    <td>{recipient.country || '-'}</td>
                    <td>{recipient.products?.join(', ') || '-'}</td>
                    <td>{recipient.last_booking_at || '-'}</td>
                  </tr>
                ))}
                {!loading && recipients.length === 0 && <tr><td colSpan="6">Search to display customers.</td></tr>}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      {composeOpen && (
        <div className="mail-compose-overlay" role="dialog" aria-modal="true">
          <div className="admin-mail-compose">
            <div className="admin-mail-compose-header">
              <h3>New Message</h3>
              <button type="button" className="admin-mail-compose-close" onClick={() => setComposeOpen(false)} aria-label="Close">x</button>
            </div>
            <div className="admin-mail-compose-recipients">
              <span>To</span>
              <div>{selectedEmails.join(', ')}</div>
            </div>
            <input
              className="admin-mail-compose-subject"
              value={mail.subject}
              onChange={(event) => setMail({ ...mail, subject: event.target.value })}
              placeholder="Subject"
            />
            <input
              className="admin-mail-compose-title"
              value={mail.title}
              onChange={(event) => setMail({ ...mail, title: event.target.value })}
              placeholder="Title"
            />
            <div
              className="admin-mail-compose-body"
              ref={bodyEditorRef}
              contentEditable
              role="textbox"
              aria-label="Compose email"
              data-placeholder="Compose email"
              onInput={syncBodyFromEditor}
              suppressContentEditableWarning
            />
            {attachments.length > 0 ? (
              <div className="admin-mail-attachments">
                {attachments.map((file, index) => (
                  <span key={`${file.name}-${index}`} className="admin-mail-attachment-chip">
                    {file.name}
                    <button type="button" onClick={() => removeAttachment(index)} aria-label={`Remove ${file.name}`}>x</button>
                  </span>
                ))}
              </div>
            ) : null}
            <div className="admin-mail-compose-actions">
              <button type="button" className="admin-mail-send-btn" onClick={sendMail} disabled={sending}>{sending ? 'Sending...' : 'Send'}</button>
              <div className="admin-mail-compose-toolbar" aria-label="Compose tools">
                <button type="button" title="Formatting options" onClick={() => runEditorCommand('removeFormat')}><span>A</span></button>
                <button type="button" title="Bold" onClick={() => runEditorCommand('bold')}><strong>B</strong></button>
                <button type="button" title="Italic" onClick={() => runEditorCommand('italic')}><em>I</em></button>
                <button type="button" title="Underline" onClick={() => runEditorCommand('underline')}><u>U</u></button>
                <button type="button" title="Text color" onClick={() => colorInputRef.current?.click()}><span className="mail-tool-color">A</span></button>
                <button type="button" title="Attach file" onClick={() => attachmentInputRef.current?.click()}><PaperclipIcon /></button>
                <button type="button" title="Insert link" onClick={insertLink}><LinkIcon /></button>
                <button type="button" title="Insert image" onClick={() => imageInputRef.current?.click()}><ImageIcon /></button>
                <button type="button" title="More options" onClick={() => runEditorCommand('insertUnorderedList')}><MoreIcon /></button>
              </div>
              <button type="button" className="admin-mail-discard-btn" onClick={discardDraft} disabled={sending} title="Discard draft"><TrashIcon /></button>
              <input ref={attachmentInputRef} type="file" multiple className="admin-mail-hidden-input" onChange={handleAttachmentFiles} />
              <input ref={imageInputRef} type="file" accept="image/*" className="admin-mail-hidden-input" onChange={handleImageFiles} />
              <input ref={colorInputRef} type="color" className="admin-mail-hidden-input" onChange={(event) => runEditorCommand('foreColor', event.target.value)} />
            </div>
          </div>
        </div>
      )}
    </AdminSidebarLayout>
  )
}

function Field({ label, children }) {
  return <label className="admin-mail-field"><span>{label}</span>{children}</label>
}

function MultiSelect({ options, values, onToggle, placeholder }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    function handlePointerDown(event) {
      if (!wrapRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  return (
    <div className={`mail-multi${open ? ' open' : ''}`} ref={wrapRef}>
      <button type="button" className="mail-multi-summary" onClick={() => setOpen((value) => !value)}>
        {values.length > 0 ? values.join(', ') : placeholder}
      </button>
      {open ? (
        <div className="mail-multi-options">
          {options.map((option) => <label key={option}><input type="checkbox" checked={values.includes(option)} onChange={() => onToggle(option)} />{option}</label>)}
        </div>
      ) : null}
    </div>
  )
}

function PaperclipIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21.4 11.6-8.8 8.8a6 6 0 0 1-8.5-8.5l9.5-9.5a4 4 0 0 1 5.7 5.7l-9.6 9.6a2 2 0 0 1-2.8-2.8l8.9-8.9" /></svg>
}

function LinkIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1" /><path d="M14 11a5 5 0 0 0-7.1 0l-2 2A5 5 0 0 0 12 20.1l1.1-1.1" /></svg>
}

function ImageIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v14H4z" /><path d="m4 15 4-4 4 4 3-3 5 5" /><path d="M15 9h.01" /></svg>
}

function MoreIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5h.01M12 12h.01M12 19h.01" /></svg>
}

function TrashIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16" /><path d="M10 11v6M14 11v6" /><path d="M6 7l1 14h10l1-14" /><path d="M9 7V4h6v3" /></svg>
}

export default AdminMailPage
