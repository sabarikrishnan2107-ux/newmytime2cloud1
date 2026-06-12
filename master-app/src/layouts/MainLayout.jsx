import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AppSidebar from '../components/AppSidebar'
import AppHeader from '../components/AppHeader'

export default function MainLayout({ title }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="flex min-h-screen bg-bg">
      <AppSidebar />
      <div className="flex-1 ml-sidebar flex flex-col min-h-screen">
        <AppHeader title={title} />
        <main className="flex-1 px-6 pt-6 pb-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
