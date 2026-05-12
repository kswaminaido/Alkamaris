import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminSidebarLayout from '../components/layout/AdminSidebarLayout'
import TransactionEditModal from '../components/transactions/TransactionEditModal'
import { useAuth } from '../context/AuthContext'

const PAGE_SIZE = 10
const EXPORT_PAGE_SIZE = 1000
const MAX_VISIBLE_PAGES = 5

const statusOptions = [
  { value: 'I', label: 'Invoice' },
  { value: 'P', label: 'Pending' },
  { value: 'S', label: 'Shipped' },
  { value: 'R', label: 'Received' },
  { value: 'U', label: 'Unshipped' },
  { value: 'T', label: 'Tally' },
]

const csvColumns = [
  { label: 'Code', value: (transaction) => transaction.booking_no },
  { label: 'Date', value: (transaction) => displayDate(transaction.issue_date) },
  { label: 'Packer', value: (transaction) => transaction.general_info_packer?.vendor },
  { label: 'Customer', value: (transaction) => transaction.general_info_customer?.customer },
  { label: 'SC Inv. to Packer', value: (transaction) => transaction.revenue_packer?.description },
  { label: 'SC Inv. to Customer', value: (transaction) => transaction.revenue_customer?.description },
  { label: 'Packer Inv.', value: (transaction) => transaction.general_info_packer?.packer_name },
  { label: "Buyer's PO/Contract", value: (transaction) => transaction.general_info_customer?.buyer_number },
  { label: 'ETD', value: (transaction) => displayDate(transaction.shipping_details_packer?.lsd_min) },
  { label: 'ETA', value: (transaction) => displayDate(transaction.shipping_details_packer?.req_eta) },
  { label: 'LSD', value: (transaction) => displayDate(transaction.shipping_details_customer?.lsd_max) },
  { label: 'Status', value: (transaction) => getStatusLabel(transaction.status ?? 'U') },
  { label: 'SH Date', value: (transaction) => displayDate(transaction.shipping_details_customer?.req_eta) },
  { label: 'Destination', value: (transaction) => transaction.destination },
  { label: 'Date Modified', value: (transaction) => displayDate(transaction.updated_at) },
]

function getStatusLabel(value) {
  const option = statusOptions.find(opt => opt.value === value)
  return option ? option.label : value
}

