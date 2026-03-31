import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminSidebarLayout from '../components/layout/AdminSidebarLayout'
import { useAuth } from '../context/AuthContext'
import { DROPDOWN_FIELD_GROUPS, buildConfigMap, getFieldOptions, normalizeOptions } from '../utils/dropdownData'

function DataPage() {
  const navigate = useNavigate()
  const { currentUser, authFetch, logout } = useAuth()
  const [configMap, setConfigMap] = useState({})
  const [usersByRole, setUsersByRole] = useState({ customer: [], vendor: [] })
  const [drafts, setDrafts] = useState({})
  const [previewSelection, setPreviewSelection] = useState({})
  const [loading, setLoading] = useState(false)
  const [savingField, setSavingField] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [toast, setToast] = useState('')
  const [activeGroupKey, setActiveGroupKey] = useState('')

  const resources = useMemo(() => ({ configMap, countries: [], usersByRole }), [configMap, usersByRole])
  const visibleGroups = useMemo(
    () => DROPDOWN_FIELD_GROUPS.map((group) => ({ ...group, fields: group.fields.filter((field) => field.source !== 'countries') })),
    [],
  )
  const activeGroup = useMemo(
    () => visibleGroups.find((group) => group.key === activeGroupKey) ?? visibleGroups[0] ?? null,
    [activeGroupKey, visibleGroups],
  )
  const pageStats = useMemo(() => {
    const fields = visibleGroups.flatMap((group) => group.fields)
    const configFields = fields.filter((field) => field.source === 'config')
    const managedOptions = configFields.reduce((count, field) => count + normalizeOptions(drafts[field.key] ?? getFieldOptions(field, resources)).length, 0)

    return [
      { label: 'Groups', value: visibleGroups.length },
      { label: 'Fields', value: fields.length },
      { label: 'Config Fields', value: configFields.length },
      { label: 'Managed Options', value: managedOptions },
    ]
  }, [drafts, resources, visibleGroups])

  useEffect(() => {
    if (!activeGroupKey && visibleGroups[0]) {
      setActiveGroupKey(visibleGroups[0].key)
    }
  }, [activeGroupKey, visibleGroups])

  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(''), 2200)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!currentUser) return
    if (currentUser.role !== 'admin') {
      navigate('/dashboard', { replace: true })
      return
    }
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, navigate])

  async function loadData() {
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const [configResponse, customerResponse, vendorResponse] = await Promise.all([
        authFetch('/configs'),
        authFetch('/users?role=customer&per_page=100'),
        authFetch('/users?role=vendor&per_page=100'),
      ])

      const [configPayload, customerPayload, vendorPayload] = await Promise.all([
        configResponse.json(),
        customerResponse.json(),
        vendorResponse.json(),
      ])

      const nextConfigMap = configResponse.ok ? buildConfigMap(configPayload?.data) : {}
      const nextUsersByRole = {
        customer: customerResponse.ok ? extractUserNames(customerPayload?.data) : [],
        vendor: vendorResponse.ok ? extractUserNames(vendorPayload?.data) : [],
      }

      setConfigMap(nextConfigMap)
      setUsersByRole(nextUsersByRole)
      setDrafts(buildDrafts(visibleGroups, nextConfigMap, nextUsersByRole))
      setPreviewSelection({})
      setToast('Data loaded')
    } catch {
      setError('Unable to load data resources.')
    } finally {
      setLoading(false)
    }
  }

  function handleAddOption(fieldKey, value) {
    setDrafts((current) => ({
      ...current,
      [fieldKey]: normalizeOptions([...(current[fieldKey] ?? []), value]),
    }))
  }

  function handleRemoveOptionByValue(fieldKey, value) {
    setDrafts((current) => ({
      ...current,
      [fieldKey]: (current[fieldKey] ?? []).filter((option) => option !== value),
    }))
  }

  async function handleSaveField(field) {
    if (field.source !== 'config') return

    const data = normalizeOptions(drafts[field.key] ?? [])

    setSavingField(field.key)
    setError('')
    setMessage('')

    try {
      const existingConfig = configMap[field.type]
      const response = await authFetch(existingConfig ? `/configs/${existingConfig.id}` : '/configs', {
        method: existingConfig ? 'PUT' : 'POST',
        body: JSON.stringify({ type: field.type, data }),
      })
      const payload = await response.json()

      if (!response.ok) {
        const firstValidationMessage = payload?.errors ? Object.values(payload.errors)?.[0]?.[0] : null
        setError(firstValidationMessage ?? payload?.message ?? `Unable to save ${field.label}.`)
        return
      }

      const savedConfig = payload?.data
      setConfigMap((current) => ({ ...current, [savedConfig.type]: savedConfig }))
      setDrafts((current) => ({ ...current, [field.key]: normalizeOptions(savedConfig?.data) }))
      setMessage('Data saved')
      setToast('Data saved')
    } catch {
      setError(`Unable to save ${field.label}.`)
    } finally {
      setSavingField('')
    }
  }

  async function handleLogout() {
    await logout()
    navigate('/', { replace: true })
  }

  if (!currentUser || currentUser.role !== 'admin') return null

  return (
    <AdminSidebarLayout
      currentUser={currentUser}
      title="Data"
      activeKey="data"
      onLogout={handleLogout}
    >
      <div className="transaction-page data-page">
        {toast ? <div className="data-toast">{toast}</div> : null}

        <section className="txn-panel txn-top data-page-header">
          <div className="data-page-header-copy">
            <span className="data-page-eyebrow">Dropdown Resource Center</span>
            <h5>Data</h5>
            <p>Manage dropdown options by category. Each field shows where it is used, and config-backed values can be updated with row-based dropdown option editors.</p>
          </div>
          <button type="button" className="secondary-btn" onClick={loadData} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </section>

        <section className="data-hero-strip" aria-label="Data page summary">
          {pageStats.map((stat) => (
            <article key={stat.label} className="data-stat-card">
              <span className="data-stat-value">{stat.value}</span>
              <span className="data-stat-label">{stat.label}</span>
            </article>
          ))}
        </section>

        {message && <p className="message success">{message}</p>}
        {error && <p className="message error">{error}</p>}

        <section className="data-section-switcher">
          {visibleGroups.map((group) => (
            <button
              key={group.key}
              type="button"
              className={`data-section-btn${activeGroup?.key === group.key ? ' active' : ''}`}
              onClick={() => setActiveGroupKey(group.key)}
            >
              <span>{group.title}</span>
              <small>{group.fields.length} fields</small>
            </button>
          ))}
        </section>

        {activeGroup ? (
          <section className="txn-col data-group-card">
            <div className="txn-section-title data-group-title">
              <h5>{activeGroup.title}</h5>
              <p>Click a field below to search, add, or remove values in one place before saving updates.</p>
            </div>
            <div className="data-field-grid">
              {activeGroup.fields.map((field) => {
                const options = getFieldOptions(field, resources)
                const isConfigField = field.source === 'config'
                const draftOptions = drafts[field.key] ?? options
                const normalizedDraftOptions = normalizeOptions(draftOptions)

                return (
                  <article key={field.key} className="txn-panel data-field-card">
                    <div className="data-field-top">
                      <div className="data-field-head">
                        <strong>{field.label}</strong>
                        <span className={`data-source-badge data-source-${field.source}`}>{sourceLabel(field)}</span>
                      </div>
                      <div className="data-field-meta">Reflects on: {(field.pages ?? ['New Booking']).join(', ')}</div>
                    </div>

                    {isConfigField ? (
                      <>
                        <OptionManager
                          fieldKey={field.key}
                          options={normalizedDraftOptions}
                          selectedValue={previewSelection[field.key] ?? ''}
                          onChangeSelection={(value) => setPreviewSelection((current) => ({ ...current, [field.key]: value }))}
                          onAddOption={(value) => handleAddOption(field.key, value)}
                          onRemoveOption={(value) => handleRemoveOptionByValue(field.key, value)}
                        />

                        <div className="data-field-actions">
                          <span>{normalizedDraftOptions.length} option{normalizedDraftOptions.length === 1 ? '' : 's'}</span>
                          <button
                            type="button"
                            className="primary-btn"
                            onClick={() => handleSaveField(field)}
                            disabled={savingField === field.key}
                          >
                            {savingField === field.key ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      </>
                    ) : (
                      <ReadonlyOptionBrowser
                        fieldKey={field.key}
                        options={options}
                        selectedValue={previewSelection[field.key] ?? ''}
                        onChangeSelection={(value) => setPreviewSelection((current) => ({ ...current, [field.key]: value }))}
                      />
                    )}
                  </article>
                )
              })}
            </div>
          </section>
        ) : null}
      </div>
    </AdminSidebarLayout>
  )
}

