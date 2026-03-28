import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AdminSidebarLayout from '../components/layout/AdminSidebarLayout'
import { useAuth } from '../context/AuthContext'

const DUMMY = {
  productOrigin: ['India (Singapore)', 'India (UAE)', 'Vietnam'],
  destination: ['Singapore', 'UAE', 'Rotterdam'],
  category: ['Food Grade', 'Feed Grade', 'Industrial'],
  type: ['Trade', 'Service', 'Commission'],
  yesNo: ['Yes', 'No'],
  country: ['India', 'Singapore', 'UAE'],
  container: ['20 FT', '40 FT', 'Bulk'],
  attn: ['Accounts', 'Purchase', 'Logistics'],
  shipto: ['Main Warehouse', 'Port Facility', 'Client Yard'],
  buyers: ['Buyer A', 'Buyer B', 'Buyer C'],
  customers: ['Customer Alpha', 'Customer Beta', 'Customer Gamma'],
  endCustomers: ['Retail Group', 'Wholesale Group', 'Distributor X'],
  priceType: ['USD/MT', 'INR/MT', 'SGD/MT'],
  payment: ['LC', 'TT', 'CAD'],
  paymentTerms: ['Advance', '30 Days', '60 Days'],
  tolerance: ['+/- 1%', '+/- 2%', '+/- 5%'],
  vendors: ['Vendor Prime', 'Vendor Delta', 'Vendor Nova'],
  packers: ['Packer One', 'Packer Two', 'Packer Three'],
  packedBy: ['Factory', 'Third Party', 'Vendor'],
  consignee: ['Consignee A', 'Consignee B', 'Consignee C'],
  currency: ['USD', 'INR', 'SGD', 'EUR'],
}

