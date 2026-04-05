import { useEffect, useMemo, useState } from 'react'

const CURRENCIES = ['USD', 'INR', 'SGD', 'EUR']
const COUNT_UNITS = ['CTN(S)', 'PCS', 'BAG(S)', 'PALLET(S)']

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
              <InfoField label="Status" value={transaction.transaction_status ?? 'I'} />
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
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [calculating, setCalculating] = useState(false)

  function setValue(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function calculate() {
    setCalculating(true)
    setError('')
    try {
      const next = await calculateDraft(form, authFetch)
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
            <EditorField label="Product"><input value={form.product} onChange={(event) => setValue('product', event.target.value)} /></EditorField>
            <EditorField label="Brand"><input value={form.brand} onChange={(event) => setValue('brand', event.target.value)} /></EditorField>
            <EditorField label="Style"><input value={form.style} onChange={(event) => setValue('style', event.target.value)} /></EditorField>
            <EditorField label="Packaging"><input value={form.secondary_packaging} onChange={(event) => setValue('secondary_packaging', event.target.value)} /></EditorField>
            <EditorField label="Packing"><input value={form.packing} onChange={(event) => setValue('packing', event.target.value)} /></EditorField>
            <EditorField label="Item Code"><input value={form.item_code} onChange={(event) => setValue('item_code', event.target.value)} /></EditorField>
            <EditorField label="Media"><input value={form.media} onChange={(event) => setValue('media', event.target.value)} /></EditorField>
            <EditorField label="Customer/Lot No."><input value={form.customer_lot_no} onChange={(event) => setValue('customer_lot_no', event.target.value)} /></EditorField>
            <EditorField label="Notes"><textarea rows="4" value={form.notes} onChange={(event) => setValue('notes', event.target.value)} /></EditorField>
            <EditorField label="Size"><div className="txe-item-inline"><input value={form.size} onChange={(event) => setValue('size', event.target.value)} /><input value={form.glaze_percentage} onChange={(event) => setValue('glaze_percentage', event.target.value)} placeholder="% glaze" /></div></EditorField>
            <EditorField label="Total Weight"><MeasureRow value={form.total_weight_value} unit={form.total_weight_unit_slug} onValue={(value) => setValue('total_weight_value', value)} onUnit={(value) => setValue('total_weight_unit_slug', value)} /></EditorField>
            <EditorField label="Qty"><div className="txe-item-inline txe-item-inline-wide"><input value={form.qty_value} onChange={(event) => setValue('qty_value', event.target.value)} /><select value={form.qty_unit} onChange={(event) => setValue('qty_unit', event.target.value)}>{COUNT_UNITS.map((option) => <option key={option}>{option}</option>)}</select><input value={form.qty_booking} onChange={(event) => setValue('qty_booking', event.target.value)} placeholder="Qty Booking" /></div></EditorField>
            <EditorField label="Selling Unit Price"><PriceRow value={form.selling_unit_price} currency={form.selling_currency} unit={form.selling_unit_slug} onValue={(value) => setValue('selling_unit_price', value)} onCurrency={(value) => setValue('selling_currency', value)} onUnit={(value) => setValue('selling_unit_slug', value)} /></EditorField>
            <EditorField label="Calculate"><button type="button" className="txe-items-calc-btn" onClick={calculate} disabled={calculating}>{calculating ? 'Calculating...' : 'Calculate'}</button></EditorField>
            <EditorField label="Lqd-Price"><PriceRow value={form.lqd_price} currency={form.lqd_currency} unit={form.lqd_unit_slug} onValue={(value) => setValue('lqd_price', value)} onCurrency={(value) => setValue('lqd_currency', value)} onUnit={(value) => setValue('lqd_unit_slug', value)} /></EditorField>
            <EditorField label="Lqd-Qty"><input readOnly value={form.lqd_qty} /></EditorField>
            <EditorField label="Buying Unit Price"><PriceRow value={form.buying_unit_price} currency={form.buying_currency} unit={form.buying_unit_slug} onValue={(value) => setValue('buying_unit_price', value)} onCurrency={(value) => setValue('buying_currency', value)} onUnit={(value) => setValue('buying_unit_slug', value)} /></EditorField>
            <EditorField label="Selling Total"><div className="txe-item-inline"><input readOnly value={form.selling_total} /><input value={form.selling_correction} onChange={(event) => setValue('selling_correction', event.target.value)} placeholder="Correction" /></div></EditorField>
            <EditorField label="Comm. from Packer"><MeasureRow value={form.commission_from_packer} unit={form.commission_from_packer_unit_slug} onValue={(value) => setValue('commission_from_packer', value)} onUnit={(value) => setValue('commission_from_packer_unit_slug', value)} /></EditorField>
            <EditorField label="Lqd-Total"><input readOnly value={form.lqd_total} /></EditorField>
            <EditorField label="Comm. from Customer"><MeasureRow value={form.commission_from_customer} unit={form.commission_from_customer_unit_slug} onValue={(value) => setValue('commission_from_customer', value)} onUnit={(value) => setValue('commission_from_customer_unit_slug', value)} /></EditorField>
            <EditorField label="Buying Total"><div className="txe-item-inline"><input readOnly value={form.buying_total} /><input value={form.buying_correction} onChange={(event) => setValue('buying_correction', event.target.value)} placeholder="Correction" /></div></EditorField>
            <EditorField label="Total Packer Com."><input readOnly value={form.total_packer_commission} /></EditorField>
            <EditorField label="Total CTN Correction"><input value={form.total_ctn_correction} onChange={(event) => setValue('total_ctn_correction', event.target.value)} /></EditorField>
            <EditorField label="Total Customer Com."><input readOnly value={form.total_customer_commission} /></EditorField>
            <EditorField label="Total NW Correction"><input value={form.total_nw_correction} onChange={(event) => setValue('total_nw_correction', event.target.value)} /></EditorField>
          </div>

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
  return <div className="txe-item-inline txe-item-inline-wide"><input value={value} onChange={(event) => onValue(event.target.value)} /><input value={unit} onChange={(event) => onUnit(event.target.value)} placeholder="Unit" /></div>
}

function PriceRow({ value, currency, unit, onValue, onCurrency, onUnit }) {
  return <div className="txe-item-inline txe-item-inline-wide"><input value={value} onChange={(event) => onValue(event.target.value)} /><select value={currency} onChange={(event) => onCurrency(event.target.value)}>{CURRENCIES.map((option) => <option key={option}>{option}</option>)}</select><input value={unit} onChange={(event) => onUnit(event.target.value)} placeholder="Unit" /></div>
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
    item_code: item?.item_code ?? '',
    customer_lot_no: item?.customer_lot_no ?? '',
    size: item?.size ?? transaction.container_primary ?? '',
    glaze_percentage: stringify(item?.glaze_percentage),
    total_weight_value: stringify(item?.total_weight_value),
    total_weight_unit_category: '',
    total_weight_unit_slug: item?.total_weight_unit_slug ?? '',
    qty_value: stringify(item?.qty_value),
    qty_unit: item?.qty_unit ?? COUNT_UNITS[0],
    qty_booking: stringify(item?.qty_booking),
    selling_unit_price: stringify(item?.selling_unit_price),
    selling_currency: item?.selling_currency ?? 'USD',
    selling_unit_category: '',
    selling_unit_slug: item?.selling_unit_slug ?? '',
    selling_total: stringify(item?.selling_total),
    selling_correction: stringify(item?.selling_correction),
    lqd_qty: stringify(item?.lqd_qty),
    lqd_price: stringify(item?.lqd_price),
    lqd_currency: item?.lqd_currency ?? 'USD',
    lqd_unit_category: '',
    lqd_unit_slug: item?.lqd_unit_slug ?? '',
    lqd_total: stringify(item?.lqd_total),
    buying_unit_price: stringify(item?.buying_unit_price),
    buying_currency: item?.buying_currency ?? 'USD',
    buying_unit_category: '',
    buying_unit_slug: item?.buying_unit_slug ?? '',
    buying_total: stringify(item?.buying_total),
    buying_correction: stringify(item?.buying_correction),
    commission_from_packer: stringify(item?.commission_from_packer),
    commission_from_packer_unit_category: '',
    commission_from_packer_unit_slug: item?.commission_from_packer_unit_slug ?? '',
    total_packer_commission: stringify(item?.total_packer_commission),
    commission_from_customer: stringify(item?.commission_from_customer),
    commission_from_customer_unit_category: '',
    commission_from_customer_unit_slug: item?.commission_from_customer_unit_slug ?? '',
    total_customer_commission: stringify(item?.total_customer_commission),
    total_ctn_correction: stringify(item?.total_ctn_correction),
    total_nw_correction: stringify(item?.total_nw_correction),
    sort_order: item?.sort_order ?? (transaction.items?.length ?? 0),
  }
}

async function calculateDraft(form, authFetch) {
  const baseQuantity = toNumber(form.total_weight_value || form.qty_booking)
  const commissionBase = toNumber(form.total_weight_value)

  return {
    lqd_qty: fixed(baseQuantity),
    selling_total: fixed(baseQuantity * toNumber(form.selling_unit_price) + toNumber(form.selling_correction)),
    lqd_total: fixed(baseQuantity * toNumber(form.lqd_price)),
    buying_total: fixed(baseQuantity * toNumber(form.buying_unit_price) + toNumber(form.buying_correction)),
    total_packer_commission: fixed(commissionBase * toNumber(form.commission_from_packer)),
    total_customer_commission: fixed(commissionBase * toNumber(form.commission_from_customer)),
  }
}

function normalizePayload(form) {
  return Object.fromEntries(Object.entries(form).map(([key, value]) => {
    if (key.endsWith('_category')) {
      return [key, null]
    }
    if (key.endsWith('_slug') || key.endsWith('_currency') || ['product', 'style', 'packing', 'media', 'notes', 'brand', 'secondary_packaging', 'item_code', 'customer_lot_no', 'size', 'qty_unit'].includes(key)) {
      return [key, normalizeText(value)]
    }
    if (key === 'sort_order') return [key, Number.isFinite(Number(value)) ? Number(value) : 0]
    return [key, normalizeNumber(value)]
  }))
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

export default TransactionItemsModal
