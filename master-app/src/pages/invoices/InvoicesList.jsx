import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import Icon from '../../components/Icon'
import Toast from '../../components/Toast'
import { useToast } from '../../hooks/useToast'
import { downloadBlob } from '../../services/downloadBlob'
import InvoiceEmailModal from './InvoiceEmailModal'

function fmtDate(d) {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString(undefined, {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  } catch { return d }
}

export default function InvoicesList() {
  const navigate = useNavigate()
  const { toasts, success, error } = useToast()

  const [invoices, setInvoices] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [from, setFrom]         = useState('')
  const [to, setTo]             = useState('')
  const [page, setPage]         = useState(1)
  const [total, setTotal]       = useState(0)
  const [hasNext, setHasNext]   = useState(false)
  const [hasPrev, setHasPrev]   = useState(false)
  const [emailTarget, setEmailTarget] = useState(null)
  const perPage = 20
  const debounceRef = useRef(null)

  const fetchInvoices = useCallback(async (q = '', f = '', t = '', pg = 1) => {
    setLoading(true)
    try {
      const { data } = await api.get('/master/invoices', {
        params: { q, from: f || undefined, to: t || undefined, per_page: perPage, page: pg },
      })
      setInvoices(data.data || [])
      setTotal(data.total || 0)
      setHasNext(!!data.next_page_url)
      setHasPrev(!!data.prev_page_url)
      setPage(data.current_page || 1)
    } catch {
      error('Failed to load invoices')
    } finally {
      setLoading(false)
    }
  }, [error])

  useEffect(() => { fetchInvoices() }, [fetchInvoices])

  const handleSearch = (val) => {
    setSearch(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchInvoices(val, from, to, 1), 500)
  }

  const applyDateFilters = () => fetchInvoices(search, from, to, 1)
  const clearFilters = () => {
    setSearch(''); setFrom(''); setTo('')
    fetchInvoices('', '', '', 1)
  }

  const download = async (inv, e) => {
    e.stopPropagation()
    try {
      await downloadBlob(
        (cfg) => api.get(`/master/invoices/${inv.id}/pdf`, cfg),
        `${inv.number}.pdf`,
      )
    } catch {
      error('Failed to download invoice PDF')
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Invoices</div>
          <div className="page-subtitle">{total} total invoices</div>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/payments/create')}>
          <Icon name="plus" size={15} /> Record Payment
        </button>
      </div>

      <div className="card fade-up">
        <div className="px-[18px] py-[14px] border-b border-border flex items-center gap-3 flex-wrap">
          <div className="search-bar flex-1 max-w-[300px]">
            <Icon name="search" size={14} color="#8b949e" />
            <input
              placeholder="Search by invoice # or company…"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
            {search && (
              <button className="bg-transparent text-content-muted p-0" onClick={() => handleSearch('')}>
                <Icon name="close" size={13} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-content-muted">From</label>
            <input
              type="date"
              className="input"
              style={{ width: 150 }}
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
            <label className="text-xs text-content-muted">To</label>
            <input
              type="date"
              className="input"
              style={{ width: 150 }}
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
            <button className="btn btn-ghost btn-sm" onClick={applyDateFilters}>Apply</button>
            {(search || from || to) && (
              <button className="btn btn-ghost btn-sm" onClick={clearFilters}>Clear</button>
            )}
          </div>

          <span className="text-sm text-content-muted ml-auto">
            {loading ? 'Loading…' : `${invoices.length} shown`}
          </span>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>Invoice</th>
                <th>Company</th>
                <th>Issue Date</th>
                <th>Subtotal</th>
                <th>VAT</th>
                <th>Total</th>
                <th>Status</th>
                <th style={{ width: 140, textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-10">
                  <div className="flex justify-center"><span className="spinner" /></div>
                </td></tr>
              ) : invoices.length === 0 ? (
                <tr><td colSpan={9}>
                  <div className="empty-state">
                    <Icon name="invoice" size={32} />
                    <h4>No invoices found</h4>
                    <p>Record a payment to generate the first invoice</p>
                  </div>
                </td></tr>
              ) : invoices.map((inv, idx) => {
                const cur = inv.currency || inv.company?.currency || 'AED'
                return (
                  <tr key={inv.id} className="cursor-pointer" onClick={() => navigate(`/invoices/${inv.id}`)}>
                    <td className="muted text-sm">{(page - 1) * perPage + idx + 1}</td>
                    <td><span className="font-semibold text-accent">{inv.number}</span></td>
                    <td>{inv.company?.name || '—'}</td>
                    <td className="muted">{fmtDate(inv.issue_date)}</td>
                    <td className="muted">{cur} {Number(inv.subtotal).toFixed(2)}</td>
                    <td className="muted">
                      {Number(inv.tax_percent) > 0
                        ? `${Number(inv.tax_percent)}% · ${cur} ${Number(inv.tax_amount).toFixed(2)}`
                        : '—'}
                    </td>
                    <td><span className="font-semibold">{cur} {Number(inv.total).toFixed(2)}</span></td>
                    <td>
                      {inv.sent_at
                        ? <span className="badge badge-success"><span className="badge-dot" />Sent</span>
                        : <span className="badge badge-warning"><span className="badge-dot" />Not sent</span>}
                    </td>
                    <td className="text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <button title="Download PDF" className="btn-icon" onClick={(e) => download(inv, e)}>
                          <Icon name="download" size={14} />
                        </button>
                        <button title="Email invoice" className="btn-icon" onClick={(e) => { e.stopPropagation(); setEmailTarget(inv) }}>
                          <Icon name="mail" size={14} />
                        </button>
                        <button title="View" className="btn-icon" onClick={(e) => { e.stopPropagation(); navigate(`/invoices/${inv.id}`) }}>
                          <Icon name="eye" size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {!loading && invoices.length > 0 && (
          <div className="px-[18px] py-3 border-t border-border flex items-center justify-between">
            <span className="text-sm text-content-muted">Page {page} · {total} total</span>
            <div className="flex gap-1.5">
              <button className="btn-icon" disabled={!hasPrev} onClick={() => fetchInvoices(search, from, to, page - 1)}>
                <Icon name="back" size={14} />
              </button>
              <div className="w-7 h-7 rounded-[6px] flex items-center justify-center bg-accent text-white text-sm font-semibold">{page}</div>
              <button className="btn-icon" disabled={!hasNext} onClick={() => fetchInvoices(search, from, to, page + 1)}>
                <Icon name="chevronRight" size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {emailTarget && (
        <InvoiceEmailModal
          invoice={emailTarget}
          onClose={() => setEmailTarget(null)}
          onSent={() => {
            success('Invoice emailed successfully')
            setEmailTarget(null)
            fetchInvoices(search, from, to, page)
          }}
          onError={(msg) => error(msg)}
        />
      )}

      <Toast toasts={toasts} />
    </div>
  )
}
