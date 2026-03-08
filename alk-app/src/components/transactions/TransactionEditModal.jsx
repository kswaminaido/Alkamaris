import { useState } from 'react'

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

function TransactionEditModal({ transaction, onClose }) {
  const [tab, setTab] = useState('home')

  if (!transaction) return null

  return (
    <div className="txn-edit-overlay" role="dialog" aria-modal="true" aria-label="Edit Transaction">
      <div className="txn-edit-modal">
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
            <BottomActions />
          </div>

          <div className="txn-edit-side-icons">
            <SideIconButton active={tab === 'home'} label="Home" onClick={() => setTab('home')} icon={<HomeIcon />} />
            <SideIconButton active={tab === 'dollar'} label="Dollar" onClick={() => setTab('dollar')} icon={<DollarIcon />} />
            <SideIconButton active={tab === 'ship'} label="Ship" onClick={() => setTab('ship')} icon={<ShipIcon />} />
          </div>
        </div>
      </div>
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
        <LabelField label="Booking No."><input defaultValue={transaction.booking_no || 'SIN2605802'} /></LabelField>
        <LabelField label="Issue Date"><input defaultValue={issueDate} /></LabelField>
        <LabelField label="Status"><input defaultValue={transaction.transaction_status ?? 'I'} /></LabelField>
        <LabelField label="Last Modified By"><input defaultValue={salesPersonName || 'Keerthana Gubbala'} /></LabelField>

        <LabelField label="Sales Person"><select defaultValue={salesPersonName || 'Chaipat'}>{withCurrent(OPTIONS.salesPeople, salesPersonName || 'Chaipat').map((o) => <option key={o}>{o}</option>)}</select></LabelField>
        <LabelField label="Product Origin"><select defaultValue={origin || 'INDIA'}>{withCurrent(OPTIONS.origin, origin || 'INDIA').map((o) => <option key={o}>{o}</option>)}</select></LabelField>
        <LabelField label="Type"><select defaultValue={type || 'Trade'}>{withCurrent(OPTIONS.type, type || 'Trade').map((o) => <option key={o}>{o}</option>)}</select></LabelField>
        <LabelField label="Container"><div className="txe-inline"><select defaultValue={container || '40 ft'}>{withCurrent(OPTIONS.container, container || '40 ft').map((o) => <option key={o}>{o}</option>)}</select><select defaultValue="Full Load">{OPTIONS.load.map((o) => <option key={o}>{o}</option>)}</select></div></LabelField>

        <LabelField label="Destination"><select defaultValue={destination || 'Jordan'}>{withCurrent(OPTIONS.destination, destination || 'Jordan').map((o) => <option key={o}>{o}</option>)}</select></LabelField>
        <LabelField label="Certified"><select defaultValue={certified}>{OPTIONS.yesNo.map((o) => <option key={o}>{o}</option>)}</select></LabelField>
        <LabelField label="Net Margin"><input defaultValue={transaction.net_margin ?? ''} /></LabelField>
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
          <Row label="Customer"><input defaultValue={customer.customer ?? ''} /></Row>
          <Row label="Attn"><select defaultValue={customer.attention ?? ''}>{withCurrent(['MR. YOUSEF AZIZ', 'MR. RAHUL'], customer.attention).map((o) => <option key={o}>{o}</option>)}</select></Row>
          <Row label="Buyer's"><div className="txe-inline"><select defaultValue={customer.buyer ?? ''}><option value="">Select an ...</option>{customer.buyer ? <option value={customer.buyer}>{customer.buyer}</option> : null}</select><input defaultValue={customer.buyer_number ?? ''} placeholder="#" /></div></Row>
          <Row label="End Customer"><input defaultValue={customer.end_customer ?? ''} /></Row>
          <Row label="Prices Customer"><div className="txe-inline"><select defaultValue={customer.prices_customer_type ?? 'CFR'}>{withCurrent(['CFR', 'FOB'], customer.prices_customer_type || 'CFR').map((o) => <option key={o}>{o}</option>)}</select><input defaultValue={customer.prices_customer_rate ?? ''} /></div></Row>
          <Row label="Payment Customer"><div className="txe-inline"><select defaultValue={customer.payment_customer_type ?? 'T/T'}>{withCurrent(OPTIONS.payment, customer.payment_customer_type || 'T/T').map((o) => <option key={o}>{o}</option>)}</select><input defaultValue={customer.payment_customer_advance_percent ?? ''} /></div></Row>
          <Row label="Description"><textarea rows="2" defaultValue={customer.description ?? ''} /></Row>
          <Row label="Tolerance"><select defaultValue={customer.tolerance ?? '+/- 1%'}>{withCurrent(OPTIONS.tolerance, customer.tolerance || '+/- 1%').map((o) => <option key={o}>{o}</option>)}</select></Row>
        </SectionCard>

        <SectionCard title="GENERAL INFO" side="PACKER" tone="blue">
          <Row label="Vendor"><input defaultValue={packer.vendor ?? ''} /></Row>
          <Row label="Packer's"><div className="txe-inline"><select defaultValue={packer.packer_name ?? ''}><option value="">Select</option>{packer.packer_name ? <option value={packer.packer_name}>{packer.packer_name}</option> : null}</select><input defaultValue={packer.packer_number ?? ''} placeholder="#" /></div></Row>
          <Row label="Packed By"><input defaultValue={packer.packed_by ?? ''} /></Row>
          <Row label="Prices Packer"><div className="txe-inline"><select defaultValue={packer.prices_packer_type ?? 'CFR'}>{withCurrent(['CFR', 'FOB'], packer.prices_packer_type || 'CFR').map((o) => <option key={o}>{o}</option>)}</select><input defaultValue={packer.prices_packer_rate ?? ''} /></div></Row>
          <Row label="Payment Packer"><div className="txe-inline"><select defaultValue={packer.payment_packer_type ?? 'T/T'}>{withCurrent(OPTIONS.payment, packer.payment_packer_type || 'T/T').map((o) => <option key={o}>{o}</option>)}</select><input defaultValue={packer.payment_packer_advance_percent ?? ''} /></div></Row>
          <Row label="Description"><textarea rows="2" defaultValue={packer.description ?? ''} /></Row>
          <Row label="Tolerance"><div className="txe-inline"><select defaultValue={packer.tolerance ?? '+/- 1%'}>{withCurrent(OPTIONS.tolerance, packer.tolerance || '+/- 1%').map((o) => <option key={o}>{o}</option>)}</select><input defaultValue={packer.total_lqd_price ?? ''} /></div></Row>
        </SectionCard>
      </div>

      <div className="txe-two">
        <SectionCard title="REVENUE" side="CUSTOMER" tone="blue">
          <Row label="Total Selling Value"><div className="txe-inline"><input defaultValue={revenueCustomer.total_selling_value ?? ''} /><select defaultValue={revenueCustomer.total_selling_currency ?? 'US($)'}>{withCurrent(OPTIONS.currency, revenueCustomer.total_selling_currency || 'US($)').map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="Commission"><div className="txe-inline"><label><input type="radio" name="rev-c" defaultChecked={!!revenueCustomer.commission_enabled} /> Yes</label><label><input type="radio" name="rev-c" defaultChecked={!revenueCustomer.commission_enabled} /> No</label><input defaultValue={revenueCustomer.commission_percent ?? ''} placeholder="Percent" /></div></Row>
          <Row label="Amount"><div className="txe-inline"><input defaultValue={revenueCustomer.amount ?? ''} /><select defaultValue={revenueCustomer.amount_currency ?? 'US($)'}>{withCurrent(OPTIONS.currency, revenueCustomer.amount_currency || 'US($)').map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="Description"><textarea rows="2" defaultValue={revenueCustomer.description ?? ''} /></Row>
        </SectionCard>

        <SectionCard title="REVENUE" side="PACKER" tone="blue">
          <Row label="Total Buying Value"><div className="txe-inline"><input defaultValue={revenuePacker.total_buying_value ?? ''} /><select defaultValue={revenuePacker.total_buying_currency ?? 'US($)'}>{withCurrent(OPTIONS.currency, revenuePacker.total_buying_currency || 'US($)').map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="Commission"><div className="txe-inline"><label><input type="radio" name="rev-p" defaultChecked={!!revenuePacker.commission_enabled} /> Yes</label><label><input type="radio" name="rev-p" defaultChecked={!revenuePacker.commission_enabled} /> No</label><input defaultValue={revenuePacker.commission_percent ?? ''} placeholder="Percent" /></div></Row>
          <Row label="Amount"><div className="txe-inline"><input defaultValue={revenuePacker.amount ?? ''} /><select defaultValue={revenuePacker.amount_currency ?? 'US($)'}>{withCurrent(OPTIONS.currency, revenuePacker.amount_currency || 'US($)').map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="Description"><textarea rows="2" defaultValue={revenuePacker.description ?? ''} /></Row>
        </SectionCard>
      </div>

      <div className="txe-two">
        <SectionCard title="CASH FLOW" side="CUSTOMER" tone="green">
          <Row label="Date Advance"><div className="txe-inline"><input defaultValue={formatDate(cashCustomer.date_advance)} /><input defaultValue={cashCustomer.amount_advance ?? ''} /></div></Row>
          <Row label="Date Balance"><div className="txe-inline"><input defaultValue={formatDate(cashCustomer.date_balance)} /><input defaultValue={cashCustomer.amount_balance ?? ''} /></div></Row>
        </SectionCard>
        <SectionCard title="CASH FLOW" side="PACKER" tone="green">
          <Row label="Date Advance"><div className="txe-inline"><input defaultValue={formatDate(cashPacker.date_advance)} /><input defaultValue={cashPacker.amount_advance ?? ''} /></div></Row>
          <Row label="Date Balance"><div className="txe-inline"><input defaultValue={formatDate(cashPacker.date_balance)} /><input defaultValue={cashPacker.amount_balance ?? ''} /></div></Row>
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
          <Row label="LSD Min"><div className="txe-inline"><input defaultValue={formatDate(shippingCustomer.lsd_min)} /><input defaultValue={formatDate(shippingCustomer.lsd_max)} /></div></Row>
          <Row label="Presentation"><div className="txe-inline"><input defaultValue={shippingCustomer.presentation_days ?? ''} /><input defaultValue={formatDate(shippingCustomer.lc_expiry)} /></div></Row>
          <Row label="REQ ETA"><input defaultValue={formatDate(shippingCustomer.req_eta)} /></Row>
        </SectionCard>
        <SectionCard title="SHIPPING DETAILS" side="PACKER" tone="cyan">
          <Row label="LSD Min"><div className="txe-inline"><input defaultValue={formatDate(shippingPacker.lsd_min)} /><input defaultValue={formatDate(shippingPacker.lsd_max)} /></div></Row>
          <Row label="Presentation"><div className="txe-inline"><input defaultValue={shippingPacker.presentation_days ?? ''} /><input defaultValue={formatDate(shippingPacker.lc_expiry)} /></div></Row>
          <Row label="REQ ETA"><input defaultValue={formatDate(shippingPacker.req_eta)} /></Row>
        </SectionCard>
      </div>

      <SectionCard title="NOTES" tone="gray">
        <div className="txe-two">
          <div>
            <Row label="By Sale"><textarea rows="2" defaultValue={notes.by_sales ?? ''} /></Row>
            <Row label="By QC"><textarea rows="2" /></Row>
            <Row label="For Customer"><textarea rows="2" /></Row>
          </div>
          <div>
            <Row label="By Logistic"><textarea rows="2" /></Row>
            <Row label="By Packaging"><textarea rows="2" /></Row>
            <Row label="For Packer"><textarea rows="2" defaultValue={notes.for_packer ?? 'Consignee: Leader food supply institution'} /></Row>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Cancel Transaction ( Claim / Reject )" tone="gray">
        <div className="txe-checkline">
          <label><input type="checkbox" /> Claim</label>
          <label><input type="checkbox" /> Reject</label>
          <label><input type="checkbox" /> Move</label>
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
          <Row label="Trucking"><div className="txe-inline"><input /><select>{OPTIONS.currency.map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="Freight"><div className="txe-inline"><input /><select>{OPTIONS.currency.map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="Local Charges"><div className="txe-inline"><input /><select>{OPTIONS.currency.map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="Custom Clearance"><div className="txe-inline"><input /><select>{OPTIONS.currency.map((o) => <option key={o}>{o}</option>)}</select></div></Row>
        </SectionCard>

        <SectionCard title="EXPENSES" side="INSURANCE" tone="pink">
          <Row label="Marine Insurance"><div className="txe-inline"><input /><select>{OPTIONS.currency.map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="Rejection Insurance"><div className="txe-inline"><input /><select>{OPTIONS.currency.map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="Credit Insurance"><div className="txe-inline"><input /><select>{OPTIONS.currency.map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="War risk charges"><div className="txe-inline"><input /><select>{OPTIONS.currency.map((o) => <option key={o}>{o}</option>)}</select></div></Row>
        </SectionCard>
      </div>

      <div className="txe-two">
        <SectionCard title="EXPENSES" side="DOCUMENTATION / BANK CHARGES" tone="pink">
          <Row label="Legalization Docs"><div className="txe-inline"><input /><select>{OPTIONS.currency.map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="Bank Charges"><div className="txe-inline"><input defaultValue="0.00" /><select>{OPTIONS.currency.map((o) => <option key={o}>{o}</option>)}</select></div></Row>
        </SectionCard>

        <SectionCard title="EXPENSES" side="PACKAGING" tone="pink">
          <Row label="Packaging material"><div className="txe-inline"><input /><select>{OPTIONS.currency.map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="Printing cylinder"><div className="txe-inline"><input /><select>{OPTIONS.currency.map((o) => <option key={o}>{o}</option>)}</select></div></Row>
        </SectionCard>
      </div>

      <div className="txe-two">
        <SectionCard title="Expenses" side="INSPECTION / LAB TEST" tone="pink">
          <Row label="Inspection Amt."><div className="txe-inline"><input /><select>{OPTIONS.currency.map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="Loading Supervision"><div className="txe-inline"><input /><select>{OPTIONS.currency.map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="Lab Test"><div className="txe-inline"><input /><select>{OPTIONS.currency.map((o) => <option key={o}>{o}</option>)}</select></div></Row>
        </SectionCard>

        <SectionCard title="EXPENSES" side="REBATE / CLAIM" tone="pink">
          <Row label="Rebate to Customer"><div className="txe-inline"><input defaultValue="2,000.00" /><select>{OPTIONS.currency.map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="Description"><input /></Row>
          <Row label="Rebate to Packer"><div className="txe-inline"><input defaultValue="0.00" /><select>{OPTIONS.currency.map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="Description"><input /></Row>
          <Row label="Claim"><div className="txe-inline"><input /><select>{OPTIONS.currency.map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="Others"><div className="txe-inline"><input /><select>{OPTIONS.currency.map((o) => <option key={o}>{o}</option>)}</select></div></Row>
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
            <Row label="Plan ETD"><input defaultValue="" /></Row>
            <Row label="Plan ETA"><input defaultValue="" /></Row>
            <Row label="Packaging Date"><div className="txe-inline"><input placeholder="Inner" /><input placeholder="Outer" /></div></Row>
            <Row label="Feeder Vessel"><input /></Row>
            <Row label="Mother Vessel"><input defaultValue="ORCHARD STAR V.008S" /></Row>
            <Row label="Container #"><input defaultValue="EMCU5743198" /></Row>
            <Row label="Seal #"><input defaultValue="EMCHVP5524" /></Row>
            <Row label="LC #"><input /></Row>
            <Row label="Temperature Recorder No"><input /></Row>
          </div>
          <div>
            <Row label="ETD Date"><input defaultValue="20/02/2026" /></Row>
            <Row label="ETA Date"><input defaultValue="29/03/2026" /></Row>
            <Row label="QC Inspection Date"><input /></Row>
            <Row label="Discharge At"><input /></Row>
            <Row label="Service Type"><select defaultValue="ALL WATER OR MLB">{OPTIONS.serviceType.map((o) => <option key={o}>{o}</option>)}</select></Row>
            <Row label="B/L Date"><input defaultValue="20/02/2026" /></Row>
            <Row label="B/L No."><input defaultValue="EGLV1046000036" /></Row>
            <Row label="Port"><input defaultValue="KOLKATA, INDIA" /></Row>
            <Row label="Destination"><input defaultValue="AQABA, JORDAN" /></Row>
            <Row label="Shipping Line / Agent"><input defaultValue="EVERGREEN LINE" /></Row>
            <Row label="Packer Inv Date"><input defaultValue="16/02/2026" /></Row>
            <Row label="Packer Inv."><input defaultValue="CMFE/S/074/25-2" /></Row>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="NOTES" tone="gray">
        <div className="txe-two">
          <div>
            <Row label="By Sale"><textarea rows="2" defaultValue={notes.by_sales ?? ''} /></Row>
            <Row label="By QC"><textarea rows="2" /></Row>
            <Row label="For Customer"><textarea rows="2" /></Row>
          </div>
          <div>
            <Row label="By Logistic"><textarea rows="2" /></Row>
            <Row label="By Packaging"><textarea rows="2" /></Row>
            <Row label="For Packer"><textarea rows="2" defaultValue={notes.for_packer ?? 'Consignee: Leader food supply institution'} /></Row>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Cancel Transaction ( Claim / Reject )" tone="gray">
        <div className="txe-checkline">
          <label><input type="checkbox" /> Claim</label>
          <label><input type="checkbox" /> Reject</label>
          <label><input type="checkbox" /> Move</label>
        </div>
      </SectionCard>
    </div>
  )
}

function BottomActions() {
  return (
    <div className="txe-bottom-actions">
      <div className="txe-bottom-tabs">
        <button type="button">Items</button>
        <button type="button">Special Notes</button>
        <button type="button">L/C Terms</button>
      </div>
      <div className="txe-bottom-buttons">
        <button type="button">Duplicate</button>
        <button type="button">Print</button>
        <button type="button">Save</button>
        <button type="button">Save &amp; Quit</button>
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
