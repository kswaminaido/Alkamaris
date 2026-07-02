import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PaginationBar from '../components/common/PaginationBar'
import AdminSidebarLayout from '../components/layout/AdminSidebarLayout'
import { useAuth } from '../context/AuthContext'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const PAGE_SIZE = 20

function AdminHistoryPage() {
  const navigate = useNavigate()
  const { currentUser, logout, authFetch } = useAuth()
  const [events, setEvents] = useState([])
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, per_page: PAGE_SIZE, total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const historyTree = useMemo(() => buildHistoryTree(events), [events])
  const currentPage = pagination.current_page ?? page
  const lastPage = Math.max(1, pagination.last_page ?? 1)
  const totalRecords = pagination.total ?? 0

  useEffect(() => {
    loadHistory(page)
  }, [page])

  async function handleLogout() {
    await logout()
    navigate('/', { replace: true })
  }

  async function loadHistory(targetPage = page) {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        per_page: String(PAGE_SIZE),
      })
      const response = await authFetch(`/admin/history?${params.toString()}`, { loadingLabel: 'Loading history...' })
      const payload = await response.json()
      if (!response.ok) {
        setError(payload?.message ?? 'Unable to load history.')
        return
      }
      setEvents(Array.isArray(payload?.data) ? payload.data : [])
      setPagination(payload?.pagination ?? { current_page: targetPage, last_page: 1, per_page: PAGE_SIZE, total: 0 })
    } catch {
      setError('Unable to load history.')
    } finally {
      setLoading(false)
    }
  }

  function refreshHistory() {
    if (page === 1) {
      loadHistory(1)
      return
    }
    setPage(1)
  }

  if (!currentUser) return null

  return (
    <AdminSidebarLayout currentUser={currentUser} activeKey="history" onLogout={handleLogout} authFetch={authFetch}>
      <section className="admin-history-page">
        <div className="admin-history-header">
          <div>
            <h2>History</h2>
            <p>Last 5 days of admin activity</p>
          </div>
          <button type="button" className="secondary-btn" onClick={refreshHistory} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {error ? <p className="message error">{error}</p> : null}

        <PaginationBar
          currentPage={currentPage}
          lastPage={lastPage}
          totalRecords={totalRecords}
          onPageChange={setPage}
          disabled={loading}
        />

        <div className="admin-history-tree" aria-live="polite">
          {loading ? (
            <div className="admin-history-empty">Loading history...</div>
          ) : historyTree.length === 0 ? (
            <div className="admin-history-empty">No activity found in the last 5 days.</div>
          ) : (
            historyTree.map((dateGroup) => (
              <section className="history-date-group" key={dateGroup.key}>
                <h3>Date: {dateGroup.label}</h3>
                <ol className="history-window-list">
                  {dateGroup.windows.map((windowGroup) => (
                    <li className="history-window-item" key={windowGroup.key}>
                      <div className="history-window-label">{windowGroup.label}</div>
                      <ol className="history-action-list">
                        {windowGroup.events.map((event) => (
                          <li className="history-action-item" key={event.id}>
                            <span className="history-action-main">
                              {event.user_name ? <strong>{event.user_name}</strong> : null}
                              {event.user_name ? ' ' : null}
                              {event.description || event.action || event.event_type || 'Activity recorded'}
                            </span>
                            <time dateTime={event.created_at}>{formatTime(event.created_at)}</time>
                          </li>
                        ))}
                      </ol>
                    </li>
                  ))}
                </ol>
              </section>
            ))
          )}
        </div>

        <PaginationBar
          currentPage={currentPage}
          lastPage={lastPage}
          totalRecords={totalRecords}
          onPageChange={setPage}
          disabled={loading}
          className="compact-pagination-bottom"
        />
      </section>
    </AdminSidebarLayout>
  )
}

function buildHistoryTree(events) {
  const dateGroups = new Map()

  events
    .filter((event) => event?.created_at)
    .forEach((event) => {
      const date = new Date(event.created_at)
      if (Number.isNaN(date.getTime())) return

      const dateKey = formatDateKey(date)
      const windowStart = new Date(date)
      windowStart.setMinutes(Math.floor(date.getMinutes() / 30) * 30, 0, 0)
      const windowEnd = new Date(windowStart)
      windowEnd.setMinutes(windowStart.getMinutes() + 30)
      const windowKey = String(windowStart.getTime())

      if (!dateGroups.has(dateKey)) {
        dateGroups.set(dateKey, {
          key: dateKey,
          label: formatDateLabel(date),
          sortValue: startOfDay(date).getTime(),
          windows: new Map(),
        })
      }

      const dateGroup = dateGroups.get(dateKey)
      if (!dateGroup.windows.has(windowKey)) {
        dateGroup.windows.set(windowKey, {
          key: windowKey,
          label: `${formatTime(windowStart)} - ${formatTime(windowEnd)}`,
          sortValue: windowStart.getTime(),
          events: [],
        })
      }

      dateGroup.windows.get(windowKey).events.push(event)
    })

  return [...dateGroups.values()]
    .sort((a, b) => b.sortValue - a.sortValue)
    .map((dateGroup) => ({
      ...dateGroup,
      windows: [...dateGroup.windows.values()]
        .sort((a, b) => b.sortValue - a.sortValue)
        .map((windowGroup) => ({
          ...windowGroup,
          events: windowGroup.events.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
        })),
    }))
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function formatDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatDateLabel(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${String(date.getDate()).padStart(2, '0')}-${MONTHS[date.getMonth()]}-${date.getFullYear()}`
}

function formatTime(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

export default AdminHistoryPage
