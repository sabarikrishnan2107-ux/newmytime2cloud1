export default function ConfirmModal({ title, message, onConfirm, onCancel, loading }) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">{title || 'Confirm'}</div>
        <div className="modal-body">{message}</div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onCancel} disabled={loading}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? <span className="spinner spinner-sm" /> : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}
