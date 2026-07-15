import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminSidebarLayout from '../components/layout/AdminSidebarLayout'
import PaginationBar from '../components/common/PaginationBar'
import TransactionEditModal from '../components/transactions/TransactionEditModal'
import { useAuth } from '../context/AuthContext'

const PAGE_SIZE = 50
const EXPORT_PAGE_SIZE = 1000
const SALES_PERSON_ROLE_VALUES = ['sales']

const statusOptions = [
  { value: 'I', label: 'Invoice' },
  { value: 'P', label: 'Unpaid' },
  { value: 'D', label: 'Paid' },
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
  { label: 'AME Inv. to Packer', value: (transaction) => ameInvoiceToPacker(transaction) },
  { label: 'AME Inv. to Customer', value: (transaction) => ameInvoiceToCustomer(transaction) },
  { label: 'Packer Inv.', value: (transaction) => transaction.logistics?.packer_inv },
  { label: 'PO/Contract', value: (transaction) => transaction.general_info_customer?.buyer_number },
  { label: 'ETD', value: (transaction) => displayDate(transaction.logistics?.etd_date) },
  { label: 'ETA', value: (transaction) => displayDate(transaction.logistics?.eta_date) },
  { label: 'LSD', value: (transaction) => displayDate(transaction.shipping_details_packer?.lsd_max) },
  { label: 'Status', value: (transaction) => getStatusLabel(transaction.status ?? 'U') },
  // { label: 'SH Date', value: (transaction) => displayDate(transaction.shipping_details_customer?.req_eta) },
  { label: 'Destination', value: (transaction) => transaction.destination },
  { label: 'Date Modified', value: (transaction) => displayDate(transaction.updated_at) },
]

function getStatusLabel(value) {
  const option = statusOptions.find(opt => opt.value === value)
  return option ? option.label : value
}

