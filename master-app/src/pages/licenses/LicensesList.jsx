import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import Icon from '../../components/Icon'
import Toast from '../../components/Toast'
import { useToast } from '../../hooks/useToast'

function isExpired(d) {
  if (!d) return false
  return new Date(d) < new Date(new Date().toDateString())
}

export default function LicensesList() {
  const navigate = useNavigate()
  const { toasts, success, error } = useToast()

  const [licenses, setLicenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [hasPrev, setHasPrev] = useState(false)
  const perPage = 50
  const debounceRef = useRef(null)

  const fetchLicenses = useCallback(async (query = '', pg = 1) => {
    setLoading(true)
    try {
      const { data } = await api.get('licenses', { params: { per_page: perPage, page: pg, key: query || undefined } })
      setLicenses(data.data || [])
      setTotal(data.total || 0)
      setHasNext(!!data.next_page_url)
      setHasPrev(!!data.prev_page_url)
      setPage(data.current_page || 1)
    } catch { error('Failed to load licenses') }
    finally { setLoading(false) }
  }, [error])

  useEffect(() => { fetchLicenses() }, [fetchLicenses])

  const handleSearch = (val) => {
    setSearch(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchLicenses(val, 1), 500)
  }

  const copyToken = async (token) => {
    try { await navigator.clipboard.writeText(token); success('License key copied') }
    catch { error('Copy failed') }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Licenses</div>
          <div className="page-subtitle">{total} total licenses</div>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/licenses/create')}>
          <Icon name="key" size={15} /> Generate License
        </button>
      </div>

      <div className="card fade-up">
        <div className="px-[18px] py-[14px] border-b border-border flex items-center gap-3">
          <div className="search-bar flex-1 max-w-[300px]">
            <Icon name="search" size={14} color="#8b949e" />
            <input placeholder="Search by id, company, fingerprint…" value={search} onChange={e => handleSearch(e.target.value)} />
            {search && (
              <button className="bg-transparent text-content-muted p-0" onClick={() => handleSearch('')}>
                <Icon name="close" size={13} />
              </button>
            )}
          </div>
          <span className="text-sm text-content-muted ml-auto">
            {loading ? 'Loading…' : `${licenses.length} shown`}
          </span>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>License ID</th>
                <th>Company</th>
                <th>Machine FP</th>
                <th>Max Emp</th>
                <th>Max Dev</th>
                <th>Expiry</th>
                <th>Status</th>
                <th style={{ width: 60, textAlign: 'center' }}>Key</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-10">
                  <div className="flex justify-center"><span className="spinner" /></div>
                </td></tr>
              ) : licenses.length === 0 ? (
                <tr><td colSpan={9}>
                  <div className="empty-state">
                    <Icon name="key" size={32} />
                    <h4>No licenses found</h4>
                    <p>{search ? 'Try a different search term' : 'Generate your first desktop license'}</p>
                  </div>
                </td></tr>
              ) : licenses.map((l, idx) => {
                const expired = isExpired(l.expiry)
                const superseded = l.status === 'superseded'
                return (
                  <tr key={l.id}>
                    <td className="muted text-sm">{(page - 1) * perPage + idx + 1}</td>
                    <td><span className="font-semibold font-mono text-xs">{l.license_id}</span></td>
                    <td className="muted">{l.company_name || (l.company_id ? `#${l.company_id}` : '—')}</td>
                    <td className="muted font-mono text-[11px]">{(l.machine_fp || '').slice(0, 12)}…</td>
                    <td>{l.max_employees}</td>
                    <td>{l.max_devices}</td>
                    <td className="muted">{l.expiry}</td>
                    <td>
                      {expired
                        ? <span className="badge badge-error"><span className="badge-dot" />Expired</span>
                        : superseded
                          ? <span className="badge badge-error"><span className="badge-dot" />Superseded</span>
                          : <span className="badge badge-success"><span className="badge-dot" />Active</span>}
                    </td>
                    <td className="text-center">
                      <button className="btn-icon" title="Copy license key" onClick={() => copyToken(l.token)}>
                        <Icon name="copy" size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {!loading && licenses.length > 0 && (
          <div className="px-[18px] py-3 border-t border-border flex items-center justify-between">
            <span className="text-sm text-content-muted">Page {page} · {total} total</span>
            <div className="flex gap-1.5">
              <button className="btn-icon" disabled={!hasPrev} onClick={() => fetchLicenses(search, page - 1)}>
                <Icon name="back" size={14} />
              </button>
              <div className="w-7 h-7 rounded-[6px] flex items-center justify-center bg-accent text-white text-sm font-semibold">{page}</div>
              <button className="btn-icon" disabled={!hasNext} onClick={() => fetchLicenses(search, page + 1)}>
                <Icon name="chevronRight" size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      <Toast toasts={toasts} />
    </div>
  )
}
