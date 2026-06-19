import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, ShoppingCart, Eye, XCircle } from 'lucide-react'
import { ordersApi } from '../api/orders'
import ConfirmDialog from '../components/ConfirmDialog'
import EmptyState from '../components/EmptyState'
import { useToast } from '../context/ToastContext'

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(null)
  const { showToast } = useToast()

  const load = () => {
    setLoading(true)
    ordersApi
      .list()
      .then(setOrders)
      .catch((err) => showToast(err.message, 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(load, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCancel = async () => {
    try {
      await ordersApi.remove(cancelling.id)
      showToast(`Order #${cancelling.id} was cancelled and stock restored.`, 'success')
      setCancelling(null)
      load()
    } catch (err) {
      showToast(err.message, 'error')
      setCancelling(null)
    }
  }

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1 className="page__title">Orders</h1>
          <p className="page__subtitle">Every order placed, with live status and totals.</p>
        </div>
        <Link className="btn btn--primary" to="/orders/new">
          <Plus size={16} /> New order
        </Link>
      </div>

      <div className="card">
        {loading ? (
          <div className="page-loading">Loading orders…</div>
        ) : orders.length === 0 ? (
          <EmptyState
            icon={<ShoppingCart size={28} />}
            title="No orders yet"
            message="Create your first order once you have products and customers set up."
            action={
              <Link className="btn btn--primary" to="/orders/new">
                <Plus size={16} /> New order
              </Link>
            }
          />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Date</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="table__primary mono">#{o.id}</td>
                  <td>{o.customer_name || `Customer #${o.customer_id}`}</td>
                  <td>{o.items.length}</td>
                  <td className="mono">${Number(o.total_amount).toFixed(2)}</td>
                  <td>
                    <span className={`badge badge--${o.status}`}>{o.status}</span>
                  </td>
                  <td className="mono">{new Date(o.created_at).toLocaleDateString()}</td>
                  <td className="table__actions">
                    <Link className="icon-btn" to={`/orders/${o.id}`} aria-label={`View order ${o.id}`}>
                      <Eye size={16} />
                    </Link>
                    <button
                      className="icon-btn icon-btn--danger"
                      onClick={() => setCancelling(o)}
                      aria-label={`Cancel order ${o.id}`}
                    >
                      <XCircle size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {cancelling && (
        <ConfirmDialog
          title="Cancel order"
          message={`Cancel order #${cancelling.id}? Stock for every item will be added back to inventory.`}
          confirmLabel="Cancel order"
          onConfirm={handleCancel}
          onCancel={() => setCancelling(null)}
        />
      )}
    </div>
  )
}
