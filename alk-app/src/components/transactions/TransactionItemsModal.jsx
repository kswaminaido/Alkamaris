import { useEffect, useMemo, useRef, useState } from 'react'

const CURRENCIES = ['USD', 'INR', 'SGD', 'EUR']
const COUNT_UNITS = ['CTN(S)', 'PCS', 'BAG(S)', 'PALLET(S)']
const WEIGHT_UNITS = ['LB(S)', 'KG(S)', 'G', 'OZ', 'MT']
const RATE_HINTS = ['Std', 'Adj']
const EMPTY_ITEM_OPTIONS = { product: [], style: [], packing: [], brand: [], size: [] }

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

let transactionItemOptionsCache = null
let transactionItemOptionsPromise = null

function TransactionItemsModal({ transaction, authFetch, onClose, onTransactionChange }) {
  const [editingItem, setEditingItem] = useState(null)
  const [feedback, setFeedback] = useState({ message: '', error: '' })
  const [busyKey, setBusyKey] = useState('')

  const items = transaction.items ?? []
  const totals = useMemo(() => ({
    selling: items.reduce((sum, item) => sum + toNumber(item.selling_total), 0),
    buying: items.reduce((sum, item) => sum + toNumber(item.buying_total), 0),
    weight: items.reduce((sum, item) => sum + toNumber(item.total_weight_value), 0),
  }), [items])

  useEffect(() => {
    setEditingItem(null)
    setFeedback({ message: '', error: '' })
    setBusyKey('')
  }, [transaction.id])

  async function handleAction(key, requestFactory, successMessage) {
    setBusyKey(key)
    setFeedback({ message: '', error: '' })
    try {
      const response = await requestFactory()
      const body = await response.json()
      if (!response.ok) {
        const firstValidationMessage = body?.errors ? Object.values(body.errors)?.[0]?.[0] : null
        setFeedback({ message: '', error: firstValidationMessage ?? body?.message ?? 'Unable to update item.' })
        return
      }
      if (body?.data) {
        onTransactionChange(body.data)
      }
      setFeedback({ message: successMessage, error: '' })
    } catch {
      setFeedback({ message: '', error: 'Unable to update item.' })
    } finally {
      setBusyKey('')
    }
  }

  return (
    <div className="txe-items-overlay" role="dialog" aria-modal="true" aria-label="Transaction items">
      <div className="txe-items-modal">
        <div className="txe-items-topbar">
          <div>
            <div className="txe-items-title">Transaction Items</div>
            <div className="txe-items-breadcrumb">Transaction &gt; All Transaction &gt; Items Detail</div>
          </div>
          <div className="txe-items-status">Linked to booking <strong>{transaction.booking_no || '-'}</strong></div>
        </div>

        <div className="txe-items-body">
          <div className="txe-items-summary">
            <div className="txe-items-summary-grid">
              <InfoField label="Transaction ID" value={transaction.booking_no} />
              <InfoField label="Vendor" value={transaction.general_info_packer?.vendor} />
              <InfoField label="Book Date" value={displayDate(transaction.issue_date)} />
              <InfoField label="Customer" value={transaction.general_info_customer?.customer} />
              <InfoField label="ETA Date" value={displayDate(transaction.shipping_details_customer?.req_eta ?? transaction.shipping_details_packer?.req_eta)} />
              <InfoField label="LSD" value={displayDate(transaction.shipping_details_customer?.lsd_max ?? transaction.shipping_details_packer?.lsd_min)} />
              <InfoField label="Status" value={getStatusLabel(transaction.status) ?? 'Unknown'} />
            </div>
            <div className="txe-items-summary-actions">
              <button type="button" onClick={() => setEditingItem({})}>Add</button>
              <button type="button" onClick={onClose}>Close</button>
            </div>
          </div>

          {feedback.message ? <p className="message success">{feedback.message}</p> : null}
          {feedback.error ? <p className="message error">{feedback.error}</p> : null}

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
                    <th>Selling Price</th>
                    <th>Total Selling</th>
                    <th>Buying Total</th>
                    <th>Up</th>
                    <th>Down</th>
                    <th>Duplicate</th>
                    <th>Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr><td colSpan={16} className="txe-items-empty">No items yet. Click Add to create the first item.</td></tr>
                  ) : items.map((item, index) => (
                    <tr key={item.id} className="txe-items-clickable-row" onClick={() => setEditingItem(item)}>
                      <td>{index + 1}</td>
                      <td>{item.product || '-'}</td>
                      <td>{item.style || '-'}</td>
                      <td>{item.media || item.item_code || '-'}</td>
                      <td>{item.packing || '-'}</td>
                      <td>{item.brand || '-'}</td>
                      <td>{item.size || '-'}</td>
                      <td>{formatDecimal(item.total_weight_value)}</td>
                      <td>{formatQty(item.qty_booking ?? item.qty_value, item.qty_unit)}</td>
                      <td>{formatMoney(item.selling_unit_price)}</td>
                      <td>{formatMoney(item.selling_total)}</td>
                      <td>{formatMoney(item.buying_total)}</td>
                      <td><MiniAction busy={busyKey === `up-${item.id}`} onClick={(event) => { event.stopPropagation(); handleAction(`up-${item.id}`, () => authFetch(`/transactions/${transaction.id}/items/${item.id}/move`, { method: 'POST', body: JSON.stringify({ direction: 'up' }) }), 'Item order updated.') }}>^</MiniAction></td>
                      <td><MiniAction busy={busyKey === `down-${item.id}`} onClick={(event) => { event.stopPropagation(); handleAction(`down-${item.id}`, () => authFetch(`/transactions/${transaction.id}/items/${item.id}/move`, { method: 'POST', body: JSON.stringify({ direction: 'down' }) }), 'Item order updated.') }}>v</MiniAction></td>
                      <td><MiniAction busy={busyKey === `dup-${item.id}`} onClick={(event) => { event.stopPropagation(); handleAction(`dup-${item.id}`, () => authFetch(`/transactions/${transaction.id}/items/${item.id}/duplicate`, { method: 'POST' }), 'Item duplicated.') }}>+</MiniAction></td>
                      <td><MiniAction tone="delete" busy={busyKey === `del-${item.id}`} onClick={(event) => { event.stopPropagation(); handleAction(`del-${item.id}`, () => authFetch(`/transactions/${transaction.id}/items/${item.id}`, { method: 'DELETE' }), 'Item deleted.') }}>x</MiniAction></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="txe-items-footer">
            <div className="txe-items-totals">
              <InfoField label="Total Selling Price" value={formatMoney(totals.selling)} />
              <InfoField label="Total Buying Price" value={formatMoney(totals.buying)} />
              <InfoField label="Total Weight" value={formatDecimal(totals.weight)} />
            </div>
            <div className="txe-items-nav">
              <button type="button" onClick={onClose}>Back trans.</button>
              <button type="button" disabled>Next Trans.</button>
            </div>
          </div>
        </div>

        {editingItem !== null ? (
          <TransactionItemEditorModal
            transaction={transaction}
            authFetch={authFetch}
            item={editingItem.id ? editingItem : null}
            onClose={() => setEditingItem(null)}
            onSaved={(updatedTransaction, successMessage) => {
              onTransactionChange(updatedTransaction)
              setEditingItem(null)
              setFeedback({ message: successMessage, error: '' })
            }}
          />
        ) : null}
      </div>
    </div>
  )
}

function TransactionItemEditorModal({ transaction, authFetch, item, onClose, onSaved }) {
  const [form, setForm] = useState(() => buildForm(transaction, item))
  const [fieldOptions, setFieldOptions] = useState(() => transactionItemOptionsCache ?? EMPTY_ITEM_OPTIONS)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [calculating, setCalculating] = useState(false)

  useEffect(() => {
    setForm(buildForm(transaction, item))
  }, [item, transaction])

  useEffect(() => {
    const nextCalculated = calculateDraft(form)

    setForm((current) => {
      const hasChanges = Object.entries(nextCalculated).some(([key, value]) => current[key] !== value)
      return hasChanges ? { ...current, ...nextCalculated } : current
    })
  }, [
    form.packing,
    form.total_weight_value,
    form.qty_value,
    form.qty_booking,
    form.selling_unit_price,
    form.selling_correction,
    form.lqd_price,
    form.buying_unit_price,
    form.buying_correction,
    form.rebate_rate_packer,
    form.rebate_rate_customer,
    form.commission_from_packer,
    form.commission_from_customer,
  ])

  useEffect(() => {
    let active = true

    async function loadFieldOptions() {
      if (transactionItemOptionsCache) {
        setFieldOptions(transactionItemOptionsCache)
        return
      }

      try {
        if (!transactionItemOptionsPromise) {
          transactionItemOptionsPromise = authFetch('/transaction-item-options')
            .then((response) => response.json())
            .then((body) => ({
              product: normalizeOptionList(body?.data?.product),
              style: normalizeOptionList(body?.data?.style),
              packing: normalizeOptionList(body?.data?.packing),
              brand: normalizeOptionList(body?.data?.brand),
              size: normalizeOptionList(body?.data?.size),
            }))
            .catch(() => EMPTY_ITEM_OPTIONS)
            .then((options) => {
              transactionItemOptionsCache = options
              return options
            })
            .finally(() => {
              transactionItemOptionsPromise = null
            })
        }

        const options = await transactionItemOptionsPromise

        if (!active) return

        setFieldOptions(options)
      } catch {
        if (active) {
          setFieldOptions(EMPTY_ITEM_OPTIONS)
        }
      }
    }

    loadFieldOptions()

    return () => {
      active = false
    }
  }, [])

  function setValue(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function calculate() {
    setCalculating(true)
    setError('')
    try {
      const next = calculateDraft(form)
      setForm((current) => ({ ...current, ...next }))
    } catch {
      setError('Unable to calculate item totals.')
    } finally {
      setCalculating(false)
    }
  }

  async function save() {
    setSaving(true)
    setError('')
    try {
      const response = await authFetch(item?.id ? `/transactions/${transaction.id}/items/${item.id}` : `/transactions/${transaction.id}/items`, {
        method: item?.id ? 'PUT' : 'POST',
        body: JSON.stringify({ item: normalizePayload(form) }),
      })
      const body = await response.json()
      if (!response.ok) {
        const firstValidationMessage = body?.errors ? Object.values(body.errors)?.[0]?.[0] : null
        setError(firstValidationMessage ?? body?.message ?? 'Unable to save item.')
        return
      }
      onSaved(body?.data, item?.id ? 'Item updated.' : 'Item created.')
    } catch {
      setError('Unable to save item.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="txe-item-editor-overlay" role="dialog" aria-modal="true" aria-label={item ? 'Edit item' : 'Add item'}>
      <div className="txe-item-editor-modal">
        <div className="txe-items-topbar">
          <div>
            <div className="txe-items-title">{item ? 'Edit Transaction Item' : 'Add Transaction Item'}</div>
            <div className="txe-items-breadcrumb">Transaction &gt; All Transaction &gt; Items Detail &gt; Add/Edit</div>
          </div>
          <div className="txe-items-status">Booking <strong>{transaction.booking_no || '-'}</strong></div>
        </div>
        <div className="txe-item-editor-body">
          <div className="txe-item-editor-summary">
            <InfoField label="TransactionID" value={transaction.booking_no} />
            <InfoField label="Vendor" value={transaction.general_info_packer?.vendor} />
            <InfoField label="Customer" value={transaction.general_info_customer?.customer} />
          </div>

          {error ? <p className="message error">{error}</p> : null}

          <div className="txe-item-editor-grid">
            <div className="txe-item-editor-col">
              <EditorField label="Product"><SearchableSelect value={form.product} list={fieldOptions.product} onChange={(value) => setValue('product', value)} /></EditorField>
              <EditorField label="Style"><SearchableSelect value={form.style} list={fieldOptions.style} onChange={(value) => setValue('style', value)} /></EditorField>
              <EditorField label="Packing"><SearchableSelect value={form.packing} list={fieldOptions.packing} onChange={(value) => setValue('packing', value)} /></EditorField>
              <EditorField label="Media"><input value={form.media} onChange={(event) => setValue('media', event.target.value)} /></EditorField>
              <EditorField label="Notes"><textarea rows="4" value={form.notes} onChange={(event) => setValue('notes', event.target.value)} /></EditorField>
              <EditorField label="Size"><div className="txe-item-inline txe-item-inline-size"><SearchableSelect value={form.size} list={fieldOptions.size} onChange={(value) => setValue('size', value)} /><input value={form.glaze_percentage} onChange={(event) => setValue('glaze_percentage', event.target.value)} placeholder="% glaze" /></div></EditorField>
              <EditorField label="Total Weight"><WeightRow value={form.total_weight_value} unit={form.total_weight_unit_slug} onValue={(value) => setValue('total_weight_value', value)} onUnit={(value) => setValue('total_weight_unit_slug', value)} /></EditorField>
              <EditorField label="Qty"><QtyRow value={form.qty_value} unit={form.qty_unit} booking={form.qty_booking} onValue={(value) => setValue('qty_value', value)} onUnit={(value) => setValue('qty_unit', value)} onBooking={(value) => setValue('qty_booking', value)} /></EditorField>
              <EditorField label="Selling Unit Price"><PriceRow value={form.selling_unit_price} currency={form.selling_currency} unit={form.selling_unit_slug} hint={form.selling_unit_category} onValue={(value) => setValue('selling_unit_price', value)} onCurrency={(value) => setValue('selling_currency', value)} onUnit={(value) => setValue('selling_unit_slug', value)} onHint={(value) => setValue('selling_unit_category', value)} beforeText="Before Tariff" /></EditorField>
              <EditorField label="Lqd-Price"><PriceRow value={form.lqd_price} currency={form.lqd_currency} unit={form.lqd_unit_slug} hint={form.lqd_unit_category} onValue={(value) => setValue('lqd_price', value)} onCurrency={(value) => setValue('lqd_currency', value)} onUnit={(value) => setValue('lqd_unit_slug', value)} onHint={(value) => setValue('lqd_unit_category', value)} /></EditorField>
              <EditorField label={<><strong>Buying</strong> Unit Price</>}><PriceRow value={form.buying_unit_price} currency={form.buying_currency} unit={form.buying_unit_slug} hint={form.buying_unit_category} onValue={(value) => setValue('buying_unit_price', value)} onCurrency={(value) => setValue('buying_currency', value)} onUnit={(value) => setValue('buying_unit_slug', value)} onHint={(value) => setValue('buying_unit_category', value)} /></EditorField>
              <EditorField label="Total CTN Correction"><input value={form.total_ctn_correction} onChange={(event) => setValue('total_ctn_correction', event.target.value)} /></EditorField>
            </div>

            <div className="txe-item-editor-col">
              <EditorField label="Brand"><SearchableSelect value={form.brand} list={fieldOptions.brand} onChange={(value) => setValue('brand', value)} /></EditorField>
              <EditorField label="Packaging"><input value={form.secondary_packaging} onChange={(event) => setValue('secondary_packaging', event.target.value)} /></EditorField>
              <EditorField label="Customer/Lot No. / Item Code"><input value={form.customer_lot_item_code} onChange={(event) => setValue('customer_lot_item_code', event.target.value)} /></EditorField>
              <section className="txe-item-calc-panel" aria-label="Calculation controls">
                <div className="txe-item-calc-panel-header">Calculate</div>
                <button type="button" className="txe-items-calc-btn" onClick={calculate} disabled={calculating}>{calculating ? 'Calculating...' : 'Calculate'}</button>
              </section>
              <EditorField label="Lqd-Qty"><input readOnly value={form.lqd_qty} /></EditorField>
              <EditorField label="Selling Total"><div className="txe-item-inline"><input readOnly value={form.selling_total} /><input value={form.selling_correction} onChange={(event) => setValue('selling_correction', event.target.value)} placeholder="Correction" /></div></EditorField>
              <EditorField label="Lqd-Total"><input readOnly value={form.lqd_total} /></EditorField>
              <EditorField label={<><strong>Buying</strong> Total</>}><div className="txe-item-inline"><input readOnly value={form.buying_total} /><input value={form.buying_correction} onChange={(event) => setValue('buying_correction', event.target.value)} placeholder="Correction" /></div></EditorField>
              <EditorField label="Rebate Rate (Packer)"><RebateRow value={form.rebate_rate_packer} currency={form.rebate_rate_packer_currency} unit={form.rebate_rate_packer_unit_slug} total={form.rebate_rate_packer_total} onValue={(value) => setValue('rebate_rate_packer', value)} onCurrency={(value) => setValue('rebate_rate_packer_currency', value)} onUnit={(value) => setValue('rebate_rate_packer_unit_slug', value)} onTotal={(value) => setValue('rebate_rate_packer_total', value)} /></EditorField>
              <EditorField label="Rebate Rate (Customer)"><RebateRow value={form.rebate_rate_customer} currency={form.rebate_rate_customer_currency} unit={form.rebate_rate_customer_unit_slug} total={form.rebate_rate_customer_total} onValue={(value) => setValue('rebate_rate_customer', value)} onCurrency={(value) => setValue('rebate_rate_customer_currency', value)} onUnit={(value) => setValue('rebate_rate_customer_unit_slug', value)} onTotal={(value) => setValue('rebate_rate_customer_total', value)} /></EditorField>
              <EditorField label="Total NW Correction"><input value={form.total_nw_correction} onChange={(event) => setValue('total_nw_correction', event.target.value)} /></EditorField>
            </div>
          </div>

          <section className="txe-item-commission-panel" aria-label="Commission summary">
            <div className="txe-item-commission-bar" />
            <div className="txe-item-commission-grid">
              <div className="txe-item-commission-col">
                <label className="txe-item-commission-row">
                  <span>Comm. from Packer</span>
                  <MeasureRow value={form.commission_from_packer} unit={form.commission_from_packer_unit_slug} onValue={(value) => setValue('commission_from_packer', value)} onUnit={(value) => setValue('commission_from_packer_unit_slug', value)} />
                </label>
                <label className="txe-item-commission-row">
                  <span>Comm. from Customer </span>
                  <MeasureRow value={form.commission_from_customer} unit={form.commission_from_customer_unit_slug} onValue={(value) => setValue('commission_from_customer', value)} onUnit={(value) => setValue('commission_from_customer_unit_slug', value)} />
                </label>
              </div>
              <div className="txe-item-commission-col txe-item-commission-col-totals">
                <label className="txe-item-commission-row">
                  <span>Total Packer Com.</span>
                  <input readOnly value={form.total_packer_commission} />
                </label>
                <label className="txe-item-commission-row">
                  <span>Total Customer Com.</span>
                  <input readOnly value={form.total_customer_commission} />
                </label>
              </div>
            </div>
          </section>

          <div className="txe-item-editor-actions">
            <div className="txe-item-editor-actions-left">
              <button type="button" className="txe-items-primary-btn" onClick={save} disabled={saving || calculating}>{saving ? 'Saving...' : 'Save'}</button>
              <button type="button" className="txe-items-secondary-btn" onClick={onClose} disabled={saving}>Cancel</button>
            </div>
            <div className="txe-items-nav">
              <button type="button" onClick={onClose}>Back trans.</button>
              <button type="button" disabled>Next Trans.</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoField({ label, value }) {
  return <label><span>{label}</span><input readOnly value={value || ''} /></label>
}

function EditorField({ label, children }) {
  return <label className="txe-item-field-row"><span>{label}</span><div>{children}</div></label>
}

function MeasureRow({ value, unit, onValue, onUnit }) {
  return (
    <div className="txe-item-inline txe-item-inline-wide">
      <input value={value} onChange={(event) => onValue(event.target.value)} />
      <select value={unit} onChange={(event) => onUnit(event.target.value)}>
        <option value="">Select</option>
        {WEIGHT_UNITS.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  )
}

function QtyRow({ value, unit, booking, onValue, onUnit, onBooking }) {
  return (
    <div className="txe-item-inline txe-item-inline-qty">
      <input value={value} onChange={(event) => onValue(event.target.value)} />
      <select value={unit} onChange={(event) => onUnit(event.target.value)}>
        {COUNT_UNITS.map((option) => <option key={option}>{option}</option>)}
      </select>
      <span className="txe-inline-caption">Qty Booking</span>
      <input value={booking} onChange={(event) => onBooking(event.target.value)} />
    </div>
  )
}

function WeightRow({ value, unit, onValue, onUnit }) {
  return (
    <div className="txe-item-inline txe-item-inline-weight">
      <input value={value} onChange={(event) => onValue(event.target.value)} />
      <select value={unit} onChange={(event) => onUnit(event.target.value)}>
        <option value=""></option>
        {WEIGHT_UNITS.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  )
}

function PriceRow({ value, currency, unit, hint, onValue, onCurrency, onUnit, onHint, beforeText = '' }) {
  return (
    <div className="txe-item-inline txe-item-inline-price">
      <input value={value} onChange={(event) => onValue(event.target.value)} />
      <select value={currency} onChange={(event) => onCurrency(event.target.value)}>
        {CURRENCIES.map((option) => <option key={option} value={option}>{currencyLabel(option)}</option>)}
      </select>
      <span className="txe-inline-divider">/</span>
      <select value={unit} onChange={(event) => onUnit(event.target.value)}>
        <option value=""></option>
        {WEIGHT_UNITS.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
      <select className="txe-item-select-compact" value={hint} onChange={(event) => onHint(event.target.value)}>
        <option value="">Select</option>
        {RATE_HINTS.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
      {beforeText ? <span className="txe-inline-caption">{beforeText}</span> : null}
    </div>
  )
}

function RebateRow({ value, currency, unit, total, onValue, onCurrency, onUnit, onTotal }) {
  return (
    <div className="txe-item-inline txe-item-inline-rebate">
      <input value={value} onChange={(event) => onValue(event.target.value)} />
      <select value={currency} onChange={(event) => onCurrency(event.target.value)}>
        {CURRENCIES.map((option) => <option key={option} value={option}>{currencyLabel(option)}</option>)}
      </select>
      <span className="txe-inline-divider">/</span>
      <select value={unit} onChange={(event) => onUnit(event.target.value)}>
        <option value=""></option>
        {WEIGHT_UNITS.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
      <span className="txe-inline-caption">Total</span>
      <input value={total} onChange={(event) => onTotal(event.target.value)} />
    </div>
  )
}

function SearchableSelect({ value, list, onChange }) {
  const rootRef = useRef(null)
  const [isOpen, setIsOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  const options = normalizeOptionList(list)
  const normalizedSearch = searchText.trim().toLowerCase()
  const filteredOptions = normalizedSearch
    ? options.filter((option) => option.toLowerCase().includes(normalizedSearch))
    : options

  useEffect(() => {
    if (!isOpen) {
      setSearchText('')
    }
  }, [isOpen])

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
        onClick={() => setIsOpen(true)}
        onChange={(event) => {
          setSearchText(event.target.value)
          onChange(event.target.value)
          setIsOpen(true)
        }}
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
                  setSearchText('')
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

function MiniAction({ children, onClick, tone = '', busy = false }) {
  return <button type="button" className={`txe-items-icon-btn${tone ? ` ${tone}` : ''}`} onClick={onClick} disabled={busy}>{busy ? '…' : children}</button>
}

function buildForm(transaction, item) {
  return {
    product: item?.product ?? transaction.category ?? '',
    style: item?.style ?? '',
    packing: item?.packing ?? transaction.container_secondary ?? '',
    media: item?.media ?? '',
    notes: item?.notes ?? '',
    brand: item?.brand ?? transaction.general_info_packer?.vendor ?? '',
    secondary_packaging: item?.secondary_packaging ?? '',
    customer_lot_item_code: item?.item_code ?? item?.customer_lot_no ?? '',
    size: item?.size ?? transaction.container_primary ?? '',
    glaze_percentage: stringify(item?.glaze_percentage),
    total_weight_value: stringify(item?.total_weight_value),
    total_weight_unit_category: item?.total_weight_unit_category ?? '',
    total_weight_unit_slug: item?.total_weight_unit_slug ?? '',
    qty_value: stringify(item?.qty_value),
    qty_unit: item?.qty_unit ?? COUNT_UNITS[0],
    qty_booking: stringify(item?.qty_booking),
    selling_unit_price: stringify(item?.selling_unit_price),
    selling_currency: item?.selling_currency ?? 'USD',
    selling_unit_category: item?.selling_unit_category ?? '',
    selling_unit_slug: item?.selling_unit_slug ?? '',
    selling_total: stringify(item?.selling_total),
    selling_correction: stringify(item?.selling_correction),
    lqd_qty: stringify(item?.lqd_qty),
    lqd_price: stringify(item?.lqd_price),
    lqd_currency: item?.lqd_currency ?? 'USD',
    lqd_unit_category: item?.lqd_unit_category ?? '',
    lqd_unit_slug: item?.lqd_unit_slug ?? '',
    lqd_total: stringify(item?.lqd_total),
    buying_unit_price: stringify(item?.buying_unit_price),
    buying_currency: item?.buying_currency ?? 'USD',
    buying_unit_category: item?.buying_unit_category ?? '',
    buying_unit_slug: item?.buying_unit_slug ?? '',
    buying_total: stringify(item?.buying_total),
    buying_correction: stringify(item?.buying_correction),
    rebate_rate_packer: stringify(item?.rebate_rate_packer),
    rebate_rate_packer_currency: item?.rebate_rate_packer_currency ?? 'USD',
    rebate_rate_packer_unit_category: item?.rebate_rate_packer_unit_category ?? '',
    rebate_rate_packer_unit_slug: item?.rebate_rate_packer_unit_slug ?? '',
    rebate_rate_packer_total: item?.rebate_rate_packer_total === null || item?.rebate_rate_packer_total === undefined ? '0.0000' : stringify(item?.rebate_rate_packer_total),
    rebate_rate_customer: stringify(item?.rebate_rate_customer),
    rebate_rate_customer_currency: item?.rebate_rate_customer_currency ?? 'USD',
    rebate_rate_customer_unit_category: item?.rebate_rate_customer_unit_category ?? '',
    rebate_rate_customer_unit_slug: item?.rebate_rate_customer_unit_slug ?? '',
    rebate_rate_customer_total: item?.rebate_rate_customer_total === null || item?.rebate_rate_customer_total === undefined ? '0.0000' : stringify(item?.rebate_rate_customer_total),
    commission_from_packer: stringify(item?.commission_from_packer),
    commission_from_packer_unit_category: item?.commission_from_packer_unit_category ?? '',
    commission_from_packer_unit_slug: item?.commission_from_packer_unit_slug ?? '',
    total_packer_commission: stringify(item?.total_packer_commission),
    commission_from_customer: stringify(item?.commission_from_customer),
    commission_from_customer_unit_category: item?.commission_from_customer_unit_category ?? '',
    commission_from_customer_unit_slug: item?.commission_from_customer_unit_slug ?? '',
    total_customer_commission: stringify(item?.total_customer_commission),
    total_ctn_correction: stringify(item?.total_ctn_correction),
    total_nw_correction: stringify(item?.total_nw_correction),
    sort_order: item?.sort_order ?? (transaction.items?.length ?? 0),
  }
}

function calculateDraft(form) {
  const baseQuantity = resolveBaseQuantity(form)
  const quantity = resolveQuantity(form)
  const packingMultiplier = extractPackingMultiplier(form.packing)
  const sellingBase = packingMultiplier * quantity
  const commissionBase = packingMultiplier * quantity
  const packerCommissionRate = normalizeNumber(form.commission_from_packer) ?? 0
  const customerCommissionRate = normalizeNumber(form.commission_from_customer) ?? 0

  return {
    lqd_qty: fixed(baseQuantity),
    selling_total: fixed(sellingBase * toNumber(form.selling_unit_price) + toNumber(form.selling_correction)),
    lqd_total: fixed(baseQuantity * toNumber(form.lqd_price)),
    buying_total: fixed(baseQuantity * toNumber(form.buying_unit_price) + toNumber(form.buying_correction)),
    rebate_rate_packer_total: fixed4(commissionBase * toNumber(form.rebate_rate_packer)),
    rebate_rate_customer_total: fixed4(commissionBase * toNumber(form.rebate_rate_customer)),
    total_packer_commission: fixed(packerCommissionRate === 0 ? 0 : commissionBase * packerCommissionRate),
    total_customer_commission: fixed(customerCommissionRate === 0 ? 0 : commissionBase * customerCommissionRate),
  }
}

function normalizePayload(form) {
  const sharedItemCode = normalizeText(form.customer_lot_item_code)

  return Object.fromEntries(Object.entries(form).flatMap(([key, value]) => {
    if (key === 'customer_lot_item_code') {
      return [
        ['item_code', sharedItemCode],
        ['customer_lot_no', sharedItemCode],
      ]
    }

    if (key.endsWith('_category') || key.endsWith('_slug') || key.endsWith('_currency') || ['product', 'style', 'packing', 'media', 'notes', 'brand', 'secondary_packaging', 'size', 'qty_unit'].includes(key)) {
      return [[key, normalizeText(value)]]
    }
    if (key === 'sort_order') return [[key, Number.isFinite(Number(value)) ? Number(value) : 0]]
    return [[key, normalizeNumber(value)]]
  }))
}

function resolveBaseQuantity(form) {
  return firstDefinedNumber(form.total_weight_value, form.qty_booking, form.qty_value)
}

function resolveQuantity(form) {
  return firstDefinedNumber(form.qty_value, form.qty_booking)
}

function firstDefinedNumber(...values) {
  for (const value of values) {
    const normalized = normalizeNumber(value)
    if (normalized !== null) {
      return normalized
    }
  }

  return 0
}

function extractPackingMultiplier(value) {
  const text = normalizeText(value)
  if (text === null) return 0

  const factors = text
    .match(/-?\d+(?:\.\d+)?/g)
    ?.map((part) => Number(part))
    .filter((part) => Number.isFinite(part) && part > 0) ?? []

  if (factors.length === 0) return 0

  return factors.reduce((product, factor) => product * factor, 1)
}

function displayDate(value) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-GB')
}

function normalizeText(value) {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  return text === '' ? null : text
}

function normalizeNumber(value) {
  const text = normalizeText(value)
  if (text === null) return null
  const number = Number(text)
  return Number.isFinite(number) ? number : null
}

function toNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function stringify(value) {
  return value === null || value === undefined ? '' : String(value)
}

function normalizeOptionList(options) {
  return [...new Set(
    (Array.isArray(options) ? options : [])
      .map((option) => (typeof option === 'string' ? option.trim() : ''))
      .filter(Boolean),
  )]
}

function formatMoney(value) {
  return toNumber(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDecimal(value) {
  return toNumber(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatQty(value, unit) {
  const numericValue = toNumber(value)
  return numericValue ? `${numericValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}${unit ? ` ${unit}` : ''}` : (unit || '-')
}

function fixed(value) {
  return toNumber(value).toFixed(5)
}

function fixed4(value) {
  return toNumber(value).toFixed(4)
}

function currencyLabel(value) {
  return value === 'USD' ? 'US ($)' : value
}

export default TransactionItemsModal
