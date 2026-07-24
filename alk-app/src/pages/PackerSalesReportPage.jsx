import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DateFilterInput from '../components/common/DateFilterInput'
import PaginationBar from '../components/common/PaginationBar'
import AdminSidebarLayout from '../components/layout/AdminSidebarLayout'
import { useAuth } from '../context/AuthContext'
import { fetchSalesPersonOptions } from '../utils/userOptions'

const PAGE_SIZE = 50
const EXPORT_PAGE_SIZE = 1000
const ALLOWED_ROLES = ['admin', 'accounts']

const statusOptions = [
  { value: 'I', label: 'Invoice' },
  { value: 'P', label: 'Unpaid' },
  { value: 'D', label: 'Paid' },
  { value: 'S', label: 'Shipped' },
  { value: 'R', label: 'Received' },
  { value: 'U', label: 'Unshipped' },
  { value: 'T', label: 'Tally' },
  { value: 'C', label: 'Cancelled' },
]

function buildCsvColumns(showQcInspectionColumn = false, qcInspectionColumnLabel = 'QC Data') {
  return [
    ...(showQcInspectionColumn ? [{ label: qcInspectionColumnLabel, value: (row) => displayDate(row.qcInspectionDate) }] : []),
    { label: 'Code', value: (row) => row.bookingNo },
    { label: 'Date', value: (row) => displayDate(row.issueDate) },
    { label: 'Packer', value: (row) => row.packer },
    { label: 'Customer', value: (row) => row.customer },
    { label: 'Product', value: (row) => row.product },
    { label: 'Style', value: (row) => row.style },
    { label: 'Packing', value: (row) => row.packing },
    { label: 'Size', value: (row) => row.size },
    { label: 'Qty', value: (row) => formatQty(row.qty, row.qtyUnit) },
    { label: 'Total Weight', value: (row) => formatNumber(row.totalWeight) },
    { label: 'Buying Total', value: (row) => formatMoney(row.buyingTotal) },
    { label: 'Packer Commission', value: (row) => formatMoney(row.packerCommission) },
    { label: 'Buyer Commission', value: (row) => formatMoney(row.buyerCommission) },
    { label: 'ETA Date', value: (row) => (row.isFirstCodeRow ? displayDate(row.etaDate) : '') },
    { label: 'ETD Date', value: (row) => (row.isFirstCodeRow ? displayDate(row.etdDate) : '') },
    { label: 'LSD Date', value: (row) => (row.isFirstCodeRow ? displayDate(row.lsdDate) : '') },
    { label: 'Total Commission', value: (row) => (row.isFirstCodeRow ? formatMoney(row.totalCommission) : '') },
    { label: 'Status', value: (row) => (row.isFirstCodeRow ? getStatusLabel(row.status) : '') },
  ]
}

