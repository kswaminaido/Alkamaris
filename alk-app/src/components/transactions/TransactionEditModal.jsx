import { useEffect, useMemo, useRef, useState } from 'react'
import PaginationBar from '../common/PaginationBar'
import TransactionItemsModal from './TransactionItemsModal'
import { FALLBACK_COUNTRIES, fetchCountryOptions, mergeCountryOptions } from '../../utils/countries'
import { DROPDOWN_FIELD_GROUPS, buildConfigMap, getFieldOptions } from '../../utils/dropdownData'
import { APP_ENV } from '../../config/api'

const IS_LOCAL_ENV = String(APP_ENV).toLowerCase() === 'local'
const LOCAL_OPTIONS = {
  salesPeople: ['Chaipat', 'Keerthana Gubbala', 'Nina', 'Sahil'],
  type: ['Trade', 'Service'],
  container: ['20 ft', '40 ft'],
  load: ['Full Load', 'Part Load'],
  currency: ['US($)', 'EUR', 'INR'],
  payment: ['T/T', 'L/C', 'CAD'],
  tolerance: ['+/- 0.5%', '+/- 1%', '+/- 2%'],
  serviceType: ['ALL WATER OR MLB', 'FOB', 'CIF'],
}

const OPTIONS = {
  salesPeople: IS_LOCAL_ENV ? LOCAL_OPTIONS.salesPeople : [],
  type: IS_LOCAL_ENV ? LOCAL_OPTIONS.type : [],
  yesNo: ['Yes', 'No'],
  container: IS_LOCAL_ENV ? LOCAL_OPTIONS.container : [],
  load: IS_LOCAL_ENV ? LOCAL_OPTIONS.load : [],
  currency: IS_LOCAL_ENV ? LOCAL_OPTIONS.currency : [],
  payment: IS_LOCAL_ENV ? LOCAL_OPTIONS.payment : [],
  tolerance: IS_LOCAL_ENV ? LOCAL_OPTIONS.tolerance : [],
  serviceType: IS_LOCAL_ENV ? LOCAL_OPTIONS.serviceType : [],
}

const STATUS_OPTIONS = [
  { value: 'I', label: 'Invoice' },
  { value: 'P', label: 'Unpaid' },
  { value: 'D', label: 'Paid' },
  { value: 'S', label: 'Shipped' },
  { value: 'R', label: 'Received' },
  { value: 'U', label: 'Unshipped' },
  { value: 'T', label: 'Tally' },
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
  { type: 'lc_terms_vendor', label: 'Print L/C Terms (Packer)' },
  { type: 'lc_terms', label: 'Print L/C Terms' },
  { type: 'delivery_order', label: 'Print Delivery Order' },
]

const PRINT_YES_NO_OPTIONS = ['NO', 'YES']
const PRINT_GLAZING_OPTIONS = ['Size', 'NO', 'YES']
const PRINT_TEMPLATE_OPTIONS = ['India Private']
const PRICE_TERMS = ['EXW (Ex Works)', 'FCA', 'CIF', 'CFR', 'FOB', 'DAP', 'DDP', 'DPU']

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
  const [lcModalOpen, setLcModalOpen] = useState(false)
  const [lcValue, setLcValue] = useState(transaction?.lc_days ?? '')
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
  const [customers, setCustomers] = useState([])
  const [customerContacts, setCustomerContacts] = useState({})
  const [packers, setPackers] = useState([])
  const [packedByPackers, setPackedByPackers] = useState([])
  const [salesPeople, setSalesPeople] = useState([])
  const [dropdownConfigMap, setDropdownConfigMap] = useState({})
  const formRef = useRef(null)
  const authFetchRef = useRef(authFetch)
  const dropdownFieldMap = useMemo(
    () => Object.fromEntries(DROPDOWN_FIELD_GROUPS.flatMap((group) => group.fields.map((field) => [field.key, field]))),
    [],
  )
  const dropdownResources = useMemo(
    () => ({ configMap: dropdownConfigMap, countries: countryOptions, usersByRole: { customer: customers, packer: packers } }),
    [countryOptions, customers, dropdownConfigMap, packers],
  )

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
  }, [transaction?.id])

  useEffect(() => {
    authFetchRef.current = authFetch
  }, [authFetch])

  useEffect(() => {
    let active = true

    async function loadEditResources() {
      const fetcher = authFetchRef.current
      const [countries, configs, users] = await Promise.all([
        fetchCountryOptions(),
        loadDropdownConfigs(fetcher),
        loadBookingPartyOptions(fetcher),
      ])

      if (!active) return
      setCountryOptions(countries)
      setDropdownConfigMap(configs)
      setCustomers(users.customers)
      setCustomerContacts(users.customerContacts)
      setPackers(users.packers)
      setPackedByPackers(users.packedByPackers)
      setSalesPeople(users.salesPeople)
    }

    loadEditResources()

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
            <h2>Transaction# {displayValue(transaction.booking_no)}</h2>
          </div>
          <button type="button" className="txn-edit-close" onClick={onClose} aria-label="Close transaction details">x</button>
        </div>

        <div className="txn-edit-body">
          <div className="txn-edit-main">
            <HeaderCard transaction={transaction} optionsFor={optionsFor} addOption={addDropdownOption} salesPeople={salesPeople} />
            {tab === 'home' && <HomeTab transaction={transaction} optionsFor={optionsFor} addOption={addDropdownOption} customers={customers} customerContacts={customerContacts} packers={packers} packedByPackers={packedByPackers} />}
            {tab === 'dollar' && <DollarTab transaction={transaction} optionsFor={optionsFor} addOption={addDropdownOption} />}
            {tab === 'ship' && <ShipTab transaction={transaction} optionsFor={optionsFor} addOption={addDropdownOption} />}
            <BottomActions
              saving={saving}
              duplicating={duplicating}
              onOpenItems={() => setItemsModalOpen(true)}
              onOpenLc={() => { setLcValue(transaction?.lc_days ?? ''); setLcModalOpen(true) }}
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
      {lcModalOpen ? (
        <LcTermsModal
          transaction={transaction}
          value={lcValue}
          onChange={(v) => setLcValue(v)}
          onClose={() => setLcModalOpen(false)}
          onSubmit={async (selected) => {
            if (!onSave) return
            setSaving(true)
            setError('')
            try {
              const result = await onSave(transaction.id, { transaction: { lc_days: selected, booking_no: transaction.booking_no, booking_mode: transaction.booking_mode ?? 'trade_commission' } })
              if (!result?.ok) {
                const message = result?.error ?? 'Unable to save L/C terms.'
                setError(message)
                showToast(message, 'error')
                return
              }
              showToast('L/C terms saved')
              setLcModalOpen(false)
            } finally {
              setSaving(false)
            }
          }}
        />
      ) : null}
      {toast ? <Toast text={toast.text} tone={toast.tone} /> : null}
    </div>
  )

  function optionsFor(fieldKey) {
    const field = dropdownFieldMap[fieldKey]
    return field ? getFieldOptions(field, dropdownResources) : []
  }

  function configTypeFor(fieldKey) {
    return dropdownFieldMap[fieldKey]?.type ?? null
  }

  async function addDropdownOption(fieldKey, value) {
    const type = configTypeFor(fieldKey)
    const option = typeof value === 'string' ? value.trim() : ''
    if (!type || !option || !authFetch) return false

    try {
      const response = await authFetch('/configs/options', {
        method: 'POST',
        body: JSON.stringify({ type, value: option }),
      })
      const payload = await response.json()

      if (!response.ok || !payload?.data?.type) {
        const message = payload?.message ?? 'Unable to add dropdown option.'
        setError(message)
        showToast(message, 'error')
        return false
      }

      setDropdownConfigMap((current) => ({
        ...current,
        [payload.data.type]: payload.data,
      }))
      return true
    } catch {
      setError('Unable to add dropdown option.')
      showToast('Unable to add dropdown option.', 'error')
      return false
    }
  }
}

