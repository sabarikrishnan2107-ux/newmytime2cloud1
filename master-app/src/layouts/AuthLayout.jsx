import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AuthLayout({ children }) {
  const { user } = useAuth()
  if (user) return <Navigate to="/companies" replace />

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-5">
      {children}
    </div>
  )
}
