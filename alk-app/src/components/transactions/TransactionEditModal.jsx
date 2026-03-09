import { useEffect, useRef, useState } from 'react'

const OPTIONS = {
  salesPeople: ['Chaipat', 'Keerthana Gubbala', 'Nina', 'Sahil'],
  origin: ['INDIA', 'UAE', 'VIETNAM'],
  destination: ['Jordan', 'AQABA, JORDAN', 'SINGAPORE'],
  type: ['Trade', 'Service'],
  yesNo: ['Yes', 'No'],
  container: ['20 ft', '40 ft'],
  load: ['Full Load', 'Part Load'],
  currency: ['US($)', 'EUR', 'INR'],
  payment: ['T/T', 'L/C', 'CAD'],
  tolerance: ['+/- 0.5%', '+/- 1%', '+/- 2%'],
  serviceType: ['ALL WATER OR MLB', 'FOB', 'CIF'],
}

const EXPENSE_FIELDS = [
  { key: 'trucking', label: 'Trucking', group: 'transportation_customs' },
  { key: 'freight', label: 'Freight', group: 'transportation_customs' },
  { key: 'local_charges', label: 'Local Charges', group: 'transportation_customs' },
  { key: 'custom_clearance', label: 'Custom Clearance', group: 'transportation_customs' },
  { key: 'marine_insurance', label: 'Marine Insurance', group: 'insurance' },
  { key: 'rejection_insurance', label: 'Rejection Insurance', group: 'insurance' },
  { key: 'credit_insurance', label: 'Credit Insurance', group: 'insurance' },
  { key: 'war_risk_charges', label: 'War risk charges', group: 'insurance' },
  { key: 'legalization_docs', label: 'Legalization Docs', group: 'documentation_bank' },
  { key: 'bank_charges', label: 'Bank Charges', group: 'documentation_bank' },
  { key: 'packaging_material', label: 'Packaging material', group: 'packaging' },
  { key: 'printing_cylinder', label: 'Printing cylinder', group: 'packaging' },
  { key: 'inspection_amt', label: 'Inspection Amt.', group: 'inspection_lab' },
  { key: 'loading_supervision', label: 'Loading Supervision', group: 'inspection_lab' },
  { key: 'lab_test', label: 'Lab Test', group: 'inspection_lab' },
  { key: 'rebate_customer', label: 'Rebate to Customer', group: 'rebate_claim' },
  { key: 'rebate_packer', label: 'Rebate to Packer', group: 'rebate_claim' },
  { key: 'claim', label: 'Claim', group: 'rebate_claim' },
  { key: 'others', label: 'Others', group: 'rebate_claim' },
]

