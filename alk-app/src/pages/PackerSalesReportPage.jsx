import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminSidebarLayout from '../components/layout/AdminSidebarLayout'
import { useAuth } from '../context/AuthContext'

const PAGE_SIZE = 10
const EXPORT_PAGE_SIZE = 1000
const MAX_VISIBLE_PAGES = 5
const ALLOWED_ROLES = ['admin', 'accounts']

const statusOptions = [
  { value: 'I', label: 'Invoice' },
  { value: 'P', label: 'Pending' },
  { value: 'S', label: 'Shipped' },
  { value: 'R', label: 'Received' },
  { value: 'U', label: 'Unshipped' },
  { value: 'T', label: 'Tally' },
]

const csvColumns = [
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
  { label: 'Status', value: (row) => getStatusLabel(row.status) },
]

function PackerSalesReportPage() {
  const navigate = useNavigate()
  const { currentUser, authFetch, logout } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, per_page: PAGE_SIZE, total: 0 })
  const [searchFilters, setSearchFilters] = useState({
    bookingNo: '',
    vendor: '',
    customer: '',
    status: '',
    fromDate: '',
    toDate: '',
  })

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
      const params = buildTransactionParams(filters, targetPage, PAGE_SIZE)
      const response = await authFetch(`/transactions?${params.toString()}`)
      const payload = await response.json()

      if (!response.ok) {
        setError(payload?.message ?? 'Unable to load packer sales.')
        return
      }

      setTransactions(payload?.data ?? [])
      setPagination(payload?.pagination ?? { current_page: 1, last_page: 1, per_page: PAGE_SIZE, total: 0 })
      setPage(targetPage)
    } catch {
      setError('Unable to load packer sales.')
    } finally {
      setLoading(false)
    }
  }

  function handleFilterChange(key, value) {
    setSearchFilters((previous) => ({ ...previous, [key]: value }))
    setPage(1)
  }

  function clearFilters() {
    setSearchFilters({ bookingNo: '', vendor: '', customer: '', status: '', fromDate: '', toDate: '' })
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
        const params = buildTransactionParams(searchFilters, targetPage, EXPORT_PAGE_SIZE)
        const response = await authFetch(`/transactions?${params.toString()}`)
        const payload = await response.json()

        if (!response.ok) {
          setError(payload?.message ?? 'Unable to export packer sales.')
          return
        }

        rowsToExport = [...rowsToExport, ...flattenPackerSalesRows(payload?.data ?? [])]
        lastExportPage = payload?.pagination?.last_page ?? 1
        targetPage += 1
      } while (targetPage <= lastExportPage)

      if (rowsToExport.length === 0) return

      downloadCsv(rowsToExport)
    } catch {
      setError('Unable to export packer sales.')
    } finally {
      setExporting(false)
    }
  }

  function downloadCsv(rowsToExport) {
    const rows = [
      csvColumns.map((column) => column.label),
      ...rowsToExport.map((row) => csvColumns.map((column) => column.value(row) ?? '-')),
    ]
    const csv = rows.map((row) => row.map(formatCsvCell).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `packer-sales-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  async function onLogout() {
    await logout()
    navigate('/', { replace: true })
  }

  function getVisiblePageNumbers() {
    if (lastPage <= MAX_VISIBLE_PAGES) {
      return Array.from({ length: lastPage }, (_, index) => index + 1)
    }

    const halfWindow = Math.floor(MAX_VISIBLE_PAGES / 2)
    let start = currentPage - halfWindow
    let end = currentPage + halfWindow

    if (start < 1) {
      start = 1
      end = MAX_VISIBLE_PAGES
    }
    if (end > lastPage) {
      end = lastPage
      start = lastPage - MAX_VISIBLE_PAGES + 1
    }

    return Array.from({ length: end - start + 1 }, (_, index) => start + index)
  }

  function renderPagination() {
    const pageNumbers = getVisiblePageNumbers()

    return (
      <div className="transactions-pagination transactions-pagination-bottom">
        <div className="transactions-pagination-actions">
          <button
            type="button"
            className="page-chip nav"
            onClick={() => setPage(Math.max(1, currentPage - 1))}
            disabled={!canGoPrevious}
            aria-label="Previous page"
          >
            {'<'}
          </button>
          {pageNumbers.map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              className={`page-chip${pageNumber === currentPage ? ' active' : ''}`}
              onClick={() => setPage(pageNumber)}
              aria-label={`Page ${pageNumber}`}
              aria-current={pageNumber === currentPage ? 'page' : undefined}
            >
              {pageNumber}
            </button>
          ))}
          <button
            type="button"
            className="page-chip nav"
            onClick={() => setPage(Math.min(lastPage, currentPage + 1))}
            disabled={!canGoNext}
            aria-label="Next page"
          >
            {'>'}
          </button>
        </div>
      </div>
    )
  }

  if (!currentUser || !ALLOWED_ROLES.includes(currentUser.role)) return null

  const rows = flattenPackerSalesRows(transactions)
  const totalRecords = pagination.total ?? 0
  const currentPage = pagination.current_page ?? page
  const lastPage = Math.max(1, pagination.last_page ?? 1)
  const canGoPrevious = currentPage > 1
  const canGoNext = currentPage < lastPage

  return (
    <AdminSidebarLayout currentUser={currentUser} title="Packer Sales" activeKey="all_transactions" onLogout={onLogout} authFetch={authFetch}>
      <div className="transactions-page">
        <div className="transactions-toolbar">
          <div>
            <h5>Reports &gt; Packer Sales</h5>
            <div className="search-filters">
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

              <div className="filter-group">
                <label htmlFor="packer-sales-from-date-filter">From date</label>
                <input
                  id="packer-sales-from-date-filter"
                  type="date"
                  value={searchFilters.fromDate}
                  onChange={(event) => handleFilterChange('fromDate', event.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="filter-group">
                <label htmlFor="packer-sales-to-date-filter">To date</label>
                <input
                  id="packer-sales-to-date-filter"
                  type="date"
                  value={searchFilters.toDate}
                  onChange={(event) => handleFilterChange('toDate', event.target.value)}
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

        {error ? <p className="message error">{error}</p> : null}

        <div className="transactions-table-wrap">
          <table className="transactions-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Date</th>
                <th>Packer</th>
                <th>Customer</th>
                <th>Product</th>
                <th>Style</th>
                <th>Packing</th>
                <th>Size</th>
                <th>Qty</th>
                <th>Total Weight</th>
                <th>Buying Total</th>
                <th>Packer Com.</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={13} style={{ textAlign: 'center' }}>
                    Loading packer sales, please wait...
                  </td>
                </tr>
              ) : null}
              {!loading && rows.length === 0 ? (
                <tr><td colSpan={13}>No packer sales found.</td></tr>
              ) : null}
              {!loading && rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.bookingNo}</td>
                  <td>{displayDate(row.issueDate)}</td>
                  <td>{row.packer || '-'}</td>
                  <td>{row.customer || '-'}</td>
                  <td>{row.product || '-'}</td>
                  <td>{row.style || '-'}</td>
                  <td>{row.packing || '-'}</td>
                  <td>{row.size || '-'}</td>
                  <td>{formatQty(row.qty, row.qtyUnit)}</td>
                  <td>{formatNumber(row.totalWeight)}</td>
                  <td>{formatMoney(row.buyingTotal)}</td>
                  <td>{formatMoney(row.packerCommission)}</td>
                  <td>{getStatusLabel(row.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalRecords > 0 ? renderPagination() : null}
      </div>
    </AdminSidebarLayout>
  )
}

function flattenPackerSalesRows(transactions) {
  return transactions.flatMap((transaction) => {
    const items = Array.isArray(transaction.items) && transaction.items.length > 0 ? transaction.items : [null]

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
      status: transaction.status ?? 'U',
    }))
  })
}

function getStatusLabel(value) {
  const option = statusOptions.find((status) => status.value === value)
  return option ? option.label : value
}

function buildTransactionParams(filters, targetPage, perPage) {
  const params = new URLSearchParams()
  params.append('page', targetPage)
  params.append('per_page', perPage)
  if (filters.bookingNo) params.append('booking_no', filters.bookingNo)
  if (filters.vendor) params.append('vendor', filters.vendor)
  if (filters.customer) params.append('customer', filters.customer)
  if (filters.status) params.append('status', filters.status)
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

function formatNumber(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '-'
  return number.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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
