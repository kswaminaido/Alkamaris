import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

function RequireAuth({ children }) {
  const { currentUser } = useAuth()

  if (!currentUser) {
    return <Navigate to="/" replace />
  }

  return children
}

export default RequireAuth