function buildDrafts(groups, configMap, usersByRole) {
  const resources = { configMap, countries: [], usersByRole }

  return Object.fromEntries(
    groups.flatMap((group) => group.fields)
      .filter((field) => field.source === 'config')
      .map((field) => [field.key, getFieldOptions(field, resources)]),
  )
}

function extractUserNames(users) {
  if (!Array.isArray(users)) return []
  return normalizeOptions(users.map((user) => (typeof user?.name === 'string' ? user.name : '')))
}

function OptionManager({ fieldKey, options, selectedValue, onChangeSelection, onAddOption, onRemoveOption }) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const normalizedSearch = search.trim().toLowerCase()
  const filteredOptions = options.filter((option) => option.toLowerCase().includes(normalizedSearch))
  const canAdd = search.trim() !== '' && !options.some((option) => option.toLowerCase() === normalizedSearch)
  const triggerLabel = selectedValue || 'Select or add option'

  function handleAdd() {
    if (!canAdd) return
    const value = search.trim()
    onAddOption(value)
    onChangeSelection(value)
    setSearch('')
    setOpen(true)
  }

  return (
    <div className="data-option-stack">
      <button
        type="button"
        className={`data-combobox-trigger${open ? ' is-open' : ''}`}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={`${fieldKey}-menu`}
      >
        <span>{triggerLabel}</span>
        <ChevronIcon className={`sidebar-chevron transition-rotate ${open ? 'rotate-90' : ''}`} />
      </button>

      {open ? (
        <div className="data-combobox-panel" id={`${fieldKey}-menu`}>
          <div className="data-combobox-search-row">
            <span className="data-combobox-search-icon" aria-hidden="true">
              Search
            </span>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  handleAdd()
                }
              }}
              placeholder="Search or type a new option"
            />
            <button type="button" className="data-combobox-add-btn" onClick={handleAdd} disabled={!canAdd}>
              Add
            </button>
          </div>

          <div className="data-combobox-list">
            {canAdd ? (
              <button type="button" className="data-combobox-item data-combobox-add" onClick={handleAdd}>
                Add "{search.trim()}"
              </button>
            ) : null}

            {filteredOptions.length ? filteredOptions.map((option) => (
              <div key={option} className={`data-combobox-item-row${selectedValue === option ? ' selected' : ''}`}>
                <button
                  type="button"
                  className="data-combobox-item"
                  onClick={() => {
                    onChangeSelection(option)
                    setOpen(false)
                  }}
                >
                  {option}
                </button>
                <button
                  type="button"
                  className="data-combobox-remove"
                  onClick={() => {
                    onRemoveOption(option)
                    if (selectedValue === option) {
                      onChangeSelection('')
                    }
                  }}
                  aria-label={`Delete ${option}`}
                >
                  X
                </button>
              </div>
            )) : <span className="data-empty-text">No matching options.</span>}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function ReadonlyOptionBrowser({ fieldKey, options, selectedValue, onChangeSelection }) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const normalizedSearch = search.trim().toLowerCase()
  const filteredOptions = options.filter((option) => option.toLowerCase().includes(normalizedSearch))

  return (
    <div className="data-option-stack">
      <button
        type="button"
        className={`data-combobox-trigger data-combobox-trigger-readonly${open ? ' is-open' : ''}`}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={`${fieldKey}-readonly-menu`}
      >
        <span>{selectedValue || 'Preview available options'}</span>
        <ChevronIcon className={`sidebar-chevron transition-rotate ${open ? 'rotate-90' : ''}`} />
      </button>

      {open ? (
        <div className="data-combobox-panel" id={`${fieldKey}-readonly-menu`}>
          <div className="data-combobox-search-row">
            <span className="data-combobox-search-icon" aria-hidden="true">
              Search
            </span>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search options"
            />
          </div>

          <div className="data-combobox-list">
            {filteredOptions.length ? filteredOptions.map((option) => (
              <button
                key={option}
                type="button"
                className={`data-combobox-item${selectedValue === option ? ' selected' : ''}`}
                onClick={() => {
                  onChangeSelection(option)
                  setOpen(false)
                }}
              >
                {option}
              </button>
            )) : <span className="data-empty-text">No matching options.</span>}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function sourceLabel(field) {
  if (field.source === 'config') return 'Config'
  if (field.source === 'users') return `${field.role === 'vendor' ? 'Vendor' : 'Customer'} Users`
  return 'Resource'
}

function ChevronIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  )
}

export default DataPage
