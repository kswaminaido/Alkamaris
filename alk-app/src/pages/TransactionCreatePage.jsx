import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AdminSidebarLayout from '../components/layout/AdminSidebarLayout'
import { useAuth } from '../context/AuthContext'
import { DROPDOWN_FIELD_GROUPS, buildConfigMap, getFieldOptions } from '../utils/dropdownData'
import { FALLBACK_COUNTRIES, fetchCountryOptions, mergeCountryOptions } from '../utils/countries'

function getTodayInputValue() {
  const now = new Date()
  const local = new Date(now.getTime() - (now.getTimezoneOffset() * 60 * 1000))
  return local.toISOString().slice(0, 10)
}

function generateBookingNo(dateValue = getTodayInputValue()) {
  const date = new Date(`${dateValue}T00:00:00`)
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date
  const month = String(safeDate.getMonth() + 1).padStart(2, '0')
  const year = String(safeDate.getFullYear()).slice(-2)
  const suffix = String(Math.floor(Math.random() * 1000000)).padStart(6, '0')
  return `ALK${month}${year}${suffix}`
}

function buildInitialForm() {
  const issueDate = getTodayInputValue()

  return {
    transaction: {
      booking_no: generateBookingNo(issueDate),
      issue_date: issueDate,
      sales_person_id: '',
      product_origin: 'India (Singapore)',
      destination: '',
      category: '',
      type: '',
      certified: 'No',
      country: '',
      container_primary: '',
      container_secondary: '',
      net_margin: '',
      booking_mode: 'trade_commission',
    },
    general_info_customer: {
      customer: '', attention: '', ship_to: '', buyer: '', buyer_number: '', end_customer: '', prices_customer_type: '',
      prices_customer_rate: '', payment_customer_type: '', payment_customer_term: '', payment_customer_advance_percent: '',
      description: '', tolerance: '', marketing_fee: false,
    },
    general_info_packer: {
      vendor: '', packer_name: '', packer_number: '', packed_by: '', prices_packer_type: '', prices_packer_rate: '',
      payment_packer_type: '', payment_packer_term: '', payment_packer_advance_percent: '', description: '',
      tolerance: '', total_lqd_price: '', consignee: '',
    },
    revenue_customer: {
      total_selling_value: '', total_selling_currency: 'USD', commission_enabled: false, commission_percent: '', amount: '',
      amount_currency: 'USD', description: '', rebate_memo_amount: '', rebate_memo_description: '', overcharge_sc_amount: '',
      overcharge_sc_description: '',
    },
    revenue_packer: {
      total_buying_value: '', total_buying_currency: 'USD', commission_enabled: false, commission_percent: '', amount: '',
      amount_currency: 'USD', description: '', overcharge_sc_amount: '', overcharge_sc_description: '',
    },
    cash_flow_customer: { date_advance: '', amount_advance: '', date_balance: '', amount_balance: '' },
    cash_flow_packer: { date_advance: '', amount_advance: '', date_balance: '', amount_balance: '' },
    shipping_details_customer: { lsd_min: '', lsd_max: '', presentation_days: '', lc_expiry: '', req_eta: '' },
    shipping_details_packer: { lsd_min: '', lsd_max: '', presentation_days: '', lc_expiry: '', req_eta: '' },
    notes: { by_sales: '' },
  }
}

function TransactionCreatePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { currentUser, authFetch, logout } = useAuth()
  const [form, setForm] = useState(() => buildInitialForm())
  const [countries, setCountries] = useState(FALLBACK_COUNTRIES)
  const [customers, setCustomers] = useState([])
  const [vendors, setVendors] = useState([])
  const [dropdownConfigMap, setDropdownConfigMap] = useState({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const dropdownFieldMap = useMemo(
    () => Object.fromEntries(DROPDOWN_FIELD_GROUPS.flatMap((group) => group.fields.map((field) => [field.key, field]))),
    [],
  )
  const dropdownResources = useMemo(
    () => ({ configMap: dropdownConfigMap, countries, usersByRole: { customer: customers, vendor: vendors } }),
    [countries, customers, dropdownConfigMap, vendors],
  )

  const pageTitle = useMemo(() => (
    form.transaction.booking_mode === 'qc_services' ? 'QC Services Booking' : 'New Booking'
  ), [form.transaction.booking_mode])

  useEffect(() => {
    if (!currentUser) return
    if (currentUser.role !== 'admin') {
      navigate('/dashboard', { replace: true })
      return
    }

    const mode = searchParams.get('mode')
    const bookingMode = mode === 'trade_commission' || mode === 'qc_services' ? mode : 'trade_commission'

    setForm((previous) => {
      const issueDate = previous.transaction.issue_date || getTodayInputValue()

      return {
        ...previous,
        transaction: {
          ...previous.transaction,
          booking_mode: bookingMode,
          booking_no: previous.transaction.booking_no || generateBookingNo(issueDate),
          issue_date: issueDate,
          sales_person_id: currentUser.id ?? '',
          product_origin: previous.transaction.product_origin || 'India (Singapore)',
        },
      }
    })

    loadBookingParties()
    loadCountries()
    loadDropdownConfigs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, searchParams, navigate])

  async function loadBookingParties() {
    try {
      const [customerResponse, vendorResponse] = await Promise.all([
        authFetch('/users?role=customer&per_page=100'),
        authFetch('/users?role=vendor&per_page=100'),
      ])

      const [customerPayload, vendorPayload] = await Promise.all([
        customerResponse.json(),
        vendorResponse.json(),
      ])

      setCustomers(customerResponse.ok ? extractUserNames(customerPayload?.data) : [])
      setVendors(vendorResponse.ok ? extractUserNames(vendorPayload?.data) : [])
    } catch {
      setCustomers([])
      setVendors([])
    }
  }

  async function loadCountries() {
    setCountries(await fetchCountryOptions())
  }

  async function loadDropdownConfigs() {
    try {
      const response = await authFetch('/configs')
      const payload = await response.json()
      setDropdownConfigMap(response.ok ? buildConfigMap(payload?.data) : {})
    } catch {
      setDropdownConfigMap({})
    }
  }

  function setValue(section, field, value) {
    setForm((previous) => ({ ...previous, [section]: { ...previous[section], [field]: value } }))
  }

  function optionsFor(fieldKey) {
    const field = dropdownFieldMap[fieldKey]
    return field ? getFieldOptions(field, dropdownResources) : []
  }

  async function onLogout() {
    await logout()
    navigate('/', { replace: true })
  }

  async function onSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')

    const payload = JSON.parse(JSON.stringify(form))
    payload.transaction.booking_no = payload.transaction.booking_no || generateBookingNo(payload.transaction.issue_date)
    payload.transaction.issue_date = getTodayInputValue()
    payload.transaction.sales_person_id = currentUser?.id ?? null
    payload.transaction.product_origin = payload.transaction.product_origin || 'India (Singapore)'
    payload.transaction.certified = payload.transaction.certified === 'Yes'

    try {
      const response = await authFetch('/transactions', { method: 'POST', body: JSON.stringify(payload) })
      const body = await response.json()

      if (!response.ok) {
        const firstValidationMessage = body?.errors ? Object.values(body.errors)?.[0]?.[0] : null
        setError(firstValidationMessage ?? body?.message ?? 'Unable to create transaction.')
      } else {
        setMessage(`Transaction ${body?.data?.booking_no ?? ''} created successfully.`)
        navigate('/transactions', { replace: true })
      }
    } catch {
      setError('Unable to create transaction.')
    } finally {
      setSaving(false)
    }
  }

  if (!currentUser || currentUser.role !== 'admin') return null

  return (
    <AdminSidebarLayout
      currentUser={currentUser}
      title={pageTitle}
      activeKey={form.transaction.booking_mode === 'qc_services' ? 'new_booking_qc' : 'new_booking_trade'}
      onLogout={onLogout}
    >
      <form className="transaction-page" onSubmit={onSubmit}>
        <section className="txn-panel txn-top">
          <h5>TRANSACTION DETAILS</h5>
          <TxHeader form={form} setValue={setValue} currentUser={currentUser} optionsFor={optionsFor} />
        </section>
        <section className="txn-double-grid">
          <TxnColumn title="GENERAL INFO" side="CUSTOMER"><GeneralCustomer form={form} setValue={setValue} customers={customers} optionsFor={optionsFor} /></TxnColumn>
          <TxnColumn title="GENERAL INFO" side="PACKER"><GeneralPacker form={form} setValue={setValue} vendors={vendors} optionsFor={optionsFor} /></TxnColumn>
          <TxnColumn title="REVENUE" side="CUSTOMER"><RevenueCustomer form={form} setValue={setValue} optionsFor={optionsFor} /></TxnColumn>
          <TxnColumn title="REVENUE" side="PACKER"><RevenuePacker form={form} setValue={setValue} optionsFor={optionsFor} /></TxnColumn>
          <TxnColumn title="CASH FLOW" side="CUSTOMER"><CashFlow section="cash_flow_customer" form={form} setValue={setValue} /></TxnColumn>
          <TxnColumn title="CASH FLOW" side="PACKER"><CashFlow section="cash_flow_packer" form={form} setValue={setValue} /></TxnColumn>
          <TxnColumn title="SHIPPING DETAILS" side="CUSTOMER"><Shipping section="shipping_details_customer" form={form} setValue={setValue} /></TxnColumn>
          <TxnColumn title="SHIPPING DETAILS" side="PACKER"><Shipping section="shipping_details_packer" form={form} setValue={setValue} /></TxnColumn>
        </section>
        <TxnColumn title="NOTES" side=""><Row label="By Sale"><textarea rows="3" value={form.notes.by_sales} onChange={(e) => setValue('notes', 'by_sales', e.target.value)} /></Row></TxnColumn>
        <div className="txn-actions">
          <button type="submit" className="primary-btn" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          <button type="button" className="icon-btn" title="Print" onClick={() => window.print()}><SvgPrint /></button>
          <button type="button" className="icon-btn" title="List" onClick={() => navigate('/transactions')}><SvgList /></button>
        </div>
        {message && <p className="message success">{message}</p>}
        {error && <p className="message error">{error}</p>}
      </form>
    </AdminSidebarLayout>
  )
}

