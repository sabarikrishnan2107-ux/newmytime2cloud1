import { useState } from 'react'
import api from '../../services/api'
import Icon from '../../components/Icon'

export default function InvoiceEmailModal({ invoice, onClose, onSent, onError }) {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setLoading(true)
    try {
      const { data } = await api.post(`/master/invoices/${invoice.id}/email`, {
        email_message: message || null,
      })
      onSent?.(data)
    } catch (e) {
      onError?.(e.response?.data?.message || 'Failed to send invoice')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal-title flex items-center gap-2">
          <Icon name="mail" size={16} /> Email invoice {invoice.number}
        </div>
        <div className="modal-body">
          <div className="field" style={{ marginBottom: 4 }}>
            <label>Optional message</label>
            <textarea
              className="input"
              rows={5}
              placeholder="Add a short note to the email (optional)…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={2000}
            />
          </div>
          <div className="text-xs text-content-muted mt-1">
            The invoice PDF is attached automatically.
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading}>
            {loading ? <span className="spinner spinner-sm" /> : <><Icon name="send" size={13} /> Send</>}
          </button>
        </div>
      </div>
    </div>
  )
}
