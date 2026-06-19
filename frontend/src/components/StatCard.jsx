export default function StatCard({ icon, label, value, accent = 'amber' }) {
  return (
    <div className={`stat-card stat-card--${accent}`}>
      <div className="stat-card__icon">{icon}</div>
      <div>
        <div className="stat-card__value">{value}</div>
        <div className="stat-card__label">{label}</div>
      </div>
    </div>
  )
}
