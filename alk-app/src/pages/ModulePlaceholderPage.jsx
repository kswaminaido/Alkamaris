import { useNavigate } from 'react-router-dom'
import AdminSidebarLayout from '../components/layout/AdminSidebarLayout'
import { useAuth } from '../context/AuthContext'

function ModulePlaceholderPage({ title, activeKey = '' }) {
  const navigate = useNavigate()
  const { currentUser, logout } = useAuth()

  async function handleLogout() {
    await logout()
    navigate('/', { replace: true })
  }

  if (!currentUser || currentUser.role !== 'admin') return null

  return (
    <AdminSidebarLayout currentUser={currentUser} title={title} activeKey={activeKey} onLogout={handleLogout}>
      <div className="transaction-page">
        <section className="txn-panel txn-top">
          <h5>{title}</h5>
          <p className="dashboard-footnote">This module is not implemented yet, but the route and sidebar navigation are now active.</p>
        </section>
      </div>
    </AdminSidebarLayout>
  )
}

export default ModulePlaceholderPage
