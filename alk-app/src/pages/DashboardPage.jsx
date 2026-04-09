import { useNavigate } from 'react-router-dom'
import DashboardPanel from '../components/dashboard/DashboardPanel'
import UserDashboardPanel from '../components/dashboard/UserDashboardPanel'
import AdminSidebarLayout from '../components/layout/AdminSidebarLayout'
import TopNav from '../components/layout/TopNav'
import { useAuth } from '../context/AuthContext'

function DashboardPage() {
  const navigate = useNavigate()
  const { currentUser, dashboardTitle, logout } = useAuth()

  async function handleLogout() {
    await logout()
    navigate('/', { replace: true })
  }

  if (!currentUser) {
    return null
  }

  return (
    <AdminSidebarLayout currentUser={currentUser} title={dashboardTitle} activeKey="" onLogout={handleLogout}>
      {currentUser.role === 'admin' ? (
        <DashboardPanel
          currentUser={currentUser}
          dashboardTitle={dashboardTitle}
        />
      ) : (
        <UserDashboardPanel currentUser={currentUser} dashboardTitle={dashboardTitle} />
      )}
    </AdminSidebarLayout>
  )
}

export default DashboardPage
