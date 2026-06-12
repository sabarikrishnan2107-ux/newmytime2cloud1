import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../../services/api'
import Icon from '../../components/Icon'
import Toast from '../../components/Toast'
import { useToast } from '../../hooks/useToast'

const METHODS = [
  { value: 'cash',   label: 'Cash' },
  { value: 'bank',   label: 'Bank Transfer' },
  { value: 'card',   label: 'Card' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'online', label: 'Online' },
  { value: 'other',  label: 'Other' },
]

function todayISO() {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

export default function PaymentCreate() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const presetCompanyId = searchParams.get('company_id') || ''
  const { toasts, success, error } = useToast()

  const [companies, setCompanies] = useState([])
  const [companiesLoading, setCompaniesLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const [form, setForm] = useState({
    company_id:    presetCompanyId,
    amount:        '',
    description:   '',
    tax_percent:   '5',
    payment_date:  todayISO(),
    method:        'bank',
    reference_no:  '',
    notes:         '',
    email_now:     false,
    email_message: '',
  })

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('company', { params: { per_page: 500, page: 1 } })
        const list = (data.data || []).slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        setCompanies(list)
      } catch {
        error('Failed to load companies')
      } finally {
        setCompaniesLoading(false)
      }
    })()
  }, [error])

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  const FE = ({ field }) =>
    errors[field]
      ? <span className="field-error">{Array.isArray(errors[field]) ? errors[field][0] : errors[field]}</span>
      : null

  const selectedCompany = companies.find((c) => String(c.id) === String(form.company_id))
  const currency = selectedCompany?.currency || 'AED'

  const amountNum = Number(form.amount || 0)
  const taxPct    = Number(form.tax_percent || 0)
  const taxAmount = Math.round(amountNum * taxPct) / 100
  const total     = Math.round((amountNum + taxAmount) * 100) / 100

  const submit = async () => {
    setLoading(true)
    setErrors({})
    try {
      const payload = {
        company_id:    form.company_id ? Number(form.company_id) : null,
        amount:        form.amount,
        description:   form.description,
        tax_percent:   form.tax_percent === '' ? 0 : Number(form.tax_percent),
        payment_date:  form.payment_date,
        method:        form.method,
        reference_no:  form.reference_no || null,
        notes:         form.notes || null,
        email_now:     !!form.email_now,
        email_message: form.email_message || null,
      }

      const { data } = await api.post('/master/payments', payload)

      if (!data.status) {
        setErrors(data.errors || {})
        error('Please fix the errors and try again')
        return
      }

      if (data.email_error) {
        error(`Payment recorded, but email failed: ${data.email_error}`)
      } else if (payload.email_now) {
        success('Payment recorded & invoice emailed')
      } else {
        success('Payment recorded successfully')
      }

      const invoiceId = data.record?.id
      setTimeout(() => {
        if (invoiceId) navigate(`/invoices/${invoiceId}`)
        else navigate('/payments')
      }, 600)
    } catch (e) {
      if (e.response?.data?.errors) setErrors(e.response.data.errors)
      error(e.response?.data?.message || 'Failed to record payment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fade-up">
      <div className="page-header">
        <div>
          <div className="page-title">Record Payment</div>
          <div className="page-subtitle">An invoice will be generated automatically</div>
        </div>
        <button className="btn btn-ghost" onClick={() => navigate('/payments')}>
          <Icon name="back" size={14} /> Back
        </button>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="section-header">
            <div className="section-header-icon"><Icon name="payment" size={18} /></div>
            <div>
              <div className="section-header-title">Payment Details</div>
              <div className="section-header-sub">Enter the amount received from the company</div>
            </div>
          </div>

          <div className="grid-2 gap-4">
            <div className="field">
              <label>Company *</label>
              <select
                className={`input ${errors.company_id ? 'input-error' : ''}`}
                value={form.company_id}
                onChange={(e) => set('company_id', e.target.value)}
                disabled={companiesLoading}
              >
                <option value="">{companiesLoading ? 'Loading companies…' : 'Select a company'}</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.currency ? `(${c.currency})` : ''}
                  </option>
                ))}
              </select>
              <FE field="company_id" />
            </div>

            <div className="field">
              <label>Payment Date *</label>
              <input
                type="date"
                className={`input ${errors.payment_date ? 'input-error' : ''}`}
                value={form.payment_date}
                onChange={(e) => set('payment_date', e.target.value)}
              />
              <FE field="payment_date" />
            </div>

            <div className="field">
              <label>Amount (before tax) *</label>
              <div className="flex items-center gap-2">
                <span className="text-content-muted text-sm shrink-0 px-2">{currency}</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className={`input ${errors.amount ? 'input-error' : ''}`}
                  value={form.amount}
                  onChange={(e) => set('amount', e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <FE field="amount" />
            </div>

            <div className="field">
              <label>VAT / Tax (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                className={`input ${errors.tax_percent ? 'input-error' : ''}`}
                value={form.tax_percent}
                onChange={(e) => set('tax_percent', e.target.value)}
                placeholder="5"
              />
              <FE field="tax_percent" />
            </div>

            <div className="field">
              <label>Payment Method *</label>
              <select
                className={`input ${errors.method ? 'input-error' : ''}`}
                value={form.method}
                onChange={(e) => set('method', e.target.value)}
              >
                {METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <FE field="method" />
            </div>

            <div className="field">
              <label>Reference Number</label>
              <input
                className={`input ${errors.reference_no ? 'input-error' : ''}`}
                value={form.reference_no}
                onChange={(e) => set('reference_no', e.target.value)}
                placeholder="Transaction / cheque #"
              />
              <FE field="reference_no" />
            </div>
          </div>

          <div className="field mt-4">
            <label>Description *</label>
            <textarea
              rows={3}
              className={`input ${errors.description ? 'input-error' : ''}`}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="e.g. Annual subscription renewal for 2026"
            />
            <FE field="description" />
          </div>

          <div className="field mt-2">
            <label>Internal Notes</label>
            <textarea
              rows={2}
              className={`input ${errors.notes ? 'input-error' : ''}`}
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Not shown on the invoice"
            />
            <FE field="notes" />
          </div>

          {/* Totals preview */}
          <div className="bg-surface-2 border border-border-2 rounded-lg p-4 mt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-content-muted">Subtotal</span>
              <span>{currency} {amountNum.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-content-muted">VAT ({taxPct || 0}%)</span>
              <span>{currency} {taxAmount.toFixed(2)}</span>
            </div>
            <div className="border-t border-border-2 mt-3 pt-3 flex items-center justify-between">
              <span className="font-semibold">Total</span>
              <span className="text-lg font-bold text-accent">{currency} {total.toFixed(2)}</span>
            </div>
          </div>

          {/* Email section */}
          <div className="section-header mt-6">
            <div className="section-header-icon"><Icon name="mail" size={18} /></div>
            <div>
              <div className="section-header-title">Email Invoice</div>
              <div className="section-header-sub">Optionally send the invoice PDF to the company now</div>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.email_now}
              onChange={(e) => set('email_now', e.target.checked)}
            />
            <span className="text-base text-content-secondary">
              Email invoice to company immediately after recording
            </span>
          </label>

          {form.email_now && (
            <div className="field mt-3">
              <label>Custom message (optional)</label>
              <textarea
                rows={3}
                className="input"
                value={form.email_message}
                onChange={(e) => set('email_message', e.target.value)}
                placeholder="Add a short note to the email"
              />
            </div>
          )}
        </div>

        <div className="form-footer">
          <button className="btn btn-ghost" onClick={() => navigate('/payments')} disabled={loading}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={submit} disabled={loading}>
            {loading ? <span className="spinner spinner-sm" /> : <><Icon name="check" size={14} /> Record Payment</>}
          </button>
        </div>
      </div>

      <Toast toasts={toasts} />
    </div>
  )
}
