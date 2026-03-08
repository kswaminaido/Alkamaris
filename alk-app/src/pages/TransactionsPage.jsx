import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminTopNav from '../components/layout/AdminTopNav'
import { useAuth } from '../context/AuthContext'

function TransactionsPage() {
  const navigate = useNavigate()
  const { currentUser, authFetch, logout } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, per_page: 20, total: 0 })
  const [keyword, setKeyword] = useState('')

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
      const response = await authFetch(`/transactions?page=${targetPage}&per_page=20`)
      const payload = await response.json()
      if (!response.ok) {
        setError(payload?.message ?? 'Unable to load transactions.')
        return
      }
      setTransactions(payload?.data ?? [])
      setPagination(payload?.pagination ?? { current_page: 1, last_page: 1, per_page: 20, total: 0 })
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
        setError(payload?.message ?? 'Unable to duplicate transaction.')
        return
      }
      const duplicated = payload?.data
      if (!duplicated) {
        await loadTransactions(page)
        return
      }

      setTransactions((previous) => {
        const index = previous.findIndex((item) => item.id === transactionId)
        if (index === -1) return [duplicated, ...previous]
        const next = [...previous]
        next.splice(index + 1, 0, duplicated)
        return next.slice(0, pagination.per_page)
      })
      setPagination((previous) => ({ ...previous, total: previous.total + 1 }))
    } catch {
      setError('Unable to duplicate transaction.')
    }
  }

  function onAction(action) {
    if (action.key === 'new_booking_trade' || action.key === 'new_booking_qc') {
      navigate(`/transactions/new?mode=${action.mode}`)
      return
    }
    if (action.key === 'all_transactions') return
    navigate('/dashboard')
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
  })

  if (!currentUser || currentUser.role !== 'admin') return null

  return (
    <section className="modern-dashboard">
      <AdminTopNav activeKey="all_transactions" onAction={onAction} onLogout={onLogout} />

      <div className="transactions-page">
        <div className="transactions-toolbar">
          <h3>Transaction &gt; All Transaction</h3>
          <input placeholder="Keyword" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        </div>

        <div className="transactions-pagination">
          <span>
            Page {pagination.current_page} of {pagination.last_page} ({pagination.total} Records)
          </span>
          <div className="transactions-pagination-actions">
            <button type="button" onClick={() => loadTransactions(1)} disabled={page <= 1}>|&lt;&lt;</button>
            <button type="button" onClick={() => loadTransactions(Math.max(1, page - 1))} disabled={page <= 1}>&lt;</button>
            <button type="button" onClick={() => loadTransactions(Math.min(pagination.last_page, page + 1))} disabled={page >= pagination.last_page}>&gt;</button>
            <button type="button" onClick={() => loadTransactions(pagination.last_page)} disabled={page >= pagination.last_page}>&gt;&gt;|</button>
          </div>
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
                <tr key={transaction.id}>
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
                      onClick={() => duplicateTransaction(transaction.id)}
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
      </div>
    </section>
  )
}

function displayDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-GB')
}

export default TransactionsPage