function TxHeader({ form, setValue, currentUser, optionsFor }) {
  const salesPersonName = currentUser?.name || currentUser?.email || ''
  const productOriginOptions = mergeCountryOptions(optionsFor('transaction.product_origin'), 'India (Singapore)')
  const destinationOptions = optionsFor('transaction.destination')

  return (
    <div className="txn-grid cols-4">
      <Field label="Booking No."><input value={form.transaction.booking_no} disabled className="txn-readonly" /></Field>
      <Field label="Issue Date"><input type="date" value={form.transaction.issue_date} disabled className="txn-readonly" /></Field>
      <Field label="Category"><Select value={form.transaction.category} list={optionsFor('transaction.category')} onChange={(value) => setValue('transaction', 'category', value)} /></Field>
      <Field label="Country"><Select value={form.transaction.country} list={optionsFor('transaction.country')} onChange={(value) => setValue('transaction', 'country', value)} /></Field>
      <Field label="Sales Person"><input value={salesPersonName} disabled className="txn-readonly" /></Field>
      <Field label="Product Origin"><Select value={form.transaction.product_origin} list={productOriginOptions} onChange={(value) => setValue('transaction', 'product_origin', value)} /></Field>
      <Field label="Type"><Select value={form.transaction.type} list={optionsFor('transaction.type')} onChange={(value) => setValue('transaction', 'type', value)} /></Field>
      <Field label="Container">
        <div className="txn-container-split">
          <input
            className="txn-container-small"
            placeholder="Size"
            value={form.transaction.container_primary}
            onChange={(e) => setValue('transaction', 'container_primary', e.target.value)}
          />
          <input
            className="txn-container-large"
            placeholder="Container details"
            value={form.transaction.container_secondary}
            onChange={(e) => setValue('transaction', 'container_secondary', e.target.value)}
          />
        </div>
      </Field>
      <Field label="Destination"><Select value={form.transaction.destination} list={destinationOptions} onChange={(value) => setValue('transaction', 'destination', value)} /></Field>
      <Field label="Certified"><Select value={form.transaction.certified} list={optionsFor('transaction.certified')} onChange={(value) => setValue('transaction', 'certified', value)} /></Field>
      <Field label="Net Margin"><input type="number" step="0.01" value={form.transaction.net_margin} onChange={(e) => setValue('transaction', 'net_margin', e.target.value)} /></Field>
    </div>
  )
}

