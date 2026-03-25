import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminSidebarLayout from '../components/layout/AdminSidebarLayout'
import TransactionEditModal from '../components/transactions/TransactionEditModal'
import { useAuth } from '../context/AuthContext'

const PAGE_SIZE = 10
const MAX_VISIBLE_PAGES = 5

function TransactionsPage() {
  const navigate = useNavigate()
  const { currentUser, authFetch, logout } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, per_page: PAGE_SIZE, total: 0 })
  const [keyword, setKeyword] = useState('')
  const [selectedTransaction, setSelectedTransaction] = useState(null)

  useEffect(() => {
    if (!currentUser) return
    if (currentUser.role !== 'admin') {
      navigate('/dashboard', { replace: true })
      return
    }
    loadTransactions(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser])

  async function loadTransactions(targetPage = page) {
    setLoading(true)
    setError('')
    try {
      const response = await authFetch(`/transactions?page=${targetPage}&per_page=${PAGE_SIZE}`)
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
        await loadTransactions(page)
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

  async function onLogout() {
    await logout()
    navigate('/', { replace: true })
  }

  const visibleRows = transactions.filter((transaction) => {
    const text = keyword.trim().toLowerCase()
    if (!text) return true
    const searchable = [
      transaction.booking_no,
      transaction.general_info_packer?.vendor,
      transaction.general_info_customer?.customer,
      transaction.destination,
    ].filter(Boolean).join(' ').toLowerCase()
    return searchable.includes(text)
  }).slice(0, PAGE_SIZE)
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
            onClick={() => loadTransactions(Math.max(1, currentPage - 1))}
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
              onClick={() => loadTransactions(pageNumber)}
              aria-label={`Page ${pageNumber}`}
              aria-current={pageNumber === currentPage ? 'page' : undefined}
            >
              {pageNumber}
            </button>
          ))}
          <button
            type="button"
            className="page-chip nav"
            onClick={() => loadTransactions(Math.min(lastPage, currentPage + 1))}
            disabled={!canGoNext}
            aria-label="Next page"
          >
            {'>'}
          </button>
        </div>
      </div>
    )
  }

  if (!currentUser || currentUser.role !== 'admin') return null

  return (
    <AdminSidebarLayout currentUser={currentUser} title="Transaction Data" activeKey="all_transactions" onLogout={onLogout}>
      <div className="transactions-page">
        <div className="transactions-toolbar">
          <h3>Transaction &gt; All Transaction</h3>
          <input placeholder="Keyword" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        </div>

        {error && <p className="message error">{error}</p>}

        <div className="transactions-table-wrap">
          <table className="transactions-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Date</th>
                <th>Vendor</th>
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
              {!loading && visibleRows.length === 0 && (
                <tr><td colSpan={16}>No transactions found.</td></tr>
              )}
              {visibleRows.map((transaction) => (
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
                  <td>{transaction.transaction_status ?? 'U'}</td>
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

export default TransactionsPage