function HeaderCard({ transaction, optionsFor, addOption, salesPeople }) {
  const salesPerson = transaction.sales_person ?? transaction.salesPerson ?? {}
  const salesPersonName = salesPerson.name ?? ''
  const salesPersonId = transaction.sales_person_id ?? salesPerson.id ?? ''
  const lastModifiedBy = transactionLastModifiedBy(transaction)
  const issueDate = toInputDate(transaction.issue_date)
  const updatedAt = formatDate(transaction.updated_at)
  const category = transaction.category ?? ''
  const origin = transaction.product_origin ?? ''
  const type = transaction.type ?? ''
  const destination = transaction.destination ?? ''
  const container = transaction.container_primary ?? ''
  const containerSecondary = transaction.container_secondary ?? ''
  const certified = transaction.certified ? 'Yes' : 'No'
  const originOptions = mergeCountryOptions(optionsFor('transaction.product_origin'), origin)
  const destinationOptions = mergeCountryOptions(optionsFor('transaction.destination'), destination)

  return (
    <div className="txe-card txe-header-card">
      <div className="txe-grid-4">
        <LabelField label="Booking No."><input name="transaction.booking_no" defaultValue={transaction.booking_no ?? ''} /></LabelField>
        <LabelField label="Issue Date"><DateInput name="transaction.issue_date" value={issueDate} readOnly className="txe-readonly" /></LabelField>
        <LabelField label="Category"><NamedSearchableSelect name="transaction.category" value={category} list={withCurrent(optionsFor('transaction.category'), category)} onAdd={(value) => addOption('transaction.category', value)} /></LabelField>
        <LabelField label="Status"><select name="transaction.status" defaultValue={transaction.status ?? 'P'}>{STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></LabelField>
        <LabelField label="Last Modified By"><input readOnly value={lastModifiedBy} /></LabelField>

        <LabelField label="Sales Person"><SalesPersonSelect value={salesPersonId} list={salesPeople} currentName={salesPersonName} /></LabelField>
        <LabelField label="Product Origin"><NamedSearchableSelect name="transaction.product_origin" value={origin} list={originOptions} onAdd={(value) => addOption('transaction.product_origin', value)} /></LabelField>
        <LabelField label="Type"><NamedSearchableSelect name="transaction.type" value={type} list={withCurrent(optionsFor('transaction.type'), type)} onAdd={(value) => addOption('transaction.type', value)} /></LabelField>
        <LabelField label="Container"><div className="txe-inline"><NamedSearchableSelect name="transaction.container_primary" value={container} list={withCurrent(optionsFor('transaction.container_primary'), container)} onAdd={(value) => addOption('transaction.container_primary', value)} hideToggle /><NamedSearchableSelect name="transaction.container_secondary" value={containerSecondary} list={withCurrent(optionsFor('transaction.container_secondary'), containerSecondary)} onAdd={(value) => addOption('transaction.container_secondary', value)} hideToggle /></div></LabelField>

        {/* <LabelField label="Country"><NamedSearchableSelect name="transaction.country" value={country} list={countrySelectOptions} onAdd={(value) => addOption('transaction.country', value)} /></LabelField> */}
        <LabelField label="Destination"><NamedSearchableSelect name="transaction.destination" value={destination} list={destinationOptions} onAdd={(value) => addOption('transaction.destination', value)} /></LabelField>
        <LabelField label="Certified"><NamedSearchableSelect name="transaction.certified" value={certified} list={withCurrent(optionsFor('transaction.certified'), certified)} onAdd={(value) => addOption('transaction.certified', value)} /></LabelField>
        <LabelField label="Net Margin"><input name="transaction.net_margin" defaultValue={transaction.net_margin ?? ''} /></LabelField>
        <LabelField label="Last Modified On"><input defaultValue={updatedAt} /></LabelField>
      </div>
    </div>
  )
}

function HomeTab({ transaction, optionsFor, addOption, customers, customerContacts, packers, packedByPackers }) {
  const customer = transaction.general_info_customer ?? {}
  const packer = transaction.general_info_packer ?? {}
  const revenueCustomer = transaction.revenue_customer ?? {}
  const revenuePacker = transaction.revenue_packer ?? {}
  const itemRevenueTotals = getItemRevenueTotals(transaction)
  const revenueCustomerCommissionEnabled = itemRevenueTotals.hasCustomerCommission || !!revenueCustomer.commission_enabled
  const revenuePackerCommissionEnabled = itemRevenueTotals.hasPackerCommission || !!revenuePacker.commission_enabled
  const totalCustomerCommissionValue = formatFormAmount(itemRevenueTotals.hasItems ? itemRevenueTotals.totalCustomerCommission : revenueCustomer.total_selling_value)
  const revenueCustomerAmountValue = formatFormAmount(itemRevenueTotals.hasItems ? itemRevenueTotals.totalSellingPrice : revenueCustomer.amount)
  const revenuePackerAmountValue = formatFormAmount(itemRevenueTotals.hasItems ? itemRevenueTotals.totalSellingPrice : revenuePacker.amount)
  const totalPackerCommissionValue = formatFormAmount(itemRevenueTotals.hasItems ? itemRevenueTotals.totalPackerCommission : revenuePacker.total_buying_value)
  const cashFlowCustomer = transaction.cash_flow_customer ?? {}
  const cashFlowPacker = transaction.cash_flow_packer ?? {}
  const shippingCustomer = transaction.shipping_details_customer ?? {}
  const shippingPacker = transaction.shipping_details_packer ?? {}
  const notes = transaction.notes ?? transaction.note ?? {}
  const noteEntries = transaction.note_entries ?? transaction.noteEntries ?? []
  const customerAttention = customer.attention ?? ''
  const [attentionState, setAttentionState] = useState(() => ({
    source: customerAttention,
    transactionId: transaction.id,
    value: customerAttention,
  }))
  const attentionValue = attentionState.transactionId === transaction.id && attentionState.source === customerAttention
    ? attentionState.value
    : customerAttention

  function setAttentionValue(value) {
    setAttentionState({
      source: customerAttention,
      transactionId: transaction.id,
      value,
    })
  }

  function handleCustomerChange(value) {
    const contactName = customerContacts?.[value]
    if (contactName) setAttentionValue(contactName)
  }

  return (
    <div className="txe-stack">
      <div className="txe-two">
        <SectionCard title="GENERAL INFO" side="CUSTOMER" tone="blue">
          <Row label="Customer"><NamedSearchableSelect name="general_info_customer.customer" value={customer.customer ?? ''} list={mergeOptions(customers, optionsFor('general_info_customer.customer'), [customer.customer])} onChange={handleCustomerChange} onAdd={(value) => addOption('general_info_customer.customer', value)} /></Row>
          <Row label="Attn"><NamedSearchableSelect name="general_info_customer.attention" value={attentionValue} list={mergeOptions(Object.values(customerContacts ?? {}), packers, [attentionValue])} onChange={setAttentionValue} /></Row>
          <Row label="Buyer's"><div className="txe-inline"><NamedSearchableSelect name="general_info_customer.buyer" value={customer.buyer ?? ''} list={withCurrent(optionsFor('general_info_customer.buyer'), customer.buyer)} onAdd={(value) => addOption('general_info_customer.buyer', value)} /><input name="general_info_customer.buyer_number" defaultValue={customer.buyer_number ?? ''} placeholder="#" /></div></Row>
          <Row label="End Customer"><NamedSearchableSelect name="general_info_customer.end_customer" value={customer.end_customer ?? ''} list={withCurrent(optionsFor('general_info_customer.end_customer'), customer.end_customer)} onAdd={(value) => addOption('general_info_customer.end_customer', value)} /></Row>
          <Row label="Prices Customer"><div className="txe-inline"><NamedSearchableSelect name="general_info_customer.prices_customer_type" value={customer.prices_customer_type ?? ''} list={mergeOptions(optionsFor('general_info_customer.prices_customer_type'), PRICE_TERMS, [customer.prices_customer_type])} onAdd={(value) => addOption('general_info_customer.prices_customer_type', value)} /><input type="text" name="general_info_customer.prices_customer_rate" defaultValue={customer.prices_customer_rate ?? ''} /></div></Row>
          <Row label="Payment Customer"><div className="txe-inline txe-inline-3"><NamedSearchableSelect name="general_info_customer.payment_customer_type" value={customer.payment_customer_type ?? ''} list={withCurrent(optionsFor('general_info_customer.payment_customer_type'), customer.payment_customer_type)} onAdd={(value) => addOption('general_info_customer.payment_customer_type', value)} /><NamedSearchableSelect name="general_info_customer.payment_customer_term" value={customer.payment_customer_term ?? ''} list={withCurrent(optionsFor('general_info_customer.payment_customer_term'), customer.payment_customer_term)} onAdd={(value) => addOption('general_info_customer.payment_customer_term', value)} /><input name="general_info_customer.payment_customer_advance_percent" defaultValue={customer.payment_customer_advance_percent ?? ''} placeholder="Adv %" /></div></Row>
          <Row label="Description"><textarea name="general_info_customer.description" rows="2" defaultValue={customer.description ?? ''} /></Row>
          <Row label="Tolerance"><NamedSearchableSelect name="general_info_customer.tolerance" value={customer.tolerance ?? ''} list={withCurrent(optionsFor('general_info_customer.tolerance'), customer.tolerance)} onAdd={(value) => addOption('general_info_customer.tolerance', value)} /></Row>
          <Row label="Marketing Fee"><label className="txe-inline-check"><input type="checkbox" name="general_info_customer.marketing_fee" defaultChecked={Boolean(customer.marketing_fee)} />Yes</label></Row>
        </SectionCard>

        <SectionCard title="GENERAL INFO" side="PACKER" tone="blue">
          <Row label="Packer"><NamedSearchableSelect name="general_info_packer.vendor" value={packer.vendor ?? ''} list={mergeOptions(packers, optionsFor('general_info_packer.vendor'), [packer.vendor])} onAdd={(value) => addOption('general_info_packer.vendor', value)} /></Row>
          <Row label="Packer's"><div className="txe-inline"><NamedSearchableSelect name="general_info_packer.packer_name" value={packer.packer_name ?? ''} list={withCurrent(optionsFor('general_info_packer.packer_name'), packer.packer_name)} onAdd={(value) => addOption('general_info_packer.packer_name', value)} /><input name="general_info_packer.packer_number" defaultValue={packer.packer_number ?? ''} placeholder="#" /></div></Row>
          <Row label="Packed By"><NamedSearchableSelect name="general_info_packer.packed_by" value={packer.packed_by ?? ''} list={mergeOptions(packedByPackers, optionsFor('general_info_packer.packed_by'), [packer.packed_by])} onAdd={(value) => addOption('general_info_packer.packed_by', value)} /></Row>
          <Row label="Prices Packer"><div className="txe-inline"><NamedSearchableSelect name="general_info_packer.prices_packer_type" value={packer.prices_packer_type ?? ''} list={mergeOptions(optionsFor('general_info_packer.prices_packer_type'), PRICE_TERMS, [packer.prices_packer_type])} onAdd={(value) => addOption('general_info_packer.prices_packer_type', value)} /><input type="text" name="general_info_packer.prices_packer_rate" defaultValue={packer.prices_packer_rate ?? ''} /></div></Row>
          <Row label="Payment Packer"><div className="txe-inline txe-inline-3"><NamedSearchableSelect name="general_info_packer.payment_packer_type" value={packer.payment_packer_type ?? ''} list={withCurrent(optionsFor('general_info_packer.payment_packer_type'), packer.payment_packer_type)} onAdd={(value) => addOption('general_info_packer.payment_packer_type', value)} /><NamedSearchableSelect name="general_info_packer.payment_packer_term" value={packer.payment_packer_term ?? ''} list={withCurrent(optionsFor('general_info_packer.payment_packer_term'), packer.payment_packer_term)} onAdd={(value) => addOption('general_info_packer.payment_packer_term', value)} /><input name="general_info_packer.payment_packer_advance_percent" defaultValue={packer.payment_packer_advance_percent ?? ''} placeholder="Adv %" /></div></Row>
          <Row label="Description"><textarea name="general_info_packer.description" rows="2" defaultValue={packer.description ?? ''} /></Row>
          <Row label="Tolerance"><div className="txe-inline"><NamedSearchableSelect name="general_info_packer.tolerance" value={packer.tolerance ?? ''} list={withCurrent(optionsFor('general_info_packer.tolerance'), packer.tolerance)} onAdd={(value) => addOption('general_info_packer.tolerance', value)} /><input name="general_info_packer.total_lqd_price" defaultValue={packer.total_lqd_price ?? ''} /></div></Row>
        </SectionCard>
      </div>

      <div className="txe-two">
        <SectionCard title="REVENUE" side="CUSTOMER" tone="blue">
          <Row label="Total Selling Value"><div className="txe-inline"><input key={`revenue-customer-total-${transaction.id}-${totalCustomerCommissionValue}`} name="revenue_customer.total_selling_value" defaultValue={totalCustomerCommissionValue} /><NamedSearchableSelect name="revenue_customer.total_selling_currency" value={revenueCustomer.total_selling_currency ?? ''} list={withCurrent(optionsFor('revenue_customer.total_selling_currency'), revenueCustomer.total_selling_currency)} onAdd={(value) => addOption('revenue_customer.total_selling_currency', value)} /></div></Row>
          <Row label="Commission"><div className="txe-inline"><label><input key={`revenue-customer-yes-${transaction.id}-${revenueCustomerCommissionEnabled}`} type="radio" name="revenue_customer.commission_enabled" value="Yes" defaultChecked={revenueCustomerCommissionEnabled} /> Yes</label><label><input key={`revenue-customer-no-${transaction.id}-${revenueCustomerCommissionEnabled}`} type="radio" name="revenue_customer.commission_enabled" value="No" defaultChecked={!revenueCustomerCommissionEnabled} /> No</label><input name="revenue_customer.commission_percent" defaultValue={revenueCustomer.commission_percent ?? ''} placeholder="Percent" /></div></Row>
          <Row label="Amount"><div className="txe-inline"><input key={`revenue-customer-amount-${transaction.id}-${revenueCustomerAmountValue}`} name="revenue_customer.amount" defaultValue={revenueCustomerAmountValue} /><NamedSearchableSelect name="revenue_customer.amount_currency" value={revenueCustomer.amount_currency ?? ''} list={withCurrent(optionsFor('revenue_customer.amount_currency'), revenueCustomer.amount_currency)} onAdd={(value) => addOption('revenue_customer.amount_currency', value)} /></div></Row>
          <Row label="Description"><textarea name="revenue_customer.description" rows="2" defaultValue={revenueCustomer.description ?? ''} /></Row>
          <Row label="Rebate Memo"><div className="txe-inline"><input name="revenue_customer.rebate_memo_amount" defaultValue={revenueCustomer.rebate_memo_amount ?? ''} placeholder="Amount" /><input name="revenue_customer.rebate_memo_description" defaultValue={revenueCustomer.rebate_memo_description ?? ''} placeholder="Description" /></div></Row>
          <Row label="Overcharge SC"><div className="txe-inline"><input name="revenue_customer.overcharge_sc_amount" defaultValue={revenueCustomer.overcharge_sc_amount ?? ''} placeholder="Amount" /><input name="revenue_customer.overcharge_sc_description" defaultValue={revenueCustomer.overcharge_sc_description ?? ''} placeholder="Description" /></div></Row>
        </SectionCard>

        <SectionCard title="REVENUE" side="PACKER" tone="blue">
          <Row label="Total Buying Value"><div className="txe-inline"><input key={`revenue-packer-total-${transaction.id}-${totalPackerCommissionValue}`} name="revenue_packer.total_buying_value" defaultValue={totalPackerCommissionValue} /><NamedSearchableSelect name="revenue_packer.total_buying_currency" value={revenuePacker.total_buying_currency ?? ''} list={withCurrent(optionsFor('revenue_packer.total_buying_currency'), revenuePacker.total_buying_currency)} onAdd={(value) => addOption('revenue_packer.total_buying_currency', value)} /></div></Row>
          <Row label="Commission"><div className="txe-inline"><label><input key={`revenue-packer-yes-${transaction.id}-${revenuePackerCommissionEnabled}`} type="radio" name="revenue_packer.commission_enabled" value="Yes" defaultChecked={revenuePackerCommissionEnabled} /> Yes</label><label><input key={`revenue-packer-no-${transaction.id}-${revenuePackerCommissionEnabled}`} type="radio" name="revenue_packer.commission_enabled" value="No" defaultChecked={!revenuePackerCommissionEnabled} /> No</label><input name="revenue_packer.commission_percent" defaultValue={revenuePacker.commission_percent ?? ''} placeholder="Percent" /></div></Row>
          <Row label="Amount"><div className="txe-inline"><input key={`revenue-packer-amount-${transaction.id}-${revenuePackerAmountValue}`} name="revenue_packer.amount" defaultValue={revenuePackerAmountValue} /><NamedSearchableSelect name="revenue_packer.amount_currency" value={revenuePacker.amount_currency ?? ''} list={withCurrent(optionsFor('revenue_packer.amount_currency'), revenuePacker.amount_currency)} onAdd={(value) => addOption('revenue_packer.amount_currency', value)} /></div></Row>
          <Row label="Description"><textarea name="revenue_packer.description" rows="2" defaultValue={revenuePacker.description ?? ''} /></Row>
          <Row label="Overcharge SC"><div className="txe-inline"><input name="revenue_packer.overcharge_sc_amount" defaultValue={revenuePacker.overcharge_sc_amount ?? ''} placeholder="Amount" /><input name="revenue_packer.overcharge_sc_description" defaultValue={revenuePacker.overcharge_sc_description ?? ''} placeholder="Description" /></div></Row>
        </SectionCard>
      </div>

      <div className="txe-two">
        <SectionCard title="RECEIVE" side="CUSTOMER" tone="gold">
          <Row label="Date Advance"><div className="txe-inline"><DateInput name="cash_flow_customer.date_advance" value={cashFlowCustomer.date_advance} /><input name="cash_flow_customer.amount_advance" defaultValue={cashFlowCustomer.amount_advance ?? ''} /></div></Row>
          <Row label="Invoice Date"><div className="txe-inline"><DateInput /><input /></div></Row>
          <Row label="Date Balance"><div className="txe-inline"><DateInput name="cash_flow_customer.date_balance" value={cashFlowCustomer.date_balance} /><input name="cash_flow_customer.amount_balance" defaultValue={cashFlowCustomer.amount_balance ?? ''} /></div></Row>
        </SectionCard>
        <SectionCard title="PAYMENT" side="PACKER" tone="gold">
          <Row label="Sales Proceeds"><div className="txe-inline"><DateInput name="cash_flow_packer.date_advance" value={cashFlowPacker.date_advance} /><input name="cash_flow_packer.amount_advance" defaultValue={cashFlowPacker.amount_advance ?? ''} /></div></Row>
          <Row label="Invoice Date"><div className="txe-inline"><DateInput name="cash_flow_packer.invoice_date" value={cashFlowPacker.invoice_date} /><input /></div></Row>
          <Row label="Comm. Paid On"><div className="txe-inline"><DateInput name="cash_flow_packer.date_balance" value={cashFlowPacker.date_balance} /><input name="cash_flow_packer.amount_balance" defaultValue={cashFlowPacker.amount_balance ?? ''} /></div></Row>
        </SectionCard>
      </div>

      <div className="txe-two">
        <SectionCard title="SHIPPING DETAILS" side="CUSTOMER" tone="cyan">
          <Row label="LSD Min"><div className="txe-inline"><DateInput name="shipping_details_customer.lsd_min" value={shippingCustomer.lsd_min} /><DateInput name="shipping_details_customer.lsd_max" value={shippingCustomer.lsd_max} /></div></Row>
          <Row label="Presentation"><div className="txe-inline"><input name="shipping_details_customer.presentation_days" defaultValue={shippingCustomer.presentation_days ?? ''} /><DateInput name="shipping_details_customer.lc_expiry" value={shippingCustomer.lc_expiry} /></div></Row>
          <Row label="REQ ETA"><DateInput name="shipping_details_customer.req_eta" value={shippingCustomer.req_eta} /></Row>
        </SectionCard>
        <SectionCard title="SHIPPING DETAILS" side="PACKER" tone="cyan">
          <Row label="LSD Min"><div className="txe-inline"><DateInput name="shipping_details_packer.lsd_min" value={shippingPacker.lsd_min} /><DateInput name="shipping_details_packer.lsd_max" value={shippingPacker.lsd_max} /></div></Row>
          <Row label="Presentation"><div className="txe-inline"><input name="shipping_details_packer.presentation_days" defaultValue={shippingPacker.presentation_days ?? ''} /><DateInput name="shipping_details_packer.lc_expiry" value={shippingPacker.lc_expiry} /></div></Row>
          <Row label="REQ ETA"><DateInput name="shipping_details_packer.req_eta" value={shippingPacker.req_eta} /></Row>
        </SectionCard>
      </div>

      <SectionCard title="NOTES" tone="gray">
        <div className="txe-two">
          <div>
            <Row label="By Sale"><textarea name="notes.by_sales" rows="2" defaultValue={notes.by_sales ?? ''} /></Row>
            <Row label="By QC"><textarea name="note.by_qc" rows="2" defaultValue={noteEntryValue(noteEntries, 'by_qc')} /></Row>
            <Row label="For Customer"><textarea name="note.for_customer" rows="2" defaultValue={noteEntryValue(noteEntries, 'for_customer')} /></Row>
          </div>
          <div>
            <Row label="By Logistic"><textarea name="note.by_logistic" rows="2" defaultValue={noteEntryValue(noteEntries, 'by_logistic')} /></Row>
            <Row label="By Packaging"><textarea name="note.by_packaging" rows="2" defaultValue={noteEntryValue(noteEntries, 'by_packaging')} /></Row>
            <Row label="For Packer"><textarea name="note.for_packer" rows="2" defaultValue={noteEntryValue(noteEntries, 'for_packer')} /></Row>
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
          <Row label="Trucking"><div className="txe-inline"><input name="expense.trucking.amount" defaultValue={getExpenseValue(transaction, 'trucking', 'amount')} /><select name="expense.trucking.currency" defaultValue={getExpenseValue(transaction, 'trucking', 'currency') ?? ''}>{withCurrent(OPTIONS.currency, getExpenseValue(transaction, 'trucking', 'currency')).map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="Freight"><div className="txe-inline"><input name="expense.freight.amount" defaultValue={getExpenseValue(transaction, 'freight', 'amount')} /><select name="expense.freight.currency" defaultValue={getExpenseValue(transaction, 'freight', 'currency') ?? ''}>{withCurrent(OPTIONS.currency, getExpenseValue(transaction, 'freight', 'currency')).map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="Local Charges"><div className="txe-inline"><input name="expense.local_charges.amount" defaultValue={getExpenseValue(transaction, 'local_charges', 'amount')} /><select name="expense.local_charges.currency" defaultValue={getExpenseValue(transaction, 'local_charges', 'currency') ?? ''}>{withCurrent(OPTIONS.currency, getExpenseValue(transaction, 'local_charges', 'currency')).map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="Custom Clearance"><div className="txe-inline"><input name="expense.custom_clearance.amount" defaultValue={getExpenseValue(transaction, 'custom_clearance', 'amount')} /><select name="expense.custom_clearance.currency" defaultValue={getExpenseValue(transaction, 'custom_clearance', 'currency') ?? ''}>{withCurrent(OPTIONS.currency, getExpenseValue(transaction, 'custom_clearance', 'currency')).map((o) => <option key={o}>{o}</option>)}</select></div></Row>
        </SectionCard>

        <SectionCard title="EXPENSES" side="INSURANCE" tone="pink">
          <Row label="Marine Insurance"><div className="txe-inline"><input name="expense.marine_insurance.amount" defaultValue={getExpenseValue(transaction, 'marine_insurance', 'amount')} /><select name="expense.marine_insurance.currency" defaultValue={getExpenseValue(transaction, 'marine_insurance', 'currency') ?? ''}>{withCurrent(OPTIONS.currency, getExpenseValue(transaction, 'marine_insurance', 'currency')).map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="Rejection Insurance"><div className="txe-inline"><input name="expense.rejection_insurance.amount" defaultValue={getExpenseValue(transaction, 'rejection_insurance', 'amount')} /><select name="expense.rejection_insurance.currency" defaultValue={getExpenseValue(transaction, 'rejection_insurance', 'currency') ?? ''}>{withCurrent(OPTIONS.currency, getExpenseValue(transaction, 'rejection_insurance', 'currency')).map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="Credit Insurance"><div className="txe-inline"><input name="expense.credit_insurance.amount" defaultValue={getExpenseValue(transaction, 'credit_insurance', 'amount')} /><select name="expense.credit_insurance.currency" defaultValue={getExpenseValue(transaction, 'credit_insurance', 'currency') ?? ''}>{withCurrent(OPTIONS.currency, getExpenseValue(transaction, 'credit_insurance', 'currency')).map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="War risk charges"><div className="txe-inline"><input name="expense.war_risk_charges.amount" defaultValue={getExpenseValue(transaction, 'war_risk_charges', 'amount')} /><select name="expense.war_risk_charges.currency" defaultValue={getExpenseValue(transaction, 'war_risk_charges', 'currency') ?? ''}>{withCurrent(OPTIONS.currency, getExpenseValue(transaction, 'war_risk_charges', 'currency')).map((o) => <option key={o}>{o}</option>)}</select></div></Row>
        </SectionCard>
      </div>

      <div className="txe-two">
        <SectionCard title="EXPENSES" side="DOCUMENTATION / BANK CHARGES" tone="pink">
          <Row label="Legalization Docs"><div className="txe-inline"><input name="expense.legalization_docs.amount" defaultValue={getExpenseValue(transaction, 'legalization_docs', 'amount')} /><select name="expense.legalization_docs.currency" defaultValue={getExpenseValue(transaction, 'legalization_docs', 'currency') ?? ''}>{withCurrent(OPTIONS.currency, getExpenseValue(transaction, 'legalization_docs', 'currency')).map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="Bank Charges"><div className="txe-inline"><input name="expense.bank_charges.amount" defaultValue={getExpenseValue(transaction, 'bank_charges', 'amount') ?? localFallback('0.00')} /><select name="expense.bank_charges.currency" defaultValue={getExpenseValue(transaction, 'bank_charges', 'currency') ?? ''}>{withCurrent(OPTIONS.currency, getExpenseValue(transaction, 'bank_charges', 'currency')).map((o) => <option key={o}>{o}</option>)}</select></div></Row>
        </SectionCard>

        <SectionCard title="EXPENSES" side="PACKAGING" tone="pink">
          <Row label="Packaging material"><div className="txe-inline"><input name="expense.packaging_material.amount" defaultValue={getExpenseValue(transaction, 'packaging_material', 'amount')} /><select name="expense.packaging_material.currency" defaultValue={getExpenseValue(transaction, 'packaging_material', 'currency') ?? ''}>{withCurrent(OPTIONS.currency, getExpenseValue(transaction, 'packaging_material', 'currency')).map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="Printing cylinder"><div className="txe-inline"><input name="expense.printing_cylinder.amount" defaultValue={getExpenseValue(transaction, 'printing_cylinder', 'amount')} /><select name="expense.printing_cylinder.currency" defaultValue={getExpenseValue(transaction, 'printing_cylinder', 'currency') ?? ''}>{withCurrent(OPTIONS.currency, getExpenseValue(transaction, 'printing_cylinder', 'currency')).map((o) => <option key={o}>{o}</option>)}</select></div></Row>
        </SectionCard>
      </div>

      <div className="txe-two">
        <SectionCard title="Expenses" side="INSPECTION / LAB TEST" tone="pink">
          <Row label="Inspection Amt."><div className="txe-inline"><input name="expense.inspection_amt.amount" defaultValue={getExpenseValue(transaction, 'inspection_amt', 'amount')} /><select name="expense.inspection_amt.currency" defaultValue={getExpenseValue(transaction, 'inspection_amt', 'currency') ?? ''}>{withCurrent(OPTIONS.currency, getExpenseValue(transaction, 'inspection_amt', 'currency')).map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="Loading Supervision"><div className="txe-inline"><input name="expense.loading_supervision.amount" defaultValue={getExpenseValue(transaction, 'loading_supervision', 'amount')} /><select name="expense.loading_supervision.currency" defaultValue={getExpenseValue(transaction, 'loading_supervision', 'currency') ?? ''}>{withCurrent(OPTIONS.currency, getExpenseValue(transaction, 'loading_supervision', 'currency')).map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="Lab Test"><div className="txe-inline"><input name="expense.lab_test.amount" defaultValue={getExpenseValue(transaction, 'lab_test', 'amount')} /><select name="expense.lab_test.currency" defaultValue={getExpenseValue(transaction, 'lab_test', 'currency') ?? ''}>{withCurrent(OPTIONS.currency, getExpenseValue(transaction, 'lab_test', 'currency')).map((o) => <option key={o}>{o}</option>)}</select></div></Row>
        </SectionCard>

        <SectionCard title="EXPENSES" side="REBATE / CLAIM" tone="pink">
          <Row label="Rebate to Customer"><div className="txe-inline"><input name="expense.rebate_customer.amount" defaultValue={getExpenseValue(transaction, 'rebate_customer', 'amount') ?? localFallback('2,000.00')} /><select name="expense.rebate_customer.currency" defaultValue={getExpenseValue(transaction, 'rebate_customer', 'currency') ?? ''}>{withCurrent(OPTIONS.currency, getExpenseValue(transaction, 'rebate_customer', 'currency')).map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="Description"><input name="expense.rebate_customer.description" defaultValue={getExpenseValue(transaction, 'rebate_customer', 'description')} /></Row>
          <Row label="Rebate to Packer"><div className="txe-inline"><input name="expense.rebate_packer.amount" defaultValue={getExpenseValue(transaction, 'rebate_packer', 'amount') ?? localFallback('0.00')} /><select name="expense.rebate_packer.currency" defaultValue={getExpenseValue(transaction, 'rebate_packer', 'currency') ?? ''}>{withCurrent(OPTIONS.currency, getExpenseValue(transaction, 'rebate_packer', 'currency')).map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="Description"><input name="expense.rebate_packer.description" defaultValue={getExpenseValue(transaction, 'rebate_packer', 'description')} /></Row>
          <Row label="Claim"><div className="txe-inline"><input name="expense.claim.amount" defaultValue={getExpenseValue(transaction, 'claim', 'amount')} /><select name="expense.claim.currency" defaultValue={getExpenseValue(transaction, 'claim', 'currency') ?? ''}>{withCurrent(OPTIONS.currency, getExpenseValue(transaction, 'claim', 'currency')).map((o) => <option key={o}>{o}</option>)}</select></div></Row>
          <Row label="Others"><div className="txe-inline"><input name="expense.others.amount" defaultValue={getExpenseValue(transaction, 'others', 'amount')} /><select name="expense.others.currency" defaultValue={getExpenseValue(transaction, 'others', 'currency') ?? ''}>{withCurrent(OPTIONS.currency, getExpenseValue(transaction, 'others', 'currency')).map((o) => <option key={o}>{o}</option>)}</select></div></Row>
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
  const packer = transaction.general_info_packer?.vendor ?? transaction.general_info_packer?.packer_name ?? ''
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
              <label><span>Packer</span><input readOnly value={packer} /></label>
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
            <PaginationBar totalRecords={rows.length} />
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
            <PaginationBar totalRecords={rows.length} className="compact-pagination-bottom" />
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

function ShipTab({ transaction, optionsFor, addOption }) {
  const notes = transaction.notes ?? transaction.note ?? {}
  const noteEntries = transaction.note_entries ?? transaction.noteEntries ?? []
  const logistics = transaction.logistics ?? {}
  const logisticsValue = (key, fallback = '') => logistics[key] ?? fallback
  const logisticsDate = (key, fallback = '') => toInputDate(logistics[key]) || toInputDate(fallback)
  const destination = logisticsValue('destination', localFallback('MONTREAL, CANADA'))

  return (
    <div className="txe-stack">
      <SectionCard title="LOGISTICS" tone="blue">
        <div className="txe-two">
          <div>
            <Row label="Plan ETD"><DateInput name="logistics.plan_etd" value={logisticsDate('plan_etd')} /></Row>
            <Row label="Plan ETA"><DateInput name="logistics.plan_eta" value={logisticsDate('plan_eta')} /></Row>
            <Row label="Packaging Date"><div className="txe-inline txe-inline-3"><DateInput name="logistics.packaging_date_inner" value={logisticsDate('packaging_date_inner')} /><DateInput name="logistics.packaging_date_outer" value={logisticsDate('packaging_date_outer')} /><DateInput name="logistics.packaging_date_approved" value={logisticsDate('packaging_date_approved')} /></div></Row>
            <Row label="Feeder Vessel"><input name="logistics.feeder_vessel" defaultValue={logisticsValue('feeder_vessel')} /></Row>
            <Row label="Mother Vessel"><input name="logistics.mother_vessel" defaultValue={logisticsValue('mother_vessel', localFallback('VARADA V.081W'))} /></Row>
            <Row label="Container #"><input name="logistics.container_no" defaultValue={logisticsValue('container_no', localFallback('MNBU9177027'))} /></Row>
            <Row label="Seal #"><input name="logistics.seal_no" defaultValue={logisticsValue('seal_no', localFallback('ML-IN2683329'))} /></Row>
            <Row label="LC #"><input name="logistics.lc_no" defaultValue={logisticsValue('lc_no')} /></Row>
            <Row label="Temperature Recorder No"><input name="logistics.temperature_recorder_no" defaultValue={logisticsValue('temperature_recorder_no')} /></Row>
            <Row label="Temperature Recorder Location ROW NO"><input name="logistics.temperature_recorder_location_row_no" defaultValue={logisticsValue('temperature_recorder_location_row_no')} /></Row>
          </div>
          <div>
            <Row label="ETD Date"><DateInput name="logistics.etd_date" value={logisticsDate('etd_date', localFallback('08/01/2026'))} /></Row>
            <Row label="ETA Date"><DateInput name="logistics.eta_date" value={logisticsDate('eta_date', localFallback('26/02/2026'))} /></Row>
            <Row label="QC Inspection Date"><DateInput name="logistics.qc_inspection_date" value={logisticsDate('qc_inspection_date')} /></Row>
            <Row label="Discharge"><input name="logistics.discharge" defaultValue={logisticsValue('discharge', logistics.discharge_at ?? '')} /></Row>
            <Row label="At"><input name="logistics.at" defaultValue={logisticsValue('at')} /></Row>
            <Row label="Service Type"><NamedSearchableSelect name="logistics.service_type" value={logisticsValue('service_type')} list={withCurrent(OPTIONS.serviceType, logistics.service_type)} /></Row>
            <Row label="B/L Date"><DateInput name="logistics.bl_date" value={logisticsDate('bl_date', '')} /></Row>
            <Row label="B/L No."><input name="logistics.bl_no" defaultValue={logisticsValue('bl_no', '')} /></Row>
            <Row label="Port"><input name="logistics.port" defaultValue={logisticsValue('port', localFallback('VISAKHAPATNAM, IND'))} /></Row>
            <Row label="Destination"><NamedSearchableSelect name="logistics.destination" value={destination} list={mergeCountryOptions(optionsFor('transaction.destination'), destination)} onAdd={(value) => addOption('transaction.destination', value)} /></Row>
            <Row label="Shipping Line / Agent"><input name="logistics.shipping_line_agent" defaultValue={logisticsValue('shipping_line_agent', localFallback('MAERSK'))} /></Row>
            <Row label="AME Inv. to Customer"><input name="logistics.sc_inv_to_customer" defaultValue={logisticsValue('sc_inv_to_customer')} /></Row>
            <Row label="Packer Inv Date"><DateInput name="logistics.packer_inv_date" value={logisticsDate('packer_inv_date', localFallback('26/12/2025'))} /></Row>
            <Row label="Packer Inv."><input name="logistics.packer_inv" defaultValue={logisticsValue('packer_inv', localFallback('MAA/286/2025-26'))} /></Row>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="NOTES" tone="gray">
        <div className="txe-two">
          <div>
            <Row label="By Sale"><textarea name="note.ship_by_sales" rows="2" defaultValue={notes.by_sales ?? ''} /></Row>
            <Row label="By QC"><textarea name="note.ship_by_qc" rows="2" defaultValue={noteEntryValue(noteEntries, 'ship_by_qc')} /></Row>
            <Row label="For Customer"><textarea name="note.ship_for_customer" rows="2" defaultValue={noteEntryValue(noteEntries, 'ship_for_customer')} /></Row>
          </div>
          <div>
            <Row label="By Logistic"><textarea name="note.ship_by_logistic" rows="2" defaultValue={noteEntryValue(noteEntries, 'ship_by_logistic')} /></Row>
            <Row label="By Packaging"><textarea name="note.ship_by_packaging" rows="2" defaultValue={noteEntryValue(noteEntries, 'ship_by_packaging')} /></Row>
            <Row label="For Packer"><textarea name="note.ship_for_packer" rows="2" defaultValue={noteEntryValue(noteEntries, 'ship_for_packer')} /></Row>
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

function BottomActions({ saving, duplicating, onOpenItems, onOpenLc, onDuplicate, onPrint, onSave, onSaveQuit }) {
  return (
    <div className="txe-bottom-actions">
      <div className="txe-bottom-tabs">
        <button type="button" onClick={onOpenItems}>Items</button>
        <button type="button">Special Notes</button>
        <button type="button" onClick={() => { if (typeof onOpenLc === 'function') onOpenLc() }}>L/C Terms</button>
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
  const transactionId = displayValue(transaction.booking_no)
  const lastModifiedBy = transactionLastModifiedBy(transaction) || localFallback('Noree Naknava')
  const lastModifiedDate = formatDate(transaction.updated_at) || localFallback('31/03/2026')

  return (
    <div className="txe-print-overlay" role="dialog" aria-modal="true" aria-label="Print documents">
      <div className="txe-print-modal">
        <div className="txe-print-header">
          <div>
            <h5>#{transactionId}</h5>
            <span>Print &gt; Menu</span>
          </div>
          <button type="button" className="txn-edit-close" onClick={onClose}>x</button>
        </div>

        <div className="txe-print-content">
          <div className="txe-print-form">
            <div className="txe-print-topgrid">
              <div><span>Transaction ID</span><strong>{displayValue(transaction.booking_no)}</strong></div>
              <div><span>Transaction Date</span><strong>{formatDate(transaction.issue_date) || localFallback('24/01/2026')}</strong></div>
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

function LcTermsModal({ transaction, value, onChange, onClose, onSubmit }) {
  const options = [30, 45, 60, 90]
  const [selected, setSelected] = useState(value ?? '')

  return (
    <div className="txe-print-overlay" role="dialog" aria-modal="true" aria-label="L/C Terms">
      <div className="txe-print-modal" style={{ width: '50%' }}>
        <div className="txe-print-header">
          <div>
            <h3>Set L/C Terms</h3>
            <span>Choose L/C term days</span>
          </div>
          <button type="button" className="txn-edit-close" onClick={onClose}>x</button>
        </div>

        <div className="txe-print-content">
          <div className="txe-print-form">
            <div className="txe-print-topgrid">
              <div><span>Transaction</span><strong>{transaction.booking_no}</strong></div>
            </div>

            <div style={{ marginTop: 12 }}>
              <label style={{ display: 'block', marginBottom: 6 }}>L/C term days</label>
              <select value={selected ?? ''} onChange={(e) => { setSelected(e.target.value); if (onChange) onChange(e.target.value) }}>
                <option value="">Select</option>
                {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>

            <div style={{ marginTop: 18 }}>
              <button type="button" className='btn btn-primary' onClick={() => { if (onSubmit) onSubmit(selected) }}>Save</button>
              <button type="button" className='btn btn-secondary' onClick={onClose} style={{ marginLeft: 8 }}>Cancel</button>
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

function DateInput({ name, value, readOnly = false, className = '' }) {
  return <input type="date" name={name} defaultValue={toInputDate(value)} readOnly={readOnly} className={className} />
}

function SalesPersonSelect({ value, list, currentName }) {
  const normalizedValue = value ? String(value) : ''
  const normalizedList = (Array.isArray(list) ? list : []).map((option) => ({
    ...option,
    id: String(option.id),
  }))
  const hasCurrentOption = normalizedValue && normalizedList.some((option) => option.id === normalizedValue)
  const options = hasCurrentOption || !normalizedValue
    ? normalizedList
    : [
      { id: normalizedValue, label: currentName || `User #${normalizedValue}` },
      ...normalizedList,
    ]

  return (
    <select key={normalizedValue} name="transaction.sales_person_id" defaultValue={normalizedValue}>
      <option value="">Select</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>{option.label}</option>
      ))}
    </select>
  )
}

function NamedSearchableSelect({ name, value, list, onChange, onAdd, hideToggle = false }) {
  return (
    <SearchableSelect
      key={`${name ?? 'field'}:${value ?? ''}`}
      name={name}
      initialValue={value}
      list={list}
      onChange={onChange}
      onAdd={onAdd}
      hideToggle={hideToggle}
    />
  )
}

function SearchableSelect({ name, initialValue, list, onChange, onAdd, hideToggle = false }) {
  const rootRef = useRef(null)
  const [isOpen, setIsOpen] = useState(false)
  const [value, setValue] = useState(initialValue ?? '')
  const [searchText, setSearchText] = useState('')
  const [savingOption, setSavingOption] = useState(false)
  const options = normalizeOptions(list)
  const normalizedSearch = searchText.trim().toLowerCase()
  const filteredOptions = normalizedSearch
    ? options.filter((option) => option.toLowerCase().includes(normalizedSearch))
    : options
  const typedValue = (searchText || value || '').trim()
  const canAdd = Boolean(onAdd && typedValue && !options.some((option) => option.toLowerCase() === typedValue.toLowerCase()))

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

  async function addTypedOption() {
    if (!canAdd || savingOption) return
    setSavingOption(true)
    const added = await onAdd(typedValue)
    setSavingOption(false)

    if (added) {
      setValue(typedValue)
      if (onChange) onChange(typedValue)
      setSearchText('')
      setIsOpen(false)
    }
  }

  return (
    <div className={`txn-combobox${hideToggle ? ' no-toggle' : ''}`} ref={rootRef}>
      <input
        name={name}
        type="text"
        value={value ?? ''}
        placeholder="Search"
        autoComplete="off"
        onFocus={() => setIsOpen(true)}
        onClick={() => setIsOpen(true)}
        onChange={(event) => {
          setSearchText(event.target.value)
          setValue(event.target.value)
          if (onChange) onChange(event.target.value)
          setIsOpen(true)
        }}
      />
      {!hideToggle && (
        <button
          type="button"
          className="txn-combobox-toggle"
          aria-label={isOpen ? 'Close options' : 'Open options'}
          onClick={() => setIsOpen((previous) => !previous)}
        >
          <span className={`txn-combobox-caret${isOpen ? ' is-open' : ''}`} aria-hidden="true" />
        </button>
      )}
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
                  setSearchText('')
                  setValue(option)
                  if (onChange) onChange(option)
                  setIsOpen(false)
                }}
              >
                {option}
              </button>
            ))
          ) : (
            <div className="txn-combobox-empty">No matches found</div>
          )}
          {canAdd ? (
            <button
              type="button"
              className="txn-combobox-add"
              disabled={savingOption}
              onMouseDown={(event) => event.preventDefault()}
              onClick={addTypedOption}
            >
              {savingOption ? 'Adding...' : `Add "${typedValue}"`}
            </button>
          ) : null}
        </div>
      ) : null}
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
    lc_days: false,
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
  const options = normalizeOptions(list)
  const normalizedCurrent = typeof current === 'string' ? current.trim() : ''
  if (!normalizedCurrent) return options
  return options.includes(normalizedCurrent) ? options : [normalizedCurrent, ...options]
}

function mergeOptions(...lists) {
  return normalizeOptions(lists.flat())
}

function normalizeOptions(options) {
  return [...new Set(
    (Array.isArray(options) ? options : [])
      .filter((option) => typeof option === 'string')
      .map((option) => option.trim())
      .filter(Boolean),
  )]
}

async function loadDropdownConfigs(authFetch) {
  if (!authFetch) return {}

  try {
    const response = await authFetch('/configs')
    const payload = await response.json()
    return response.ok ? buildConfigMap(payload?.data) : {}
  } catch {
    return {}
  }
}

async function loadBookingPartyOptions(authFetch) {
  if (!authFetch) return { customers: [], customerContacts: {}, packers: [], packedByPackers: [], salesPeople: [] }

  try {
    const response = await authFetch('/users?roles=customer,packer,vendor,sales,admin,logistics&per_page=100')
    const payload = await response.json()

    if (!response.ok || !payload?.data) return { customers: [], customerContacts: {}, packers: [], packedByPackers: [], salesPeople: [] }
    const customers = payload.data.filter((user) => user.role === 'customer')
    const packers = payload.data.filter((user) => ['packer', 'vendor'].includes(user.role))

    return {
      customers: extractUserNames(customers),
      customerContacts: extractCustomerContactMap(customers),
      packers: extractUserNames(packers),
      packedByPackers: extractUserNamesWithAddresses(packers),
      salesPeople: extractSalesPersonOptions(payload.data.filter((user) => ['sales', 'admin', 'logistics'].includes(user.role))),
    }
  } catch {
    return { customers: [], customerContacts: {}, packers: [], packedByPackers: [], salesPeople: [] }
  }
}

function extractUserNames(users) {
  return normalizeOptions(
    (Array.isArray(users) ? users : [])
      .map((user) => (typeof user?.name === 'string' ? user.name : '')),
  )
}

function extractUserNamesWithAddresses(users) {
  return normalizeOptions(
    (Array.isArray(users) ? users : []).map((user) => {
      const name = typeof user?.name === 'string' ? user.name.trim() : ''
      const address = typeof user?.address === 'string' ? user.address.replace(/\s+/g, ' ').trim() : ''
      if (!name) return ''

      return address ? `${name} - ${address}` : name
    }),
  )
}

function extractCustomerContactMap(users) {
  return Object.fromEntries(
    (Array.isArray(users) ? users : [])
      .map((user) => [
        typeof user?.name === 'string' ? user.name.trim() : '',
        typeof user?.contact_name === 'string' ? user.contact_name.trim() : '',
      ])
      .filter(([name, contactName]) => name && contactName),
  )
}

function extractSalesPersonOptions(users) {
  const userMap = new Map()

  for (const user of Array.isArray(users) ? users : []) {
    if (!user?.id) continue
    const label = [user.name, user.email].find((value) => typeof value === 'string' && value.trim()) ?? `User #${user.id}`
    userMap.set(String(user.id), {
      id: String(user.id),
      label,
    })
  }

  return [...userMap.values()]
}

function localFallback(value) {
  return IS_LOCAL_ENV ? value : ''
}

function transactionLastModifiedBy(transaction) {
  return normalizeText(transaction?.updated_by?.name)
    ?? normalizeText(transaction?.last_modified_by?.name)
    ?? normalizeText(transaction?.created_by?.name)
    ?? ''
}

function displayValue(value) {
  const text = normalizeText(value)
  return text ?? localFallback('-')
}

function formatDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-GB')
}

function toInputDate(value) {
  const text = normalizeText(value)
  if (!text) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text
  const parts = text.split('/')
  if (parts.length === 3) {
    const [dd, mm, yyyy] = parts
    if (yyyy?.length === 4) return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
  }
  const date = new Date(text)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
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

function formatFormAmount(value) {
  const amount = Number(value)
  return Number.isFinite(amount) ? amount.toFixed(2) : '0.00'
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

function getItemRevenueTotals(transaction) {
  const items = Array.isArray(transaction.items) ? transaction.items : []

  return items.reduce((totals, item) => {
    const sellingTotal = normalizeNumber(item.selling_total) ?? 0
    const packerCommissionTotal = normalizeNumber(item.total_packer_commission) ?? 0
    const customerCommissionTotal = normalizeNumber(item.total_customer_commission) ?? 0
    const packerCommission = normalizeNumber(item.commission_from_packer) ?? 0
    const customerCommission = normalizeNumber(item.commission_from_customer) ?? 0

    return {
      hasItems: totals.hasItems,
      totalSellingPrice: totals.totalSellingPrice + sellingTotal,
      totalPackerCommission: totals.totalPackerCommission + packerCommissionTotal,
      totalCustomerCommission: totals.totalCustomerCommission + customerCommissionTotal,
      hasPackerCommission: totals.hasPackerCommission || packerCommission !== 0,
      hasCustomerCommission: totals.hasCustomerCommission || customerCommission !== 0,
    }
  }, {
    hasItems: items.length > 0,
    totalSellingPrice: 0,
    totalPackerCommission: 0,
    totalCustomerCommission: 0,
    hasPackerCommission: false,
    hasCustomerCommission: false,
  })
}

function buildItemDetailRows(transaction) {
  const items = Array.isArray(transaction.items) ? transaction.items : []

  if (items.length > 0) {
    return items.map((item, index) => {
      const weightValue = normalizeNumber(item.total_weight_value) ?? 0
      const sellingPriceValue = normalizeNumber(item.selling_unit_price) ?? 0
      const totalSellingPriceValue = normalizeNumber(item.selling_total) ?? 0
      const buyingPriceValue = normalizeNumber(item.buying_unit_price) ?? 0
      const totalBuyingPriceValue = normalizeNumber(item.buying_total) ?? 0

      return {
        no: index + 1,
        product: item.product ?? '',
        style: item.style ?? '',
        code: item.media ?? item.item_code ?? item.customer_lot_no ?? '',
        packing: item.packing ?? '',
        brand: item.brand ?? '',
        size: item.size ?? '',
        weight: weightValue ? formatAmount(weightValue) : '',
        weightValue,
        qty: item.qty_booking ?? item.qty_value ?? '',
        sellingPrice: sellingPriceValue ? formatUnitAmount(sellingPriceValue) : '',
        sellingPriceValue,
        totalSellingPrice: totalSellingPriceValue ? formatAmount(totalSellingPriceValue) : '',
        totalSellingPriceValue,
        buyingPrice: buyingPriceValue ? formatUnitAmount(buyingPriceValue) : '',
        buyingPriceValue,
        totalBuyingPriceValue,
      }
    })
  }

  if (!IS_LOCAL_ENV) {
    return []
  }

  const revenueCustomer = transaction.revenue_customer ?? {}
  const revenuePacker = transaction.revenue_packer ?? {}
  const customer = transaction.general_info_customer ?? {}
  const packer = transaction.general_info_packer ?? {}
  const weightValue = normalizeNumber(packer.total_lqd_price) ?? normalizeNumber(transaction.net_margin) ?? 0
  const qtyValue = normalizeText(customer.buyer_number) ?? normalizeText(packer.packer_number) ?? localFallback('-')
  const sellingPriceValue = normalizeNumber(revenueCustomer.amount) ?? normalizeNumber(revenueCustomer.total_selling_value) ?? 0
  const totalSellingPriceValue = normalizeNumber(revenueCustomer.total_selling_value) ?? sellingPriceValue
  const buyingPriceValue = normalizeNumber(revenuePacker.amount) ?? normalizeNumber(revenuePacker.total_buying_value) ?? 0
  const totalBuyingPriceValue = normalizeNumber(revenuePacker.total_buying_value) ?? buyingPriceValue

  return [{
    no: 1,
    product: transaction.category ?? revenueCustomer.description ?? localFallback('Transaction Item'),
    style: customer.description ?? packer.description ?? localFallback('-'),
    code: transaction.booking_no ?? localFallback('-'),
    packing: transaction.container_secondary ?? localFallback('-'),
    brand: packer.vendor ?? packer.packer_name ?? localFallback('-'),
    size: transaction.container_primary ?? localFallback('-'),
    weight: weightValue ? formatAmount(weightValue) : localFallback('-'),
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

function getFieldValue(formData, name, fallback = null) {
  return formData.has(name) ? getField(formData, name) : (fallback ?? null)
}

function getNumberValue(formData, name, fallback = null) {
  return formData.has(name) ? normalizeNumber(formData.get(name)) : normalizeNumber(fallback)
}

function getDateValue(formData, name, fallback = null) {
  return formData.has(name) ? toApiDate(getField(formData, name)) : toApiDate(fallback)
}

function getRadioBoolean(formData, name, fallback = false) {
  const raw = formData.get(name)
  if (raw === null) return fallback
  return String(raw).toLowerCase() === 'yes'
}

function getCheckbox(formElement, name, fallback = false) {
  const element = formElement.querySelector(`input[name="${name}"]`)
  return element ? Boolean(element.checked) : Boolean(fallback)
}

function noteEntryValue(entries, noteKey) {
  const entry = (Array.isArray(entries) ? entries : []).find((item) => item?.note_key === noteKey)
  return entry?.note_value ?? ''
}

function upsertNoteEntries(existing = [], updates = {}) {
  const map = new Map()
  for (const entry of existing) {
    if (entry?.note_key) map.set(entry.note_key, { ...entry })
  }
  Object.entries(updates).forEach(([noteKey, noteValue], index) => {
    if (noteValue === undefined) return
    const value = normalizeText(noteValue)
    if (!value) {
      map.delete(noteKey)
      return
    }
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
      sales_person_id: getField(formData, 'transaction.sales_person_id') ?? transaction.sales_person_id ?? null,
      product_origin: getField(formData, 'transaction.product_origin') ?? transaction.product_origin ?? null,
      destination: getField(formData, 'transaction.destination') ?? transaction.destination ?? null,
      category: getField(formData, 'transaction.category') ?? transaction.category ?? null,
      type: getField(formData, 'transaction.type') ?? transaction.type ?? null,
      country: getField(formData, 'transaction.country') ?? transaction.country ?? null,
      container_primary: getField(formData, 'transaction.container_primary') ?? transaction.container_primary ?? null,
      container_secondary: getField(formData, 'transaction.container_secondary') ?? transaction.container_secondary ?? null,
      certified: (getField(formData, 'transaction.certified') ?? 'No') === 'Yes',
      net_margin: normalizeNumber(formData.get('transaction.net_margin')),
      status: getField(formData, 'transaction.status') ?? transaction.status,
    },
    general_info_customer: {
      customer: getFieldValue(formData, 'general_info_customer.customer', transaction.general_info_customer?.customer),
      attention: getFieldValue(formData, 'general_info_customer.attention', transaction.general_info_customer?.attention),
      ship_to: getFieldValue(formData, 'general_info_customer.ship_to', transaction.general_info_customer?.ship_to),
      buyer: getFieldValue(formData, 'general_info_customer.buyer', transaction.general_info_customer?.buyer),
      buyer_number: getFieldValue(formData, 'general_info_customer.buyer_number', transaction.general_info_customer?.buyer_number),
      end_customer: getFieldValue(formData, 'general_info_customer.end_customer', transaction.general_info_customer?.end_customer),
      prices_customer_type: getFieldValue(formData, 'general_info_customer.prices_customer_type', transaction.general_info_customer?.prices_customer_type),
      prices_customer_rate: getFieldValue(formData, 'general_info_customer.prices_customer_rate', transaction.general_info_customer?.prices_customer_rate),
      payment_customer_term: getFieldValue(formData, 'general_info_customer.payment_customer_term', transaction.general_info_customer?.payment_customer_term),
      payment_customer_type: getFieldValue(formData, 'general_info_customer.payment_customer_type', transaction.general_info_customer?.payment_customer_type),
      payment_customer_advance_percent: getNumberValue(formData, 'general_info_customer.payment_customer_advance_percent', transaction.general_info_customer?.payment_customer_advance_percent),
      description: getFieldValue(formData, 'general_info_customer.description', transaction.general_info_customer?.description),
      tolerance: getFieldValue(formData, 'general_info_customer.tolerance', transaction.general_info_customer?.tolerance),
      marketing_fee: getCheckbox(formElement, 'general_info_customer.marketing_fee', transaction.general_info_customer?.marketing_fee ?? false),
    },
    general_info_packer: {
      vendor: getFieldValue(formData, 'general_info_packer.vendor', transaction.general_info_packer?.vendor),
      packer_name: getFieldValue(formData, 'general_info_packer.packer_name', transaction.general_info_packer?.packer_name),
      packer_number: getFieldValue(formData, 'general_info_packer.packer_number', transaction.general_info_packer?.packer_number),
      packed_by: getFieldValue(formData, 'general_info_packer.packed_by', transaction.general_info_packer?.packed_by),
      prices_packer_type: getFieldValue(formData, 'general_info_packer.prices_packer_type', transaction.general_info_packer?.prices_packer_type),
      prices_packer_rate: getFieldValue(formData, 'general_info_packer.prices_packer_rate', transaction.general_info_packer?.prices_packer_rate),
      payment_packer_term: getFieldValue(formData, 'general_info_packer.payment_packer_term', transaction.general_info_packer?.payment_packer_term),
      payment_packer_type: getFieldValue(formData, 'general_info_packer.payment_packer_type', transaction.general_info_packer?.payment_packer_type),
      payment_packer_advance_percent: getNumberValue(formData, 'general_info_packer.payment_packer_advance_percent', transaction.general_info_packer?.payment_packer_advance_percent),
      description: getFieldValue(formData, 'general_info_packer.description', transaction.general_info_packer?.description),
      tolerance: getFieldValue(formData, 'general_info_packer.tolerance', transaction.general_info_packer?.tolerance),
      total_lqd_price: getNumberValue(formData, 'general_info_packer.total_lqd_price', transaction.general_info_packer?.total_lqd_price),
      consignee: getFieldValue(formData, 'general_info_packer.consignee', transaction.general_info_packer?.consignee),
    },
    revenue_customer: {
      total_selling_value: getNumberValue(formData, 'revenue_customer.total_selling_value', transaction.revenue_customer?.total_selling_value),
      total_selling_currency: getFieldValue(formData, 'revenue_customer.total_selling_currency', transaction.revenue_customer?.total_selling_currency),
      commission_enabled: getRadioBoolean(formData, 'revenue_customer.commission_enabled', transaction.revenue_customer?.commission_enabled ?? false),
      commission_percent: getNumberValue(formData, 'revenue_customer.commission_percent', transaction.revenue_customer?.commission_percent),
      amount: getNumberValue(formData, 'revenue_customer.amount', transaction.revenue_customer?.amount),
      amount_currency: getFieldValue(formData, 'revenue_customer.amount_currency', transaction.revenue_customer?.amount_currency),
      description: getFieldValue(formData, 'revenue_customer.description', transaction.revenue_customer?.description),
      rebate_memo_amount: getNumberValue(formData, 'revenue_customer.rebate_memo_amount', transaction.revenue_customer?.rebate_memo_amount),
      rebate_memo_description: getFieldValue(formData, 'revenue_customer.rebate_memo_description', transaction.revenue_customer?.rebate_memo_description),
      overcharge_sc_amount: getNumberValue(formData, 'revenue_customer.overcharge_sc_amount', transaction.revenue_customer?.overcharge_sc_amount),
      overcharge_sc_description: getFieldValue(formData, 'revenue_customer.overcharge_sc_description', transaction.revenue_customer?.overcharge_sc_description),
    },
    revenue_packer: {
      total_buying_value: getNumberValue(formData, 'revenue_packer.total_buying_value', transaction.revenue_packer?.total_buying_value),
      total_buying_currency: getFieldValue(formData, 'revenue_packer.total_buying_currency', transaction.revenue_packer?.total_buying_currency),
      commission_enabled: getRadioBoolean(formData, 'revenue_packer.commission_enabled', transaction.revenue_packer?.commission_enabled ?? false),
      commission_percent: getNumberValue(formData, 'revenue_packer.commission_percent', transaction.revenue_packer?.commission_percent),
      amount: getNumberValue(formData, 'revenue_packer.amount', transaction.revenue_packer?.amount),
      amount_currency: getFieldValue(formData, 'revenue_packer.amount_currency', transaction.revenue_packer?.amount_currency),
      description: getFieldValue(formData, 'revenue_packer.description', transaction.revenue_packer?.description),
      overcharge_sc_amount: getNumberValue(formData, 'revenue_packer.overcharge_sc_amount', transaction.revenue_packer?.overcharge_sc_amount),
      overcharge_sc_description: getFieldValue(formData, 'revenue_packer.overcharge_sc_description', transaction.revenue_packer?.overcharge_sc_description),
    },
    cash_flow_customer: {
      date_advance: getDateValue(formData, 'cash_flow_customer.date_advance', transaction.cash_flow_customer?.date_advance),
      amount_advance: getNumberValue(formData, 'cash_flow_customer.amount_advance', transaction.cash_flow_customer?.amount_advance),
      date_balance: getDateValue(formData, 'cash_flow_customer.date_balance', transaction.cash_flow_customer?.date_balance),
      amount_balance: getNumberValue(formData, 'cash_flow_customer.amount_balance', transaction.cash_flow_customer?.amount_balance),
    },
    cash_flow_packer: {
      date_advance: getDateValue(formData, 'cash_flow_packer.date_advance', transaction.cash_flow_packer?.date_advance),
      amount_advance: getNumberValue(formData, 'cash_flow_packer.amount_advance', transaction.cash_flow_packer?.amount_advance),
      invoice_date: getDateValue(formData, 'cash_flow_packer.invoice_date', transaction.cash_flow_packer?.invoice_date),
      date_balance: getDateValue(formData, 'cash_flow_packer.date_balance', transaction.cash_flow_packer?.date_balance),
      amount_balance: getNumberValue(formData, 'cash_flow_packer.amount_balance', transaction.cash_flow_packer?.amount_balance),
    },
    shipping_details_customer: {
      lsd_min: getDateValue(formData, 'shipping_details_customer.lsd_min', transaction.shipping_details_customer?.lsd_min),
      lsd_max: getDateValue(formData, 'shipping_details_customer.lsd_max', transaction.shipping_details_customer?.lsd_max),
      presentation_days: getNumberValue(formData, 'shipping_details_customer.presentation_days', transaction.shipping_details_customer?.presentation_days),
      lc_expiry: getDateValue(formData, 'shipping_details_customer.lc_expiry', transaction.shipping_details_customer?.lc_expiry),
      req_eta: getDateValue(formData, 'shipping_details_customer.req_eta', transaction.shipping_details_customer?.req_eta),
    },
    shipping_details_packer: {
      lsd_min: getDateValue(formData, 'shipping_details_packer.lsd_min', transaction.shipping_details_packer?.lsd_min),
      lsd_max: getDateValue(formData, 'shipping_details_packer.lsd_max', transaction.shipping_details_packer?.lsd_max),
      presentation_days: getNumberValue(formData, 'shipping_details_packer.presentation_days', transaction.shipping_details_packer?.presentation_days),
      lc_expiry: getDateValue(formData, 'shipping_details_packer.lc_expiry', transaction.shipping_details_packer?.lc_expiry),
      req_eta: getDateValue(formData, 'shipping_details_packer.req_eta', transaction.shipping_details_packer?.req_eta),
    },
    notes: {
      by_sales: getFieldValue(formData, 'notes.by_sales', transaction.note?.by_sales),
    },
    logistics: {
      plan_etd: getDateValue(formData, 'logistics.plan_etd', transaction.logistics?.plan_etd),
      plan_eta: getDateValue(formData, 'logistics.plan_eta', transaction.logistics?.plan_eta),
      packaging_date_inner: getDateValue(formData, 'logistics.packaging_date_inner', transaction.logistics?.packaging_date_inner),
      packaging_date_outer: getDateValue(formData, 'logistics.packaging_date_outer', transaction.logistics?.packaging_date_outer),
      packaging_date_approved: getDateValue(formData, 'logistics.packaging_date_approved', transaction.logistics?.packaging_date_approved),
      feeder_vessel: getFieldValue(formData, 'logistics.feeder_vessel', transaction.logistics?.feeder_vessel),
      mother_vessel: getFieldValue(formData, 'logistics.mother_vessel', transaction.logistics?.mother_vessel),
      container_no: getFieldValue(formData, 'logistics.container_no', transaction.logistics?.container_no),
      seal_no: getFieldValue(formData, 'logistics.seal_no', transaction.logistics?.seal_no),
      lc_no: getFieldValue(formData, 'logistics.lc_no', transaction.logistics?.lc_no),
      temperature_recorder_no: getFieldValue(formData, 'logistics.temperature_recorder_no', transaction.logistics?.temperature_recorder_no),
      temperature_recorder_location_row_no: getFieldValue(formData, 'logistics.temperature_recorder_location_row_no', transaction.logistics?.temperature_recorder_location_row_no),
      etd_date: getDateValue(formData, 'logistics.etd_date', transaction.logistics?.etd_date),
      eta_date: getDateValue(formData, 'logistics.eta_date', transaction.logistics?.eta_date),
      qc_inspection_date: getDateValue(formData, 'logistics.qc_inspection_date', transaction.logistics?.qc_inspection_date),
      discharge: getFieldValue(formData, 'logistics.discharge', transaction.logistics?.discharge),
      at: getFieldValue(formData, 'logistics.at', transaction.logistics?.at),
      discharge_at: getFieldValue(formData, 'logistics.discharge', transaction.logistics?.discharge_at),
      service_type: getFieldValue(formData, 'logistics.service_type', transaction.logistics?.service_type),
      bl_date: getDateValue(formData, 'logistics.bl_date', transaction.logistics?.bl_date),
      bl_no: getFieldValue(formData, 'logistics.bl_no', transaction.logistics?.bl_no),
      port: getFieldValue(formData, 'logistics.port', transaction.logistics?.port),
      destination: getFieldValue(formData, 'logistics.destination', transaction.logistics?.destination),
      shipping_line_agent: getFieldValue(formData, 'logistics.shipping_line_agent', transaction.logistics?.shipping_line_agent),
      sc_inv_to_customer: getFieldValue(formData, 'logistics.sc_inv_to_customer', transaction.logistics?.sc_inv_to_customer),
      packer_inv_date: getDateValue(formData, 'logistics.packer_inv_date', transaction.logistics?.packer_inv_date),
      packer_inv: getFieldValue(formData, 'logistics.packer_inv', transaction.logistics?.packer_inv),
      cancel_claim: getCheckbox(formElement, 'logistics.cancel_claim', transaction.logistics?.cancel_claim ?? false),
      cancel_reject: getCheckbox(formElement, 'logistics.cancel_reject', transaction.logistics?.cancel_reject ?? false),
      cancel_move: getCheckbox(formElement, 'logistics.cancel_move', transaction.logistics?.cancel_move ?? false),
    },
    expense_lines: expenseLines,
    note_entries: upsertNoteEntries(
      transaction.note_entries ?? transaction.noteEntries ?? [],
      {
        by_qc: formData.has('note.by_qc') ? formData.get('note.by_qc') : undefined,
        for_customer: formData.has('note.for_customer') ? formData.get('note.for_customer') : undefined,
        by_logistic: formData.has('note.by_logistic') ? formData.get('note.by_logistic') : undefined,
        by_packaging: formData.has('note.by_packaging') ? formData.get('note.by_packaging') : undefined,
        for_packer: formData.has('note.for_packer') ? formData.get('note.for_packer') : undefined,
        ship_by_sales: formData.has('note.ship_by_sales') ? formData.get('note.ship_by_sales') : undefined,
        ship_by_qc: formData.has('note.ship_by_qc') ? formData.get('note.ship_by_qc') : undefined,
        ship_for_customer: formData.has('note.ship_for_customer') ? formData.get('note.ship_for_customer') : undefined,
        ship_by_logistic: formData.has('note.ship_by_logistic') ? formData.get('note.ship_by_logistic') : undefined,
        ship_by_packaging: formData.has('note.ship_by_packaging') ? formData.get('note.ship_by_packaging') : undefined,
        ship_for_packer: formData.has('note.ship_for_packer') ? formData.get('note.ship_for_packer') : undefined,
      },
    ),
  }
}