function PackerSalesReportPage({
  title = 'Sales Revenue Report',
  heading = 'Reports > Sales Revenue',
  forcedStatus = '',
  showSummaryCards = true,
  showStatusFilter = true,
  loadingText = 'Loading packer sales, please wait...',
  emptyText = 'No packer sales found.',
  exportFilePrefix = 'packer-sales',
  errorLabel = 'packer sales',
  filterByQcInspectionDate = false,
  showQcInspectionColumn = false,
  qcInspectionColumnLabel = 'QC Data',
} = {}) {
  const navigate = useNavigate()
  const { currentUser, authFetch, logout } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [selectedReportRow, setSelectedReportRow] = useState(null)
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, per_page: PAGE_SIZE, total: 0 })
  const [summary, setSummary] = useState(null)
  const [salesPeople, setSalesPeople] = useState([])
  const [searchFilters, setSearchFilters] = useState({
    bookingNo: '',
    vendor: '',
    customer: '',
    salesPersonId: '',
    status: '',
    fromDate: '',
    toDate: '',
  })

  useEffect(() => {
    if (!currentUser || !ALLOWED_ROLES.includes(currentUser.role)) return
    loadSalesPeople()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser])

  useEffect(() => {
    if (!currentUser || !ALLOWED_ROLES.includes(currentUser.role)) return

    for (const key of ['bookingNo', 'vendor', 'customer']) {
      const value = (searchFilters[key] ?? '').trim()
      if (value !== '' && value.length < 4) return
    }

    loadTransactions(searchFilters, page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchFilters, page, currentUser?.role])

  async function loadTransactions(filters = searchFilters, targetPage = page) {
    setLoading(true)
    setError('')

    try {
      const params = buildTransactionParams(filters, targetPage, PAGE_SIZE, forcedStatus, filterByQcInspectionDate)
      const response = await authFetch(`/transactions?${params.toString()}`)
      const payload = await response.json()

      if (!response.ok) {
        setError(payload?.message ?? `Unable to load ${errorLabel}.`)
        return
      }

      setTransactions(payload?.data ?? [])
      setPagination(payload?.pagination ?? { current_page: 1, last_page: 1, per_page: PAGE_SIZE, total: 0 })
      setSummary(payload?.summary ?? null)
      setPage(targetPage)
    } catch {
      setError(`Unable to load ${errorLabel}.`)
    } finally {
      setLoading(false)
    }
  }

  async function loadSalesPeople() {
    try {
      setSalesPeople(await fetchSalesPersonOptions(authFetch, currentUser))
    } catch {
      setSalesPeople([])
    }
  }

  function handleFilterChange(key, value) {
    setSearchFilters((previous) => ({ ...previous, [key]: value }))
    setPage(1)
  }

  function clearFilters() {
    setSearchFilters({ bookingNo: '', vendor: '', customer: '', salesPersonId: '', status: '', fromDate: '', toDate: '' })
    setPage(1)
  }

  async function exportCsv() {
    if (totalRecords === 0 || exporting) return

    setExporting(true)
    setError('')

    try {
      let rowsToExport = []
      let targetPage = 1
      let lastExportPage = 1

      do {
        const params = buildTransactionParams(searchFilters, targetPage, EXPORT_PAGE_SIZE, forcedStatus, filterByQcInspectionDate)
        const response = await authFetch(`/transactions?${params.toString()}`)
        const payload = await response.json()

        if (!response.ok) {
          setError(payload?.message ?? `Unable to export ${errorLabel}.`)
          return
        }

        rowsToExport = [...rowsToExport, ...flattenPackerSalesRows(payload?.data ?? [])]
        lastExportPage = payload?.pagination?.last_page ?? 1
        targetPage += 1
      } while (targetPage <= lastExportPage)

      if (rowsToExport.length === 0) return

      downloadCsv(rowsToExport)
    } catch {
      setError(`Unable to export ${errorLabel}.`)
    } finally {
      setExporting(false)
    }
  }

  function downloadCsv(rowsToExport) {
    const csvColumns = buildCsvColumns(showQcInspectionColumn, qcInspectionColumnLabel)
    const rows = [
      csvColumns.map((column) => column.label),
      ...rowsToExport.map((row) => csvColumns.map((column) => column.value(row) ?? '-')),
    ]
    const csv = rows.map((row) => row.map(formatCsvCell).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${exportFilePrefix}-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  async function onLogout() {
    await logout()
    navigate('/', { replace: true })
  }

  if (!currentUser || !ALLOWED_ROLES.includes(currentUser.role)) return null

  const rows = buildPackerSalesSummaryRows(transactions)
  const totalRecords = pagination.total ?? 0
  const currentPage = pagination.current_page ?? page
  const lastPage = Math.max(1, pagination.last_page ?? 1)
  const summaryCards = showSummaryCards ? buildSummaryCards(rows, totalRecords, summary) : []

  return (
    <AdminSidebarLayout currentUser={currentUser} title={title} activeKey="reports" onLogout={onLogout} authFetch={authFetch}>
      <div className="transactions-page packer-sales-page">
        <div className="transactions-toolbar packer-sales-toolbar">
          <div>
            <h5>{heading}</h5>
            <div className="search-filters date-search-filters">
              <div className="filter-group">
                <label htmlFor="packer-sales-code-filter">Transaction Id / Code:</label>
                <input
                  id="packer-sales-code-filter"
                  type="text"
                  value={searchFilters.bookingNo}
                  onChange={(event) => handleFilterChange('bookingNo', event.target.value)}
                  placeholder="Search by code"
                  disabled={loading}
                />
              </div>

              <div className="filter-group">
                <label htmlFor="packer-sales-vendor-filter">Packer</label>
                <input
                  id="packer-sales-vendor-filter"
                  type="text"
                  value={searchFilters.vendor}
                  onChange={(event) => handleFilterChange('vendor', event.target.value)}
                  placeholder="Search by packer"
                  disabled={loading}
                />
              </div>

              <div className="filter-group">
                <label htmlFor="packer-sales-customer-filter">Customer</label>
                <input
                  id="packer-sales-customer-filter"
                  type="text"
                  value={searchFilters.customer}
                  onChange={(event) => handleFilterChange('customer', event.target.value)}
                  placeholder="Search by customer"
                  disabled={loading}
                />
              </div>

              <div className="filter-group">
                <label htmlFor="packer-sales-sales-person-filter">Sales Person</label>
                <select
                  id="packer-sales-sales-person-filter"
                  value={searchFilters.salesPersonId}
                  onChange={(event) => handleFilterChange('salesPersonId', event.target.value)}
                  disabled={loading}
                >
                  <option value="">Sales Persons</option>
                  {salesPeople.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
              </div>

              {showStatusFilter ? (
                <div className="filter-group">
                  <label htmlFor="packer-sales-status-filter">Status</label>
                  <select
                    id="packer-sales-status-filter"
                    value={searchFilters.status}
                    onChange={(event) => handleFilterChange('status', event.target.value)}
                    disabled={loading}
                  >
                    <option value="">All Status</option>
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div className="filter-group">
                <label htmlFor="packer-sales-from-date-filter">From date</label>
                <DateFilterInput
                  id="packer-sales-from-date-filter"
                  value={searchFilters.fromDate}
                  onChange={(value) => handleFilterChange('fromDate', value)}
                  disabled={loading}
                />
              </div>

              <div className="filter-group">
                <label htmlFor="packer-sales-to-date-filter">To date</label>
                <DateFilterInput
                  id="packer-sales-to-date-filter"
                  value={searchFilters.toDate}
                  onChange={(value) => handleFilterChange('toDate', value)}
                  disabled={loading}
                />
              </div>

              <div className="filter-group" style={{ marginLeft: 'auto' }}>
                <label>&nbsp;</label>
                <div className="filter-actions">
                  <button type="button" className="primary-btn" onClick={clearFilters} disabled={loading}>
                    Clear
                  </button>
                  <button type="button" className="primary-btn" onClick={exportCsv} disabled={loading || exporting || totalRecords === 0}>
                    {exporting ? 'Exporting...' : 'Export'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {showSummaryCards ? (
          <div className="packer-sales-summary-grid" aria-label={`${title} summary`}>
            {summaryCards.map((card) => (
              <div key={card.label} className={`packer-sales-summary-card ${card.tone}`}>
                <div className={`packer-sales-summary-section${card.secondaryLabel ? ' primary' : ''}`}>
                  <span>{card.label}</span>
                  <strong>{card.value}</strong>
                </div>
                {card.secondaryLabel ? (
                  <div className="packer-sales-summary-section secondary">
                    <span>{card.secondaryLabel}</span>
                    <strong>{card.secondaryValue}</strong>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {error ? <p className="message error">{error}</p> : null}

        <PaginationBar
          currentPage={currentPage}
          lastPage={lastPage}
          totalRecords={totalRecords}
          onPageChange={setPage}
          disabled={loading}
        />

        <div className="transactions-table-wrap packer-sales-table-wrap">
          <table className="transactions-table packer-sales-table">
            <thead>
              <tr>
                {showQcInspectionColumn ? <th>{qcInspectionColumnLabel}</th> : null}
                <th className="sticky-col">Code</th>
                <th>Date</th>
                <th>Packer</th>
                <th>Customer</th>
                <th className="numeric">Total Weight</th>
                <th className="numeric">Buying Total</th>
                <th className="numeric">Packer Commission</th>
                <th>ETA Date</th>
                <th>ETD Date</th>
                <th>LSD Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11 + (showQcInspectionColumn ? 1 : 0)} className="table-message-cell">
                    {loadingText}
                  </td>
                </tr>
              ) : null}
              {!loading && rows.length === 0 ? (
                <tr><td colSpan={11 + (showQcInspectionColumn ? 1 : 0)} className="table-message-cell">{emptyText}</td></tr>
              ) : null}
              {!loading && rows.map((row) => (
                <tr key={row.id}>
                  {showQcInspectionColumn ? <td>{displayDate(row.qcInspectionDate)}</td> : null}
                  <td className="sticky-col">
                    <button type="button" className="report-code-button" onClick={() => setSelectedReportRow(row)}>
                      {row.bookingNo}
                    </button>
                  </td>
                  <td>{displayDate(row.issueDate)}</td>
                  <td>{row.packer || '-'}</td>
                  <td>{row.customer || '-'}</td>
                  <td className="numeric">{formatNumber(row.totalWeight)}</td>
                  <td className="numeric">{formatMoney(row.buyingTotal)}</td>
                  <td className="numeric">{formatMoney(row.packerCommission)}</td>
                  <td>{displayDate(row.etaDate)}</td>
                  <td>{displayDate(row.etdDate)}</td>
                  <td>{displayDate(row.lsdDate)}</td>
                  <td>
                    <span className={`status-pill ${getStatusClass(row.status)}`}>
                      {getStatusLabel(row.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <PaginationBar
          currentPage={currentPage}
          lastPage={lastPage}
          totalRecords={totalRecords}
          onPageChange={setPage}
          disabled={loading}
          className="compact-pagination-bottom"
        />

        {selectedReportRow ? (
          <PackerSalesDetailModal row={selectedReportRow} onClose={() => setSelectedReportRow(null)} />
        ) : null}
      </div>
    </AdminSidebarLayout>
  )
}

function PackerSalesDetailModal({ row, onClose }) {
  const items = row.items ?? []

  return (
    <div className="modal-overlay packer-sales-modal-overlay" role="dialog" aria-modal="true" aria-label={`Items for ${row.bookingNo}`} onClick={onClose}>
      <div className="modal-card packer-sales-detail-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header packer-sales-detail-header">
          <div>
            <h5>{row.bookingNo}</h5>
            <p className="packer-sales-modal-subtitle">
              {row.packer || '-'} &middot; {row.customer || '-'} &middot; {displayDate(row.issueDate)}
            </p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close item details">x</button>
        </div>

        <div className="packer-sales-detail-summary" aria-label="Booking totals">
          <div>
            <span>Total Weight</span>
            <strong>{formatNumber(row.totalWeight)}</strong>
          </div>
          <div>
            <span>Buying Total</span>
            <strong>{formatMoney(row.buyingTotal)}</strong>
          </div>
          <div>
            <span>Packer Commission</span>
            <strong>{formatMoney(row.packerCommission)}</strong>
          </div>
          <div>
            <span>Items</span>
            <strong>{formatInteger(items.length)}</strong>
          </div>
        </div>

        <div className="packer-sales-detail-table-wrap">
          <PaginationBar totalRecords={items.length} />
          <table className="transactions-table packer-sales-detail-table">
            <thead>
              <tr>
                <th>No.</th>
                <th>Product</th>
                <th>Style</th>
                <th>Packing</th>
                <th>Brand</th>
                <th>Size</th>
                <th className="numeric">Qty</th>
                <th className="numeric">Total Weight</th>
                <th className="numeric">Buying Total</th>
                <th className="numeric">Packer Commission</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={10} className="table-message-cell">No product details found for this booking.</td></tr>
              ) : items.map((item, index) => (
                <tr key={item.id}>
                  <td>{index + 1}</td>
                  <td>{item.product || '-'}</td>
                  <td>{item.style || '-'}</td>
                  <td>{item.packing || '-'}</td>
                  <td>{item.brand || '-'}</td>
                  <td>{item.size || '-'}</td>
                  <td className="numeric">{formatQty(item.qty, item.qtyUnit)}</td>
                  <td className="numeric">{formatNumber(item.totalWeight)}</td>
                  <td className="numeric">{formatMoney(item.buyingTotal)}</td>
                  <td className="numeric">{formatMoney(item.packerCommission)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <PaginationBar totalRecords={items.length} className="compact-pagination-bottom" />
        </div>
      </div>
    </div>
  )
}

function buildPackerSalesSummaryRows(transactions) {
  return transactions.map((transaction) => {
    const items = buildPackerSalesItemRows(transaction)

    return {
      id: transaction.id,
      bookingNo: transaction.booking_no ?? '-',
      issueDate: transaction.issue_date,
      packer: transaction.general_info_packer?.vendor ?? transaction.general_info_packer?.packer_name ?? '',
      customer: transaction.general_info_customer?.customer ?? '',
      totalWeight: sumNullableRows(items, 'totalWeight'),
      buyingTotal: sumNullableRows(items, 'buyingTotal'),
      packerCommission: sumNullableRows(items, 'packerCommission'),
      buyerCommission: sumNullableRows(items, 'buyerCommission'),
      etaDate: transaction.logistics?.eta_date,
      etdDate: transaction.logistics?.etd_date,
      lsdDate: transaction.shipping_details_packer?.lsd_max,
      qcInspectionDate: transaction.logistics?.qc_inspection_date,
      status: transaction.status ?? 'U',
      items,
    }
  })
}

function flattenPackerSalesRows(transactions) {
  return transactions.flatMap((transaction) => {
    const items = Array.isArray(transaction.items) && transaction.items.length > 0 ? transaction.items : [null]
    const packerCommissionTotal = sumTransactionItems(transaction.items, 'total_packer_commission')
    const buyerCommissionTotal = sumTransactionItems(transaction.items, 'total_customer_commission')
    const totalCommission = sumValues([packerCommissionTotal, buyerCommissionTotal])

    return items.map((item, index) => ({
      id: `${transaction.id}-${item?.id ?? `empty-${index}`}`,
      bookingNo: transaction.booking_no ?? '-',
      issueDate: transaction.issue_date,
      packer: transaction.general_info_packer?.vendor ?? transaction.general_info_packer?.packer_name ?? '',
      customer: transaction.general_info_customer?.customer ?? '',
      product: item?.product ?? '',
      style: item?.style ?? '',
      packing: item?.packing ?? '',
      size: item?.size ?? '',
      qty: item?.qty_booking ?? item?.qty_value ?? null,
      qtyUnit: item?.qty_unit ?? '',
      totalWeight: item?.total_weight_value ?? null,
      buyingTotal: item?.buying_total ?? null,
      packerCommission: item?.total_packer_commission ?? null,
      buyerCommission: item?.total_customer_commission ?? null,
      etaDate: transaction.logistics?.eta_date,
      etdDate: transaction.logistics?.etd_date,
      lsdDate: transaction.shipping_details_packer?.lsd_max,
      qcInspectionDate: transaction.logistics?.qc_inspection_date,
      totalCommission,
      status: transaction.status ?? 'U',
      isFirstCodeRow: index === 0,
    }))
  })
}

function buildPackerSalesItemRows(transaction) {
  const items = Array.isArray(transaction.items) ? transaction.items : []

  return items.map((item, index) => ({
    id: item?.id ?? `${transaction.id}-item-${index}`,
    product: item?.product ?? '',
    style: item?.style ?? '',
    packing: item?.packing ?? '',
    brand: item?.brand ?? '',
    size: item?.size ?? '',
    qty: item?.qty_booking ?? item?.qty_value ?? null,
    qtyUnit: item?.qty_unit ?? '',
    totalWeight: item?.total_weight_value ?? null,
    buyingTotal: item?.buying_total ?? null,
    packerCommission: item?.total_packer_commission ?? null,
    buyerCommission: item?.total_customer_commission ?? null,
  }))
}

function getStatusLabel(value) {
  const option = statusOptions.find((status) => status.value === value)
  return option ? option.label : value
}

function getStatusClass(value) {
  switch (value) {
    case 'I':
      return 'invoice'
    case 'P':
      return 'unpaid'
    case 'D':
      return 'paid'
    case 'S':
      return 'shipped'
    case 'R':
      return 'received'
    case 'T':
      return 'tally'
    case 'C':
      return 'cancelled'
    default:
      return 'unshipped'
  }
}

function buildSummaryCards(rows, totalRecords, summary = null) {
  const buyerCommissionTotal = numericValue(summary?.buyer_commission_total) ?? sumRows(rows, 'buyerCommission')
  const packerCommissionTotal = numericValue(summary?.packer_commission_total) ?? sumRows(rows, 'packerCommission')
  const totalCommission = numericValue(summary?.total_commission) ?? (buyerCommissionTotal + packerCommissionTotal)
  const unshippedCount = numericValue(summary?.unshipped_count) ?? rows.filter((row) => row.status === 'U').length

  return [
    {
      label: 'Transactions',
      value: formatInteger(totalRecords),
      tone: 'blue',
      secondaryLabel: 'Unshipped Count',
      secondaryValue: formatInteger(unshippedCount),
    },
    { label: 'Buyer Commission', value: formatCurrency(buyerCommissionTotal), tone: 'amber' },
    { label: 'Packer Commission', value: formatCurrency(packerCommissionTotal), tone: 'green' },
    { label: 'Total Commission', value: formatCurrency(totalCommission), tone: 'teal' },
  ]
}

function buildTransactionParams(filters, targetPage, perPage, forcedStatus = '', filterByQcInspectionDate = false) {
  const params = new URLSearchParams()
  params.append('page', targetPage)
  params.append('per_page', perPage)
  if (filters.bookingNo) params.append('booking_no', filters.bookingNo)
  if (filters.vendor) params.append('vendor', filters.vendor)
  if (filters.customer) params.append('customer', filters.customer)
  if (filters.salesPersonId) params.append('sales_person_id', filters.salesPersonId)
  if (forcedStatus) {
    params.append('status', forcedStatus)
  } else if (filters.status) {
    params.append('status', filters.status)
  }
  if (filterByQcInspectionDate) params.append('has_qc_inspection_date', '1')
  if (filters.fromDate) params.append('from_date', filters.fromDate)
  if (filters.toDate) params.append('to_date', filters.toDate)
  return params
}

function displayDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-GB')
}

function formatMoney(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '-'
  return number.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatCurrency(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '$0.00'
  return `$${number.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatInteger(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '0'
  return number.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function formatNumber(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '-'
  return number.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function sumRows(rows, key) {
  return rows.reduce((total, row) => {
    const value = numericValue(row[key])
    return value !== null ? total + value : total
  }, 0)
}

function sumNullableRows(rows, key) {
  let hasValue = false
  const total = rows.reduce((sum, row) => {
    const value = numericValue(row[key])
    if (value === null) return sum

    hasValue = true
    return sum + value
  }, 0)

  return hasValue ? total : null
}

function sumTransactionItems(items, key) {
  if (!Array.isArray(items)) return null

  let hasValue = false
  const total = items.reduce((sum, item) => {
    const value = numericValue(item?.[key])
    if (value === null) return sum

    hasValue = true
    return sum + value
  }, 0)

  return hasValue ? total : null
}

function sumValues(values) {
  let hasValue = false
  const total = values.reduce((sum, value) => {
    const number = numericValue(value)
    if (number === null) return sum

    hasValue = true
    return sum + number
  }, 0)

  return hasValue ? total : null
}

function numericValue(value) {
  if (value === null || value === undefined || value === '') return null

  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function formatQty(value, unit) {
  const number = Number(value)
  const formatted = Number.isFinite(number)
    ? number.toLocaleString('en-US', { maximumFractionDigits: 2 })
    : '-'
  return unit && formatted !== '-' ? `${formatted} ${unit}` : formatted
}

function formatCsvCell(value) {
  const text = String(value ?? '')
  return `"${text.replaceAll('"', '""')}"`
}

export default PackerSalesReportPage