function TransactionsPage({ overdueOnly = false }) {
  const navigate = useNavigate()
  const { currentUser, authFetch, logout } = useAuth()
  const defaultStatus = overdueOnly ? 'U' : ''
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, per_page: PAGE_SIZE, total: 0 })
  const [salesPeople, setSalesPeople] = useState([])
  const [searchFilters, setSearchFilters] = useState({
    bookingNo: '',
    vendor: '',
    customer: '',
    salesPersonId: '',
    status: defaultStatus,
    fromDate: '',
    toDate: '',
  })
  const [selectedTransaction, setSelectedTransaction] = useState(null)

  useEffect(() => {
    if (!currentUser) return
    loadSalesPeople()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser])

  useEffect(() => {
    if (!currentUser) return
    // Require min 3 characters for free-text filters before firing API
    const textKeys = ['bookingNo', 'vendor', 'customer']
    for (const key of textKeys) {
      const val = (searchFilters[key] ?? '').trim()
      if (val !== '' && val.length < 4) {
        return
      }
    }
    loadTransactions(searchFilters, page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchFilters, page])

  async function loadTransactions(filters = searchFilters, targetPage = page) {
    setLoading(true)
    setError('')
    try {
      const params = buildTransactionParams(filters, targetPage, PAGE_SIZE, { overdueOnly })
      const response = await authFetch(`/transactions?${params.toString()}`)
      const payload = await response.json()
      if (!response.ok) {
        setError(payload?.message ?? `Unable to load ${overdueOnly ? 'overdue invoices' : 'transactions'}.`)
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

  async function loadSalesPeople() {
    try {
      const response = await authFetch('/users?role=sales&per_page=100')
      const payload = await response.json()
      setSalesPeople(response.ok ? extractSalesPersonOptions(payload?.data, currentUser) : extractSalesPersonOptions([], currentUser))
    } catch {
      setSalesPeople(extractSalesPersonOptions([], currentUser))
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
      salesPersonId: '',
      status: defaultStatus,
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
        const params = buildTransactionParams(searchFilters, targetPage, EXPORT_PAGE_SIZE, { overdueOnly })
        const response = await authFetch(`/transactions?${params.toString()}`)
        const payload = await response.json()
        if (!response.ok) {
          setError(payload?.message ?? `Unable to export ${overdueOnly ? 'overdue invoices' : 'transactions'}.`)
          return
        }

        rowsToExport = [...rowsToExport, ...(payload?.data ?? [])]
        lastExportPage = payload?.pagination?.last_page ?? 1
        targetPage += 1
      } while (targetPage <= lastExportPage)

      if (rowsToExport.length === 0) return

      downloadTransactionsCsv(rowsToExport)
    } catch {
      setError(`Unable to export ${overdueOnly ? 'overdue invoices' : 'transactions'}.`)
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
    link.download = `${overdueOnly ? 'overdue-invoices' : 'transactions'}-${new Date().toISOString().slice(0, 10)}.csv`
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
        const next = [duplicated, ...previous]
        return next.slice(0, PAGE_SIZE)
      })
      setSelectedTransaction(duplicated)
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
        setSelectedTransaction(updated)
        await loadTransactions(searchFilters, 1)
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
    setSelectedTransaction(updatedTransaction)
    loadTransactions(searchFilters, 1)
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
    <AdminSidebarLayout currentUser={currentUser} title={overdueOnly ? 'Overdue Invoice' : 'Transaction Data'} activeKey="all_transactions" onLogout={onLogout} authFetch={authFetch}>
      <div className="transactions-page">
        <div className="transactions-toolbar">
          <div>
            <h5>Transaction &gt; {overdueOnly ? 'Overdue Invoice' : 'All Transaction'}</h5>
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
                <label htmlFor="sales-person-filter">Sales Person</label>
                <select
                  id="sales-person-filter"
                  value={searchFilters.salesPersonId}
                  onChange={(e) => handleFilterChange('salesPersonId', e.target.value)}
                  disabled={loading}
                >
                  <option value="">All Sales Persons</option>
                  {salesPeople.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="status-filter">Status</label>
                <select
                  id="status-filter"
                  value={searchFilters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  disabled={loading || overdueOnly}
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
                    {exporting ? 'Exporting...' : 'CSV'}
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
          disabled={loading}
        />

        <div className="transactions-table-wrap">
          <table className="transactions-table">
            <thead>
              <tr>
                <th>Txn ID</th>
                <th>Date</th>
                <th>LSD</th>
                <th>Packer</th>
                <th>Customer</th>
                <th>AME Inv. to Packer</th>
                <th>AME Inv. to Customer</th>
                <th>Packer Inv.</th>
                <th>PO/Contract</th>
                <th>ETD</th>
                <th>ETA</th>
                <th>Status</th>
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
                  <td>{displayDate(transaction.shipping_details_packer?.lsd_max)}</td>
                  <td>{transaction.general_info_packer?.vendor ?? '-'}</td>
                  <td>{transaction.general_info_customer?.customer ?? '-'}</td>
                  <td>{ameInvoiceToPacker(transaction)}</td>
                  <td>{ameInvoiceToCustomer(transaction)}</td>
                  <td>{transaction.logistics?.packer_inv ?? '-'}</td>
                  <td>{transaction.general_info_customer?.buyer_number ?? '-'}</td>
                  <td>{displayDate(transaction.logistics?.etd_date)}</td>
                  <td>{displayDate(transaction.logistics?.eta_date)}</td>
                  <td>{getStatusLabel(transaction.status ?? 'U')}</td>
                  {/* <td>{displayDate(transaction.shipping_details_customer?.req_eta)}</td> */}
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

        <PaginationBar
          currentPage={currentPage}
          lastPage={lastPage}
          totalRecords={totalRecords}
          onPageChange={setPage}
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
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-GB')
}

function ameInvoiceToPacker(transaction) {
  return transaction.revenue_packer?.amount
    ?? itemSellingTotal(transaction)
    ?? '-'
}

function ameInvoiceToCustomer(transaction) {
  return transaction.revenue_customer?.amount
    ?? itemSellingTotal(transaction)
    ?? '-'
}

function itemSellingTotal(transaction) {
  const items = Array.isArray(transaction.items) ? transaction.items : []
  if (items.length === 0) return null

  const total = items.reduce((sum, item) => {
    const value = Number(item?.selling_total ?? 0)
    return Number.isFinite(value) ? sum + value : sum
  }, 0)

  return total === 0 ? null : total.toFixed(2)
}

function buildTransactionParams(filters, targetPage, perPage, options = {}) {
  const params = new URLSearchParams()
  params.append('page', targetPage)
  params.append('per_page', perPage)
  if (options.overdueOnly) params.append('overdue_invoice', '1')
  if (filters.bookingNo) params.append('booking_no', filters.bookingNo)
  if (filters.vendor) params.append('vendor', filters.vendor)
  if (filters.customer) params.append('customer', filters.customer)
  if (filters.salesPersonId) params.append('sales_person_id', filters.salesPersonId)
  if (filters.status) params.append('status', filters.status)
  if (!options.overdueOnly && filters.status === 'U') params.append('sort_direction', 'asc')
  if (filters.fromDate) params.append('from_date', filters.fromDate)
  if (filters.toDate) params.append('to_date', filters.toDate)
  return params
}

function extractSalesPersonOptions(users, currentUser) {
  const userMap = new Map()
  const fallbackUsers = SALES_PERSON_ROLE_VALUES.includes(currentUser?.role) ? [currentUser] : []

  for (const user of [...fallbackUsers, ...(Array.isArray(users) ? users : [])]) {
    if (!user?.id) continue
    const label = [user.name, user.email].find((value) => typeof value === 'string' && value.trim()) ?? `User #${user.id}`
    userMap.set(String(user.id), {
      id: String(user.id),
      label,
    })
  }

  return [...userMap.values()]
}

function formatCsvCell(value) {
  const text = String(value ?? '')
  return `"${text.replaceAll('"', '""')}"`
}

export default TransactionsPage
