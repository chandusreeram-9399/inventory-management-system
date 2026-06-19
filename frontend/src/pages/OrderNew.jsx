import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, ArrowLeft } from 'lucide-react'
import { customersApi } from '../api/customers'
import { productsApi } from '../api/products'
import { ordersApi } from '../api/orders'
import { useToast } from '../context/ToastContext'

let lineKey = 0
const newLine = () => ({ key: ++lineKey, product_id: '', quantity: '1' })

export default function OrderNew() {
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [loadingData, setLoadingData] = useState(true)

  const [customerId, setCustomerId] = useState('')
  const [lines, setLines] = useState([newLine()])
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    Promise.all([customersApi.list(), productsApi.list()])
      .then(([c, p]) => {
        setCustomers(c)
        setProducts(p)
      })
      .catch((err) => showToast(err.message, 'error'))
      .finally(() => setLoadingData(false))
  }, [showToast])

  const productById = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products])

  const updateLine = (key, patch) => {
    setLines((current) => current.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  }

  const removeLine = (key) => {
    setLines((current) => (current.length > 1 ? current.filter((l) => l.key !== key) : current))
  }

  const addLine = () => setLines((current) => [...current, newLine()])

  const total = useMemo(() => {
    return lines.reduce((sum, l) => {
      const product = productById[l.product_id]
      const qty = Number(l.quantity) || 0
      return product ? sum + Number(product.price) * qty : sum
    }, 0)
  }, [lines, productById])

  const validate = () => {
    const next = {}
    if (!customerId) next.customer_id = 'Select a customer.'

    const usedProducts = new Set()
    lines.forEach((l, idx) => {
      if (!l.product_id) {
        next[`line_${idx}`] = 'Select a product.'
        return
      }
      const qty = Number(l.quantity)
      if (!l.quantity || Number.isNaN(qty) || qty <= 0 || !Number.isInteger(qty)) {
        next[`line_${idx}`] = 'Quantity must be a whole number greater than 0.'
        return
      }
      const product = productById[l.product_id]
      if (product && qty > product.quantity_in_stock) {
        next[`line_${idx}`] = `Only ${product.quantity_in_stock} in stock.`
      }
      if (usedProducts.has(l.product_id)) {
        next[`line_${idx}`] = 'Product already added to this order — adjust the quantity instead.'
      }
      usedProducts.add(l.product_id)
    })

    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    try {
      const order = await ordersApi.create({
        customer_id: Number(customerId),
        items: lines.map((l) => ({ product_id: Number(l.product_id), quantity: Number(l.quantity) })),
      })
      showToast(`Order #${order.id} created.`, 'success')
      navigate(`/orders/${order.id}`)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingData) {
    return <div className="page-loading">Loading…</div>
  }

  const blockedNoData = customers.length === 0 || products.length === 0

  return (
    <div className="page page--narrow">
      <div className="page__header">
        <div>
          <button className="link-back" onClick={() => navigate('/orders')}>
            <ArrowLeft size={15} /> Back to orders
          </button>
          <h1 className="page__title">New order</h1>
          <p className="page__subtitle">Stock is checked and reduced automatically when you submit.</p>
        </div>
      </div>

      {blockedNoData ? (
        <div className="card">
          <p className="confirm-message">
            You need at least one customer and one product before you can create an order.
          </p>
        </div>
      ) : (
        <form className="card" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="customer">Customer</label>
            <select id="customer" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Select a customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name} ({c.email})
                </option>
              ))}
            </select>
            {errors.customer_id && <span className="field__error">{errors.customer_id}</span>}
          </div>

          <div className="order-lines">
            <div className="order-lines__head">
              <span>Product</span>
              <span>Quantity</span>
              <span>Subtotal</span>
              <span />
            </div>

            {lines.map((line, idx) => {
              const product = productById[line.product_id]
              const subtotal = product ? Number(product.price) * (Number(line.quantity) || 0) : 0
              return (
                <div key={line.key} className="order-lines__row">
                  <select
                    value={line.product_id}
                    onChange={(e) => updateLine(line.key, { product_id: e.target.value })}
                  >
                    <option value="">Select a product…</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — ${Number(p.price).toFixed(2)} ({p.quantity_in_stock} in stock)
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={line.quantity}
                    onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                  />

                  <span className="mono order-lines__subtotal">${subtotal.toFixed(2)}</span>

                  <button
                    type="button"
                    className="icon-btn icon-btn--danger"
                    onClick={() => removeLine(line.key)}
                    disabled={lines.length === 1}
                    aria-label="Remove line item"
                  >
                    <Trash2 size={16} />
                  </button>

                  {errors[`line_${idx}`] && (
                    <span className="field__error order-lines__error">{errors[`line_${idx}`]}</span>
                  )}
                </div>
              )
            })}

            <button type="button" className="btn btn--ghost btn--small" onClick={addLine}>
              <Plus size={15} /> Add another product
            </button>
          </div>

          <div className="order-total">
            <span>Order total</span>
            <span className="mono order-total__value">${total.toFixed(2)}</span>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn--ghost" onClick={() => navigate('/orders')}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? 'Placing order…' : 'Place order'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