function TransactionEditModal({ transaction, onClose, onSave, onDuplicate }) {
  const [tab, setTab] = useState('home')
  const [saving, setSaving] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const formRef = useRef(null)

  if (!transaction) return null

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 2200)
    return () => clearTimeout(timer)
  }, [toast])

  function showToast(text, tone = 'success') {
    setToast({ text, tone })
  }

  async function handleSave(closeAfterSave) {
    if (!onSave || !formRef.current) return
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const payload = buildPayload(formRef.current, transaction)
      const result = await onSave(transaction.id, payload)
      if (!result?.ok) {
        const message = result?.error ?? 'Unable to save transaction.'
        setError(message)
        showToast(message, 'error')
        return
      }
      showToast('Transactions saved')
      if (closeAfterSave) {
        setTimeout(() => onClose(), 250)
      } else {
        setMessage('Transactions saved')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDuplicate() {
    if (!onDuplicate) return
    setDuplicating(true)
    setMessage('')
    setError('')
    try {
      const result = await onDuplicate(transaction.id)
      if (!result?.ok) {
        const dupError = result?.error ?? 'Unable to duplicate transaction.'
        setError(dupError)
        showToast(dupError, 'error')
        return
      }
      setMessage('Transaction duplicated successfully.')
      showToast('Transaction duplicated successfully')
    } finally {
      setDuplicating(false)
    }
  }

  function handlePrint() {
    showToast('Print dialog opened')
    window.print()
  }

  return (
    <div className="txn-edit-overlay" role="dialog" aria-modal="true" aria-label="Edit Transaction">
      <form ref={formRef} className="txn-edit-modal" onSubmit={(event) => event.preventDefault()}>
        <div className="txn-edit-header">
          <h2>Transaction# {transaction.booking_no || 'SIN2605802'}</h2>
          <button type="button" className="txn-edit-close" onClick={onClose}>x</button>
        </div>

        <div className="txn-edit-body">
          <div className="txn-edit-main">
            <HeaderCard transaction={transaction} />
            {tab === 'home' && <HomeTab transaction={transaction} />}
            {tab === 'dollar' && <DollarTab />}
            {tab === 'ship' && <ShipTab transaction={transaction} />}
            <BottomActions
              saving={saving}
              duplicating={duplicating}
              onDuplicate={handleDuplicate}
              onPrint={handlePrint}
              onSave={() => handleSave(false)}
              onSaveQuit={() => handleSave(true)}
            />
            {message ? <p className="message success">{message}</p> : null}
            {error ? <p className="message error">{error}</p> : null}
          </div>

          <div className="txn-edit-side-icons">
            <SideIconButton active={tab === 'home'} label="Home" onClick={() => setTab('home')} icon={<HomeIcon />} />
            <SideIconButton active={tab === 'dollar'} label="Dollar" onClick={() => setTab('dollar')} icon={<DollarIcon />} />
            <SideIconButton active={tab === 'ship'} label="Ship" onClick={() => setTab('ship')} icon={<ShipIcon />} />
          </div>
        </div>
      </form>
      {toast ? <Toast text={toast.text} tone={toast.tone} /> : null}
    </div>
  )
}

function HeaderCard({ transaction }) {
  const salesPersonName = transaction.sales_person?.name ?? ''
  const issueDate = formatDate(transaction.issue_date)
  const updatedAt = formatDate(transaction.updated_at)
  const origin = transaction.product_origin ?? ''
  const type = transaction.type ?? ''
  const destination = transaction.destination ?? ''
  const container = transaction.container_primary ?? ''
  const certified = transaction.certified ? 'Yes' : 'No'

  return (
    <div className="txe-card txe-header-card">
      <div className="txe-grid-4">
        <LabelField label="Booking No."><input name="transaction.booking_no" defaultValue={transaction.booking_no || 'SIN2605802'} /></LabelField>
        <LabelField label="Issue Date"><input name="transaction.issue_date" defaultValue={issueDate} /></LabelField>
        <LabelField label="Status"><input defaultValue={transaction.transaction_status ?? 'I'} /></LabelField>
        <LabelField label="Last Modified By"><input defaultValue={salesPersonName || 'Keerthana Gubbala'} /></LabelField>

        <LabelField label="Sales Person"><select defaultValue={salesPersonName || 'Chaipat'}>{withCurrent(OPTIONS.salesPeople, salesPersonName || 'Chaipat').map((o) => <option key={o}>{o}</option>)}</select></LabelField>
        <LabelField label="Product Origin"><select name="transaction.product_origin" defaultValue={origin || 'INDIA'}>{withCurrent(OPTIONS.origin, origin || 'INDIA').map((o) => <option key={o}>{o}</option>)}</select></LabelField>
        <LabelField label="Type"><select name="transaction.type" defaultValue={type || 'Trade'}>{withCurrent(OPTIONS.type, type || 'Trade').map((o) => <option key={o}>{o}</option>)}</select></LabelField>
        <LabelField label="Container"><div className="txe-inline"><select name="transaction.container_primary" defaultValue={container || '40 ft'}>{withCurrent(OPTIONS.container, container || '40 ft').map((o) => <option key={o}>{o}</option>)}</select><select name="transaction.container_secondary" defaultValue="Full Load">{OPTIONS.load.map((o) => <option key={o}>{o}</option>)}</select></div></LabelField>

        <LabelField label="Destination"><select name="transaction.destination" defaultValue={destination || 'Jordan'}>{withCurrent(OPTIONS.destination, destination || 'Jordan').map((o) => <option key={o}>{o}</option>)}</select></LabelField>
        <LabelField label="Certified"><select name="transaction.certified" defaultValue={certified}>{OPTIONS.yesNo.map((o) => <option key={o}>{o}</option>)}</select></LabelField>
        <LabelField label="Net Margin"><input name="transaction.net_margin" defaultValue={transaction.net_margin ?? ''} /></LabelField>
        <LabelField label="Last Modified On"><input defaultValue={updatedAt} /></LabelField>
      </div>
    </div>
  )
}

function HomeTab({ transaction }) {
  const customer = transaction.general_info_customer ?? {}
  const packer = transaction.general_info_packer ?? {}
  const revenueCustomer = transaction.revenue_customer ?? {}
  const revenuePacker = transaction.revenue_packer ?? {}
  const cashCustomer = transaction.cash_flow_customer ?? {}
  const cashPacker = transaction.cash_flow_packer ?? {}
  const shippingCustomer = transaction.shipping_details_customer ?? {}
  const shippingPacker = transaction.shipping_details_packer ?? {}
  const notes = transaction.notes ?? transaction.note ?? {}

  return (
    <div className="txe-stack">
      <div className="txe-two">
        <SectionCard title="GENERAL INFO" side="CUSTOMER" tone="blue">
          <Row label="Customer"><input name="general_info_customer.customer" defaultValue={customer.customer ?? ''} /></Row>
          <Row label="Attn"><select defaultValue={customer.attention ?? ''}>{withCurrent(['MR. YOUSEF AZIZ', 'MR. RAHUL'], customer.attention).map((o) => <option key={o}>{o}</option>)}</select></Row>
          <Row label="Buyer's"><div className="txe-inline"><select name="general_info_customer.buyer" defaultValue={customer.buyer ?? ''}><option value="">Select an ...</option>{customer.buyer ? <option value={customer.buyer}>{customer.buyer}</option> : null}</select><input name="general_info_customer.buyer_number" defaultValue={customer.buyer_number ?? ''} placeholder="#" /></div></Row>
          <Row label="End Customer"><input defaultValue={customer.end_customer ?? ''} /></Row>
          <Row label="Prices Customer"><div className="txe-inline"><select name="general_info_customer.prices_customer_type" defaultValue={customer.prices_customer_type ?? 'CFR'}>{withCurrent(['CFR', 'FOB'], customer.prices_customer_type || 'CFR').map((o) => <option key={o}>{o}</option>)}</select><input name="general_info_customer.prices_customer_rate" defaultValue={customer.prices_customer_rate ?? ''} /></div></Row>
          <Row label="Payment Customer"><div className="txe-inline"><select name="general_info_customer.payment_customer_type" defaultValue={customer.payment_customer_type ?? 'T/T'}>{withCurrent(OPTIONS.payment, customer.payment_customer_type || 'T/T').map((o) => <option key={o}>{o}</option>)}</select><input name="general_info_customer.payment_customer_advance_percent" defaultValue={customer.payment_customer_advance_percent ?? ''} /></div></Row>
          <Row label="Description"><textarea name="general_info_customer.description" rows="2" defaultValue={customer.description ?? ''} /></Row>
          <Row label="Tolerance"><select defaultValue={customer.tolerance ?? '+/- 1%'}>{withCurrent(OPTIONS.tolerance, customer.tolerance || '+/- 1%').map((o) => <option key={o}>{o}</option>)}</select></Row>
        </SectionCard>

        <SectionCard title="GENERAL INFO" side="PACKER" tone="blue">
          <Row label="Vendor"><input name="general_info_packer.vendor" defaultValue={packer.vendor ?? ''} /></Row>
          <Row label="Packer's"><div className="txe-inline"><select name="general_info_packer.packer_name" defaultValue={packer.packer_name ?? ''}><option value="">Select</option>{packer.packer_name ? <option value={packer.packer_name}>{packer.packer_name}</option> : null}</select><input name="general_info_packer.packer_number" defaultValue={packer.packer_number ?? ''} placeholder="#" /></div></Row>
          <Row label="Packed By"><input defaultValue={packer.packed_by ?? ''} /></Row>
          <Row label="Prices Packer"><div className="txe-inline"><select name="general_info_packer.prices_packer_type" defaultValue={packer.prices_packer_type ?? 'CFR'}>{withCurrent(['CFR', 'FOB'], packer.prices_packer_type || 'CFR').map((o) => <option key={o}>{o}</option>)}</select><input name="general_info_packer.prices_packer_rate" defaultValue={packer.prices_packer_rate ?? ''} /></div></Row>
          <Row label="Payment Packer"><div className="txe-inline"><select name="general_info_packer.payment_packer_type" defaultValue={packer.payment_packer_type ?? 'T/T'}>{withCurrent(OPTIONS.payment, packer.payment_packer_type || 'T/T').map((o) => <option key={o}>{o}</option>)}</select><input name="general_info_packer.payment_packer_advance_percent" defaultValue={packer.payment_packer_advance_percent ?? ''} /></div></Row>
          <Row label="Description"><textarea name="general_info_packer.description" rows="2" defaultValue={packer.description ?? ''} /></Row>
          <Row label="Tolerance"><div className="txe-inline"><select name="general_info_packer.tolerance" defaultValue={packer.tolerance ?? '+/- 1%'}>{withCurrent(OPTIONS.tolerance, packer.tolerance || '+/- 1%').map((o) => <option key={o}>{o}</option>)}</select><input name="general_info_packer.total_lqd_price" defaultValue={packer.total_lqd_price ?? ''} /></div></Row>
        </SectionCard>
      </div>

      <div className="txe-two">
        <SectionCard title="REVENUE" side="CUSTOMER" tone="blue">
          <Row label="Total Selling Value"><div className="txe-inline"><input name="revenue_customer.total_selling_value" defaultValue={revenueCustomer.total_selling_value ?? ''} /><select name="revenue_customer.total_selling_currency" defaultValue={revenueCustomer.total_selling_currency ?? 'US($)'}>{withCurrent(OPTIONS.currency, revenueCustomer.total_selling_currency || 'US($)').map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="Commission"><div className="txe-inline"><label><input type="radio" name="revenue_customer.commission_enabled" value="Yes" defaultChecked={!!revenueCustomer.commission_enabled} /> Yes</label><label><input type="radio" name="revenue_customer.commission_enabled" value="No" defaultChecked={!revenueCustomer.commission_enabled} /> No</label><input name="revenue_customer.commission_percent" defaultValue={revenueCustomer.commission_percent ?? ''} placeholder="Percent" /></div></Row>
          <Row label="Amount"><div className="txe-inline"><input name="revenue_customer.amount" defaultValue={revenueCustomer.amount ?? ''} /><select name="revenue_customer.amount_currency" defaultValue={revenueCustomer.amount_currency ?? 'US($)'}>{withCurrent(OPTIONS.currency, revenueCustomer.amount_currency || 'US($)').map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="Description"><textarea name="revenue_customer.description" rows="2" defaultValue={revenueCustomer.description ?? ''} /></Row>
        </SectionCard>

        <SectionCard title="REVENUE" side="PACKER" tone="blue">
          <Row label="Total Buying Value"><div className="txe-inline"><input name="revenue_packer.total_buying_value" defaultValue={revenuePacker.total_buying_value ?? ''} /><select name="revenue_packer.total_buying_currency" defaultValue={revenuePacker.total_buying_currency ?? 'US($)'}>{withCurrent(OPTIONS.currency, revenuePacker.total_buying_currency || 'US($)').map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="Commission"><div className="txe-inline"><label><input type="radio" name="revenue_packer.commission_enabled" value="Yes" defaultChecked={!!revenuePacker.commission_enabled} /> Yes</label><label><input type="radio" name="revenue_packer.commission_enabled" value="No" defaultChecked={!revenuePacker.commission_enabled} /> No</label><input name="revenue_packer.commission_percent" defaultValue={revenuePacker.commission_percent ?? ''} placeholder="Percent" /></div></Row>
          <Row label="Amount"><div className="txe-inline"><input name="revenue_packer.amount" defaultValue={revenuePacker.amount ?? ''} /><select name="revenue_packer.amount_currency" defaultValue={revenuePacker.amount_currency ?? 'US($)'}>{withCurrent(OPTIONS.currency, revenuePacker.amount_currency || 'US($)').map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="Description"><textarea name="revenue_packer.description" rows="2" defaultValue={revenuePacker.description ?? ''} /></Row>
        </SectionCard>
      </div>

      <div className="txe-two">
        <SectionCard title="CASH FLOW" side="CUSTOMER" tone="green">
          <Row label="Date Advance"><div className="txe-inline"><input name="cash_flow_customer.date_advance" defaultValue={formatDate(cashCustomer.date_advance)} /><input name="cash_flow_customer.amount_advance" defaultValue={cashCustomer.amount_advance ?? ''} /></div></Row>
          <Row label="Date Balance"><div className="txe-inline"><input name="cash_flow_customer.date_balance" defaultValue={formatDate(cashCustomer.date_balance)} /><input name="cash_flow_customer.amount_balance" defaultValue={cashCustomer.amount_balance ?? ''} /></div></Row>
        </SectionCard>
        <SectionCard title="CASH FLOW" side="PACKER" tone="green">
          <Row label="Date Advance"><div className="txe-inline"><input name="cash_flow_packer.date_advance" defaultValue={formatDate(cashPacker.date_advance)} /><input name="cash_flow_packer.amount_advance" defaultValue={cashPacker.amount_advance ?? ''} /></div></Row>
          <Row label="Date Balance"><div className="txe-inline"><input name="cash_flow_packer.date_balance" defaultValue={formatDate(cashPacker.date_balance)} /><input name="cash_flow_packer.amount_balance" defaultValue={cashPacker.amount_balance ?? ''} /></div></Row>
        </SectionCard>
      </div>

      <div className="txe-two">
        <SectionCard title="RECEIVE" side="CUSTOMER" tone="gold">
          <Row label="Date Advance"><div className="txe-inline"><input /><input /></div></Row>
          <Row label="Date Balance"><div className="txe-inline"><input /><input /></div></Row>
        </SectionCard>
        <SectionCard title="PAYMENT" side="PACKER" tone="gold">
          <Row label="Date Advance"><div className="txe-inline"><input /><input /></div></Row>
          <Row label="Date Balance"><div className="txe-inline"><input /><input /></div></Row>
        </SectionCard>
      </div>

      <div className="txe-two">
        <SectionCard title="SHIPPING DETAILS" side="CUSTOMER" tone="cyan">
          <Row label="LSD Min"><div className="txe-inline"><input name="shipping_details_customer.lsd_min" defaultValue={formatDate(shippingCustomer.lsd_min)} /><input name="shipping_details_customer.lsd_max" defaultValue={formatDate(shippingCustomer.lsd_max)} /></div></Row>
          <Row label="Presentation"><div className="txe-inline"><input name="shipping_details_customer.presentation_days" defaultValue={shippingCustomer.presentation_days ?? ''} /><input name="shipping_details_customer.lc_expiry" defaultValue={formatDate(shippingCustomer.lc_expiry)} /></div></Row>
          <Row label="REQ ETA"><input name="shipping_details_customer.req_eta" defaultValue={formatDate(shippingCustomer.req_eta)} /></Row>
        </SectionCard>
        <SectionCard title="SHIPPING DETAILS" side="PACKER" tone="cyan">
          <Row label="LSD Min"><div className="txe-inline"><input name="shipping_details_packer.lsd_min" defaultValue={formatDate(shippingPacker.lsd_min)} /><input name="shipping_details_packer.lsd_max" defaultValue={formatDate(shippingPacker.lsd_max)} /></div></Row>
          <Row label="Presentation"><div className="txe-inline"><input name="shipping_details_packer.presentation_days" defaultValue={shippingPacker.presentation_days ?? ''} /><input name="shipping_details_packer.lc_expiry" defaultValue={formatDate(shippingPacker.lc_expiry)} /></div></Row>
          <Row label="REQ ETA"><input name="shipping_details_packer.req_eta" defaultValue={formatDate(shippingPacker.req_eta)} /></Row>
        </SectionCard>
      </div>

      <SectionCard title="NOTES" tone="gray">
        <div className="txe-two">
          <div>
            <Row label="By Sale"><textarea name="notes.by_sales" rows="2" defaultValue={notes.by_sales ?? ''} /></Row>
            <Row label="By QC"><textarea name="note.by_qc" rows="2" /></Row>
            <Row label="For Customer"><textarea name="note.for_customer" rows="2" /></Row>
          </div>
          <div>
            <Row label="By Logistic"><textarea name="note.by_logistic" rows="2" /></Row>
            <Row label="By Packaging"><textarea name="note.by_packaging" rows="2" /></Row>
            <Row label="For Packer"><textarea name="note.for_packer" rows="2" defaultValue={notes.for_packer ?? 'Consignee: Leader food supply institution'} /></Row>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Cancel Transaction ( Claim / Reject )" tone="gray">
        <div className="txe-checkline">
          <label><input type="checkbox" name="logistics.cancel_claim" /> Claim</label>
          <label><input type="checkbox" name="logistics.cancel_reject" /> Reject</label>
          <label><input type="checkbox" name="logistics.cancel_move" /> Move</label>
        </div>
      </SectionCard>
    </div>
  )
}

function DollarTab() {
  return (
    <div className="txe-stack">
      <div className="txe-two">
        <SectionCard title="Expenses" side="TRANSPORTATION & CUSTOMS" tone="pink">
          <Row label="Trucking"><div className="txe-inline"><input name="expense.trucking.amount" /><select name="expense.trucking.currency">{OPTIONS.currency.map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="Freight"><div className="txe-inline"><input name="expense.freight.amount" /><select name="expense.freight.currency">{OPTIONS.currency.map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="Local Charges"><div className="txe-inline"><input name="expense.local_charges.amount" /><select name="expense.local_charges.currency">{OPTIONS.currency.map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="Custom Clearance"><div className="txe-inline"><input name="expense.custom_clearance.amount" /><select name="expense.custom_clearance.currency">{OPTIONS.currency.map((o) => <option key={o}>{o}</option>)}</select></div></Row>
        </SectionCard>

        <SectionCard title="EXPENSES" side="INSURANCE" tone="pink">
          <Row label="Marine Insurance"><div className="txe-inline"><input name="expense.marine_insurance.amount" /><select name="expense.marine_insurance.currency">{OPTIONS.currency.map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="Rejection Insurance"><div className="txe-inline"><input name="expense.rejection_insurance.amount" /><select name="expense.rejection_insurance.currency">{OPTIONS.currency.map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="Credit Insurance"><div className="txe-inline"><input name="expense.credit_insurance.amount" /><select name="expense.credit_insurance.currency">{OPTIONS.currency.map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="War risk charges"><div className="txe-inline"><input name="expense.war_risk_charges.amount" /><select name="expense.war_risk_charges.currency">{OPTIONS.currency.map((o) => <option key={o}>{o}</option>)}</select></div></Row>
        </SectionCard>
      </div>

      <div className="txe-two">
        <SectionCard title="EXPENSES" side="DOCUMENTATION / BANK CHARGES" tone="pink">
          <Row label="Legalization Docs"><div className="txe-inline"><input name="expense.legalization_docs.amount" /><select name="expense.legalization_docs.currency">{OPTIONS.currency.map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="Bank Charges"><div className="txe-inline"><input name="expense.bank_charges.amount" defaultValue="0.00" /><select name="expense.bank_charges.currency">{OPTIONS.currency.map((o) => <option key={o}>{o}</option>)}</select></div></Row>
        </SectionCard>

        <SectionCard title="EXPENSES" side="PACKAGING" tone="pink">
          <Row label="Packaging material"><div className="txe-inline"><input name="expense.packaging_material.amount" /><select name="expense.packaging_material.currency">{OPTIONS.currency.map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="Printing cylinder"><div className="txe-inline"><input name="expense.printing_cylinder.amount" /><select name="expense.printing_cylinder.currency">{OPTIONS.currency.map((o) => <option key={o}>{o}</option>)}</select></div></Row>
        </SectionCard>
      </div>

      <div className="txe-two">
        <SectionCard title="Expenses" side="INSPECTION / LAB TEST" tone="pink">
          <Row label="Inspection Amt."><div className="txe-inline"><input name="expense.inspection_amt.amount" /><select name="expense.inspection_amt.currency">{OPTIONS.currency.map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="Loading Supervision"><div className="txe-inline"><input name="expense.loading_supervision.amount" /><select name="expense.loading_supervision.currency">{OPTIONS.currency.map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="Lab Test"><div className="txe-inline"><input name="expense.lab_test.amount" /><select name="expense.lab_test.currency">{OPTIONS.currency.map((o) => <option key={o}>{o}</option>)}</select></div></Row>
        </SectionCard>

        <SectionCard title="EXPENSES" side="REBATE / CLAIM" tone="pink">
          <Row label="Rebate to Customer"><div className="txe-inline"><input name="expense.rebate_customer.amount" defaultValue="2,000.00" /><select name="expense.rebate_customer.currency">{OPTIONS.currency.map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="Description"><input name="expense.rebate_customer.description" /></Row>
          <Row label="Rebate to Packer"><div className="txe-inline"><input name="expense.rebate_packer.amount" defaultValue="0.00" /><select name="expense.rebate_packer.currency">{OPTIONS.currency.map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="Description"><input name="expense.rebate_packer.description" /></Row>
          <Row label="Claim"><div className="txe-inline"><input name="expense.claim.amount" /><select name="expense.claim.currency">{OPTIONS.currency.map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="Others"><div className="txe-inline"><input name="expense.others.amount" /><select name="expense.others.currency">{OPTIONS.currency.map((o) => <option key={o}>{o}</option>)}</select></div></Row>
        </SectionCard>
      </div>
    </div>
  )
}

function ShipTab({ transaction }) {
  const notes = transaction.notes ?? transaction.note ?? {}

  return (
    <div className="txe-stack">
      <SectionCard title="LOGISTICS" tone="blue">
        <div className="txe-two">
          <div>
            <Row label="Plan ETD"><input name="logistics.plan_etd" defaultValue="" /></Row>
            <Row label="Plan ETA"><input name="logistics.plan_eta" defaultValue="" /></Row>
            <Row label="Packaging Date"><div className="txe-inline"><input name="logistics.packaging_date_inner" placeholder="Inner" /><input name="logistics.packaging_date_outer" placeholder="Outer" /></div></Row>
            <Row label="Feeder Vessel"><input name="logistics.feeder_vessel" /></Row>
            <Row label="Mother Vessel"><input name="logistics.mother_vessel" defaultValue="ORCHARD STAR V.008S" /></Row>
            <Row label="Container #"><input name="logistics.container_no" defaultValue="EMCU5743198" /></Row>
            <Row label="Seal #"><input name="logistics.seal_no" defaultValue="EMCHVP5524" /></Row>
            <Row label="LC #"><input name="logistics.lc_no" /></Row>
            <Row label="Temperature Recorder No"><input name="logistics.temperature_recorder_no" /></Row>
          </div>
          <div>
            <Row label="ETD Date"><input name="logistics.etd_date" defaultValue="20/02/2026" /></Row>
            <Row label="ETA Date"><input name="logistics.eta_date" defaultValue="29/03/2026" /></Row>
            <Row label="QC Inspection Date"><input name="logistics.qc_inspection_date" /></Row>
            <Row label="Discharge At"><input name="logistics.discharge_at" /></Row>
            <Row label="Service Type"><select name="logistics.service_type" defaultValue="ALL WATER OR MLB">{OPTIONS.serviceType.map((o) => <option key={o}>{o}</option>)}</select></Row>
            <Row label="B/L Date"><input name="logistics.bl_date" defaultValue="20/02/2026" /></Row>
            <Row label="B/L No."><input name="logistics.bl_no" defaultValue="EGLV1046000036" /></Row>
            <Row label="Port"><input name="logistics.port" defaultValue="KOLKATA, INDIA" /></Row>
            <Row label="Destination"><input name="logistics.destination" defaultValue="AQABA, JORDAN" /></Row>
            <Row label="Shipping Line / Agent"><input name="logistics.shipping_line_agent" defaultValue="EVERGREEN LINE" /></Row>
            <Row label="Packer Inv Date"><input name="logistics.packer_inv_date" defaultValue="16/02/2026" /></Row>
            <Row label="Packer Inv."><input name="logistics.packer_inv" defaultValue="CMFE/S/074/25-2" /></Row>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="NOTES" tone="gray">
        <div className="txe-two">
          <div>
            <Row label="By Sale"><textarea name="note.ship_by_sales" rows="2" defaultValue={notes.by_sales ?? ''} /></Row>
            <Row label="By QC"><textarea name="note.ship_by_qc" rows="2" /></Row>
            <Row label="For Customer"><textarea name="note.ship_for_customer" rows="2" /></Row>
          </div>
          <div>
            <Row label="By Logistic"><textarea name="note.ship_by_logistic" rows="2" /></Row>
            <Row label="By Packaging"><textarea name="note.ship_by_packaging" rows="2" /></Row>
            <Row label="For Packer"><textarea name="note.ship_for_packer" rows="2" defaultValue={notes.for_packer ?? 'Consignee: Leader food supply institution'} /></Row>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Cancel Transaction ( Claim / Reject )" tone="gray">
        <div className="txe-checkline">
          <label><input type="checkbox" name="logistics.cancel_claim" /> Claim</label>
          <label><input type="checkbox" name="logistics.cancel_reject" /> Reject</label>
          <label><input type="checkbox" name="logistics.cancel_move" /> Move</label>
        </div>
      </SectionCard>
    </div>
  )
}

function BottomActions({ saving, duplicating, onDuplicate, onPrint, onSave, onSaveQuit }) {
  return (
    <div className="txe-bottom-actions">
      <div className="txe-bottom-tabs">
        <button type="button">Items</button>
        <button type="button">Special Notes</button>
        <button type="button">L/C Terms</button>
      </div>
      <div className="txe-bottom-buttons">
        <button type="button" onClick={onDuplicate} disabled={saving || duplicating}>{duplicating ? 'Duplicating...' : 'Duplicate'}</button>
        <button type="button" onClick={onPrint} disabled={saving || duplicating}>Print</button>
        <button type="button" onClick={onSave} disabled={saving || duplicating}>{saving ? 'Saving...' : 'Save'}</button>
        <button type="button" onClick={onSaveQuit} disabled={saving || duplicating}>{saving ? 'Saving...' : 'Save & Quit'}</button>
      </div>
    </div>
  )
}

function SectionCard({ title, side, tone = 'blue', children }) {
  return (
    <section className={`txe-card txe-${tone}`}>
      <div className="txe-card-head">
        <h4>{title}</h4>
        {side ? <span>{side}</span> : null}
      </div>
      <div className="txe-card-body">{children}</div>
    </section>
  )
}

function LabelField({ label, children }) {
  return (
    <label className="txe-label-field">
      <span>{label}</span>
      {children}
    </label>
  )
}

function Row({ label, children }) {
  return (
    <div className="txe-row">
      <label>{label}</label>
      <div>{children}</div>
    </div>
  )
}

function SideIconButton({ active, label, onClick, icon }) {
  return (
    <button type="button" className={`txe-side-btn${active ? ' active' : ''}`} onClick={onClick} title={label}>
      {icon}
    </button>
  )
}

function Toast({ text, tone = 'success' }) {
  return (
    <div
      style={{
        position: 'fixed',
        right: '20px',
        top: '20px',
        zIndex: 9999,
        padding: '10px 14px',
        borderRadius: '8px',
        color: '#fff',
        background: tone === 'error' ? '#b00020' : '#1f7a39',
        boxShadow: '0 8px 20px rgba(0, 0, 0, 0.25)',
        fontSize: '14px',
      }}
    >
      {text}
    </div>
  )
}

function HomeIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5M6 9.5V21h12V9.5" /></svg>
}

function DollarIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18M16 7.5c0-1.7-1.8-3-4-3s-4 1.3-4 3 1.8 3 4 3 4 1.3 4 3-1.8 3-4 3-4-1.3-4-3" /></svg>
}

function ShipIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 18c1.2 1.3 2.4 2 3.6 2s2.4-.7 3.6-2c1.2 1.3 2.4 2 3.6 2s2.4-.7 3.6-2c1.2 1.3 2.4 2 3.6 2M5 14h14l-1.5-5h-11Z" /></svg>
}

export default TransactionEditModal

function withCurrent(list, current) {
  if (!current) return list
  return list.includes(current) ? list : [current, ...list]
}

function formatDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-GB')
}

function normalizeText(value) {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  return text === '' ? null : text
}

function normalizeNumber(value) {
  const text = normalizeText(value)
  if (text === null) return null
  const number = Number(text.replace(/,/g, ''))
  return Number.isFinite(number) ? number : null
}

function toApiDate(value) {
  const text = normalizeText(value)
  if (!text) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text
  const parts = text.split('/')
  if (parts.length === 3) {
    const [dd, mm, yyyy] = parts
    if (yyyy?.length === 4) return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
  }
  const date = new Date(text)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString().slice(0, 10)
}

function getField(formData, name) {
  return normalizeText(formData.get(name))
}

function getRadioBoolean(formData, name, fallback = false) {
  const raw = formData.get(name)
  if (raw === null) return fallback
  return String(raw).toLowerCase() === 'yes'
}

function getCheckbox(formElement, name) {
  const element = formElement.querySelector(`input[name="${name}"]`)
  return Boolean(element?.checked)
}

function upsertNoteEntries(existing = [], updates = {}) {
  const map = new Map()
  for (const entry of existing) {
    if (entry?.note_key) map.set(entry.note_key, { ...entry })
  }
  Object.entries(updates).forEach(([noteKey, noteValue], index) => {
    const value = normalizeText(noteValue)
    if (!value) return
    const current = map.get(noteKey) ?? {}
    map.set(noteKey, {
      ...current,
      note_key: noteKey,
      note_value: value,
      section: noteKey.startsWith('ship_') ? 'ship' : 'home',
      sort_order: current.sort_order ?? index,
    })
  })
  return Array.from(map.values()).map((entry) => ({
    section: entry.section ?? null,
    note_key: entry.note_key,
    note_value: entry.note_value ?? null,
    sort_order: entry.sort_order ?? 0,
  }))
}

function buildPayload(formElement, transaction) {
  const formData = new FormData(formElement)
  const existingExpenseMap = new Map(
    (transaction.expense_lines ?? transaction.expenseLines ?? []).map((line) => [line.line_key, line]),
  )
  const expenseLines = EXPENSE_FIELDS.map((field, index) => {
    const amount = normalizeNumber(formData.get(`expense.${field.key}.amount`))
    const currency = getField(formData, `expense.${field.key}.currency`)
    const description = getField(formData, `expense.${field.key}.description`)
    const existing = existingExpenseMap.get(field.key)
    const normalizedCurrency = currency ?? existing?.currency ?? null
    const normalizedAmount = amount ?? (existing?.amount !== undefined ? normalizeNumber(existing.amount) : null)
    const normalizedDescription = description ?? existing?.description ?? null

    if (normalizedAmount === null && !normalizedCurrency && !normalizedDescription) {
      return null
    }

    return {
      section: 'expenses',
      group_name: field.group,
      line_key: field.key,
      line_label: field.label,
      amount: normalizedAmount,
      currency: normalizedCurrency,
      description: normalizedDescription,
      sort_order: existing?.sort_order ?? index,
    }
  }).filter(Boolean)

  return {
    transaction: {
      booking_no: getField(formData, 'transaction.booking_no') ?? transaction.booking_no,
      booking_mode: transaction.booking_mode ?? 'trade_commission',
      issue_date: toApiDate(getField(formData, 'transaction.issue_date') ?? transaction.issue_date),
      sales_person_id: transaction.sales_person_id ?? null,
      product_origin: getField(formData, 'transaction.product_origin') ?? transaction.product_origin ?? null,
      destination: getField(formData, 'transaction.destination') ?? transaction.destination ?? null,
      category: transaction.category ?? null,
      type: getField(formData, 'transaction.type') ?? transaction.type ?? null,
      country: transaction.country ?? null,
      container_primary: getField(formData, 'transaction.container_primary') ?? transaction.container_primary ?? null,
      container_secondary: getField(formData, 'transaction.container_secondary') ?? transaction.container_secondary ?? null,
      certified: (getField(formData, 'transaction.certified') ?? 'No') === 'Yes',
      net_margin: normalizeNumber(formData.get('transaction.net_margin')),
    },
    general_info_customer: {
      customer: getField(formData, 'general_info_customer.customer'),
      attention: transaction.general_info_customer?.attention ?? null,
      ship_to: transaction.general_info_customer?.ship_to ?? null,
      buyer: getField(formData, 'general_info_customer.buyer'),
      buyer_number: getField(formData, 'general_info_customer.buyer_number'),
      end_customer: transaction.general_info_customer?.end_customer ?? null,
      prices_customer_type: getField(formData, 'general_info_customer.prices_customer_type'),
      prices_customer_rate: normalizeNumber(formData.get('general_info_customer.prices_customer_rate')),
      payment_customer_term: transaction.general_info_customer?.payment_customer_term ?? null,
      payment_customer_type: getField(formData, 'general_info_customer.payment_customer_type'),
      payment_customer_advance_percent: normalizeNumber(formData.get('general_info_customer.payment_customer_advance_percent')),
      description: getField(formData, 'general_info_customer.description'),
      tolerance: transaction.general_info_customer?.tolerance ?? null,
      marketing_fee: transaction.general_info_customer?.marketing_fee ?? false,
    },
    general_info_packer: {
      vendor: getField(formData, 'general_info_packer.vendor'),
      packer_name: getField(formData, 'general_info_packer.packer_name'),
      packer_number: getField(formData, 'general_info_packer.packer_number'),
      packed_by: transaction.general_info_packer?.packed_by ?? null,
      prices_packer_type: getField(formData, 'general_info_packer.prices_packer_type'),
      prices_packer_rate: normalizeNumber(formData.get('general_info_packer.prices_packer_rate')),
      payment_packer_term: transaction.general_info_packer?.payment_packer_term ?? null,
      payment_packer_type: getField(formData, 'general_info_packer.payment_packer_type'),
      payment_packer_advance_percent: normalizeNumber(formData.get('general_info_packer.payment_packer_advance_percent')),
      description: getField(formData, 'general_info_packer.description'),
      tolerance: getField(formData, 'general_info_packer.tolerance'),
      total_lqd_price: normalizeNumber(formData.get('general_info_packer.total_lqd_price')),
      consignee: transaction.general_info_packer?.consignee ?? null,
    },
    revenue_customer: {
      total_selling_value: normalizeNumber(formData.get('revenue_customer.total_selling_value')),
      total_selling_currency: getField(formData, 'revenue_customer.total_selling_currency'),
      commission_enabled: getRadioBoolean(formData, 'revenue_customer.commission_enabled', transaction.revenue_customer?.commission_enabled ?? false),
      commission_percent: normalizeNumber(formData.get('revenue_customer.commission_percent')),
      amount: normalizeNumber(formData.get('revenue_customer.amount')),
      amount_currency: getField(formData, 'revenue_customer.amount_currency'),
      description: getField(formData, 'revenue_customer.description'),
      rebate_memo_amount: transaction.revenue_customer?.rebate_memo_amount ?? null,
      rebate_memo_description: transaction.revenue_customer?.rebate_memo_description ?? null,
      overcharge_sc_amount: transaction.revenue_customer?.overcharge_sc_amount ?? null,
      overcharge_sc_description: transaction.revenue_customer?.overcharge_sc_description ?? null,
    },
    revenue_packer: {
      total_buying_value: normalizeNumber(formData.get('revenue_packer.total_buying_value')),
      total_buying_currency: getField(formData, 'revenue_packer.total_buying_currency'),
      commission_enabled: getRadioBoolean(formData, 'revenue_packer.commission_enabled', transaction.revenue_packer?.commission_enabled ?? false),
      commission_percent: normalizeNumber(formData.get('revenue_packer.commission_percent')),
      amount: normalizeNumber(formData.get('revenue_packer.amount')),
      amount_currency: getField(formData, 'revenue_packer.amount_currency'),
      description: getField(formData, 'revenue_packer.description'),
      overcharge_sc_amount: transaction.revenue_packer?.overcharge_sc_amount ?? null,
      overcharge_sc_description: transaction.revenue_packer?.overcharge_sc_description ?? null,
    },
    cash_flow_customer: {
      date_advance: toApiDate(getField(formData, 'cash_flow_customer.date_advance') ?? transaction.cash_flow_customer?.date_advance),
      amount_advance: normalizeNumber(formData.get('cash_flow_customer.amount_advance')),
      date_balance: toApiDate(getField(formData, 'cash_flow_customer.date_balance') ?? transaction.cash_flow_customer?.date_balance),
      amount_balance: normalizeNumber(formData.get('cash_flow_customer.amount_balance')),
    },
    cash_flow_packer: {
      date_advance: toApiDate(getField(formData, 'cash_flow_packer.date_advance') ?? transaction.cash_flow_packer?.date_advance),
      amount_advance: normalizeNumber(formData.get('cash_flow_packer.amount_advance')),
      date_balance: toApiDate(getField(formData, 'cash_flow_packer.date_balance') ?? transaction.cash_flow_packer?.date_balance),
      amount_balance: normalizeNumber(formData.get('cash_flow_packer.amount_balance')),
    },
    shipping_details_customer: {
      lsd_min: toApiDate(getField(formData, 'shipping_details_customer.lsd_min') ?? transaction.shipping_details_customer?.lsd_min),
      lsd_max: toApiDate(getField(formData, 'shipping_details_customer.lsd_max') ?? transaction.shipping_details_customer?.lsd_max),
      presentation_days: normalizeNumber(formData.get('shipping_details_customer.presentation_days')),
      lc_expiry: toApiDate(getField(formData, 'shipping_details_customer.lc_expiry') ?? transaction.shipping_details_customer?.lc_expiry),
      req_eta: toApiDate(getField(formData, 'shipping_details_customer.req_eta') ?? transaction.shipping_details_customer?.req_eta),
    },
    shipping_details_packer: {
      lsd_min: toApiDate(getField(formData, 'shipping_details_packer.lsd_min') ?? transaction.shipping_details_packer?.lsd_min),
      lsd_max: toApiDate(getField(formData, 'shipping_details_packer.lsd_max') ?? transaction.shipping_details_packer?.lsd_max),
      presentation_days: normalizeNumber(formData.get('shipping_details_packer.presentation_days')),
      lc_expiry: toApiDate(getField(formData, 'shipping_details_packer.lc_expiry') ?? transaction.shipping_details_packer?.lc_expiry),
      req_eta: toApiDate(getField(formData, 'shipping_details_packer.req_eta') ?? transaction.shipping_details_packer?.req_eta),
    },
    notes: {
      by_sales: getField(formData, 'notes.by_sales') ?? transaction.note?.by_sales ?? null,
    },
    logistics: {
      plan_etd: toApiDate(getField(formData, 'logistics.plan_etd')),
      plan_eta: toApiDate(getField(formData, 'logistics.plan_eta')),
      packaging_date_inner: toApiDate(getField(formData, 'logistics.packaging_date_inner')),
      packaging_date_outer: toApiDate(getField(formData, 'logistics.packaging_date_outer')),
      feeder_vessel: getField(formData, 'logistics.feeder_vessel'),
      mother_vessel: getField(formData, 'logistics.mother_vessel'),
      container_no: getField(formData, 'logistics.container_no'),
      seal_no: getField(formData, 'logistics.seal_no'),
      lc_no: getField(formData, 'logistics.lc_no'),
      temperature_recorder_no: getField(formData, 'logistics.temperature_recorder_no'),
      etd_date: toApiDate(getField(formData, 'logistics.etd_date')),
      eta_date: toApiDate(getField(formData, 'logistics.eta_date')),
      qc_inspection_date: toApiDate(getField(formData, 'logistics.qc_inspection_date')),
      discharge_at: getField(formData, 'logistics.discharge_at'),
      service_type: getField(formData, 'logistics.service_type'),
      bl_date: toApiDate(getField(formData, 'logistics.bl_date')),
      bl_no: getField(formData, 'logistics.bl_no'),
      port: getField(formData, 'logistics.port'),
      destination: getField(formData, 'logistics.destination'),
      shipping_line_agent: getField(formData, 'logistics.shipping_line_agent'),
      packer_inv_date: toApiDate(getField(formData, 'logistics.packer_inv_date')),
      packer_inv: getField(formData, 'logistics.packer_inv'),
      cancel_claim: getCheckbox(formElement, 'logistics.cancel_claim'),
      cancel_reject: getCheckbox(formElement, 'logistics.cancel_reject'),
      cancel_move: getCheckbox(formElement, 'logistics.cancel_move'),
    },
    expense_lines: expenseLines,
    note_entries: upsertNoteEntries(
      transaction.note_entries ?? transaction.noteEntries ?? [],
      {
        by_qc: formData.get('note.by_qc'),
        for_customer: formData.get('note.for_customer'),
        by_logistic: formData.get('note.by_logistic'),
        by_packaging: formData.get('note.by_packaging'),
        for_packer: formData.get('note.for_packer'),
        ship_by_sales: formData.get('note.ship_by_sales'),
        ship_by_qc: formData.get('note.ship_by_qc'),
        ship_for_customer: formData.get('note.ship_for_customer'),
        ship_by_logistic: formData.get('note.ship_by_logistic'),
        ship_by_packaging: formData.get('note.ship_by_packaging'),
        ship_for_packer: formData.get('note.ship_for_packer'),
      },
    ),
  }
}
