import { useEffect, useRef, useState } from 'react'
import TransactionItemsModal from './TransactionItemsModal'
import { FALLBACK_COUNTRIES, fetchCountryOptions, mergeCountryOptions } from '../../utils/countries'

const OPTIONS = {
  salesPeople: ['Chaipat', 'Keerthana Gubbala', 'Nina', 'Sahil'],
  type: ['Trade', 'Service'],
  yesNo: ['Yes', 'No'],
  container: ['20 ft', '40 ft'],
  load: ['Full Load', 'Part Load'],
  currency: ['US($)', 'EUR', 'INR'],
  payment: ['T/T', 'L/C', 'CAD'],
  tolerance: ['+/- 0.5%', '+/- 1%', '+/- 2%'],
  serviceType: ['ALL WATER OR MLB', 'FOB', 'CIF'],
}

const STATUS_OPTIONS = [
  { value: 'I', label: 'Invoice' },
  { value: 'P', label: 'Pending' },
  { value: 'S', label: 'Shipped' },
  { value: 'R', label: 'Received' },
]

function getStatusLabel(status) {
  const option = STATUS_OPTIONS.find(o => o.value === status)
  return option ? option.label : 'Unknown'
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

const PRINT_DOCUMENTS = [
  { type: 'all', label: 'Print All' },
  { type: 'bcb_lqd', label: 'Print BCB /Lqd' },
  { type: 'bcv_lqd', label: 'Print BCV /Lqd' },
  { type: 'sales_contract_packer', label: 'Print Sales Contract Packer' },
  { type: 'appendix_packer', label: 'Print Appendix Packer' },
  { type: 'proforma_invoice', label: 'Print Proforma Inv' },
  { type: 'specs', label: 'Print Specs' },
  { type: 's_a', label: 'Print S/A' },
  { type: 'lc_terms_vendor', label: 'Print L/C Terms (Vendor)' },
  { type: 'lc_terms', label: 'Print L/C Terms' },
  { type: 'delivery_order', label: 'Print Delivery Order' },
]

const PRINT_YES_NO_OPTIONS = ['NO', 'YES']
const PRINT_GLAZING_OPTIONS = ['Size', 'NO', 'YES']
const PRINT_TEMPLATE_OPTIONS = ['India Private']

const ATTACHMENT_OPTIONS = [
  'Health Certificate',
  'Commercial Invoice',
  'Packing List',
  'Master Bill of Lading',
  'Certificate of Origin',
  'Beneficiary Certificate',
  'Other Document',
]

function TransactionEditModal({ transaction, authFetch, onClose, onSave, onDuplicate, onTransactionChange }) {
  const [tab, setTab] = useState('home')
  const [itemsModalOpen, setItemsModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const [printDialogOpen, setPrintDialogOpen] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [documentPreviews, setDocumentPreviews] = useState([])
  const [printSelections, setPrintSelections] = useState(() => buildInitialPrintSelections())
  const [printOptions, setPrintOptions] = useState(() => buildInitialPrintOptions())
  const [countryOptions, setCountryOptions] = useState(FALLBACK_COUNTRIES)
  const formRef = useRef(null)

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 2200)
    return () => clearTimeout(timer)
  }, [toast])

  function showToast(text, tone = 'success') {
    setToast({ text, tone })
  }

  useEffect(() => {
    setPrintSelections(buildInitialPrintSelections())
    setPrintOptions(buildInitialPrintOptions())
    setDocumentPreviews([])
    setPrintDialogOpen(false)
    setItemsModalOpen(false)
  }, [transaction])

  useEffect(() => {
    let active = true

    async function loadCountries() {
      const options = await fetchCountryOptions()
      if (active) {
        setCountryOptions(options)
      }
    }

    loadCountries()

    return () => {
      active = false
    }
  }, [])

  if (!transaction) return null

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
    setPrintDialogOpen(true)
    showToast('Print dialog opened')
  }

  function handleClosePrintDialog() {
    setPrintDialogOpen(false)
    setDocumentPreviews([])
  }

  async function handleRenderDocuments() {
    const documentTypes = Object.entries(printSelections)
      .filter(([, checked]) => checked)
      .map(([type]) => type)

    if (documentTypes.length === 0) {
      const printError = 'Select at least one document type.'
      setError(printError)
      showToast(printError, 'error')
      return
    }

    if (!authFetch) {
      const printError = 'Print service is unavailable.'
      setError(printError)
      showToast(printError, 'error')
      return
    }

    setPrinting(true)
    setError('')
    try {
      const response = await authFetch(`/transactions/${transaction.id}/documents/render`, {
        method: 'POST',
        body: JSON.stringify({
          document_types: documentTypes,
          options: printOptions,
        }),
      })
      const body = await response.json()
      if (!response.ok) {
        const firstValidationMessage = body?.errors ? Object.values(body.errors)?.[0]?.[0] : null
        const printError = firstValidationMessage ?? body?.message ?? 'Unable to render documents.'
        setError(printError)
        showToast(printError, 'error')
        return
      }

      const docs = body?.data ?? []
      setDocumentPreviews(docs)
      showToast('Document preview ready')
    } catch {
      const printError = 'Unable to render documents.'
      setError(printError)
      showToast(printError, 'error')
    } finally {
      setPrinting(false)
    }
  }

  function handlePrintSelectionChange(type) {
    setPrintSelections((current) => {
      if (type === 'all') {
        const nextValue = !current.all
        const next = {}
        PRINT_DOCUMENTS.forEach((document) => {
          next[document.type] = nextValue
        })
        return next
      }

      const next = { ...current, [type]: !current[type] }
      const specificTypes = PRINT_DOCUMENTS.filter((item) => item.type !== 'all').map((item) => item.type)
      next.all = specificTypes.every((item) => next[item])
      return next
    })
  }

  function handlePrintOptionChange(key, value) {
    setPrintOptions((current) => ({ ...current, [key]: value }))
  }

  function handleArticleChange(index, value) {
    setPrintOptions((current) => {
      const articles = [...current.articles]
      articles[index] = value
      return { ...current, articles }
    })
  }

  function handleAttachmentChange(label) {
    setPrintOptions((current) => {
      const exists = current.attachments.includes(label)
      return {
        ...current,
        attachments: exists
          ? current.attachments.filter((item) => item !== label)
          : [...current.attachments, label],
      }
    })
  }

  function handleDownloadSpecificDocument(documentType, format) {
    const targetDocument = documentPreviews.find((item) => item.type === documentType)
    if (!targetDocument) return
    triggerDocumentDownload(targetDocument, format)
  }

  function handlePrintDocument() {
    if (documentPreviews.length === 0) return
    const printWindow = window.open('', '_blank', 'width=1100,height=800')
    if (!printWindow) {
      showToast('Allow pop-ups to print the document.', 'error')
      return
    }
    const combinedPreview = buildPrintableHtml(documentPreviews)
    printWindow.document.open()
    printWindow.document.write(combinedPreview)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => printWindow.print(), 200)
  }

  return (
    <div className="txn-edit-overlay" role="dialog" aria-modal="true" aria-label="Edit Transaction">
      <form ref={formRef} className="txn-edit-modal" onSubmit={(event) => event.preventDefault()}>
        <div className="txn-edit-header">
          <div className="txn-edit-header-copy">
            <span className="txn-edit-eyebrow">Transaction Details</span>
            <h2>Transaction# {transaction.booking_no || 'SIN2605802'}</h2>
          </div>
          <button type="button" className="txn-edit-close" onClick={onClose} aria-label="Close transaction details">x</button>
        </div>

        <div className="txn-edit-body">
          <div className="txn-edit-main">
            <HeaderCard transaction={transaction} countryOptions={countryOptions} />
            {tab === 'home' && <HomeTab transaction={transaction} />}
            {tab === 'dollar' && <DollarTab transaction={transaction} />}
            {tab === 'ship' && <ShipTab transaction={transaction} />}
            <BottomActions
              saving={saving}
              duplicating={duplicating}
              onOpenItems={() => setItemsModalOpen(true)}
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
            <SideIconButton label="List" onClick={onClose} icon={<ListIcon />} />
            <SideIconButton label="Print" onClick={handlePrint} icon={<PrintIcon />} />
            <SideIconButton label="Save" onClick={() => handleSave(false)} icon={<SaveIcon />} disabled={saving || duplicating} />
          </div>
        </div>
      </form>
      {printDialogOpen ? (
        <PrintDialog
          transaction={transaction}
          selections={printSelections}
          options={printOptions}
          documents={documentPreviews}
          printing={printing}
          onClose={handleClosePrintDialog}
          onToggleSelection={handlePrintSelectionChange}
          onOptionChange={handlePrintOptionChange}
          onArticleChange={handleArticleChange}
          onAttachmentChange={handleAttachmentChange}
          onSubmit={handleRenderDocuments}
          onDownloadSpecificDocument={handleDownloadSpecificDocument}
          onPrintDocument={handlePrintDocument}
        />
      ) : null}
      {itemsModalOpen ? (
        <TransactionItemsModal
          transaction={transaction}
          authFetch={authFetch}
          onClose={() => setItemsModalOpen(false)}
          onTransactionChange={onTransactionChange}
        />
      ) : null}
      {toast ? <Toast text={toast.text} tone={toast.tone} /> : null}
    </div>
  )
}

