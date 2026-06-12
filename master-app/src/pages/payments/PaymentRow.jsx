import { useNavigate } from 'react-router-dom'
import Icon from '../../components/Icon'
import api from '../../services/api'
import { downloadBlob } from '../../services/downloadBlob'

function fmtAmount(currency, amount) {
  const num = Number(amount ?? 0)
  return `${currency || 'AED'} ${num.toFixed(2)}`
}

function fmtDate(d) {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString(undefined, {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  } catch { return d }
}

export default function PaymentRow({ payment, index, showCompany = true, onEmail, onError }) {
  const navigate = useNavigate()
  const invoice = payment.invoice
  const currency = payment.currency || payment.company?.currency || 'AED'

  const handleDownload = async (e) => {
    e.stopPropagation()
    if (!invoice) return
    try {
      await downloadBlob(
        (cfg) => api.get(`/master/invoices/${invoice.id}/pdf`, cfg),
        `${invoice.number}.pdf`,
      )
    } catch {
      onError?.('Failed to download invoice PDF')
    }
  }

  return (
    <tr
      className="cursor-pointer"
      onClick={() => invoice && navigate(`/invoices/${invoice.id}`)}
    >
      <td className="muted text-sm">{index}</td>
      {showCompany && (
        <td>
          <span className="font-semibold">{payment.company?.name || '—'}</span>
        </td>
      )}
      <td className="muted">{fmtDate(payment.payment_date)}</td>
      <td>
        <span className="font-semibold">{fmtAmount(currency, payment.amount)}</span>
      </td>
      <td className="muted">
        <span className="capitalize">{payment.method}</span>
        {payment.reference_no && (
          <span className="text-content-disabled"> · {payment.reference_no}</span>
        )}
      </td>
      <td>
        {invoice ? (
          <span className="text-accent font-semibold">{invoice.number}</span>
        ) : (
          <span className="text-content-disabled">—</span>
        )}
      </td>
      <td>
        {invoice?.sent_at
          ? <span className="badge badge-success"><span className="badge-dot" />Sent</span>
          : <span className="badge badge-warning"><span className="badge-dot" />Not sent</span>}
      </td>
      <td className="text-center" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-center gap-1">
          <button
            title="Download invoice PDF"
            className="btn-icon"
            disabled={!invoice}
            onClick={handleDownload}
          >
            <Icon name="download" size={14} />
          </button>
          <button
            title="Email invoice"
            className="btn-icon"
            disabled={!invoice}
            onClick={(e) => { e.stopPropagation(); invoice && onEmail?.(invoice) }}
          >
            <Icon name="mail" size={14} />
          </button>
          <button
            title="View invoice"
            className="btn-icon"
            disabled={!invoice}
            onClick={(e) => { e.stopPropagation(); invoice && navigate(`/invoices/${invoice.id}`) }}
          >
            <Icon name="eye" size={14} />
          </button>
        </div>
      </td>
    </tr>
  )
}