function TransactionsPage() {
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
  const [selectedTransaction, setSelectedTransaction] = useState(null)

  useEffect(() => {
    if (!currentUser) return
    loadTransactions(searchFilters, page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchFilters, page])

  async function loadTransactions(filters = searchFilters, targetPage = page) {
    setLoading(true)
    setError('')
    try {
      const params = buildTransactionParams(filters, targetPage, PAGE_SIZE)
      const response = await authFetch(`/transactions?${params.toString()}`)
      const payload = await response.json()
      if (!response.ok) {
        setError(payload?.message ?? 'Unable to load transactions.')
        return
      }
      setTransactions(payload?.data ?? [])
      setPagination(payload?.pagination ?? { current_page: 1, last_page: 1, per_page: PAGE_SIZE, total: 0 })
      setPage(targetPage)
    } catch {
      setError('Unable to load transactions.')
    } finally {
      setLoading(false)
    }
  }

  function handleFilterChange(key, value) {
    setSearchFilters((previous) => ({ ...previous, [key]: value }))
    setPage(1)
  }

  function clearFilters() {
    setSearchFilters({
      bookingNo: '',
      vendor: '',
      customer: '',
      status: '',
      fromDate: '',
      toDate: '',
    })
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
          setError(payload?.message ?? 'Unable to export transactions.')
          return
        }

        rowsToExport = [...rowsToExport, ...(payload?.data ?? [])]
        lastExportPage = payload?.pagination?.last_page ?? 1
        targetPage += 1
      } while (targetPage <= lastExportPage)

      if (rowsToExport.length === 0) return

      downloadTransactionsCsv(rowsToExport)
    } catch {
      setError('Unable to export transactions.')
    } finally {
      setExporting(false)
    }
  }

  function downloadTransactionsCsv(rowsToExport) {
    const rows = [
      csvColumns.map((column) => column.label),
      ...rowsToExport.map((transaction) => csvColumns.map((column) => column.value(transaction) ?? '-')),
    ]
    const csv = rows.map((row) => row.map(formatCsvCell).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  async function duplicateTransaction(transactionId) {
    try {
      const response = await authFetch(`/transactions/${transactionId}/duplicate`, { method: 'POST' })
      const payload = await response.json()
      if (!response.ok) {
        const message = payload?.message ?? 'Unable to duplicate transaction.'
        setError(message)
        return { ok: false, error: message }
      }
      const duplicated = payload?.data
      if (!duplicated) {
        await loadTransactions(searchFilters, page)
        return { ok: true }
      }

      setTransactions((previous) => {
        const index = previous.findIndex((item) => item.id === transactionId)
        if (index === -1) return [duplicated, ...previous]
        const next = [...previous]
        next.splice(index + 1, 0, duplicated)
        return next.slice(0, PAGE_SIZE)
      })
      setPagination((previous) => ({ ...previous, total: previous.total + 1 }))
      return { ok: true, data: duplicated }
    } catch {
      const message = 'Unable to duplicate transaction.'
      setError(message)
      return { ok: false, error: message }
    }
  }

  async function saveTransaction(transactionId, payload) {
    try {
      const response = await authFetch(`/transactions/${transactionId}`, { method: 'PUT', body: JSON.stringify(payload) })
      const body = await response.json()
      if (!response.ok) {
        const firstValidationMessage = body?.errors ? Object.values(body.errors)?.[0]?.[0] : null
        const message = firstValidationMessage ?? body?.message ?? 'Unable to save transaction.'
        setError(message)
        return { ok: false, error: message }
      }

      const updated = body?.data
      if (updated) {
        setTransactions((previous) => previous.map((item) => (item.id === updated.id ? updated : item)))
        setSelectedTransaction(updated)
      }
      return { ok: true, data: updated }
    } catch {
      const message = 'Unable to save transaction.'
      setError(message)
      return { ok: false, error: message }
    }
  }

  function syncTransactionRecord(updatedTransaction) {
    if (!updatedTransaction?.id) return
    setTransactions((previous) => previous.map((item) => (item.id === updatedTransaction.id ? updatedTransaction : item)))
    setSelectedTransaction(updatedTransaction)
  }

  async function onLogout() {
    await logout()
    navigate('/', { replace: true })
  }

  const visibleRows = transactions
  const totalRecords = pagination.total ?? 0
  const currentPage = pagination.current_page ?? page
  const lastPage = Math.max(1, pagination.last_page ?? 1)
  const canGoPrevious = currentPage > 1
  const canGoNext = currentPage < lastPage

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

  if (!currentUser) return null

  return (
    <AdminSidebarLayout currentUser={currentUser} title="Transaction Data" activeKey="all_transactions" onLogout={onLogout} authFetch={authFetch}>
      <div className="transactions-page">
        <div className="transactions-toolbar">
          <div>
            <h5>Transaction &gt; All Transaction</h5>
            <div className="search-filters">
              <div className="filter-group">
                <label htmlFor="booking-no-filter">Transaction Id / Code:</label>
                <input
                  id="booking-no-filter"
                  type="text"
                  value={searchFilters.bookingNo}
                  onChange={(e) => handleFilterChange('bookingNo', e.target.value)}
                  placeholder="Search by code"
                  disabled={loading}
                />
              </div>

              <div className="filter-group">
                <label htmlFor="vendor-filter">Packer</label>
                <input
                  id="vendor-filter"
                  type="text"
                  value={searchFilters.vendor}
                  onChange={(e) => handleFilterChange('vendor', e.target.value)}
                  placeholder="Search by packer"
                  disabled={loading}
                />
              </div>

              <div className="filter-group">
                <label htmlFor="customer-filter">Customer</label>
                <input
                  id="customer-filter"
                  type="text"
                  value={searchFilters.customer}
                  onChange={(e) => handleFilterChange('customer', e.target.value)}
                  placeholder="Search by customer"
                  disabled={loading}
                />
              </div>

              <div className="filter-group">
                <label htmlFor="status-filter">Status</label>
                <select
                  id="status-filter"
                  value={searchFilters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  disabled={loading}
                >
                  <option value="">All Status</option>
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="from-date-filter">From date</label>
                <input
                  id="from-date-filter"
                  type="date"
                  value={searchFilters.fromDate}
                  onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="filter-group">
                <label htmlFor="to-date-filter">To date</label>
                <input
                  id="to-date-filter"
                  type="date"
                  value={searchFilters.toDate}
                  onChange={(e) => handleFilterChange('toDate', e.target.value)}
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

        {error && <p className="message error">{error}</p>}

        <div className="transactions-table-wrap">
          <table className="transactions-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Date</th>
                <th>Packer</th>
                <th>Customer</th>
                <th>SC Inv. to Packer</th>
                <th>SC Inv. to Customer</th>
                <th>Packer Inv.</th>
                <th>Buyer&apos;s PO/Contract</th>
                <th>ETD</th>
                <th>ETA</th>
                <th>LSD</th>
                <th>Status</th>
                <th>SH Date</th>
                <th>Destination</th>
                <th>Date Modified</th>
                <th>Duplicate</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={16} style={{ textAlign: 'center' }}>
                    Loading transactions, please wait...
                  </td>
                </tr>
              )}
              {!loading && visibleRows.length === 0 && (
                <tr><td colSpan={16}>No transactions found.</td></tr>
              )}
              {!loading && visibleRows.map((transaction) => (
                <tr key={transaction.id} className="transactions-row-clickable" onClick={() => setSelectedTransaction(transaction)}>
                  <td>{transaction.booking_no}</td>
                  <td>{displayDate(transaction.issue_date)}</td>
                  <td>{transaction.general_info_packer?.vendor ?? '-'}</td>
                  <td>{transaction.general_info_customer?.customer ?? '-'}</td>
                  <td>{transaction.revenue_packer?.description ?? '-'}</td>
                  <td>{transaction.revenue_customer?.description ?? '-'}</td>
                  <td>{transaction.general_info_packer?.packer_name ?? '-'}</td>
                  <td>{transaction.general_info_customer?.buyer_number ?? '-'}</td>
                  <td>{displayDate(transaction.shipping_details_packer?.lsd_min)}</td>
                  <td>{displayDate(transaction.shipping_details_packer?.req_eta)}</td>
                  <td>{displayDate(transaction.shipping_details_customer?.lsd_max)}</td>
                  <td>{getStatusLabel(transaction.status ?? 'U')}</td>
                  <td>{displayDate(transaction.shipping_details_customer?.req_eta)}</td>
                  <td>{transaction.destination ?? '-'}</td>
                  <td>{displayDate(transaction.updated_at)}</td>
                  <td>
                    <button
                      type="button"
                      className="icon-btn duplicate"
                      title="Duplicate"
                      aria-label={`Duplicate ${transaction.booking_no}`}
                      onClick={(event) => {
                        event.stopPropagation()
                        duplicateTransaction(transaction.id)
                      }}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M9 9h10v10H9zM5 5h10v2H7v8H5z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalRecords > 0 && renderPagination()}
      </div>

      {selectedTransaction && (
        <TransactionEditModal
          transaction={selectedTransaction}
          authFetch={authFetch}
          onClose={() => setSelectedTransaction(null)}
          onSave={saveTransaction}
          onDuplicate={duplicateTransaction}
          onTransactionChange={syncTransactionRecord}
        />
      )}
    </AdminSidebarLayout>
  )
}

function displayDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-GB')
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

function formatCsvCell(value) {
  const text = String(value ?? '')
  return `"${text.replaceAll('"', '""')}"`
}

export default TransactionsPage