function HeaderCard({ transaction, countryOptions }) {
  const salesPersonName = transaction.sales_person?.name ?? ''
  const issueDate = formatDate(transaction.issue_date)
  const updatedAt = formatDate(transaction.updated_at)
  const origin = transaction.product_origin ?? ''
  const type = transaction.type ?? ''
  const country = transaction.country ?? ''
  const destination = transaction.destination ?? ''
  const container = transaction.container_primary ?? ''
  const certified = transaction.certified ? 'Yes' : 'No'
  const originOptions = mergeCountryOptions(countryOptions, 'India (Singapore)', origin || 'INDIA')
  const countrySelectOptions = mergeCountryOptions(countryOptions, country)
  const destinationOptions = mergeCountryOptions(countryOptions, destination || 'Jordan')

  return (
    <div className="txe-card txe-header-card">
      <div className="txe-grid-4">
        <LabelField label="Booking No."><input name="transaction.booking_no" defaultValue={transaction.booking_no || 'SIN2605802'} /></LabelField>
        <LabelField label="Issue Date"><input name="transaction.issue_date" defaultValue={issueDate} /></LabelField>
        <LabelField label="Status"><select name="transaction.status" defaultValue={transaction.status ?? 'P'}>{STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></LabelField>
        <LabelField label="Last Modified By"><input defaultValue={salesPersonName || 'Keerthana Gubbala'} /></LabelField>

        <LabelField label="Sales Person"><select defaultValue={salesPersonName || 'Chaipat'}>{withCurrent(OPTIONS.salesPeople, salesPersonName || 'Chaipat').map((o) => <option key={o}>{o}</option>)}</select></LabelField>
        <LabelField label="Product Origin"><select name="transaction.product_origin" defaultValue={origin || 'India (Singapore)'}>{originOptions.map((o) => <option key={o}>{o}</option>)}</select></LabelField>
        <LabelField label="Type"><select name="transaction.type" defaultValue={type || 'Trade'}>{withCurrent(OPTIONS.type, type || 'Trade').map((o) => <option key={o}>{o}</option>)}</select></LabelField>
        <LabelField label="Container"><div className="txe-inline"><select name="transaction.container_primary" defaultValue={container || '40 ft'}>{withCurrent(OPTIONS.container, container || '40 ft').map((o) => <option key={o}>{o}</option>)}</select><select name="transaction.container_secondary" defaultValue="Full Load">{OPTIONS.load.map((o) => <option key={o}>{o}</option>)}</select></div></LabelField>

        <LabelField label="Country"><select name="transaction.country" defaultValue={country || ''}><option value="">Select</option>{countrySelectOptions.map((o) => <option key={o}>{o}</option>)}</select></LabelField>
        <LabelField label="Destination"><select name="transaction.destination" defaultValue={destination || 'Jordan'}>{destinationOptions.map((o) => <option key={o}>{o}</option>)}</select></LabelField>
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

function DollarTab({ transaction }) {
  return (
    <div className="txe-stack">
      <div className="txe-two">
        <SectionCard title="Expenses" side="TRANSPORTATION & CUSTOMS" tone="pink">
          <Row label="Trucking"><div className="txe-inline"><input name="expense.trucking.amount" defaultValue={getExpenseValue(transaction, 'trucking', 'amount')} /><select name="expense.trucking.currency" defaultValue={getExpenseValue(transaction, 'trucking', 'currency') ?? OPTIONS.currency[0]}>{withCurrent(OPTIONS.currency, getExpenseValue(transaction, 'trucking', 'currency')).map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="Freight"><div className="txe-inline"><input name="expense.freight.amount" defaultValue={getExpenseValue(transaction, 'freight', 'amount')} /><select name="expense.freight.currency" defaultValue={getExpenseValue(transaction, 'freight', 'currency') ?? OPTIONS.currency[0]}>{withCurrent(OPTIONS.currency, getExpenseValue(transaction, 'freight', 'currency')).map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="Local Charges"><div className="txe-inline"><input name="expense.local_charges.amount" defaultValue={getExpenseValue(transaction, 'local_charges', 'amount')} /><select name="expense.local_charges.currency" defaultValue={getExpenseValue(transaction, 'local_charges', 'currency') ?? OPTIONS.currency[0]}>{withCurrent(OPTIONS.currency, getExpenseValue(transaction, 'local_charges', 'currency')).map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="Custom Clearance"><div className="txe-inline"><input name="expense.custom_clearance.amount" defaultValue={getExpenseValue(transaction, 'custom_clearance', 'amount')} /><select name="expense.custom_clearance.currency" defaultValue={getExpenseValue(transaction, 'custom_clearance', 'currency') ?? OPTIONS.currency[0]}>{withCurrent(OPTIONS.currency, getExpenseValue(transaction, 'custom_clearance', 'currency')).map((o) => <option key={o}>{o}</option>)}</select></div></Row>
        </SectionCard>

        <SectionCard title="EXPENSES" side="INSURANCE" tone="pink">
          <Row label="Marine Insurance"><div className="txe-inline"><input name="expense.marine_insurance.amount" defaultValue={getExpenseValue(transaction, 'marine_insurance', 'amount')} /><select name="expense.marine_insurance.currency" defaultValue={getExpenseValue(transaction, 'marine_insurance', 'currency') ?? OPTIONS.currency[0]}>{withCurrent(OPTIONS.currency, getExpenseValue(transaction, 'marine_insurance', 'currency')).map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="Rejection Insurance"><div className="txe-inline"><input name="expense.rejection_insurance.amount" defaultValue={getExpenseValue(transaction, 'rejection_insurance', 'amount')} /><select name="expense.rejection_insurance.currency" defaultValue={getExpenseValue(transaction, 'rejection_insurance', 'currency') ?? OPTIONS.currency[0]}>{withCurrent(OPTIONS.currency, getExpenseValue(transaction, 'rejection_insurance', 'currency')).map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="Credit Insurance"><div className="txe-inline"><input name="expense.credit_insurance.amount" defaultValue={getExpenseValue(transaction, 'credit_insurance', 'amount')} /><select name="expense.credit_insurance.currency" defaultValue={getExpenseValue(transaction, 'credit_insurance', 'currency') ?? OPTIONS.currency[0]}>{withCurrent(OPTIONS.currency, getExpenseValue(transaction, 'credit_insurance', 'currency')).map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="War risk charges"><div className="txe-inline"><input name="expense.war_risk_charges.amount" defaultValue={getExpenseValue(transaction, 'war_risk_charges', 'amount')} /><select name="expense.war_risk_charges.currency" defaultValue={getExpenseValue(transaction, 'war_risk_charges', 'currency') ?? OPTIONS.currency[0]}>{withCurrent(OPTIONS.currency, getExpenseValue(transaction, 'war_risk_charges', 'currency')).map((o) => <option key={o}>{o}</option>)}</select></div></Row>
        </SectionCard>
      </div>

      <div className="txe-two">
        <SectionCard title="EXPENSES" side="DOCUMENTATION / BANK CHARGES" tone="pink">
          <Row label="Legalization Docs"><div className="txe-inline"><input name="expense.legalization_docs.amount" defaultValue={getExpenseValue(transaction, 'legalization_docs', 'amount')} /><select name="expense.legalization_docs.currency" defaultValue={getExpenseValue(transaction, 'legalization_docs', 'currency') ?? OPTIONS.currency[0]}>{withCurrent(OPTIONS.currency, getExpenseValue(transaction, 'legalization_docs', 'currency')).map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="Bank Charges"><div className="txe-inline"><input name="expense.bank_charges.amount" defaultValue={getExpenseValue(transaction, 'bank_charges', 'amount') ?? '0.00'} /><select name="expense.bank_charges.currency" defaultValue={getExpenseValue(transaction, 'bank_charges', 'currency') ?? OPTIONS.currency[0]}>{withCurrent(OPTIONS.currency, getExpenseValue(transaction, 'bank_charges', 'currency')).map((o) => <option key={o}>{o}</option>)}</select></div></Row>
        </SectionCard>

        <SectionCard title="EXPENSES" side="PACKAGING" tone="pink">
          <Row label="Packaging material"><div className="txe-inline"><input name="expense.packaging_material.amount" defaultValue={getExpenseValue(transaction, 'packaging_material', 'amount')} /><select name="expense.packaging_material.currency" defaultValue={getExpenseValue(transaction, 'packaging_material', 'currency') ?? OPTIONS.currency[0]}>{withCurrent(OPTIONS.currency, getExpenseValue(transaction, 'packaging_material', 'currency')).map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="Printing cylinder"><div className="txe-inline"><input name="expense.printing_cylinder.amount" defaultValue={getExpenseValue(transaction, 'printing_cylinder', 'amount')} /><select name="expense.printing_cylinder.currency" defaultValue={getExpenseValue(transaction, 'printing_cylinder', 'currency') ?? OPTIONS.currency[0]}>{withCurrent(OPTIONS.currency, getExpenseValue(transaction, 'printing_cylinder', 'currency')).map((o) => <option key={o}>{o}</option>)}</select></div></Row>
        </SectionCard>
      </div>

      <div className="txe-two">
        <SectionCard title="Expenses" side="INSPECTION / LAB TEST" tone="pink">
          <Row label="Inspection Amt."><div className="txe-inline"><input name="expense.inspection_amt.amount" defaultValue={getExpenseValue(transaction, 'inspection_amt', 'amount')} /><select name="expense.inspection_amt.currency" defaultValue={getExpenseValue(transaction, 'inspection_amt', 'currency') ?? OPTIONS.currency[0]}>{withCurrent(OPTIONS.currency, getExpenseValue(transaction, 'inspection_amt', 'currency')).map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="Loading Supervision"><div className="txe-inline"><input name="expense.loading_supervision.amount" defaultValue={getExpenseValue(transaction, 'loading_supervision', 'amount')} /><select name="expense.loading_supervision.currency" defaultValue={getExpenseValue(transaction, 'loading_supervision', 'currency') ?? OPTIONS.currency[0]}>{withCurrent(OPTIONS.currency, getExpenseValue(transaction, 'loading_supervision', 'currency')).map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="Lab Test"><div className="txe-inline"><input name="expense.lab_test.amount" defaultValue={getExpenseValue(transaction, 'lab_test', 'amount')} /><select name="expense.lab_test.currency" defaultValue={getExpenseValue(transaction, 'lab_test', 'currency') ?? OPTIONS.currency[0]}>{withCurrent(OPTIONS.currency, getExpenseValue(transaction, 'lab_test', 'currency')).map((o) => <option key={o}>{o}</option>)}</select></div></Row>
        </SectionCard>

        <SectionCard title="EXPENSES" side="REBATE / CLAIM" tone="pink">
          <Row label="Rebate to Customer"><div className="txe-inline"><input name="expense.rebate_customer.amount" defaultValue={getExpenseValue(transaction, 'rebate_customer', 'amount') ?? '2,000.00'} /><select name="expense.rebate_customer.currency" defaultValue={getExpenseValue(transaction, 'rebate_customer', 'currency') ?? OPTIONS.currency[0]}>{withCurrent(OPTIONS.currency, getExpenseValue(transaction, 'rebate_customer', 'currency')).map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="Description"><input name="expense.rebate_customer.description" defaultValue={getExpenseValue(transaction, 'rebate_customer', 'description')} /></Row>
          <Row label="Rebate to Packer"><div className="txe-inline"><input name="expense.rebate_packer.amount" defaultValue={getExpenseValue(transaction, 'rebate_packer', 'amount') ?? '0.00'} /><select name="expense.rebate_packer.currency" defaultValue={getExpenseValue(transaction, 'rebate_packer', 'currency') ?? OPTIONS.currency[0]}>{withCurrent(OPTIONS.currency, getExpenseValue(transaction, 'rebate_packer', 'currency')).map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="Description"><input name="expense.rebate_packer.description" defaultValue={getExpenseValue(transaction, 'rebate_packer', 'description')} /></Row>
          <Row label="Claim"><div className="txe-inline"><input name="expense.claim.amount" defaultValue={getExpenseValue(transaction, 'claim', 'amount')} /><select name="expense.claim.currency" defaultValue={getExpenseValue(transaction, 'claim', 'currency') ?? OPTIONS.currency[0]}>{withCurrent(OPTIONS.currency, getExpenseValue(transaction, 'claim', 'currency')).map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="Others"><div className="txe-inline"><input name="expense.others.amount" defaultValue={getExpenseValue(transaction, 'others', 'amount')} /><select name="expense.others.currency" defaultValue={getExpenseValue(transaction, 'others', 'currency') ?? OPTIONS.currency[0]}>{withCurrent(OPTIONS.currency, getExpenseValue(transaction, 'others', 'currency')).map((o) => <option key={o}>{o}</option>)}</select></div></Row>
        </SectionCard>
      </div>
    </div>
  )
}

function ItemsModal({ transaction, onClose }) {
  const rows = buildItemDetailRows(transaction)
  const totalSellingPrice = rows.reduce((sum, row) => sum + (row.totalSellingPriceValue ?? 0), 0)
  const totalBuyingPrice = rows.reduce((sum, row) => sum + (row.totalBuyingPriceValue ?? 0), 0)
  const totalWeight = rows.reduce((sum, row) => sum + (row.weightValue ?? 0), 0)
  const vendor = transaction.general_info_packer?.vendor ?? transaction.general_info_packer?.packer_name ?? ''
  const customer = transaction.general_info_customer?.customer ?? ''
  const etaDate = transaction.shipping_details_customer?.req_eta ?? transaction.shipping_details_packer?.req_eta ?? ''
  const lsdDate = transaction.shipping_details_customer?.lsd_max ?? transaction.shipping_details_packer?.lsd_min ?? ''

  return (
    <div className="txe-items-overlay" role="dialog" aria-modal="true" aria-label="Transaction items">
      <div className="txe-items-modal">
        <div className="txe-items-topbar">
          <div className="txe-items-breadcrumb">Transaction &gt; All Transaction &gt; Items Detail</div>
          <div className="txe-items-timer">Remaining Time: <strong>00:15:00</strong></div>
        </div>
        <div className="txe-items-body">
          <div className="txe-items-summary">
            <div className="txe-items-summary-grid">
              <label><span>Transaction ID</span><input readOnly value={transaction.booking_no || ''} /></label>
              <label><span>Vendor</span><input readOnly value={vendor} /></label>
              <label><span>Book Date</span><input readOnly value={formatDate(transaction.issue_date)} /></label>
              <label><span>Customer</span><input readOnly value={customer} /></label>
              <label><span>ETA Date</span><input readOnly value={formatDate(etaDate)} /></label>
              <label><span>LSD</span><input readOnly value={formatDate(lsdDate)} /></label>
              <label><span>Status</span><input readOnly value={getStatusLabel(transaction.status) ?? 'Unknown'} /></label>
            </div>
            <div className="txe-items-summary-actions">
              <button type="button">Add</button>
              <button type="button">Save</button>
            </div>
          </div>

          <section className="txe-items-table-card">
            <div className="txe-items-section-title">Items Detail</div>
            <div className="txe-items-table-wrap">
              <table className="txe-items-table">
                <thead>
                  <tr>
                    <th>No.</th>
                    <th>Product</th>
                    <th>Style</th>
                    <th>Media / Item Code</th>
                    <th>Packing</th>
                    <th>Brand</th>
                    <th>Size</th>
                    <th>Weight</th>
                    <th>Qty</th>
                    <th>Selling price</th>
                    <th>Total Selling price</th>
                    <th>Buying price</th>
                    <th>Up</th>
                    <th>Down</th>
                    <th>Duplicate</th>
                    <th>Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.no}>
                      <td>{row.no}</td>
                      <td>{row.product}</td>
                      <td>{row.style}</td>
                      <td>{row.code}</td>
                      <td>{row.packing}</td>
                      <td>{row.brand}</td>
                      <td>{row.size}</td>
                      <td>{row.weight}</td>
                      <td>{row.qty}</td>
                      <td>{row.sellingPrice}</td>
                      <td>{row.totalSellingPrice}</td>
                      <td>{row.buyingPrice}</td>
                      <td><button type="button" className="txe-items-icon-btn" aria-label="Move up">↑</button></td>
                      <td><button type="button" className="txe-items-icon-btn" aria-label="Move down">↓</button></td>
                      <td><button type="button" className="txe-items-icon-btn" aria-label="Duplicate row">⧉</button></td>
                      <td><button type="button" className="txe-items-icon-btn delete" aria-label="Delete row">×</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="txe-items-footer">
            <div className="txe-items-totals">
              <label><span>Total Selling Price</span><input readOnly value={formatAmount(totalSellingPrice)} /></label>
              <label><span>Total Buying Price</span><input readOnly value={formatAmount(totalBuyingPrice)} /></label>
              <label><span>Total Weight</span><input readOnly value={formatAmount(totalWeight)} /></label>
            </div>
            <div className="txe-items-nav">
              <button type="button" onClick={onClose}>Back trans.</button>
              <button type="button">Next Trans.</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ShipTab({ transaction }) {
  const notes = transaction.notes ?? transaction.note ?? {}
  const logistics = transaction.logistics ?? {}
  const logisticsValue = (key, fallback = '') => logistics[key] ?? fallback
  const logisticsDate = (key, fallback = '') => formatDate(logistics[key]) || fallback
  const destination = logisticsValue('destination', 'MONTREAL, CANADA')

  return (
    <div className="txe-stack">
      <SectionCard title="LOGISTICS" tone="blue">
        <div className="txe-two">
          <div>
            <Row label="Plan ETD"><input name="logistics.plan_etd" defaultValue={logisticsDate('plan_etd')} /></Row>
            <Row label="Plan ETA"><input name="logistics.plan_eta" defaultValue={logisticsDate('plan_eta')} /></Row>
            <Row label="Packaging Date"><div className="txe-inline txe-inline-3"><input name="logistics.packaging_date_inner" defaultValue={logisticsDate('packaging_date_inner')} placeholder="Inner" /><input name="logistics.packaging_date_outer" defaultValue={logisticsDate('packaging_date_outer')} placeholder="Outter" /><input name="logistics.packaging_date_approved" defaultValue={logisticsDate('packaging_date_approved')} placeholder="Approved" /></div></Row>
            <Row label="Feeder Vessel"><input name="logistics.feeder_vessel" defaultValue={logisticsValue('feeder_vessel')} /></Row>
            <Row label="Mother Vessel"><input name="logistics.mother_vessel" defaultValue={logisticsValue('mother_vessel', 'VARADA V.081W')} /></Row>
            <Row label="Container #"><input name="logistics.container_no" defaultValue={logisticsValue('container_no', 'MNBU9177027')} /></Row>
            <Row label="Seal #"><input name="logistics.seal_no" defaultValue={logisticsValue('seal_no', 'ML-IN2683329')} /></Row>
            <Row label="LC #"><input name="logistics.lc_no" defaultValue={logisticsValue('lc_no')} /></Row>
            <Row label="Temperature Recorder No"><input name="logistics.temperature_recorder_no" defaultValue={logisticsValue('temperature_recorder_no')} /></Row>
            <Row label="Temperature Recorder Location ROW NO"><input name="logistics.temperature_recorder_location_row_no" defaultValue={logisticsValue('temperature_recorder_location_row_no')} /></Row>
          </div>
          <div>
            <Row label="ETD Date"><input name="logistics.etd_date" defaultValue={logisticsDate('etd_date', '08/01/2026')} /></Row>
            <Row label="ETA Date"><input name="logistics.eta_date" defaultValue={logisticsDate('eta_date', '26/02/2026')} /></Row>
            <Row label="QC Inspection Date"><input name="logistics.qc_inspection_date" defaultValue={logisticsDate('qc_inspection_date')} /></Row>
            <Row label="Discharge"><input name="logistics.discharge" defaultValue={logisticsValue('discharge', logistics.discharge_at ?? '')} /></Row>
            <Row label="At"><input name="logistics.at" defaultValue={logisticsValue('at')} /></Row>
            <Row label="Service Type"><select name="logistics.service_type" defaultValue={logisticsValue('service_type', 'ALL WATER OR MLB')}>{OPTIONS.serviceType.map((o) => <option key={o}>{o}</option>)}</select></Row>
            <Row label="B/L Date"><input name="logistics.bl_date" defaultValue={logisticsDate('bl_date', '08/01/2026')} /></Row>
            <Row label="B/L No."><input name="logistics.bl_no" defaultValue={logisticsValue('bl_no', '263811951')} /></Row>
            <Row label="Port"><input name="logistics.port" defaultValue={logisticsValue('port', 'VISAKHAPATNAM, IND')} /></Row>
            <Row label="Destination"><input name="logistics.destination" defaultValue={destination} /></Row>
            <Row label="Shipping Line / Agent"><input name="logistics.shipping_line_agent" defaultValue={logisticsValue('shipping_line_agent', 'MAERSK')} /></Row>
            <Row label="SC Inv. to Customer"><input name="logistics.sc_inv_to_customer" defaultValue={logisticsValue('sc_inv_to_customer')} /></Row>
            <Row label="Packer Inv Date"><input name="logistics.packer_inv_date" defaultValue={logisticsDate('packer_inv_date', '26/12/2025')} /></Row>
            <Row label="Packer Inv."><input name="logistics.packer_inv" defaultValue={logisticsValue('packer_inv', 'MAA/286/2025-26')} /></Row>
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

function BottomActions({ saving, duplicating, onOpenItems, onDuplicate, onPrint, onSave, onSaveQuit }) {
  return (
    <div className="txe-bottom-actions">
      <div className="txe-bottom-tabs">
        <button type="button" onClick={onOpenItems}>Items</button>
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

function PrintDialog({
  transaction,
  selections,
  options,
  documents,
  printing,
  onClose,
  onToggleSelection,
  onOptionChange,
  onArticleChange,
  onAttachmentChange,
  onSubmit,
  onDownloadSpecificDocument,
  onPrintDocument,
}) {
  const transactionId = transaction.booking_no || 'SIF2502056'
  const transactionDate = formatDate(transaction.issue_date) || '13/10/2025'
  const status = transaction.transaction_status ?? 'I'
  const lastModifiedBy = transaction.updated_by?.name ?? transaction.sales_person?.name ?? transaction.created_by?.name ?? 'Noree Naknava'
  const lastModifiedDate = formatDate(transaction.updated_at) || '31/03/2026'

  return (
    <div className="txe-print-overlay" role="dialog" aria-modal="true" aria-label="Print documents">
      <div className="txe-print-modal">
        <div className="txe-print-header">
          <div>
            <h3>Transaction# {transactionId}</h3>
            <span>Print &gt; Menu</span>
          </div>
          <button type="button" className="txn-edit-close" onClick={onClose}>x</button>
        </div>

        <div className="txe-print-content">
          <div className="txe-print-form">
            <div className="txe-print-topgrid">
              <div><span>Transaction ID</span><strong>{transaction.booking_no || 'SIN2605802'}</strong></div>
              <div><span>Transaction Date</span><strong>{formatDate(transaction.issue_date) || '24/01/2026'}</strong></div>
              <div><span>Status</span><strong>{getStatusLabel(transaction.status) ?? 'Unknown'}</strong></div>
            </div>

            <div className="txe-print-two">
              <div className="txe-print-leftstack">
                <p className="txe-print-section-label">Document Type (Preview Report)</p>
                <div className="txe-print-doc-list">
                  {PRINT_DOCUMENTS.map((documentType) => (
                    <label key={documentType.type} className="txe-print-check">
                      <input
                        type="checkbox"
                        checked={Boolean(selections[documentType.type])}
                        onChange={() => onToggleSelection(documentType.type)}
                      />
                      <span>{documentType.label}</span>
                    </label>
                  ))}
                </div>

                <div className="txe-print-settings">
                  <label>
                    <span>Print Revised</span>
                    <select value={options.print_revised} onChange={(event) => onOptionChange('print_revised', event.target.value)}>
                      {withCurrent(PRINT_YES_NO_OPTIONS, options.print_revised).map((option) => <option key={option}>{option}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>Last Modified By</span>
                    <input className="txe-print-readonly" readOnly value={lastModifiedBy} />
                  </label>
                  <label>
                    <span>Last Modified Date</span>
                    <input className="txe-print-readonly" readOnly value={lastModifiedDate} />
                  </label>
                  <label>
                    <span>Print Liquidation</span>
                    <select value={options.print_liquidation} onChange={(event) => onOptionChange('print_liquidation', event.target.value)}>
                      {withCurrent(PRINT_YES_NO_OPTIONS, options.print_liquidation).map((option) => <option key={option}>{option}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>Show Glazing</span>
                    <select value={options.show_glazing} onChange={(event) => onOptionChange('show_glazing', event.target.value)}>
                      {withCurrent(PRINT_GLAZING_OPTIONS, options.show_glazing).map((option) => <option key={option}>{option}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>Templates</span>
                    <select value={options.template} onChange={(event) => onOptionChange('template', event.target.value)}>
                      {withCurrent(PRINT_TEMPLATE_OPTIONS, options.template).map((option) => <option key={option}>{option}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>Approve Code</span>
                    <input value={options.approve_code} onChange={(event) => onOptionChange('approve_code', event.target.value)} />
                  </label>
                </div>
              </div>

              <div className="txe-print-article-sheet">
                {options.articles.slice(0, 3).map((article, index) => (
                  <label key={`article-${index}`} className="txe-print-article">
                    <span>Article {index + 1}</span>
                    <textarea value={article} onChange={(event) => onArticleChange(index, event.target.value)} />
                  </label>
                ))}

                <div className="txe-print-article-lower">
                  <label className="txe-print-article">
                    <span>Article 4</span>
                    <textarea value={options.articles[3]} onChange={(event) => onArticleChange(3, event.target.value)} />
                  </label>

                  <div className="txe-print-article-side">
                    <div className="txe-print-attachments">
                      {ATTACHMENT_OPTIONS.map((attachment) => (
                        <label key={attachment} className="txe-print-check">
                          <input
                            type="checkbox"
                            checked={options.attachments.includes(attachment)}
                            onChange={() => onAttachmentChange(attachment)}
                          />
                          <span>{attachment}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <label className="txe-print-article">
                  <span>Article 5</span>
                  <textarea value={options.articles[4]} onChange={(event) => onArticleChange(4, event.target.value)} />
                </label>
              </div>
            </div>

            <div className="txe-print-actions">
              <button type="button" className="primary-btn txe-print-action-primary" onClick={onSubmit} disabled={printing}>{printing ? 'Loading...' : 'OK'}</button>
              <button type="button" className="secondary-btn txe-print-action-secondary" onClick={onClose}>Cancel</button>
            </div>
            <div className="txe-print-preview-panel">
              {documents.length > 0 ? (
                <>
                  <div className="txe-print-preview-actions">
                    <button type="button" className="txe-print-link" onClick={onPrintDocument}>Print Document</button>
                  </div>
                  <div className="txe-print-preview-stack">
                    {documents.map((document) => (
                      <section key={document.type} className="txe-print-preview-block">
                        <div className="txe-print-preview-row">
                          <div className="txe-print-preview-title">{document.label}</div>
                          <div className="txe-print-preview-inline-links">
                            <button type="button" className="txe-print-link" onClick={() => onDownloadSpecificDocument(document.type, 'pdf')}>Download as PDF</button>
                            <button type="button" className="txe-print-link" onClick={() => onDownloadSpecificDocument(document.type, 'word')}>Download as Word</button>
                          </div>
                        </div>
                        <iframe
                          className="txe-print-preview-frame"
                          title={document.label}
                          srcDoc={document.preview_html}
                        />
                      </section>
                    ))}
                  </div>
                </>
              ) : (
                <div className="txe-print-placeholder">
                  Select a document type and click OK to load the preview below.
                </div>
              )}
            </div>
          </div>
        </div>
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

function SideIconButton({ active, label, onClick, icon, disabled = false }) {
  return (
    <button type="button" className={`txe-side-btn${active ? ' active' : ''}`} onClick={onClick} title={label} disabled={disabled}>
      {icon}
      <span>{label}</span>
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

function ListIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>
}

function PrintIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 8V3h10v5M6 17H5a2 2 0 0 1-2-2v-4a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v4a2 2 0 0 1-2 2h-1M7 14h10v7H7z" /></svg>
}

function SaveIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21h14V7.8L16.2 5H5zM9 21v-7h6v7M8 5v5h7" /></svg>
}

export default TransactionEditModal

function buildInitialPrintSelections() {
  return {
    all: false,
    bcb_lqd: false,
    bcv_lqd: false,
    sales_contract_packer: false,
    appendix_packer: false,
    proforma_invoice: false,
    specs: false,
    s_a: false,
    lc_terms_vendor: false,
    lc_terms: false,
    delivery_order: false,
  }
}

function buildInitialPrintOptions() {
  return {
    print_revised: 'NO',
    print_liquidation: 'NO',
    show_glazing: 'Size',
    template: 'India Private',
    approve_code: '',
    payment_advance: '',
    articles: Array.from({ length: 5 }, () => ''),
    attachments: [],
  }
}

function triggerDocumentDownload(documentFile, format) {
  const target = documentFile?.[format]
  if (!target?.content_base64) return

  const bytes = window.atob(target.content_base64)
  const buffer = new Uint8Array(bytes.length)
  for (let index = 0; index < bytes.length; index += 1) {
    buffer[index] = bytes.charCodeAt(index)
  }

  const blob = new Blob([buffer], { type: target.mime_type || 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = target.filename || `document.${format}`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function buildPrintableHtml(documents) {
  if (!Array.isArray(documents) || documents.length === 0) {
    return '<!doctype html><html><body></body></html>'
  }

  const parser = new window.DOMParser()
  const parsedDocuments = documents
    .map((item) => parser.parseFromString(item.preview_html ?? '', 'text/html'))
    .filter((doc) => doc?.documentElement)

  const firstDocument = parsedDocuments[0]
  const headMarkup = firstDocument?.head?.innerHTML ?? ''
  const bodyMarkup = parsedDocuments
    .map((doc) => doc.body?.innerHTML ?? '')
    .filter(Boolean)
    .join('<div style="page-break-after: always;"></div>')

  return `<!doctype html><html lang="en"><head>${headMarkup}</head><body>${bodyMarkup}</body></html>`
}

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

function getExpenseValue(transaction, lineKey, fieldName) {
  const line = (transaction?.expense_lines ?? transaction?.expenseLines ?? []).find((item) => item?.line_key === lineKey)
  return line?.[fieldName] ?? ''
}

function formatAmount(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '0.00'
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatUnitAmount(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '0.00000'
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 5,
    maximumFractionDigits: 5,
    useGrouping: false,
  })
}

function buildItemDetailRows(transaction) {
  const revenueCustomer = transaction.revenue_customer ?? {}
  const revenuePacker = transaction.revenue_packer ?? {}
  const customer = transaction.general_info_customer ?? {}
  const packer = transaction.general_info_packer ?? {}
  const weightValue = normalizeNumber(packer.total_lqd_price) ?? normalizeNumber(transaction.net_margin) ?? 0
  const qtyValue = normalizeText(customer.buyer_number) ?? normalizeText(packer.packer_number) ?? '-'
  const sellingPriceValue = normalizeNumber(revenueCustomer.amount) ?? normalizeNumber(revenueCustomer.total_selling_value) ?? 0
  const totalSellingPriceValue = normalizeNumber(revenueCustomer.total_selling_value) ?? sellingPriceValue
  const buyingPriceValue = normalizeNumber(revenuePacker.amount) ?? normalizeNumber(revenuePacker.total_buying_value) ?? 0
  const totalBuyingPriceValue = normalizeNumber(revenuePacker.total_buying_value) ?? buyingPriceValue

  return [{
    no: 1,
    product: transaction.category ?? revenueCustomer.description ?? 'Transaction Item',
    style: customer.description ?? packer.description ?? '-',
    code: transaction.booking_no ?? '-',
    packing: transaction.container_secondary ?? '-',
    brand: packer.vendor ?? packer.packer_name ?? '-',
    size: transaction.container_primary ?? '-',
    weight: weightValue ? formatAmount(weightValue) : '-',
    weightValue,
    qty: qtyValue,
    sellingPrice: formatUnitAmount(sellingPriceValue),
    sellingPriceValue,
    totalSellingPrice: formatAmount(totalSellingPriceValue),
    totalSellingPriceValue,
    buyingPrice: formatUnitAmount(buyingPriceValue),
    buyingPriceValue,
    totalBuyingPriceValue,
  }]
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
      country: getField(formData, 'transaction.country') ?? transaction.country ?? null,
      container_primary: getField(formData, 'transaction.container_primary') ?? transaction.container_primary ?? null,
      container_secondary: getField(formData, 'transaction.container_secondary') ?? transaction.container_secondary ?? null,
      certified: (getField(formData, 'transaction.certified') ?? 'No') === 'Yes',
      net_margin: normalizeNumber(formData.get('transaction.net_margin')),
      status: getField(formData, 'transaction.status') ?? transaction.status,
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
      packaging_date_approved: toApiDate(getField(formData, 'logistics.packaging_date_approved')),
      feeder_vessel: getField(formData, 'logistics.feeder_vessel'),
      mother_vessel: getField(formData, 'logistics.mother_vessel'),
      container_no: getField(formData, 'logistics.container_no'),
      seal_no: getField(formData, 'logistics.seal_no'),
      lc_no: getField(formData, 'logistics.lc_no'),
      temperature_recorder_no: getField(formData, 'logistics.temperature_recorder_no'),
      temperature_recorder_location_row_no: getField(formData, 'logistics.temperature_recorder_location_row_no'),
      etd_date: toApiDate(getField(formData, 'logistics.etd_date')),
      eta_date: toApiDate(getField(formData, 'logistics.eta_date')),
      qc_inspection_date: toApiDate(getField(formData, 'logistics.qc_inspection_date')),
      discharge: getField(formData, 'logistics.discharge'),
      at: getField(formData, 'logistics.at'),
      service_type: getField(formData, 'logistics.service_type'),
      bl_date: toApiDate(getField(formData, 'logistics.bl_date')),
      bl_no: getField(formData, 'logistics.bl_no'),
      port: getField(formData, 'logistics.port'),
      destination: getField(formData, 'logistics.destination'),
      shipping_line_agent: getField(formData, 'logistics.shipping_line_agent'),
      sc_inv_to_customer: getField(formData, 'logistics.sc_inv_to_customer'),
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
