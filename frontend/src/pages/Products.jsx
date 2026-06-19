import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Package } from 'lucide-react'
import { productsApi } from '../api/products'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import StockBar from '../components/StockBar'
import EmptyState from '../components/EmptyState'
import { useToast } from '../context/ToastContext'

const LOW_STOCK_THRESHOLD = Number(import.meta.env.VITE_LOW_STOCK_THRESHOLD || 10)

const emptyForm = { name: '', sku: '', price: '', quantity_in_stock: '' }

export default function Products() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // null = closed, {} = new, {...} = edit
  const [deleting, setDeleting] = useState(null)
  const { showToast } = useToast()

  const load = () => {
    setLoading(true)
    productsApi
      .list()
      .then(setProducts)
      .catch((err) => showToast(err.message, 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(load, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaved = () => {
    setEditing(null)
    load()
  }

  const handleDelete = async () => {
    try {
      await productsApi.remove(deleting.id)
      showToast(`"${deleting.name}" was deleted.`, 'success')
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
          <h1 className="page__title">Products</h1>
          <p className="page__subtitle">Manage your catalog, pricing, and stock on hand.</p>
        </div>
        <button className="btn btn--primary" onClick={() => setEditing({})}>
          <Plus size={16} /> Add product
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div className="page-loading">Loading products…</div>
        ) : products.length === 0 ? (
          <EmptyState
            icon={<Package size={28} />}
            title="No products yet"
            message="Add your first product to start tracking inventory."
            action={
              <button className="btn btn--primary" onClick={() => setEditing({})}>
                <Plus size={16} /> Add product
              </button>
            }
          />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>SKU</th>
                <th>Price</th>
                <th>Stock</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="table__primary">{p.name}</td>
                  <td className="mono">{p.sku}</td>
                  <td className="mono">${Number(p.price).toFixed(2)}</td>
                  <td style={{ width: 200 }}>
                    <StockBar quantity={p.quantity_in_stock} threshold={LOW_STOCK_THRESHOLD} compact />
                  </td>
                  <td className="table__actions">
                    <button className="icon-btn" onClick={() => setEditing(p)} aria-label={`Edit ${p.name}`}>
                      <Pencil size={16} />
                    </button>
                    <button
                      className="icon-btn icon-btn--danger"
                      onClick={() => setDeleting(p)}
                      aria-label={`Delete ${p.name}`}
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

      {editing !== null && (
        <ProductFormModal product={editing} onClose={() => setEditing(null)} onSaved={handleSaved} />
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete product"
          message={`Delete "${deleting.name}"? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  )
}

function ProductFormModal({ product, onClose, onSaved }) {
  const isEdit = Boolean(product?.id)
  const { showToast } = useToast()
  const [form, setForm] = useState(
    isEdit
      ? {
          name: product.name,
          sku: product.sku,
          price: String(product.price),
          quantity_in_stock: String(product.quantity_in_stock),
        }
      : emptyForm
  )
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const validate = () => {
    const next = {}
    if (!form.name.trim()) next.name = 'Product name is required.'
    if (!form.sku.trim()) next.sku = 'SKU is required.'
    const price = Number(form.price)
    if (!form.price || Number.isNaN(price) || price <= 0) next.price = 'Enter a price greater than 0.'
    const qty = Number(form.quantity_in_stock)
    if (form.quantity_in_stock === '' || Number.isNaN(qty) || qty < 0 || !Number.isInteger(qty)) {
      next.quantity_in_stock = 'Enter a whole number, 0 or greater.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      price: Number(form.price),
      quantity_in_stock: Number(form.quantity_in_stock),
    }

    try {
      if (isEdit) {
        await productsApi.update(product.id, payload)
        showToast('Product updated.', 'success')
      } else {
        await productsApi.create(payload)
        showToast('Product created.', 'success')
      }
      onSaved()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={isEdit ? 'Edit product' : 'Add product'} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="name">Product name</label>
          <input
            id="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Wireless Mouse"
          />
          {errors.name && <span className="field__error">{errors.name}</span>}
        </div>

        <div className="field">
          <label htmlFor="sku">SKU / code</label>
          <input
            id="sku"
            className="mono"
            value={form.sku}
            onChange={(e) => setForm({ ...form, sku: e.target.value })}
            placeholder="e.g. WM-001"
          />
          {errors.sku && <span className="field__error">{errors.sku}</span>}
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="price">Price ($)</label>
            <input
              id="price"
              type="number"
              step="0.01"
              min="0"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              placeholder="0.00"
            />
            {errors.price && <span className="field__error">{errors.price}</span>}
          </div>

          <div className="field">
            <label htmlFor="quantity">Quantity in stock</label>
            <input
              id="quantity"
              type="number"
              step="1"
              min="0"
              value={form.quantity_in_stock}
              onChange={(e) => setForm({ ...form, quantity_in_stock: e.target.value })}
              placeholder="0"
            />
            {errors.quantity_in_stock && <span className="field__error">{errors.quantity_in_stock}</span>}
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add product'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