function GeneralCustomer({ form, setValue, customers, optionsFor }) { return (<div className="txn-panel"><Row label="Customer"><SearchableSelect value={form.general_info_customer.customer} list={customers} onChange={(v) => setValue('general_info_customer', 'customer', v)} /></Row><Row label="Attn"><Select value={form.general_info_customer.attention} list={optionsFor('general_info_customer.attention')} onChange={(v) => setValue('general_info_customer', 'attention', v)} /></Row><Row label="Shipto"><Select value={form.general_info_customer.ship_to} list={optionsFor('general_info_customer.ship_to')} onChange={(v) => setValue('general_info_customer', 'ship_to', v)} /></Row><Row label="Buyer's"><Select value={form.general_info_customer.buyer} list={optionsFor('general_info_customer.buyer')} onChange={(v) => setValue('general_info_customer', 'buyer', v)} /><input placeholder="#" value={form.general_info_customer.buyer_number} onChange={(e) => setValue('general_info_customer', 'buyer_number', e.target.value)} /></Row><Row label="End Customer"><Select value={form.general_info_customer.end_customer} list={optionsFor('general_info_customer.end_customer')} onChange={(v) => setValue('general_info_customer', 'end_customer', v)} /></Row><Row label="Prices Customer"><Select value={form.general_info_customer.prices_customer_type} list={optionsFor('general_info_customer.prices_customer_type')} onChange={(v) => setValue('general_info_customer', 'prices_customer_type', v)} /><input type="number" placeholder="@" value={form.general_info_customer.prices_customer_rate} onChange={(e) => setValue('general_info_customer', 'prices_customer_rate', e.target.value)} /></Row><Row label="Payment Customer"><Select value={form.general_info_customer.payment_customer_type} list={optionsFor('general_info_customer.payment_customer_type')} onChange={(v) => setValue('general_info_customer', 'payment_customer_type', v)} /><Select value={form.general_info_customer.payment_customer_term} list={optionsFor('general_info_customer.payment_customer_term')} onChange={(v) => setValue('general_info_customer', 'payment_customer_term', v)} /><input type="number" placeholder="Adv %" value={form.general_info_customer.payment_customer_advance_percent} onChange={(e) => setValue('general_info_customer', 'payment_customer_advance_percent', e.target.value)} /></Row><Row label="Description"><textarea rows="3" value={form.general_info_customer.description} onChange={(e) => setValue('general_info_customer', 'description', e.target.value)} /></Row><Row label="Tolerance"><Select value={form.general_info_customer.tolerance} list={optionsFor('general_info_customer.tolerance')} onChange={(v) => setValue('general_info_customer', 'tolerance', v)} /></Row><Row label="Marketing Fee"><label className="inline-checkbox"><input type="checkbox" checked={form.general_info_customer.marketing_fee} onChange={(e) => setValue('general_info_customer', 'marketing_fee', e.target.checked)} />Yes</label></Row></div>) }
function GeneralPacker({ form, setValue, vendors, optionsFor }) { return (<div className="txn-panel"><Row label="Vendor"><SearchableSelect value={form.general_info_packer.vendor} list={vendors} onChange={(v) => setValue('general_info_packer', 'vendor', v)} /></Row><Row label="Packer's"><Select value={form.general_info_packer.packer_name} list={optionsFor('general_info_packer.packer_name')} onChange={(v) => setValue('general_info_packer', 'packer_name', v)} /><input placeholder="#" value={form.general_info_packer.packer_number} onChange={(e) => setValue('general_info_packer', 'packer_number', e.target.value)} /></Row><Row label="Packed By"><Select value={form.general_info_packer.packed_by} list={optionsFor('general_info_packer.packed_by')} onChange={(v) => setValue('general_info_packer', 'packed_by', v)} /></Row><Row label="Prices Packer"><Select value={form.general_info_packer.prices_packer_type} list={optionsFor('general_info_packer.prices_packer_type')} onChange={(v) => setValue('general_info_packer', 'prices_packer_type', v)} /><input type="number" placeholder="@" value={form.general_info_packer.prices_packer_rate} onChange={(e) => setValue('general_info_packer', 'prices_packer_rate', e.target.value)} /></Row><Row label="Payment Packer"><Select value={form.general_info_packer.payment_packer_type} list={optionsFor('general_info_packer.payment_packer_type')} onChange={(v) => setValue('general_info_packer', 'payment_packer_type', v)} /><Select value={form.general_info_packer.payment_packer_term} list={optionsFor('general_info_packer.payment_packer_term')} onChange={(v) => setValue('general_info_packer', 'payment_packer_term', v)} /><input type="number" placeholder="Adv %" value={form.general_info_packer.payment_packer_advance_percent} onChange={(e) => setValue('general_info_packer', 'payment_packer_advance_percent', e.target.value)} /></Row><Row label="Description"><textarea rows="3" value={form.general_info_packer.description} onChange={(e) => setValue('general_info_packer', 'description', e.target.value)} /></Row><Row label="Tolerance"><Select value={form.general_info_packer.tolerance} list={optionsFor('general_info_packer.tolerance')} onChange={(v) => setValue('general_info_packer', 'tolerance', v)} /><span className="row-text">Total Lqd Price</span><input type="number" readOnly value={form.general_info_packer.total_lqd_price} /></Row><Row label="Consignee"><Select value={form.general_info_packer.consignee} list={optionsFor('general_info_packer.consignee')} onChange={(v) => setValue('general_info_packer', 'consignee', v)} /></Row></div>) }
function RevenueCustomer({ form, setValue, optionsFor }) { return (<div className="txn-panel"><Row label="Total Selling Value"><input type="number" value={form.revenue_customer.total_selling_value} onChange={(e) => setValue('revenue_customer', 'total_selling_value', e.target.value)} /><Select value={form.revenue_customer.total_selling_currency} list={optionsFor('revenue_customer.total_selling_currency')} onChange={(v) => setValue('revenue_customer', 'total_selling_currency', v)} /></Row><Row label="Commission"><Radio checked={form.revenue_customer.commission_enabled} onChange={(v) => setValue('revenue_customer', 'commission_enabled', v)} /><input type="number" placeholder="Percent" value={form.revenue_customer.commission_percent} onChange={(e) => setValue('revenue_customer', 'commission_percent', e.target.value)} /></Row><Row label="Amount"><input type="number" value={form.revenue_customer.amount} onChange={(e) => setValue('revenue_customer', 'amount', e.target.value)} /><Select value={form.revenue_customer.amount_currency} list={optionsFor('revenue_customer.amount_currency')} onChange={(v) => setValue('revenue_customer', 'amount_currency', v)} /></Row><Row label="Description"><textarea rows="2" value={form.revenue_customer.description} onChange={(e) => setValue('revenue_customer', 'description', e.target.value)} /></Row><Row label="Rebate Memo"><input type="number" placeholder="Amount" value={form.revenue_customer.rebate_memo_amount} onChange={(e) => setValue('revenue_customer', 'rebate_memo_amount', e.target.value)} /><input placeholder="Description" value={form.revenue_customer.rebate_memo_description} onChange={(e) => setValue('revenue_customer', 'rebate_memo_description', e.target.value)} /></Row><Row label="Overcharge SC"><input type="number" placeholder="Amount" value={form.revenue_customer.overcharge_sc_amount} onChange={(e) => setValue('revenue_customer', 'overcharge_sc_amount', e.target.value)} /><input placeholder="Description" value={form.revenue_customer.overcharge_sc_description} onChange={(e) => setValue('revenue_customer', 'overcharge_sc_description', e.target.value)} /></Row></div>) }
function RevenuePacker({ form, setValue, optionsFor }) { return (<div className="txn-panel"><Row label="Total Buying Value"><input type="number" value={form.revenue_packer.total_buying_value} onChange={(e) => setValue('revenue_packer', 'total_buying_value', e.target.value)} /><Select value={form.revenue_packer.total_buying_currency} list={optionsFor('revenue_packer.total_buying_currency')} onChange={(v) => setValue('revenue_packer', 'total_buying_currency', v)} /></Row><Row label="Commission"><Radio checked={form.revenue_packer.commission_enabled} onChange={(v) => setValue('revenue_packer', 'commission_enabled', v)} /><input type="number" placeholder="Percent" value={form.revenue_packer.commission_percent} onChange={(e) => setValue('revenue_packer', 'commission_percent', e.target.value)} /></Row><Row label="Amount"><input type="number" value={form.revenue_packer.amount} onChange={(e) => setValue('revenue_packer', 'amount', e.target.value)} /><Select value={form.revenue_packer.amount_currency} list={optionsFor('revenue_packer.amount_currency')} onChange={(v) => setValue('revenue_packer', 'amount_currency', v)} /></Row><Row label="Description"><textarea rows="2" value={form.revenue_packer.description} onChange={(e) => setValue('revenue_packer', 'description', e.target.value)} /></Row><Row label="Overcharge SC"><input type="number" placeholder="Amount" value={form.revenue_packer.overcharge_sc_amount} onChange={(e) => setValue('revenue_packer', 'overcharge_sc_amount', e.target.value)} /><input placeholder="Description" value={form.revenue_packer.overcharge_sc_description} onChange={(e) => setValue('revenue_packer', 'overcharge_sc_description', e.target.value)} /></Row></div>) }
function CashFlow({ section, form, setValue }) { const data = form[section]; return (<div className="txn-panel"><Row label="Date Advance"><input type="date" value={data.date_advance} onChange={(e) => setValue(section, 'date_advance', e.target.value)} /><input type="number" placeholder="Amount" value={data.amount_advance} onChange={(e) => setValue(section, 'amount_advance', e.target.value)} /></Row><Row label="Date Balance"><input type="date" value={data.date_balance} onChange={(e) => setValue(section, 'date_balance', e.target.value)} /><input type="number" placeholder="Amount" value={data.amount_balance} onChange={(e) => setValue(section, 'amount_balance', e.target.value)} /></Row></div>) }
function Shipping({ section, form, setValue }) { const data = form[section]; return (<div className="txn-panel"><Row label="LSD Min"><input type="date" value={data.lsd_min} onChange={(e) => setValue(section, 'lsd_min', e.target.value)} /><span className="row-text">LSD Max</span><input type="date" value={data.lsd_max} onChange={(e) => setValue(section, 'lsd_max', e.target.value)} /></Row><Row label="Presentation"><input type="number" value={data.presentation_days} onChange={(e) => setValue(section, 'presentation_days', e.target.value)} /><span className="row-text">days</span><span className="row-text">L/C Exp.</span><input type="date" value={data.lc_expiry} onChange={(e) => setValue(section, 'lc_expiry', e.target.value)} /></Row><Row label="REQ ETA"><input type="date" value={data.req_eta} onChange={(e) => setValue(section, 'req_eta', e.target.value)} /></Row></div>) }

