import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import Icon from '../components/Icon'
import {
  ResponsiveContainer,
  AreaChart, Area,
  BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'

const PALETTE = ['#7c3aed','#0ea5e9','#10b981','#f59e0b','#ef4444','#ec4899','#8b5cf6','#06b6d4']
function avatarColor(name = '') {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return PALETTE[Math.abs(h) % PALETTE.length]
}

function CompanyAvatar({ name = '?', size = 28 }) {
  const c = avatarColor(name)
  return (
    <div
      className="flex items-center justify-center font-bold uppercase shrink-0"
      style={{
        width: size, height: size,
        borderRadius: Math.round(size * 0.26),
        background: c + '28', border: `1.5px solid ${c}50`,
        fontSize: size * 0.38, color: c,
      }}
    >
      {name[0]}
    </div>
  )
}

function StatCard({ icon, iconColor, iconBg, label, value, sub, loading }) {
  return (
    <div className="card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-md flex items-center justify-center ${iconBg}`}>
          <Icon name={icon} size={18} color={iconColor} />
        </div>
        {sub && (
          <span className="text-xs text-content-muted font-medium">{sub}</span>
        )}
      </div>
      {loading ? (
        <div className="h-8 w-16 bg-surface-2 rounded animate-pulse" />
      ) : (
        <div>
          <div className="text-[28px] font-extrabold text-content leading-none">{value}</div>
          <div className="text-sm text-content-muted mt-1.5">{label}</div>
        </div>
      )}
    </div>
  )
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface border border-border-2 rounded-md px-3 py-2 shadow-[0_8px_24px_rgba(0,0,0,.5)]">
      {label && <div className="text-[11px] text-content-muted mb-1.5 font-medium">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-base text-content">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color || p.payload?.fill }} />
          <span className="font-bold">{p.value?.toLocaleString?.() ?? p.value}</span>
          <span className="text-content-muted text-sm">{p.name}</span>
        </div>
      ))}
    </div>
  )
}

