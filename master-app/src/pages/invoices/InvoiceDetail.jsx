import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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

function fmtDateTime(d) {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleString(undefined, {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch { return d }
}

function Field({ label, value }) {
  return (
    <div className="field">
      <label>{label}</label>
      <div className={`bg-surface-2 border border-border-2 rounded px-3 py-2 text-base ${value ? 'text-content' : 'text-content-disabled'}`}>
        {value || '—'}
      </div>
    </div>
  )
}

export default function InvoiceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toasts, success, error } = useToast()

  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showEmail, setShowEmail] = useState(false)

  const fetchInvoice = async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/master/invoices/${id}`)
      setInvoice(data.record)
    } catch {
      error('Failed to load invoice')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchInvoice() }, [id])

  const download = async () => {
    if (!invoice) return
    try {
      await downloadBlob(
        (cfg) => api.get(`/master/invoices/${invoice.id}/pdf`, cfg),
        `${invoice.number}.pdf`,
      )
    } catch {
      error('Failed to download invoice PDF')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center pt-20">
        <span className="spinner" style={{ width: 28, height: 28 }} />
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="empty-state py-20">
        <Icon name="invoice" size={32} />
        <h4>Invoice not found</h4>
      </div>
    )
  }

  const cur = invoice.currency || invoice.company?.currency || 'AED'
  const company = invoice.company || {}
  const payment = invoice.payment || {}

  return (
    <div className="fade-up">
      <div className="page-header">
        <div>
          <div className="page-title">{invoice.number}</div>
          <div className="page-subtitle">
            Issued {fmtDate(invoice.issue_date)} · {company.name || '—'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost" onClick={() => navigate(-1)}>
            <Icon name="back" size={14} /> Back
          </button>
          <button className="btn btn-ghost" onClick={download}>
            <Icon name="download" size={14} /> Download PDF
          </button>
          <button className="btn btn-primary" onClick={() => setShowEmail(true)}>
            <Icon name="mail" size={14} /> {invoice.sent_at ? 'Resend Email' : 'Send Email'}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {invoice.sent_at && (
            <div className="bg-success-dim border border-success rounded-md px-3 py-2 mb-4 flex items-center gap-2 text-sm">
              <Icon name="check" size={14} color="#10b981" />
              <span className="text-success">Last sent {fmtDateTime(invoice.sent_at)}</span>
            </div>
          )}

          <div className="section-header">
            <div className="section-header-icon"><Icon name="companies" size={18} /></div>
            <div>
              <div className="section-header-title">Bill To</div>
              <div className="section-header-sub">Company receiving this invoice</div>
            </div>
          </div>
          <div className="grid-3 gap-3">
            <Field label="Company" value={company.name} />
            <Field label="Currency" value={cur} />
            <Field label="Location" value={company.location} />
          </div>

          <div className="section-header mt-6">
            <div className="section-header-icon"><Icon name="payment" size={18} /></div>
            <div>
              <div className="section-header-title">Payment</div>
              <div className="section-header-sub">How this was paid</div>
            </div>
          </div>
          <div className="grid-3 gap-3">
            <Field label="Payment Date" value={fmtDate(payment.payment_date)} />
            <Field label="Method" value={payment.method ? payment.method[0].toUpperCase() + payment.method.slice(1) : '—'} />
            <Field label="Reference" value={payment.reference_no} />
          </div>

          <div className="section-header mt-6">
            <div className="section-header-icon"><Icon name="invoice" size={18} /></div>
            <div>
              <div className="section-header-title">Description</div>
              <div className="section-header-sub">What was billed</div>
            </div>
          </div>
          <div className="bg-surface-2 border border-border-2 rounded-lg p-4 whitespace-pre-wrap text-base">
            {invoice.description}
          </div>

          <div className="section-header mt-6">
            <div className="section-header-icon"><Icon name="check" size={18} /></div>
            <div>
              <div className="section-header-title">Totals</div>
              <div className="section-header-sub">Subtotal, tax, and grand total</div>
            </div>
          </div>
          <div className="bg-surface-2 border border-border-2 rounded-lg p-4 max-w-[420px] ml-auto">
            <div className="flex items-center justify-between text-sm">
              <span className="text-content-muted">Subtotal</span>
              <span>{cur} {Number(invoice.subtotal).toFixed(2)}</span>
            </div>
            {Number(invoice.tax_percent) > 0 && (
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-content-muted">VAT ({Number(invoice.tax_percent)}%)</span>
                <span>{cur} {Number(invoice.tax_amount).toFixed(2)}</span>
              </div>
            )}
            <div className="border-t border-border-2 mt-3 pt-3 flex items-center justify-between">
              <span className="font-semibold">Total</span>
              <span className="text-xl font-bold text-accent">{cur} {Number(invoice.total).toFixed(2)}</span>
            </div>
          </div>

          {payment.notes && (
            <div className="mt-6">
              <div className="text-xs text-content-muted uppercase tracking-wide mb-1">Internal Notes</div>
              <div className="bg-surface-2 border border-border-2 rounded-lg p-3 text-sm whitespace-pre-wrap text-content-secondary">
                {payment.notes}
              </div>
            </div>
          )}
        </div>
      </div>

      {showEmail && (
        <InvoiceEmailModal
          invoice={invoice}
          onClose={() => setShowEmail(false)}
          onSent={() => {
            success('Invoice emailed successfully')
            setShowEmail(false)
            fetchInvoice()
          }}
          onError={(msg) => error(msg)}
        />
      )}

      <Toast toasts={toasts} />
    </div>
  )
}
