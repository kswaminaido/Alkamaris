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
    { label: 'All Transactions', path: '/transactions', description: 'Search, review, duplicate, and update bookings.', icon: <ListIcon /> },
    { label: 'QC Inspection Date', description: 'Track inspection planning and status.', icon: <CheckIcon /> },
    { label: 'Overdue Invoice', path: '/transactions/overdue-invoice', description: 'Prioritize invoices that need attention.', icon: <AlertIcon /> },
  ]

  const reportLinks = [
    { label: 'Sales Revenue', path: '/reports/packer-sales', description: 'Review revenue by packer, buyer, and status.', icon: <ChartIcon /> },
    { label: 'Order Progress Report', description: 'Monitor booking movement by stage.', icon: <TrendIcon /> },
    { label: 'Report on Container', description: 'Summarize container level shipment activity.', icon: <BoxIcon /> },
    { label: 'Item Report', description: 'Analyze item and commission details.', icon: <TagIcon /> },
    { label: 'Statement of Account', description: 'Prepare customer and vendor account views.', icon: <FileIcon /> },
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
            <span><span className="dashboard-card-icon"><DollarIcon /></span>Total Commission</span>
            <strong>{commissionLoading ? '-' : formatCommission(totalCommission)}</strong>
          </article>
          <article className="dashboard-commission-card collected">
            <span><span className="dashboard-card-icon"><CheckIcon /></span>Total Collected</span>
            <strong>{commissionLoading ? '-' : formatCommission(commissionSummary.total_collected_commission)}</strong>
          </article>
          <article className="dashboard-commission-card pending">
            <span><span className="dashboard-card-icon"><ClockIcon /></span>Total Pending</span>
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
            <span>Daily booking controls</span>
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
                  <span className="module-link-icon">{item.icon}</span>
                  <span>
                    <strong>{item.label}</strong>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </article>

        <article className="module-card">
          <div className="module-card-head reports">
            <h3>Report</h3>
            <span>Analysis and exports</span>
          </div>
          <ul>
            {reportLinks.map((item) => (
              <li key={item.label}>
                <button
                  type="button"
                  className="module-link"
                  onClick={() => (item.path ? navigate(item.path) : setPlaceholderMessage(`${item.label} is a placeholder for now.`))}
                >
                  <span className="module-link-icon">{item.icon}</span>
                  <span>
                    <strong>{item.label}</strong>
                  </span>
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
  { status: 'I', label: 'Invoiced', sourceStatuses: ['I'] },
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

function DashboardIcon({ children }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true">{children}</svg>
}

function DollarIcon() {
  return <DashboardIcon><path d="M12 3v18M16 7.5c0-1.7-1.8-3-4-3s-4 1.3-4 3 1.8 3 4 3 4 1.3 4 3-1.8 3-4 3-4-1.3-4-3" /></DashboardIcon>
}

function CheckIcon() {
  return <DashboardIcon><path d="m5 13 4 4L19 7" /></DashboardIcon>
}

function ClockIcon() {
  return <DashboardIcon><path d="M12 7v5l3 2" /><path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></DashboardIcon>
}

function AlertIcon() {
  return <DashboardIcon><path d="M12 9v4M12 17h.01" /><path d="m10.3 4.2-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-2.8l-8-14a2 2 0 0 0-3.4 0Z" /></DashboardIcon>
}

function ListIcon() {
  return <DashboardIcon><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></DashboardIcon>
}

function ChartIcon() {
  return <DashboardIcon><path d="M4 19V5" /><path d="M4 19h16" /><path d="m7 15 4-4 3 3 5-7" /></DashboardIcon>
}

function TrendIcon() {
  return <DashboardIcon><path d="m4 17 6-6 4 4 6-8" /><path d="M14 7h6v6" /></DashboardIcon>
}

function BoxIcon() {
  return <DashboardIcon><path d="M21 8 12 3 3 8l9 5 9-5Z" /><path d="M3 8v8l9 5 9-5V8" /><path d="M12 13v8" /></DashboardIcon>
}

function TagIcon() {
  return <DashboardIcon><path d="M20 13 13 20 4 11V4h7l9 9Z" /><path d="M7.5 7.5h.01" /></DashboardIcon>
}

function FileIcon() {
  return <DashboardIcon><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h6" /></DashboardIcon>
}

export default DashboardPanel
