import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Icon from './Icon'

function getAvatarColor(name = '') {
  const colors = ['#7c3aed','#0ea5e9','#10b981','#f59e0b','#ef4444','#ec4899','#8b5cf6']
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

export default function AppHeader({ title }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const name = user?.name || 'Master'
  const color = getAvatarColor(name)

  return (
    <header className="h-header bg-surface border-b border-border flex items-center justify-between px-[22px] sticky top-0 z-50">
      <div className="text-lg font-bold text-content">{title}</div>

      <div className="relative">
        <button
          onClick={() => setMenuOpen(v => !v)}
          className="flex items-center gap-2 bg-transparent text-content-secondary px-2 py-1 rounded hover:bg-surface-2 transition-colors duration-150"
        >
          <div
            className="w-[30px] h-[30px] rounded-lg flex items-center justify-center text-sm font-bold"
            style={{ background: color + '28', border: `1.5px solid ${color}50`, color }}
          >
            {name[0].toUpperCase()}
          </div>
          <span className="text-base font-medium">{name}</span>
          <Icon name="chevronDown" size={14} />
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-[calc(100%+6px)] bg-surface border border-border-2 rounded-md p-1.5 min-w-[160px] z-[11] shadow-[0_8px_32px_rgba(0,0,0,.5)] fade-up">
              <div className="px-2.5 pt-1.5 pb-2 border-b border-border mb-1">
                <div className="text-sm font-semibold text-content">{name}</div>
                <div className="text-xs text-content-muted">{user?.email}</div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-2.5 py-[7px] rounded-[6px] bg-transparent text-error text-base font-medium hover:bg-error-dim transition-colors duration-100"
              >
                <Icon name="logout" size={14} />
                Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
