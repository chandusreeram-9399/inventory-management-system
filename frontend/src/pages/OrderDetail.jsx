import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, XCircle } from 'lucide-react'
import { ordersApi } from '../api/orders'
import ConfirmDialog from '../components/ConfirmDialog'
import { useToast } from '../context/ToastContext'

export default function OrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    ordersApi
      .get(id)
      .then(setOrder)
      .catch((err) => {
        showToast(err.message, 'error')
        navigate('/orders')
      })
      .finally(() => setLoading(false))
  }, [id, navigate, showToast])

  const handleCancel = async () => {
    try {
      await ordersApi.remove(order.id)
      showToast(`Order #${order.id} was cancelled and stock restored.`, 'success')
      navigate('/orders')
    } catch (err) {
      showToast(err.message, 'error')
      setCancelling(false)
    }
  }

  if (loading) return <div className="page-loading">Loading order…</div>
  if (!order) return null

  return (
    <div className="page page--narrow">
      <div className="page__header">
        <div>
          <button className="link-back" onClick={() => navigate('/orders')}>
            <ArrowLeft size={15} /> Back to orders
          </button>
          <h1 className="page__title">Order #{order.id}</h1>
          <p className="page__subtitle">
            Placed {new Date(order.created_at).toLocaleString()} for {order.customer_name || `customer #${order.customer_id}`}
          </p>
        </div>
        <button className="btn btn--danger-outline" onClick={() => setCancelling(true)}>
          <XCircle size={16} /> Cancel order
        </button>
      </div>

      <div className="card">
        <div className="card__header">
          <h2 className="card__title">Line items</h2>
          <span className={`badge badge--${order.status}`}>{order.status}</span>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Unit price</th>
              <th>Quantity</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id}>
                <td className="table__primary">{item.product_name || `Product #${item.product_id}`}</td>
                <td className="mono">${Number(item.unit_price).toFixed(2)}</td>
                <td>{item.quantity}</td>
                <td className="mono">${Number(item.subtotal).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="order-total">
          <span>Order total</span>
          <span className="mono order-total__value">${Number(order.total_amount).toFixed(2)}</span>
        </div>
      </div>

      {cancelling && (
        <ConfirmDialog
          title="Cancel order"
          message={`Cancel order #${order.id}? Stock for every item will be added back to inventory.`}
          confirmLabel="Cancel order"
          onConfirm={handleCancel}
          onCancel={() => setCancelling(false)}
        />
      )}
    </div>
  )
}
