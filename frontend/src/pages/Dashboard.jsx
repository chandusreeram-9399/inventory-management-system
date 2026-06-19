import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Package, Users, ShoppingCart, AlertTriangle } from 'lucide-react'
import { dashboardApi } from '../api/dashboard'
import StatCard from '../components/StatCard'
import StockBar from '../components/StockBar'
import EmptyState from '../components/EmptyState'
import { useToast } from '../context/ToastContext'

export default function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()

  useEffect(() => {
    let active = true
    dashboardApi
      .summary()
      .then((data) => {
        if (active) setSummary(data)
      })
      .catch((err) => showToast(err.message, 'error'))
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [showToast])

  if (loading) {
    return <div className="page-loading">Loading dashboard…</div>
  }

  if (!summary) {
    return null
  }

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1 className="page__title">Dashboard</h1>
          <p className="page__subtitle">A quick read on stock, customers, and order volume.</p>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard icon={<Package size={20} />} label="Total products" value={summary.total_products} accent="amber" />
        <StatCard icon={<Users size={20} />} label="Total customers" value={summary.total_customers} accent="slate" />
        <StatCard icon={<ShoppingCart size={20} />} label="Total orders" value={summary.total_orders} accent="ink" />
        <StatCard
          icon={<AlertTriangle size={20} />}
          label="Low stock items"
          value={summary.low_stock_products.length}
          accent="danger"
        />
      </div>

      <div className="card">
        <div className="card__header">
          <h2 className="card__title">Low stock products</h2>
          <span className="card__meta">Threshold: {summary.low_stock_threshold} units</span>
        </div>

        {summary.low_stock_products.length === 0 ? (
          <EmptyState
            icon={<Package size={28} />}
            title="Stock levels look healthy"
            message="No products are at or below the low-stock threshold right now."
          />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Stock level</th>
              </tr>
            </thead>
            <tbody>
              {summary.low_stock_products.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link className="table-link" to="/products">
                      {p.name}
                    </Link>
                  </td>
                  <td className="mono">{p.sku}</td>
                  <td style={{ width: 220 }}>
                    <StockBar quantity={p.quantity_in_stock} threshold={summary.low_stock_threshold} compact />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
