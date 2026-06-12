import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import Icon from '../../components/Icon'
import ConfirmModal from '../../components/ConfirmModal'
import Toast from '../../components/Toast'
import { useToast } from '../../hooks/useToast'

const COLORS = ['#7c3aed','#0ea5e9','#10b981','#f59e0b','#ef4444','#ec4899','#8b5cf6','#06b6d4']
function avatarColor(name = '') {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return COLORS[Math.abs(h) % COLORS.length]
}

function CompanyAvatar({ name = '?', size = 30 }) {
  const c = avatarColor(name)
  return (
    <div
      className="flex items-center justify-center font-bold uppercase shrink-0"
      style={{
        width: size, height: size,
        borderRadius: Math.round(size * 0.24),
        background: c + '28', border: `1.5px solid ${c}50`,
        fontSize: size * 0.38, color: c,
      }}
    >
      {name[0]}
    </div>
  )
}

function ActionMenu({ item, onEdit, onView, onDelete }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  return (
    <div ref={ref} className="relative">
      <button className="btn-icon" onClick={() => setOpen(v => !v)}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+4px)] bg-surface border border-border-2 rounded-md p-1.5 min-w-[140px] z-20 shadow-[0_8px_24px_rgba(0,0,0,.5)] fade-up">
          {[
            { icon: 'edit',  label: 'Edit',   action: () => { onEdit(item);   setOpen(false) } },
            { icon: 'eye',   label: 'View',   action: () => { onView(item);   setOpen(false) } },
            { icon: 'trash', label: 'Delete', action: () => { onDelete(item); setOpen(false) }, danger: true },
          ].map(btn => (
            <button key={btn.label} onClick={btn.action}
              className={`w-full flex items-center gap-2 px-2.5 py-[7px] rounded-[6px] bg-transparent text-base font-medium transition-colors duration-100 hover:${btn.danger ? 'bg-error-dim' : 'bg-surface-2'} ${btn.danger ? 'text-error' : 'text-content-secondary'}`}
            >
              <Icon name={btn.icon} size={14} />{btn.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function DetailField({ label, value }) {
  return (
    <div className="field">
      <label>{label}</label>
      <div className={`bg-surface-2 border border-border-2 rounded px-3 py-2 text-base ${value ? 'text-content' : 'text-content-disabled'}`}>
        {value || '—'}
      </div>
    </div>
  )
}

function StatMini({ label, value, icon }) {
  return (
    <div className="bg-surface-2 border border-border rounded-[10px] p-[10px] flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <div className="w-[26px] h-[26px] rounded-[7px] bg-accent-dim flex items-center justify-center">
          <Icon name={icon} size={13} color="#7c3aed" />
        </div>
        <span className="text-[11px] text-content-muted uppercase tracking-[.5px] font-semibold">{label}</span>
      </div>
      <span className="text-[22px] font-extrabold text-content">{value ?? 0}</span>
    </div>
  )
}

function CompanyDetail({ company, onEdit, onDelete }) {
  const [tab, setTab] = useState('profile')
  const TABS = [
    { key: 'profile',  label: 'Profile',  icon: 'companies' },
    { key: 'contact',  label: 'Contact',  icon: 'users' },
    { key: 'location', label: 'Location', icon: 'pin' },
    { key: 'license',  label: 'License',  icon: 'log' },
  ]
  const c = company
  const contact = c.contact || {}
  const license = c.trade_license || {}

  return (
    <div className="flex flex-col h-full overflow-hidden slide-right">
      {/* Header */}
      <div className="px-[22px] pt-[18px] pb-[14px] border-b border-border bg-surface shrink-0">
        <div className="flex items-start gap-3 mb-[14px]">
          {c.logo
            ? <img src={c.logo} alt={c.name} className="w-[46px] h-[46px] rounded-[10px] object-cover shrink-0" />
            : <CompanyAvatar name={c.name} size={46} />
          }
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-content mb-[3px] leading-snug">{c.name}</h2>
            <div className="flex items-center gap-[5px] mb-0.5">
              <Icon name="mail" size={11} color="#8b949e" />
              <span className="text-[11.5px] text-content-muted">{c.user?.email || '—'}</span>
            </div>
            <div className="flex items-center gap-[5px]">
              <Icon name="pin" size={11} color="#8b949e" />
              <span className="text-[11.5px] text-content-muted">{c.location || '—'}</span>
            </div>
          </div>
          <div className="flex gap-1.5 items-center shrink-0">
            {c.status === 0 || c.status === false
              ? <span className="badge badge-error"><span className="badge-dot" />Inactive</span>
              : <span className="badge badge-success"><span className="badge-dot" />Active</span>
            }
            <button className="btn btn-ghost btn-sm" onClick={() => onEdit(c)}>
              <Icon name="edit" size={12} /> Edit
            </button>
          </div>
        </div>
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <StatMini label="Employees" value={c.employees_count} icon="users" />
          <StatMini label="Branches"  value={c.branches_count}  icon="companies" />
          <StatMini label="Devices"   value={c.devices_count}   icon="device" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border bg-surface shrink-0 px-2 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key}
            className={`tab-btn ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            <Icon name={t.icon} size={13} />{t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div key={tab} className="flex-1 overflow-y-auto p-[18px_22px] bg-bg fade-in">
        {tab === 'profile' && (
          <div className="flex flex-col gap-3">
            <div className="grid-3">
              <DetailField label="Company Code" value={c.company_code} />
              <DetailField label="Company Name" value={c.name} />
              <DetailField label="Email"        value={c.user?.email} />
            </div>
            <div className="grid-2">
              <DetailField label="MOL ID"      value={c.mol_id} />
              <DetailField label="P.O Box"     value={c.p_o_box_no} />
              <DetailField label="Member From" value={c.member_from} />
              <DetailField label="Expiry"      value={c.expiry} />
            </div>
            <div className="grid-3">
              <DetailField label="Max Branches"  value={c.max_branches} />
              <DetailField label="Max Employees" value={c.max_employee} />
              <DetailField label="Max Devices"   value={c.max_devices} />
            </div>
            <div className="grid-2">
              <DetailField label="Max Mobile Devices"  value={c.max_mobile_devices} />
              <DetailField label="Max Mobile Trackers" value={c.max_mobile_trackers} />
            </div>
          </div>
        )}
        {tab === 'contact' && (
          <div className="grid-2 gap-3">
            <DetailField label="Name"     value={contact.name} />
            <DetailField label="Number"   value={contact.number} />
            <DetailField label="Position" value={contact.position} />
            <DetailField label="WhatsApp" value={contact.whatsapp} />
          </div>
        )}
        {tab === 'location' && (
          <div className="flex flex-col gap-3">
            <div className="grid-3">
              <DetailField label="Latitude"  value={c.lat} />
              <DetailField label="Longitude" value={c.lon} />
              <DetailField label="Location"  value={c.location} />
            </div>
            {c.lat && c.lon && (
              <div
                className="bg-surface-2 border border-border-2 rounded-xl h-[120px] flex items-center justify-center flex-col gap-1.5"
                style={{
                  backgroundImage: 'repeating-linear-gradient(0deg,#30363d 0,#30363d 1px,transparent 0,transparent 40px),repeating-linear-gradient(90deg,#30363d 0,#30363d 1px,transparent 0,transparent 40px)',
                  backgroundSize: '40px 40px'
                }}
              >
                <div className="w-[30px] h-[30px] rounded-full bg-accent-dim border-2 border-accent flex items-center justify-center">
                  <Icon name="pin" size={13} color="#7c3aed" />
                </div>
                <span className="text-[10.5px] text-content-muted font-mono">{c.lat}, {c.lon}</span>
              </div>
            )}
          </div>
        )}
        {tab === 'license' && (
          <div className="flex flex-col gap-3">
            <div className="grid-2">
              <DetailField label="License No"   value={license.license_no} />
              <DetailField label="License Type" value={license.license_type} />
              <DetailField label="Emirate"      value={license.emirate} />
              <DetailField label="Manager"      value={license.manager} />
              <DetailField label="Makeem No"    value={license.makeem_no} />
            </div>
            <div className="grid-2">
              <DetailField label="Issue Date"  value={license.issue_date} />
              <DetailField label="Expiry Date" value={license.expiry_date} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────
export default function CompaniesList() {
  const navigate = useNavigate()
  const { toasts, success, error } = useToast()

  const [companies, setCompanies]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [page, setPage]             = useState(1)
  const [total, setTotal]           = useState(0)
  const [hasNext, setHasNext]       = useState(false)
  const [hasPrev, setHasPrev]       = useState(false)
  const [view, setView]             = useState(() => localStorage.getItem('master_view') || 'table')
  const [selected, setSelected]     = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [splitSearch, setSplitSearch]    = useState('')
  const perPage = 50
  const debounceRef = useRef(null)

  const fetchCompanies = useCallback(async (query = '', pg = 1) => {
    setLoading(true)
    try {
      const url = query.length > 1 ? `company/search/${query}` : 'company'
      const { data } = await api.get(url, { params: { per_page: perPage, page: pg } })
      const list = data.data || []
      setCompanies(list)
      setTotal(data.total || 0)
      setHasNext(!!data.next_page_url)
      setHasPrev(!!data.prev_page_url)
      setPage(data.current_page || 1)
      if (list.length && !selected) setSelected(list[0])
    } catch { error('Failed to load companies') }
    finally { setLoading(false) }
  }, [error])

  useEffect(() => { fetchCompanies() }, [fetchCompanies])

  const handleSearch = val => {
    setSearch(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchCompanies(val, 1), 500)
  }

  const switchView = v => {
    setView(v)
    localStorage.setItem('master_view', v)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await api.delete(`company/${deleteTarget.id}`)
      setCompanies(prev => prev.filter(c => c.id !== deleteTarget.id))
      setTotal(t => t - 1)
      if (selected?.id === deleteTarget.id) setSelected(null)
      success('Company deleted successfully')
    } catch { error('Failed to delete company') }
    finally { setDeleteLoading(false); setDeleteTarget(null) }
  }

  const filteredSplit = companies.filter(c =>
    !splitSearch ||
    c.name?.toLowerCase().includes(splitSearch.toLowerCase()) ||
    c.user?.email?.toLowerCase().includes(splitSearch.toLowerCase())
  )

  // ── Table View ─────────────────────────────────────────────
  const TableView = (
    <div className="card fade-up">
      <div className="px-[18px] py-[14px] border-b border-border flex items-center gap-3">
        <div className="search-bar flex-1 max-w-[280px]">
          <Icon name="search" size={14} color="#8b949e" />
          <input placeholder="Search companies…" value={search} onChange={e => handleSearch(e.target.value)} />
          {search && (
            <button className="bg-transparent text-content-muted p-0"
              onClick={() => handleSearch('')}>
              <Icon name="close" size={13} />
            </button>
          )}
        </div>
        <span className="text-sm text-content-muted ml-auto">
          {loading ? 'Loading…' : `${companies.length} shown`}
        </span>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th>Company</th>
              <th>Email</th>
              <th>Location</th>
              <th>Employees</th>
              <th>Status</th>
              <th style={{ width: 60, textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-10">
                <div className="flex justify-center"><span className="spinner" /></div>
              </td></tr>
            ) : companies.length === 0 ? (
              <tr><td colSpan={7}>
                <div className="empty-state">
                  <Icon name="companies" size={32} />
                  <h4>No companies found</h4>
                  <p>{search ? 'Try a different search term' : 'Create your first company to get started'}</p>
                </div>
              </td></tr>
            ) : companies.map((c, idx) => (
              <tr key={c.id} className="cursor-pointer" onClick={() => { setSelected(c); switchView('split') }}>
                <td className="muted text-sm">{(page - 1) * perPage + idx + 1}</td>
                <td>
                  <div className="flex items-center gap-2.5">
                    {c.logo
                      ? <img src={c.logo} alt={c.name} className="w-[30px] h-[30px] rounded-[7px] object-cover" />
                      : <CompanyAvatar name={c.name} />
                    }
                    <span className="font-semibold">{c.name}</span>
                  </div>
                </td>
                <td className="muted">{c.user?.email || '—'}</td>
                <td className="muted">{c.location || '—'}</td>
                <td>
                  <span className="bg-accent-dim text-accent px-2 py-0.5 rounded-full text-xs font-semibold">
                    {c.employees_count ?? 0}
                  </span>
                </td>
                <td>
                  {c.status === 0 || c.status === false
                    ? <span className="badge badge-error"><span className="badge-dot" />Inactive</span>
                    : <span className="badge badge-success"><span className="badge-dot" />Active</span>
                  }
                </td>
                <td className="text-center" onClick={e => e.stopPropagation()}>
                  <ActionMenu
                    item={c}
                    onEdit={item => navigate(`/companies/${item.id}`)}
                    onView={item => { setSelected(item); switchView('split') }}
                    onDelete={item => setDeleteTarget(item)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && companies.length > 0 && (
        <div className="px-[18px] py-3 border-t border-border flex items-center justify-between">
          <span className="text-sm text-content-muted">Page {page} · {total} total</span>
          <div className="flex gap-1.5">
            <button className="btn-icon" disabled={!hasPrev} onClick={() => fetchCompanies(search, page - 1)}>
              <Icon name="back" size={14} />
            </button>
            <div className="w-7 h-7 rounded-[6px] flex items-center justify-center bg-accent text-white text-sm font-semibold">{page}</div>
            <button className="btn-icon" disabled={!hasNext} onClick={() => fetchCompanies(search, page + 1)}>
              <Icon name="chevronRight" size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )

  // ── Split View ─────────────────────────────────────────────
  const SplitView = (
    <div className="card fade-up flex overflow-hidden" style={{ height: 'calc(100vh - 130px)' }}>
      {/* List panel */}
      <div className="w-[280px] shrink-0 border-r border-border flex flex-col bg-surface">
        <div className="p-[14px] pb-[10px] border-b border-border shrink-0">
          <div className="flex items-center gap-2 mb-2.5">
            <button className="btn-icon" onClick={() => switchView('table')}>
              <Icon name="back" size={13} />
            </button>
            <span className="text-md font-bold text-content flex-1">Companies</span>
            <button onClick={() => navigate('/companies/create')}
              className="w-[26px] h-[26px] rounded-[7px] bg-accent flex items-center justify-center">
              <Icon name="plus" size={14} color="#fff" />
            </button>
          </div>
          <div className="relative">
            <span className="absolute left-[9px] top-1/2 -translate-y-1/2 flex">
              <Icon name="search" size={12} color="#6e7681" />
            </span>
            <input
              value={splitSearch}
              onChange={e => setSplitSearch(e.target.value)}
              placeholder="Search…"
              className="w-full bg-bg border border-border rounded-[7px] text-content text-sm py-[7px] pr-[10px] pl-[27px] focus:border-accent transition-colors duration-150"
            />
          </div>
          <div className="text-[10.5px] text-content-disabled mt-1.5">
            {loading ? 'Loading…' : `${filteredSplit.length} companies`}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center pt-8">
              <span className="spinner" />
            </div>
          ) : filteredSplit.map(c => {
            const active = selected?.id === c.id
            return (
              <div key={c.id} onClick={() => setSelected(c)}
                className={`px-[14px] py-[10px] cursor-pointer border-l-[3px] border-b border-b-[rgba(33,38,45,.5)] transition-all duration-100 ${
                  active
                    ? 'border-l-accent bg-accent-dim'
                    : 'border-l-transparent bg-transparent hover:bg-surface-2'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {c.logo
                    ? <img src={c.logo} alt={c.name} className="w-[30px] h-[30px] rounded-[7px] object-cover shrink-0" />
                    : <CompanyAvatar name={c.name} size={30} />
                  }
                  <div className="flex-1 min-w-0">
                    <div className={`text-[12.5px] overflow-hidden text-ellipsis whitespace-nowrap ${active ? 'font-semibold text-content' : 'font-normal text-content-secondary'}`}>
                      {c.name}
                    </div>
                    <div className="text-[10.5px] text-content-muted mt-0.5">
                      {c.employees_count ?? 0} emp · {c.branches_count ?? 0} branches
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Detail panel */}
      <div className="flex-1 overflow-hidden flex flex-col min-w-0">
        {selected
          ? <CompanyDetail
              key={selected.id}
              company={selected}
              onEdit={c => navigate(`/companies/${c.id}`)}
              onDelete={c => setDeleteTarget(c)}
            />
          : (
            <div className="flex-1 flex items-center justify-center flex-col gap-3 text-content-disabled">
              <Icon name="companies" size={40} color="#30363d" />
              <span className="text-md">Select a company to view details</span>
            </div>
          )
        }
      </div>
    </div>
  )

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Companies</div>
          <div className="page-subtitle">{total} total companies</div>
        </div>
        <div className="flex items-center gap-2.5">
          {/* View toggle */}
          <div className="flex bg-surface border border-border rounded overflow-hidden">
            {[
              { v: 'table', icon: 'menu',        title: 'Table view' },
              { v: 'split', icon: 'chevronRight', title: 'Split view' },
            ].map(({ v, icon, title }) => (
              <button key={v} title={title} onClick={() => switchView(v)}
                className={`w-[34px] h-[34px] flex items-center justify-center transition-all duration-150 ${
                  view === v ? 'bg-accent-dim text-accent' : 'bg-transparent text-content-muted hover:bg-surface-2'
                }`}
              >
                <Icon name={icon} size={15} />
              </button>
            ))}
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/companies/create')}>
            <Icon name="plus" size={15} /> New Company
          </button>
        </div>
      </div>

      {view === 'table' ? TableView : SplitView}

      {deleteTarget && (
        <ConfirmModal
          title="Delete Company"
          message={`Are you sure you want to delete "${deleteTarget.name}"? This will also delete all associated data.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteLoading}
        />
      )}
      <Toast toasts={toasts} />
    </div>
  )
}
