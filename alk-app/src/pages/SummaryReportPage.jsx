import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DateFilterInput from '../components/common/DateFilterInput'
import AdminSidebarLayout from '../components/layout/AdminSidebarLayout'
import PaginationBar from '../components/common/PaginationBar'
import TransactionEditModal from '../components/transactions/TransactionEditModal'
import { useAuth } from '../context/AuthContext'
import { buildConfigMap, getFieldOptions } from '../utils/dropdownData'
import { formatDateForDisplay } from '../utils/dateFormat'

const PAGE_SIZE = 50
const EXPORT_PAGE_SIZE = 1000

const statusOptions = [
  { value: 'I', label: 'Invoiced' },
  { value: 'C', label: 'Cancelled' },
]

const csvColumns = [
  { label: 'Code', value: (transaction) => transaction.booking_no },
  { label: 'Date', value: (transaction) => displayDate(transaction.issue_date) },
  { label: 'Packer', value: (transaction) => transaction.general_info_packer?.vendor },
  { label: 'Customer', value: (transaction) => transaction.general_info_customer?.customer },
  { label: 'By QC', value: (transaction) => transaction.by_qc },
  { label: 'Status', value: (transaction) => getStatusLabel(transaction.status ?? 'U') },
]

function getStatusLabel(value) {
  const option = statusOptions.find(opt => opt.value === value)
  return option ? option.label : value
}

