import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBrand } from '../context/BrandContext';
import { useTheme } from '../context/ThemeContext';
import Icon from './Icon';
import AdSlot from './AdSlot';
import TelegramFloatButton from './TelegramFloatButton';

// Every user gets these five, including Profile — branding ("Settings") is a
// super-admin-only capability and is appended separately below, alongside
// Admin, so it never displaces Profile in the main nav / bottom tab bar.
const navItems = [
  { to: '/', label: 'Dashboard', short: 'Home', end: true, icon: 'home' },
  { to: '/create', label: 'Create Post', short: 'Create', icon: 'plus' },
  { to: '/posts', label: 'Post History', short: 'History', icon: 'clock' },
  { to: '/accounts', label: 'Social Accounts', short: 'Accounts', icon: 'link' },
  { to: '/profile', label: 'Profile', short: 'Profile', icon: 'user' },
];

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

function BrandMark({ brand, compact }) {
  if (brand.logo_url) {
    return <img src={brand.logo_url} alt={brand.brand_name} className={compact ? 'max-h-10 w-auto max-w-full object-contain' : 'sidebar-brand-logo'} />;
  }
  return <span className={compact ? 'truncate' : 'sidebar-brand-name'}>{brand.brand_name}</span>;
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { brand } = useBrand();
  const { theme, toggleTheme } = useTheme();
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

  const isSuperAdmin = user?.role === 'super_admin';

  // Rendered after a divider in both the desktop sidebar and the mobile
  // drawer — kept out of navItems/bottom-nav so it never displaces Profile.
  const renderAdminExtras = () =>
    isSuperAdmin && (
      <>
        <div className="sidebar-divider" />
        <NavLink
          to="/settings"
          className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}
        >
          <Icon name="settings" size={18} />
          Settings
        </NavLink>
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
    );

  return (
    <div className="app-shell">
      {/* Desktop sidebar */}
      <aside className="sidebar hidden md:flex md:flex-col">
        <div className="sidebar-brand">
          <BrandMark brand={brand} />
        </div>
        <nav className="sidebar-nav flex-1">
          {navItems.map((item) => renderNavLink(item))}
          {renderAdminExtras()}
        </nav>
        <AdSlot placement="sidebar" className="ad-slot--sidebar" />
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
          {renderAdminExtras()}
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
            <button
              type="button"
              className="theme-toggle-btn"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
            </button>
            <Link to="/profile" className="flex items-center gap-3 hover:no-underline" title="Your profile">
              <span className="avatar-initials">{initials(user?.name)}</span>
              <span className="hidden sm:inline text-text">{user?.name}</span>
            </Link>
            <button className="btn btn-ghost btn-small" onClick={handleLogout}>
              <span className="hidden sm:inline">Logout</span>
              <Icon name="logout" size={16} className="sm:hidden" />
            </button>
          </div>
        </header>
        <main className="content">
          {children}
          <AdSlot placement="global_footer" />
        </main>
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

      <TelegramFloatButton />
    </div>
  );
}
