import { NavLink } from 'react-router-dom'
import Icon from './Icon'

const NAV_ITEMS = [
  { icon: 'home',      label: 'Dashboard', to: '/dashboard' },
  { icon: 'companies', label: 'Companies', to: '/companies' },
  // { icon: 'payment',   label: 'Payments',  to: '/payments'  },
  // { icon: 'invoice',   label: 'Invoices',  to: '/invoices'  },
]

export default function AppSidebar() {
  return (
    <nav className="w-sidebar min-w-sidebar h-screen fixed left-0 top-0 bg-surface border-r border-border flex flex-col z-[100]">
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 h-header border-b border-border shrink-0">
        <div className="w-[32px] h-[32px] rounded-lg bg-accent flex items-center justify-center shrink-0 shadow-[0_2px_10px_rgba(124,58,237,.4)]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
        <div>
          <div className="text-base font-bold text-content leading-none">Master</div>
          <div className="text-[10.5px] text-content-muted mt-[3px]">Control Panel</div>
        </div>
      </div>

      {/* Nav items */}
      <div className="flex flex-col gap-0.5 px-2 pt-3 flex-1">
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-150 no-underline group ${
                isActive
                  ? 'bg-accent-dim text-accent'
                  : 'text-content-muted hover:bg-surface-2 hover:text-content-secondary'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon name={item.icon} size={16} />
                <span className={`text-base font-medium ${isActive ? 'text-accent' : ''}`}>
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