function extractUserNames(users) {
  if (!Array.isArray(users)) return []

  return [...new Set(
    users
      .map((user) => (typeof user?.name === 'string' ? user.name.trim() : ''))
      .filter(Boolean),
  )]
}

function TxnColumn({ title, side, children }) { return (<div className="txn-col"><SectionHeader title={title} side={side} />{children}</div>) }
function SectionHeader({ title, side }) { return (<div className="txn-section-title"><h5>{title}</h5>{side && <span>{side}</span>}</div>) }
function Field({ label, children }) { return (<label><span>{label}</span>{children}</label>) }
function Row({ label, children }) { return (<div className="txn-row"><label className="txn-label">{label}</label><div className="txn-controls">{children}</div></div>) }
function Select({ value, list, onChange }) { return (<select value={value} onChange={(e) => onChange(e.target.value)}><option value="">Select</option>{list.map((o) => <option key={o} value={o}>{o}</option>)}</select>) }
function SearchableSelect({ value, list, onChange }) {
  const rootRef = useRef(null)
  const [isOpen, setIsOpen] = useState(false)
  const options = [...new Set((Array.isArray(list) ? list : []).map((item) => item?.trim?.()).filter(Boolean))]
  const normalizedValue = value.trim().toLowerCase()
  const filteredOptions = normalizedValue
    ? options.filter((option) => option.toLowerCase().includes(normalizedValue))
    : options

  useEffect(() => {
    if (!isOpen) return undefined

    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [isOpen])

  return (
    <div className="txn-combobox" ref={rootRef}>
      <input
        type="text"
        value={value}
        placeholder="Search or select"
        autoComplete="off"
        onFocus={() => setIsOpen(true)}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        className="txn-combobox-toggle"
        aria-label={isOpen ? 'Close options' : 'Open options'}
        onClick={() => setIsOpen((previous) => !previous)}
      >
        <span className={`txn-combobox-caret${isOpen ? ' is-open' : ''}`} aria-hidden="true" />
      </button>
      {isOpen ? (
        <div className="txn-combobox-menu">
          {filteredOptions.length ? (
            filteredOptions.map((option) => (
              <button
                key={option}
                type="button"
                className={`txn-combobox-option${option === value ? ' is-selected' : ''}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(option)
                  setIsOpen(false)
                }}
              >
                {option}
              </button>
            ))
          ) : (
            <div className="txn-combobox-empty">No matches found</div>
          )}
        </div>
      ) : null}
    </div>
  )
}
function Radio({ checked, onChange }) { return (<div className="radio-inline"><label><input type="radio" checked={checked} onChange={() => onChange(true)} /> Yes</label><label><input type="radio" checked={!checked} onChange={() => onChange(false)} /> No</label></div>) }
function SvgPrint() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 8V3h10v5M6 17H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M7 14h10v7H7z" /></svg> }
function SvgList() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg> }

export default TransactionCreatePage
