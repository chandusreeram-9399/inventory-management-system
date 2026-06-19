import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, Package, Users, ShoppingCart, Menu, X, Boxes } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/orders', label: 'Orders', icon: ShoppingCart },
]

export default function Layout() {
  const [navOpen, setNavOpen] = useState(false)

  return (
    <div className="app-shell">
      <aside className={`sidebar ${navOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar__brand">
          <Boxes size={22} strokeWidth={2.25} />
          <div>
            <div className="sidebar__brand-name">Stocklane</div>
            <div className="sidebar__brand-tag">Inventory &amp; Order Mgmt</div>
          </div>
        </div>

        <nav className="sidebar__nav">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}
              onClick={() => setNavOpen(false)}
            >
              <Icon size={18} strokeWidth={2} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {navOpen && <div className="sidebar__scrim" onClick={() => setNavOpen(false)} />}

      <div className="app-main">
        <header className="topbar">
          <button
            className="icon-btn topbar__menu-btn"
            onClick={() => setNavOpen((v) => !v)}
            aria-label="Toggle navigation"
          >
            {navOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="topbar__brand">
            <Boxes size={18} strokeWidth={2.25} />
            <span>Stocklane</span>
          </div>
        </header>

        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