function SummaryReportPage() {
  const navigate = useNavigate()
  const { currentUser, authFetch, logout } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, per_page: PAGE_SIZE, total: 0 })
  const [byQcOptions, setByQcOptions] = useState([])
  const [searchFilters, setSearchFilters] = useState({
    bookingNo: '',
    vendor: '',
    customer: '',
    byQc: '',
    status: 'I',
    fromDate: '',
    toDate: '',
  })
  const [selectedTransaction, setSelectedTransaction] = useState(null)

  useEffect(() => {
    if (!currentUser) return
    loadByQcOptions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser])

  useEffect(() => {
    if (!currentUser) return
    // Require min 4 characters for free-text filters before firing API
    const textKeys = ['bookingNo', 'vendor', 'customer']
    for (const key of textKeys) {
      const val = (searchFilters[key] ?? '').trim()
      if (val !== '' && val.length < 4) {
        return
      }
    }
    loadTransactions(searchFilters, page, pageSize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchFilters, page, pageSize])

  async function loadTransactions(filters = searchFilters, targetPage = page, selectedPageSize = pageSize) {
    setLoading(true)
    setError('')
    try {
      const params = buildTransactionParams(filters, targetPage, selectedPageSize)
      const response = await authFetch(`/summary-reports?${params.toString()}`)
      const payload = await response.json()
      if (!response.ok) {
        setError(payload?.message ?? 'Unable to load summary reports.')
        return
      }
      setTransactions(payload?.data ?? [])
      setPagination(payload?.pagination ?? { current_page: 1, last_page: 1, per_page: selectedPageSize, total: 0 })
      setPage(targetPage)
    } catch {
      setError('Unable to load summary reports.')
    } finally {
      setLoading(false)
    }
  }

  async function loadByQcOptions() {
    try {
      const response = await authFetch('/configs')
      const payload = await response.json()
      const configMap = response.ok ? buildConfigMap(payload?.data) : {}
      setByQcOptions(getFieldOptions(byQcDropdownField, { configMap }))
    } catch {
      setByQcOptions([])
    }
  }

  function handleFilterChange(key, value) {
    setSearchFilters((previous) => ({ ...previous, [key]: value }))
    setPage(1)
  }

  function clearFilters() {
    setSearchFilters({ bookingNo: '', vendor: '', customer: '', byQc: '', status: 'I', fromDate: '', toDate: '' })
    setPage(1)
  }

  function handlePageSizeChange(nextPageSize) {
    setPageSize(nextPageSize)
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
        const response = await authFetch(`/summary-reports?${params.toString()}`)
        const payload = await response.json()
        if (!response.ok) {
          setError(payload?.message ?? 'Unable to export summary reports.')
          return
        }

        rowsToExport = [...rowsToExport, ...(payload?.data ?? [])]
        lastExportPage = payload?.pagination?.last_page ?? 1
        targetPage += 1
      } while (targetPage <= lastExportPage)

      if (rowsToExport.length === 0) return

      downloadTransactionsCsv(rowsToExport)
    } catch {
      setError('Unable to export summary reports.')
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
    link.download = `summary-reports-${new Date().toISOString().slice(0, 10)}.csv`
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
        await loadTransactions(searchFilters, page, pageSize)
        return { ok: true }
      }

      setTransactions((previous) => {
        const index = previous.findIndex((item) => item.id === transactionId)
        if (index === -1) return [duplicated, ...previous]
        const next = [...previous]
        next.splice(index + 1, 0, duplicated)
        return next.slice(0, pageSize)
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

  if (!currentUser) return null

  return (
    <AdminSidebarLayout currentUser={currentUser} title="Summary Report" activeKey="all_transactions" onLogout={onLogout} authFetch={authFetch}>
      <div className="transactions-page">
        <div className="transactions-toolbar">
          <div>
            <h5>Reports &gt; Summary Report</h5>
            <div className="search-filters date-search-filters">
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
                <label htmlFor="summary-by-qc-filter">By QC</label>
                <select
                  id="summary-by-qc-filter"
                  value={searchFilters.byQc}
                  onChange={(e) => handleFilterChange('byQc', e.target.value)}
                  disabled={loading}
                >
                  <option value="">All QC</option>
                  {byQcOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="status-filter">Status</label>
                <select id="status-filter" value={searchFilters.status} disabled>
                  <option value="I">Invoiced</option>
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="from-date-filter">From date</label>
                <DateFilterInput
                  id="from-date-filter"
                  value={searchFilters.fromDate}
                  onChange={(value) => handleFilterChange('fromDate', value)}
                  disabled={loading}
                />
              </div>

              <div className="filter-group">
                <label htmlFor="to-date-filter">To date</label>
                <DateFilterInput
                  id="to-date-filter"
                  value={searchFilters.toDate}
                  onChange={(value) => handleFilterChange('toDate', value)}
                  disabled={loading}
                />
              </div>

              <div className="filter-group transaction-filter-actions-group">
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

        <PaginationBar
          currentPage={currentPage}
          lastPage={lastPage}
          totalRecords={totalRecords}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
          disabled={loading}
        />

        <div className="transactions-table-wrap">
          <table className="transactions-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Date</th>
                <th>Packer</th>
                <th>Customer</th>
                <th>By QC</th>
                <th>Status</th>
                <th>Created At</th>
                <th>Duplicate</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center' }}>
                    Loading summary report, please wait...
                  </td>
                </tr>
              )}
              {!loading && visibleRows.length === 0 && (
                <tr><td colSpan={8}>No transactions found.</td></tr>
              )}
              {!loading && visibleRows.map((transaction) => (
                <tr key={transaction.id} className="transactions-row-clickable" onClick={() => setSelectedTransaction(transaction)}>
                  <td><MobileTailCell value={transaction.booking_no} /></td>
                  <td>{displayDate(transaction.issue_date)}</td>
                  <td>{transaction.general_info_packer?.vendor ?? '-'}</td>
                  <td>{transaction.general_info_customer?.customer ?? '-'}</td>
                  <td>{transaction.by_qc ?? '-'}</td>
                  <td>{getStatusLabel(transaction.status ?? 'U')}</td>
                  <td>{displayDate(transaction.created_at)}</td>
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

        <PaginationBar
          currentPage={currentPage}
          lastPage={lastPage}
          totalRecords={totalRecords}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
          disabled={loading}
          className="compact-pagination-bottom"
        />
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
  return formatDateForDisplay(value)
}

function buildTransactionParams(filters, targetPage, perPage) {
  const params = new URLSearchParams()
  params.append('page', targetPage)
  params.append('per_page', perPage)
  if (filters.bookingNo) params.append('booking_no', filters.bookingNo)
  if (filters.vendor) params.append('vendor', filters.vendor)
  if (filters.customer) params.append('customer', filters.customer)
  if (filters.byQc) params.append('by_qc', filters.byQc)
  if (filters.status) params.append('status', filters.status)
  if (filters.fromDate) params.append('from_date', filters.fromDate)
  if (filters.toDate) params.append('to_date', filters.toDate)
  return params
}

function formatCsvCell(value) {
  const text = String(value ?? '')
  return `"${text.replaceAll('"', '""')}"`
}

function MobileTailCell({ value }) {
  const text = String(value || '-')
  const mobileText = text === '-' ? text : text.slice(-5)
  return (
    <span className="table-truncate-cell mobile-tail-cell" title={text}>
      <span className="mobile-tail-full">{text}</span>
      <span className="mobile-tail-short">{mobileText}</span>
    </span>
  )
}

const byQcDropdownField = {
  source: 'config',
  type: 'transaction_by_qc',
  fallback: [],
}

export default SummaryReportPage
