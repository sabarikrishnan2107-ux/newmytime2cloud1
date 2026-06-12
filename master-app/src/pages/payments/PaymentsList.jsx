import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import Icon from '../../components/Icon'
import Toast from '../../components/Toast'
import { useToast } from '../../hooks/useToast'
import PaymentRow from './PaymentRow'
import InvoiceEmailModal from '../invoices/InvoiceEmailModal'

export default function PaymentsList() {
  const navigate = useNavigate()
  const { toasts, success, error } = useToast()

  const [payments, setPayments] = useState([])
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

  const fetchPayments = useCallback(async (q = '', f = '', t = '', pg = 1) => {
    setLoading(true)
    try {
      const { data } = await api.get('/master/payments', {
        params: { q, from: f || undefined, to: t || undefined, per_page: perPage, page: pg },
      })
      setPayments(data.data || [])
      setTotal(data.total || 0)
      setHasNext(!!data.next_page_url)
      setHasPrev(!!data.prev_page_url)
      setPage(data.current_page || 1)
    } catch {
      error('Failed to load payments')
    } finally {
      setLoading(false)
    }
  }, [error])

  useEffect(() => { fetchPayments() }, [fetchPayments])

  const handleSearch = (val) => {
    setSearch(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchPayments(val, from, to, 1), 500)
  }

  const applyDateFilters = () => fetchPayments(search, from, to, 1)
  const clearFilters = () => {
    setSearch(''); setFrom(''); setTo('')
    fetchPayments('', '', '', 1)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Payments</div>
          <div className="page-subtitle">{total} total payments recorded</div>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/payments/create')}>
          <Icon name="plus" size={15} /> Record Payment
        </button>
      </div>

      <div className="card fade-up">
        <div className="px-[18px] py-[14px] border-b border-border flex items-center gap-3 flex-wrap">
          <div className="search-bar flex-1 max-w-[280px]">
            <Icon name="search" size={14} color="#8b949e" />
            <input
              placeholder="Search by company…"
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
            {loading ? 'Loading…' : `${payments.length} shown`}
          </span>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>Company</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Invoice #</th>
                <th>Status</th>
                <th style={{ width: 140, textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-10">
                  <div className="flex justify-center"><span className="spinner" /></div>
                </td></tr>
              ) : payments.length === 0 ? (
                <tr><td colSpan={8}>
                  <div className="empty-state">
                    <Icon name="payment" size={32} />
                    <h4>No payments found</h4>
                    <p>Record your first payment to get started</p>
                  </div>
                </td></tr>
              ) : payments.map((p, idx) => (
                <PaymentRow
                  key={p.id}
                  payment={p}
                  index={(page - 1) * perPage + idx + 1}
                  onEmail={(invoice) => setEmailTarget(invoice)}
                  onError={(msg) => error(msg)}
                />
              ))}
            </tbody>
          </table>
        </div>

        {!loading && payments.length > 0 && (
          <div className="px-[18px] py-3 border-t border-border flex items-center justify-between">
            <span className="text-sm text-content-muted">Page {page} · {total} total</span>
            <div className="flex gap-1.5">
              <button className="btn-icon" disabled={!hasPrev} onClick={() => fetchPayments(search, from, to, page - 1)}>
                <Icon name="back" size={14} />
              </button>
              <div className="w-7 h-7 rounded-[6px] flex items-center justify-center bg-accent text-white text-sm font-semibold">{page}</div>
              <button className="btn-icon" disabled={!hasNext} onClick={() => fetchPayments(search, from, to, page + 1)}>
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
            fetchPayments(search, from, to, page)
          }}
          onError={(msg) => error(msg)}
        />
      )}

      <Toast toasts={toasts} />
    </div>
  )
}