const INITIAL = {
  transaction: {
    booking_no: '', issue_date: '', sales_person_id: '', product_origin: '', destination: '', category: '',
    type: '', certified: 'No', country: '', container_primary: '', net_margin: '', booking_mode: 'trade_commission',
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

function TransactionCreatePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { currentUser, authFetch, logout } = useAuth()
  const [form, setForm] = useState(INITIAL)
  const [salesPeople, setSalesPeople] = useState([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

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
    if (mode === 'trade_commission' || mode === 'qc_services') setValue('transaction', 'booking_mode', mode)
    loadSalesPeople()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, searchParams])

  async function loadSalesPeople() {
    try {
      const response = await authFetch('/users')
      const payload = await response.json()
      if (response.ok) setSalesPeople((payload?.data ?? []).filter((u) => u.role === 'sales'))
    } catch {
      setSalesPeople([])
    }
  }

  function setValue(section, field, value) {
    setForm((p) => ({ ...p, [section]: { ...p[section], [field]: value } }))
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
    payload.transaction.sales_person_id = payload.transaction.sales_person_id ? Number(payload.transaction.sales_person_id) : null
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
        <section className="txn-panel txn-top"><h5>TRANSACTION DETAILS</h5><TxHeader form={form} setValue={setValue} salesPeople={salesPeople} /></section>
        <section className="txn-double-grid">
          <TxnColumn title="GENERAL INFO" side="CUSTOMER"><GeneralCustomer form={form} setValue={setValue} /></TxnColumn>
          <TxnColumn title="GENERAL INFO" side="PACKER"><GeneralPacker form={form} setValue={setValue} /></TxnColumn>
          <TxnColumn title="REVENUE" side="CUSTOMER"><RevenueCustomer form={form} setValue={setValue} /></TxnColumn>
          <TxnColumn title="REVENUE" side="PACKER"><RevenuePacker form={form} setValue={setValue} /></TxnColumn>
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

function TxHeader({ form, setValue, salesPeople }) {
  return (
    <div className="txn-grid cols-4">
      <Field label="Booking No."><input required value={form.transaction.booking_no} onChange={(e) => setValue('transaction', 'booking_no', e.target.value)} /></Field>
      <Field label="Issue Date"><input type="date" value={form.transaction.issue_date} onChange={(e) => setValue('transaction', 'issue_date', e.target.value)} /></Field>
      <Field label="Category"><Select value={form.transaction.category} list={DUMMY.category} onChange={(v) => setValue('transaction', 'category', v)} /></Field>
      <Field label="Country"><Select value={form.transaction.country} list={DUMMY.country} onChange={(v) => setValue('transaction', 'country', v)} /></Field>
      <Field label="Sales Person"><select value={form.transaction.sales_person_id} onChange={(e) => setValue('transaction', 'sales_person_id', e.target.value)}><option value="">Select</option>{salesPeople.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
      <Field label="Product Origin"><Select value={form.transaction.product_origin} list={DUMMY.productOrigin} onChange={(v) => setValue('transaction', 'product_origin', v)} /></Field>
      <Field label="Type"><Select value={form.transaction.type} list={DUMMY.type} onChange={(v) => setValue('transaction', 'type', v)} /></Field>
      <Field label="Container"><Select value={form.transaction.container_primary} list={DUMMY.container} onChange={(v) => setValue('transaction', 'container_primary', v)} /></Field>
      <Field label="Destination"><Select value={form.transaction.destination} list={DUMMY.destination} onChange={(v) => setValue('transaction', 'destination', v)} /></Field>
      <Field label="Certified"><Select value={form.transaction.certified} list={DUMMY.yesNo} onChange={(v) => setValue('transaction', 'certified', v)} /></Field>
      <Field label="Net Margin"><input type="number" step="0.01" value={form.transaction.net_margin} onChange={(e) => setValue('transaction', 'net_margin', e.target.value)} /></Field>
    </div>
  )
}

function GeneralCustomer({ form, setValue }) { return (<div className="txn-panel"><Row label="Customer"><Select value={form.general_info_customer.customer} list={DUMMY.customers} onChange={(v) => setValue('general_info_customer', 'customer', v)} /></Row><Row label="Attn"><Select value={form.general_info_customer.attention} list={DUMMY.attn} onChange={(v) => setValue('general_info_customer', 'attention', v)} /></Row><Row label="Shipto"><Select value={form.general_info_customer.ship_to} list={DUMMY.shipto} onChange={(v) => setValue('general_info_customer', 'ship_to', v)} /></Row><Row label="Buyer's"><Select value={form.general_info_customer.buyer} list={DUMMY.buyers} onChange={(v) => setValue('general_info_customer', 'buyer', v)} /><input placeholder="#" value={form.general_info_customer.buyer_number} onChange={(e) => setValue('general_info_customer', 'buyer_number', e.target.value)} /></Row><Row label="End Customer"><Select value={form.general_info_customer.end_customer} list={DUMMY.endCustomers} onChange={(v) => setValue('general_info_customer', 'end_customer', v)} /></Row><Row label="Prices Customer"><Select value={form.general_info_customer.prices_customer_type} list={DUMMY.priceType} onChange={(v) => setValue('general_info_customer', 'prices_customer_type', v)} /><input type="number" placeholder="@" value={form.general_info_customer.prices_customer_rate} onChange={(e) => setValue('general_info_customer', 'prices_customer_rate', e.target.value)} /></Row><Row label="Payment Customer"><Select value={form.general_info_customer.payment_customer_type} list={DUMMY.payment} onChange={(v) => setValue('general_info_customer', 'payment_customer_type', v)} /><Select value={form.general_info_customer.payment_customer_term} list={DUMMY.paymentTerms} onChange={(v) => setValue('general_info_customer', 'payment_customer_term', v)} /><input type="number" placeholder="Adv %" value={form.general_info_customer.payment_customer_advance_percent} onChange={(e) => setValue('general_info_customer', 'payment_customer_advance_percent', e.target.value)} /></Row><Row label="Description"><textarea rows="3" value={form.general_info_customer.description} onChange={(e) => setValue('general_info_customer', 'description', e.target.value)} /></Row><Row label="Tolerance"><Select value={form.general_info_customer.tolerance} list={DUMMY.tolerance} onChange={(v) => setValue('general_info_customer', 'tolerance', v)} /></Row><Row label="Marketing Fee"><label className="inline-checkbox"><input type="checkbox" checked={form.general_info_customer.marketing_fee} onChange={(e) => setValue('general_info_customer', 'marketing_fee', e.target.checked)} />Yes</label></Row></div>) }
function GeneralPacker({ form, setValue }) { return (<div className="txn-panel"><Row label="Vendor"><Select value={form.general_info_packer.vendor} list={DUMMY.vendors} onChange={(v) => setValue('general_info_packer', 'vendor', v)} /></Row><Row label="Packer's"><Select value={form.general_info_packer.packer_name} list={DUMMY.packers} onChange={(v) => setValue('general_info_packer', 'packer_name', v)} /><input placeholder="#" value={form.general_info_packer.packer_number} onChange={(e) => setValue('general_info_packer', 'packer_number', e.target.value)} /></Row><Row label="Packed By"><Select value={form.general_info_packer.packed_by} list={DUMMY.packedBy} onChange={(v) => setValue('general_info_packer', 'packed_by', v)} /></Row><Row label="Prices Packer"><Select value={form.general_info_packer.prices_packer_type} list={DUMMY.priceType} onChange={(v) => setValue('general_info_packer', 'prices_packer_type', v)} /><input type="number" placeholder="@" value={form.general_info_packer.prices_packer_rate} onChange={(e) => setValue('general_info_packer', 'prices_packer_rate', e.target.value)} /></Row><Row label="Payment Packer"><Select value={form.general_info_packer.payment_packer_type} list={DUMMY.payment} onChange={(v) => setValue('general_info_packer', 'payment_packer_type', v)} /><Select value={form.general_info_packer.payment_packer_term} list={DUMMY.paymentTerms} onChange={(v) => setValue('general_info_packer', 'payment_packer_term', v)} /><input type="number" placeholder="Adv %" value={form.general_info_packer.payment_packer_advance_percent} onChange={(e) => setValue('general_info_packer', 'payment_packer_advance_percent', e.target.value)} /></Row><Row label="Description"><textarea rows="3" value={form.general_info_packer.description} onChange={(e) => setValue('general_info_packer', 'description', e.target.value)} /></Row><Row label="Tolerance"><Select value={form.general_info_packer.tolerance} list={DUMMY.tolerance} onChange={(v) => setValue('general_info_packer', 'tolerance', v)} /><span className="row-text">Total Lqd Price</span><input type="number" readOnly value={form.general_info_packer.total_lqd_price} /></Row><Row label="Consignee"><Select value={form.general_info_packer.consignee} list={DUMMY.consignee} onChange={(v) => setValue('general_info_packer', 'consignee', v)} /></Row></div>) }
function RevenueCustomer({ form, setValue }) { return (<div className="txn-panel"><Row label="Total Selling Value"><input type="number" value={form.revenue_customer.total_selling_value} onChange={(e) => setValue('revenue_customer', 'total_selling_value', e.target.value)} /><Select value={form.revenue_customer.total_selling_currency} list={DUMMY.currency} onChange={(v) => setValue('revenue_customer', 'total_selling_currency', v)} /></Row><Row label="Commission"><Radio checked={form.revenue_customer.commission_enabled} onChange={(v) => setValue('revenue_customer', 'commission_enabled', v)} /><input type="number" placeholder="Percent" value={form.revenue_customer.commission_percent} onChange={(e) => setValue('revenue_customer', 'commission_percent', e.target.value)} /></Row><Row label="Amount"><input type="number" value={form.revenue_customer.amount} onChange={(e) => setValue('revenue_customer', 'amount', e.target.value)} /><Select value={form.revenue_customer.amount_currency} list={DUMMY.currency} onChange={(v) => setValue('revenue_customer', 'amount_currency', v)} /></Row><Row label="Description"><textarea rows="2" value={form.revenue_customer.description} onChange={(e) => setValue('revenue_customer', 'description', e.target.value)} /></Row><Row label="Rebate Memo"><input type="number" placeholder="Amount" value={form.revenue_customer.rebate_memo_amount} onChange={(e) => setValue('revenue_customer', 'rebate_memo_amount', e.target.value)} /><input placeholder="Description" value={form.revenue_customer.rebate_memo_description} onChange={(e) => setValue('revenue_customer', 'rebate_memo_description', e.target.value)} /></Row><Row label="Overcharge SC"><input type="number" placeholder="Amount" value={form.revenue_customer.overcharge_sc_amount} onChange={(e) => setValue('revenue_customer', 'overcharge_sc_amount', e.target.value)} /><input placeholder="Description" value={form.revenue_customer.overcharge_sc_description} onChange={(e) => setValue('revenue_customer', 'overcharge_sc_description', e.target.value)} /></Row></div>) }
function RevenuePacker({ form, setValue }) { return (<div className="txn-panel"><Row label="Total Buying Value"><input type="number" value={form.revenue_packer.total_buying_value} onChange={(e) => setValue('revenue_packer', 'total_buying_value', e.target.value)} /><Select value={form.revenue_packer.total_buying_currency} list={DUMMY.currency} onChange={(v) => setValue('revenue_packer', 'total_buying_currency', v)} /></Row><Row label="Commission"><Radio checked={form.revenue_packer.commission_enabled} onChange={(v) => setValue('revenue_packer', 'commission_enabled', v)} /><input type="number" placeholder="Percent" value={form.revenue_packer.commission_percent} onChange={(e) => setValue('revenue_packer', 'commission_percent', e.target.value)} /></Row><Row label="Amount"><input type="number" value={form.revenue_packer.amount} onChange={(e) => setValue('revenue_packer', 'amount', e.target.value)} /><Select value={form.revenue_packer.amount_currency} list={DUMMY.currency} onChange={(v) => setValue('revenue_packer', 'amount_currency', v)} /></Row><Row label="Description"><textarea rows="2" value={form.revenue_packer.description} onChange={(e) => setValue('revenue_packer', 'description', e.target.value)} /></Row><Row label="Overcharge SC"><input type="number" placeholder="Amount" value={form.revenue_packer.overcharge_sc_amount} onChange={(e) => setValue('revenue_packer', 'overcharge_sc_amount', e.target.value)} /><input placeholder="Description" value={form.revenue_packer.overcharge_sc_description} onChange={(e) => setValue('revenue_packer', 'overcharge_sc_description', e.target.value)} /></Row></div>) }
function CashFlow({ section, form, setValue }) { const data = form[section]; return (<div className="txn-panel"><Row label="Date Advance"><input type="date" value={data.date_advance} onChange={(e) => setValue(section, 'date_advance', e.target.value)} /><input type="number" placeholder="Amount" value={data.amount_advance} onChange={(e) => setValue(section, 'amount_advance', e.target.value)} /></Row><Row label="Date Balance"><input type="date" value={data.date_balance} onChange={(e) => setValue(section, 'date_balance', e.target.value)} /><input type="number" placeholder="Amount" value={data.amount_balance} onChange={(e) => setValue(section, 'amount_balance', e.target.value)} /></Row></div>) }
function Shipping({ section, form, setValue }) { const data = form[section]; return (<div className="txn-panel"><Row label="LSD Min"><input type="date" value={data.lsd_min} onChange={(e) => setValue(section, 'lsd_min', e.target.value)} /><span className="row-text">LSD Max</span><input type="date" value={data.lsd_max} onChange={(e) => setValue(section, 'lsd_max', e.target.value)} /></Row><Row label="Presentation"><input type="number" value={data.presentation_days} onChange={(e) => setValue(section, 'presentation_days', e.target.value)} /><span className="row-text">days</span><span className="row-text">L/C Exp.</span><input type="date" value={data.lc_expiry} onChange={(e) => setValue(section, 'lc_expiry', e.target.value)} /></Row><Row label="REQ ETA"><input type="date" value={data.req_eta} onChange={(e) => setValue(section, 'req_eta', e.target.value)} /></Row></div>) }

function TxnColumn({ title, side, children }) { return (<div className="txn-col"><SectionHeader title={title} side={side} />{children}</div>) }
function SectionHeader({ title, side }) { return (<div className="txn-section-title"><h5>{title}</h5>{side && <span>{side}</span>}</div>) }
function Field({ label, children }) { return (<label><span>{label}</span>{children}</label>) }
function Row({ label, children }) { return (<div className="txn-row"><label className="txn-label">{label}</label><div className="txn-controls">{children}</div></div>) }
function Select({ value, list, onChange }) { return (<select value={value} onChange={(e) => onChange(e.target.value)}><option value="">Select</option>{list.map((o) => <option key={o} value={o}>{o}</option>)}</select>) }
function Radio({ checked, onChange }) { return (<div className="radio-inline"><label><input type="radio" checked={checked} onChange={() => onChange(true)} /> Yes</label><label><input type="radio" checked={!checked} onChange={() => onChange(false)} /> No</label></div>) }
function SvgPrint() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 8V3h10v5M6 17H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M7 14h10v7H7z" /></svg> }
function SvgList() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg> }

export default TransactionCreatePage
