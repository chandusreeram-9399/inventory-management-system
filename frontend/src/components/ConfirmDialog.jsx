import Modal from './Modal'

export default function ConfirmDialog({ title, message, confirmLabel = 'Confirm', danger = true, onConfirm, onCancel }) {
  return (
    <Modal title={title} onClose={onCancel} width={420}>
      <p className="confirm-message">{message}</p>
      <div className="form-actions">
        <button className="btn btn--ghost" onClick={onCancel}>
          Cancel
        </button>
        <button className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