// ── Data helpers ──────────────────────────────────────────────
function groupRegistrationsByMonth(list, months = 6) {
  const now = new Date()
  const buckets = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    buckets.push({
      key,
      label: d.toLocaleString('en', { month: 'short' }),
      count: 0,
    })
  }
  const index = new Map(buckets.map(b => [b.key, b]))

  list.forEach(c => {
    const raw = c.member_from
    if (!raw) return
    const d = new Date(String(raw).replace(/\//g, '-'))
    if (isNaN(d)) return
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const bucket = index.get(key)
    if (bucket) bucket.count += 1
  })
  return buckets
}

function topCompaniesByEmployees(list, limit = 5) {
  return [...list]
    .filter(c => (c.employees_count ?? 0) > 0)
    .sort((a, b) => (b.employees_count || 0) - (a.employees_count || 0))
    .slice(0, limit)
    .map(c => ({
      name: c.name?.length > 16 ? c.name.slice(0, 15) + '…' : (c.name || '—'),
      employees: c.employees_count || 0,
      fullName: c.name,
    }))
}

function daysUntil(raw) {
  if (!raw) return null
  const d = new Date(String(raw).replace(/\//g, '-'))
  if (isNaN(d)) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  d.setHours(0, 0, 0, 0)
  return Math.round((d - today) / 86400000)
}

function expiringCompanies(list, windowDays = 30) {
  return list
    .map(c => ({ ...c, _days: daysUntil(c.expiry) }))
    .filter(c => c._days !== null && c._days >= 0 && c._days <= windowDays)
    .sort((a, b) => a._days - b._days)
}

function expiryBadge(days) {
  if (days <= 7)  return { cls: 'bg-error-dim text-error',     label: days === 0 ? 'Today' : `${days}d` }
  if (days <= 15) return { cls: 'bg-warning-dim text-warning', label: `${days}d` }
  return            { cls: 'bg-info-dim text-info',            label: `${days}d` }
}

function formatShortDate(raw) {
  const d = new Date(String(raw || '').replace(/\//g, '-'))
  if (isNaN(d)) return '—'
  return `${String(d.getDate()).padStart(2,'0')} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]} ${d.getFullYear()}`
}

// ── Main component ────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [companies, setCompanies] = useState([])
  const [totalAll, setTotalAll] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const { data } = await api.get('company', { params: { per_page: 100, page: 1 } })
        const list = data.data || []
        setCompanies(list)
        setTotalAll(data.total || list.length)
      } catch {
        /* silent — placeholders shown */
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const stats = useMemo(() => {
    const active   = companies.filter(c => c.status !== 0 && c.status !== false).length
    const inactive = companies.filter(c => c.status === 0 || c.status === false).length
    const employees = companies.reduce((s, c) => s + (c.employees_count || 0), 0)
    const branches  = companies.reduce((s, c) => s + (c.branches_count  || 0), 0)
    const devices   = companies.reduce((s, c) => s + (c.devices_count   || 0), 0)
    return { active, inactive, employees, branches, devices }
  }, [companies])

  const registrations = useMemo(() => groupRegistrationsByMonth(companies, 6), [companies])
  const topCompanies  = useMemo(() => topCompaniesByEmployees(companies, 5), [companies])
  const expiring      = useMemo(() => expiringCompanies(companies, 30), [companies])

  const recent = companies.slice(0, 8)

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  // ─── Render ─────────────────────────────────────────────────
  return (
    <div className="fade-up">
      {/* Page header */}
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">
            {greeting()}, {user?.name || 'Admin'} — here's what's happening today
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/companies/create')}>
          <Icon name="plus" size={15} /> New Company
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          icon="companies" iconColor="#7c3aed" iconBg="bg-accent-dim"
          label="Total Companies"
          value={loading ? '—' : totalAll.toLocaleString()}
          loading={loading}
        />
        <StatCard
          icon="check" iconColor="#10b981" iconBg="bg-success-dim"
          label="Active Companies"
          value={loading ? '—' : stats.active.toLocaleString()}
          sub={loading ? '' : `${totalAll > 0 ? Math.round((stats.active / totalAll) * 100) : 0}%`}
          loading={loading}
        />
        <StatCard
          icon="users" iconColor="#0ea5e9" iconBg="bg-info-dim"
          label="Total Employees"
          value={loading ? '—' : stats.employees.toLocaleString()}
          sub={loading ? '' : `${stats.branches} branches`}
          loading={loading}
        />
        <StatCard
          icon="device" iconColor="#f59e0b" iconBg="bg-warning-dim"
          label="Registered Devices"
          value={loading ? '—' : stats.devices.toLocaleString()}
          loading={loading}
        />
      </div>

      {/* Two-column: Registrations + Top companies bar */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Registrations area chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Registrations</div>
              <div className="card-subtitle">New companies over the last 6 months</div>
            </div>
            <div className="flex items-center gap-2 text-sm text-content-muted">
              <span className="w-2 h-2 rounded-full bg-accent" />
              Companies
            </div>
          </div>
          <div className="p-4 pt-2" style={{ height: 260 }}>
            {loading ? (
              <div className="h-full w-full bg-surface-2 rounded animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={registrations} margin={{ top: 12, right: 12, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"  stopColor="#7c3aed" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#7c3aed" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#21262d" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="#8b949e"
                    tick={{ fontSize: 11, fill: '#8b949e' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#8b949e"
                    tick={{ fontSize: 11, fill: '#8b949e' }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#30363d', strokeWidth: 1 }} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Companies"
                    stroke="#7c3aed"
                    strokeWidth={2}
                    fill="url(#regGrad)"
                    activeDot={{ r: 4, stroke: '#fff', strokeWidth: 1 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top companies bar */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Top Companies</div>
              <div className="card-subtitle">By employee count</div>
            </div>
          </div>
          <div className="p-4 pt-2" style={{ height: 260 }}>
            {loading ? (
              <div className="h-full w-full bg-surface-2 rounded animate-pulse" />
            ) : topCompanies.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-content-muted">
                <Icon name="users" size={28} />
                <span className="text-sm mt-2">No employee data yet</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topCompanies}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
                >
                  <CartesianGrid stroke="#21262d" horizontal={false} />
                  <XAxis
                    type="number"
                    stroke="#8b949e"
                    tick={{ fontSize: 11, fill: '#8b949e' }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#8b949e"
                    tick={{ fontSize: 11, fill: '#c9d1d9' }}
                    axisLine={false}
                    tickLine={false}
                    width={96}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(124,58,237,0.08)' }} />
                  <Bar dataKey="employees" name="Employees" fill="#0ea5e9" radius={[0, 6, 6, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Upcoming expiry */}
      <div className="card mb-6">
        <div className="card-header">
          <div>
            <div className="card-title">Upcoming Expiry</div>
            <div className="card-subtitle">Companies expiring in the next 30 days</div>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${expiring.length > 0 ? 'bg-warning-dim text-warning' : 'bg-success-dim text-success'}`}>
            {loading ? '—' : `${expiring.length} ${expiring.length === 1 ? 'company' : 'companies'}`}
          </span>
        </div>

        {loading ? (
          <div className="p-5 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 bg-surface-2 rounded animate-pulse" />
            ))}
          </div>
        ) : expiring.length === 0 ? (
          <div className="p-8 flex flex-col items-center text-content-muted">
            <Icon name="check" size={28} />
            <span className="text-sm mt-2">No companies expiring in the next 30 days</span>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {expiring.slice(0, 8).map(c => {
              const badge = expiryBadge(c._days)
              const stripe = c._days <= 7 ? 'bg-error' : c._days <= 15 ? 'bg-warning' : 'bg-info'
              return (
                <div
                  key={c.id}
                  className="relative flex items-center gap-3 pl-5 pr-5 py-3 cursor-pointer hover:bg-surface-2 transition-colors"
                  onClick={() => navigate(`/companies/${c.id}`)}
                >
                  <div className={`absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r ${stripe}`} />
                  {c.logo
                    ? <img src={c.logo} alt={c.name} className="w-[32px] h-[32px] rounded-[6px] object-cover shrink-0" />
                    : <CompanyAvatar name={c.name} size={32} />
                  }
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-content truncate">{c.name}</div>
                    <div className="text-xs text-content-muted mt-0.5">
                      Expires {formatShortDate(c.expiry)}
                      {c.user?.email && <> · {c.user.email}</>}
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${badge.cls}`}>
                    {badge.label}
                  </span>
                  <Icon name="chevronRight" size={14} className="text-content-muted shrink-0" />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Recent companies */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Recent Companies</div>
            <div className="card-subtitle">Latest {recent.length} registered</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/companies')}>
            View all <Icon name="chevronRight" size={13} />
          </button>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Company</th>
                <th>Email</th>
                <th>Location</th>
                <th>Employees</th>
                <th>Branches</th>
                <th>Status</th>
                <th style={{ width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j}>
                        <div className="h-3.5 bg-surface-2 rounded animate-pulse" style={{ width: j === 0 ? 140 : j === 6 ? 60 : 90 }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : recent.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">
                      <Icon name="companies" size={32} />
                      <h4>No companies yet</h4>
                      <p>Create your first company to get started</p>
                    </div>
                  </td>
                </tr>
              ) : recent.map(c => (
                <tr
                  key={c.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/companies/${c.id}`)}
                >
                  <td>
                    <div className="flex items-center gap-2.5">
                      {c.logo
                        ? <img src={c.logo} alt={c.name} className="w-[28px] h-[28px] rounded-[6px] object-cover shrink-0" />
                        : <CompanyAvatar name={c.name} size={28} />
                      }
                      <span className="font-semibold text-content">{c.name}</span>
                    </div>
                  </td>
                  <td className="muted">{c.user?.email || '—'}</td>
                  <td className="muted">{c.location || '—'}</td>
                  <td>
                    <span className="bg-info-dim text-info px-2 py-0.5 rounded-full text-xs font-semibold">
                      {c.employees_count ?? 0}
                    </span>
                  </td>
                  <td>
                    <span className="bg-accent-dim text-accent px-2 py-0.5 rounded-full text-xs font-semibold">
                      {c.branches_count ?? 0}
                    </span>
                  </td>
                  <td>
                    {c.status === 0 || c.status === false
                      ? <span className="badge badge-error"><span className="badge-dot" />Inactive</span>
                      : <span className="badge badge-success"><span className="badge-dot" />Active</span>
                    }
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <button
                      className="btn-icon"
                      onClick={() => navigate(`/companies/${c.id}`)}
                      title="Edit company"
                    >
                      <Icon name="edit" size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
