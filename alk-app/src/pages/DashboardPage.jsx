import { useNavigate } from 'react-router-dom'
import DashboardPanel from '../components/dashboard/DashboardPanel'
import UserDashboardPanel from '../components/dashboard/UserDashboardPanel'
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
    <>
      {currentUser.role === 'admin' ? (
        <DashboardPanel
          currentUser={currentUser}
          dashboardTitle={dashboardTitle}
          onLogout={handleLogout}
        />
      ) : (
        <>
          <TopNav currentUser={currentUser} onLogout={handleLogout} />
          <UserDashboardPanel currentUser={currentUser} dashboardTitle={dashboardTitle} />
        </>
      )}
    </>
  )
}

export default DashboardPage
