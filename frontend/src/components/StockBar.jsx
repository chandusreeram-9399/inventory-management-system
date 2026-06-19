/**
 * StockBar — the app's signature visual element.
 *
 * Every quantity figure in the system is shown alongside a thin fill bar
 * representing stock health relative to the low-stock threshold, rather
 * than as a bare number. Red = critical/out, amber = low, green = healthy.
 */
export default function StockBar({ quantity, threshold = 10, compact = false }) {
  const safeQty = Math.max(quantity, 0)
  const reference = Math.max(threshold * 3, 1)
  const fillPercent = Math.min((safeQty / reference) * 100, 100)

  let status = 'healthy'
  if (quantity <= 0) status = 'out'
  else if (quantity <= threshold / 2) status = 'critical'
  else if (quantity <= threshold) status = 'low'

  const labels = {
    out: 'Out of stock',
    critical: 'Critical',
    low: 'Low stock',
    healthy: 'In stock',
  }

  return (
    <div className={`stockbar ${compact ? 'stockbar--compact' : ''}`}>
      <div className="stockbar__top">
        <span className="stockbar__qty">{quantity}</span>
        {!compact && <span className={`stockbar__label stockbar__label--${status}`}>{labels[status]}</span>}
      </div>
      <div className="stockbar__track">
        <div
          className={`stockbar__fill stockbar__fill--${status}`}
          style={{ width: `${Math.max(fillPercent, quantity > 0 ? 4 : 0)}%` }}
        />
      </div>
    </div>
  )
}
