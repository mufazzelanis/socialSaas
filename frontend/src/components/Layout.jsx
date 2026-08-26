import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBrand } from '../context/BrandContext';
import Icon from './Icon';

const navItems = [
  { to: '/', label: 'Dashboard', short: 'Home', end: true, icon: 'home' },
  { to: '/create', label: 'Create Post', short: 'Create', icon: 'plus' },
  { to: '/posts', label: 'Post History', short: 'History', icon: 'clock' },
  { to: '/accounts', label: 'Social Accounts', short: 'Accounts', icon: 'link' },
  { to: '/settings', label: 'Settings', short: 'Settings', icon: 'settings' },
];

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

function BrandMark({ brand, compact }) {
  if (brand.logo_url) {
    return <img src={brand.logo_url} alt={brand.brand_name} className={compact ? 'max-h-7 max-w-full object-contain' : 'sidebar-brand-logo'} />;
  }
  return <span className={compact ? 'truncate' : 'sidebar-brand-name'}>{brand.brand_name}</span>;
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { brand } = useBrand();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close the drawer automatically whenever the route changes (nav tap, back
  // button, etc.) so it never lingers open over the next page.
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  // Lock body scroll while the drawer overlay is open — feels like a native
  // app sheet rather than a web page with a floating panel on it.
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const renderNavLink = (item, extraClass = '') => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.end}
      className={({ isActive }) => `sidebar-link ${extraClass}` + (isActive ? ' active' : '')}
    >
      <Icon name={item.icon} size={18} />
      {item.label}
    </NavLink>
  );

  return (
    <div className="app-shell">
      {/* Desktop sidebar */}
      <aside className="sidebar hidden md:flex md:flex-col">
        <div className="sidebar-brand">
          <BrandMark brand={brand} />
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => renderNavLink(item))}
          {user?.role === 'super_admin' && (
            <>
              <div className="sidebar-divider" />
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  'sidebar-link sidebar-link-admin' + (isActive ? ' active' : '')
                }
              >
                <Icon name="shield" size={18} />
                Admin
              </NavLink>
            </>
          )}
        </nav>
      </aside>

      {/* Mobile drawer + overlay */}
      {drawerOpen && (
        <div className="drawer-overlay" onClick={() => setDrawerOpen(false)} />
      )}
      <aside className={'drawer-panel' + (drawerOpen ? ' translate-x-0' : ' -translate-x-full')}>
        <div className="drawer-header">
          <div className="sidebar-brand !pb-0 !pt-0">
            <BrandMark brand={brand} />
          </div>
          <button
            className="drawer-close-btn"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close menu"
          >
            <Icon name="x" size={20} />
          </button>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => renderNavLink(item))}
          {user?.role === 'super_admin' && (
            <>
              <div className="sidebar-divider" />
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  'sidebar-link sidebar-link-admin' + (isActive ? ' active' : '')
                }
              >
                <Icon name="shield" size={18} />
                Admin
              </NavLink>
            </>
          )}
          <div className="sidebar-divider" />
          <button className="sidebar-link text-left w-full" onClick={handleLogout}>
            <Icon name="logout" size={18} />
            Logout
          </button>
        </nav>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="flex items-center gap-2 min-w-0">
            <button
              className="hamburger-btn md:hidden"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
            >
              <Icon name="menu" size={22} />
            </button>
            <div className="topbar-brand-mobile md:hidden">
              <BrandMark brand={brand} compact />
            </div>
          </div>
          <div className="topbar-user">
            <span className="avatar-initials">{initials(user?.name)}</span>
            <span className="hidden sm:inline">{user?.name}</span>
            <button className="btn btn-ghost btn-small" onClick={handleLogout}>
              <span className="hidden sm:inline">Logout</span>
              <Icon name="logout" size={16} className="sm:hidden" />
            </button>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>

      {/* Bottom tab bar (mobile only) */}
      <nav className="bottom-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => 'bottom-nav-link' + (isActive ? ' active' : '')}
          >
            <Icon name={item.icon} size={22} />
            {item.short}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
