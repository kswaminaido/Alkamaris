import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

function DashboardPanel({ currentUser, authFetch }) {
  const navigate = useNavigate()
  const authFetchRef = useRef(authFetch)
  const [placeholderMessage, setPlaceholderMessage] = useState('')
  const [commissionSummary, setCommissionSummary] = useState({
    total_collected_commission: 0,
    total_pending_commission: 0,
    status_summary: [],
  })
  const [commissionLoading, setCommissionLoading] = useState(false)
  const [commissionError, setCommissionError] = useState('')
  const totalCommission = Number(commissionSummary.total_collected_commission ?? 0)
    + Number(commissionSummary.total_pending_commission ?? 0)

  const transactionLinks = [
    { label: 'All Transactions', path: '/transactions' },
    { label: 'QC Inspection Date' },
    { label: 'Overdue Invoice', path: '/transactions/overdue-invoice' },
  ]

  const reportLinks = [
    { label: 'Sales Revenue', path: '/reports/packer-sales' },
    { label: 'Order Progress Report' },
    { label: 'Report on Container' },
    { label: 'Item Report' },
    { label: 'Statement of Account' },
  ]

  useEffect(() => {
    authFetchRef.current = authFetch
  }, [authFetch])

  useEffect(() => {
    if (currentUser?.role !== 'admin' || !authFetchRef.current) return undefined

    let active = true

    async function loadCommissionSummary() {
      setCommissionLoading(true)
      setCommissionError('')

      try {
        const response = await authFetchRef.current('/dashboard/commission-summary')
        const payload = await response.json()

        if (!active) return

        if (!response.ok) {
          setCommissionError(payload?.message ?? 'Unable to load commission totals.')
          return
        }

        setCommissionSummary({
          total_collected_commission: payload?.data?.total_collected_commission ?? 0,
          total_pending_commission: payload?.data?.total_pending_commission ?? 0,
          status_summary: Array.isArray(payload?.data?.status_summary) ? payload.data.status_summary : [],
        })
      } catch {
        if (active) {
          setCommissionError('Unable to load commission totals.')
        }
      } finally {
        if (active) {
          setCommissionLoading(false)
        }
      }
    }

    loadCommissionSummary()

    return () => {
      active = false
    }
  }, [currentUser?.role])

  return (
    <div className="modern-dashboard-main">
      {currentUser.role === 'admin' ? (
        <section className="dashboard-commission-grid" aria-label="Commission summary">
          <article className="dashboard-commission-card revenue">
            <span>Total Commission</span>
            <strong>{commissionLoading ? '-' : formatCommission(totalCommission)}</strong>
          </article>
          <article className="dashboard-commission-card collected">
            <span>Total Collected Commission</span>
            <strong>{commissionLoading ? '-' : formatCommission(commissionSummary.total_collected_commission)}</strong>
          </article>
          <article className="dashboard-commission-card pending">
            <span>Total Pending Commission</span>
            <strong>{commissionLoading ? '-' : formatCommission(commissionSummary.total_pending_commission)}</strong>
          </article>
          {commissionError ? <p className="dashboard-commission-error">{commissionError}</p> : null}
        </section>
      ) : null}

      {currentUser.role === 'admin' ? (
        <section className="dashboard-status-summary" aria-label="Status wise transaction summary">
          <div className="dashboard-status-summary-head">
            <h3>Status Summary</h3>
            <span>Total Count & Commission Value</span>
          </div>
          <div className="dashboard-status-grid">
            {statusSummaryRows(commissionSummary.status_summary).map((status) => (
              <article key={status.status} className="dashboard-status-card">
                <span>{status.label}</span>
                <strong>{commissionLoading ? '-' : formatInteger(status.transaction_count)}</strong>
                <small>{commissionLoading ? '-' : formatCommission(status.total_commission_value)}</small>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="modern-report-grid">
        <article className="module-card">
          <div className="module-card-head transaction">
            <h3>Transaction Data</h3>
          </div>
          <ul>
            {transactionLinks.map((item) => (
              <li key={item.label}>
                <button
                  type="button"
                  className="module-link"
                  onClick={() =>
                    item.path
                      ? navigate(item.path)
                      : setPlaceholderMessage(`${item.label} is a placeholder for now.`)
                  }
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </article>

        <article className="module-card">
          <div className="module-card-head reports">
            <h3>Report</h3>
          </div>
          <ul>
            {reportLinks.map((item) => (
              <li key={item.label}>
                <button
                  type="button"
                  className="module-link"
                  onClick={() => (item.path ? navigate(item.path) : setPlaceholderMessage(`${item.label} is a placeholder for now.`))}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </article>
      </section>

      {placeholderMessage && <p className="dashboard-placeholder-note">{placeholderMessage}</p>}

      <p className="dashboard-footnote">
        Signed in as <strong>{currentUser.name}</strong> ({currentUser.role})
      </p>
    </div>
  )
}

const dashboardStatusSummary = [
  { status: 'U', label: 'Unshipped', sourceStatuses: ['U'] },
  { status: 'S_R', label: 'Shipped', sourceStatuses: ['S', 'R'] },
  { status: 'I', label: 'Invoice', sourceStatuses: ['I'] },
  { status: 'P', label: 'Unpaid', sourceStatuses: ['P'] },
  { status: 'D', label: 'Paid', sourceStatuses: ['D'] },
]

function statusSummaryRows(rows) {
  const rowMap = new Map((Array.isArray(rows) ? rows : []).map((row) => [row.status, row]))

  return dashboardStatusSummary.map((status) => ({
    status: status.status,
    label: status.label,
    transaction_count: sumStatusField(rowMap, status.sourceStatuses, 'transaction_count'),
    total_commission_value: sumStatusField(rowMap, status.sourceStatuses, 'total_commission_value'),
  }))
}

function sumStatusField(rowMap, statuses, field) {
  return statuses.reduce((total, status) => {
    const value = Number(rowMap.get(status)?.[field] ?? 0)
    return total + (Number.isFinite(value) ? value : 0)
  }, 0)
}

function formatCommission(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '$0.00'
  return `$${number.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatInteger(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '0'
  return number.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

export default DashboardPanel
