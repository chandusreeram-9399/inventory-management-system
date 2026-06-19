import { useEffect, useState } from 'react'
import { Plus, Trash2, Users } from 'lucide-react'
import { customersApi } from '../api/customers'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import EmptyState from '../components/EmptyState'
import { useToast } from '../context/ToastContext'

const emptyForm = { full_name: '', email: '', phone_number: '' }

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const { showToast } = useToast()

  const load = () => {
    setLoading(true)
    customersApi
      .list()
      .then(setCustomers)
      .catch((err) => showToast(err.message, 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(load, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async () => {
    try {
      await customersApi.remove(deleting.id)
      showToast(`"${deleting.full_name}" was deleted.`, 'success')
      setDeleting(null)
      load()
    } catch (err) {
      showToast(err.message, 'error')
      setDeleting(null)
    }
  }

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1 className="page__title">Customers</h1>
          <p className="page__subtitle">Everyone you sell to, in one place.</p>
        </div>
        <button className="btn btn--primary" onClick={() => setAdding(true)}>
          <Plus size={16} /> Add customer
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div className="page-loading">Loading customers…</div>
        ) : customers.length === 0 ? (
          <EmptyState
            icon={<Users size={28} />}
            title="No customers yet"
            message="Add a customer before you create your first order."
            action={
              <button className="btn btn--primary" onClick={() => setAdding(true)}>
                <Plus size={16} /> Add customer
              </button>
            }
          />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td className="table__primary">{c.full_name}</td>
                  <td>{c.email}</td>
                  <td className="mono">{c.phone_number}</td>
                  <td className="table__actions">
                    <button
                      className="icon-btn icon-btn--danger"
                      onClick={() => setDeleting(c)}
                      aria-label={`Delete ${c.full_name}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {adding && (
        <CustomerFormModal
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false)
            load()
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete customer"
          message={`Delete "${deleting.full_name}"? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  )
}

function CustomerFormModal({ onClose, onSaved }) {
  const { showToast } = useToast()
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const validate = () => {
    const next = {}
    if (!form.full_name.trim()) next.full_name = 'Full name is required.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'Enter a valid email address.'
    if (!form.phone_number.trim() || form.phone_number.trim().length < 7) {
      next.phone_number = 'Enter a valid phone number.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    try {
      await customersApi.create({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone_number: form.phone_number.trim(),
      })
      showToast('Customer created.', 'success')
      onSaved()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Add customer" onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="full_name">Full name</label>
          <input
            id="full_name"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            placeholder="e.g. Jane Doe"
          />
          {errors.full_name && <span className="field__error">{errors.full_name}</span>}
        </div>

        <div className="field">
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="jane@example.com"
          />
          {errors.email && <span className="field__error">{errors.email}</span>}
        </div>

        <div className="field">
          <label htmlFor="phone">Phone number</label>
          <input
            id="phone"
            value={form.phone_number}
            onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
            placeholder="e.g. +1 555 123 4567"
          />
          {errors.phone_number && <span className="field__error">{errors.phone_number}</span>}
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Saving…' : 'Add customer'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
