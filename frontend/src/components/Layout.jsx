import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBrand } from '../context/BrandContext';

const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/create', label: 'Create Post' },
  { to: '/posts', label: 'Post History' },
  { to: '/accounts', label: 'Social Accounts' },
  { to: '/settings', label: 'Settings' },
];

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { brand } = useBrand();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          {brand.logo_url ? (
            <img src={brand.logo_url} alt={brand.brand_name} className="sidebar-brand-logo" />
          ) : (
            <span className="sidebar-brand-name">{brand.brand_name}</span>
          )}
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                'sidebar-link' + (isActive ? ' active' : '')
              }
            >
              {item.label}
            </NavLink>
          ))}
          {user?.role === 'super_admin' && (
            <>
              <div className="sidebar-divider" />
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  'sidebar-link sidebar-link-admin' + (isActive ? ' active' : '')
                }
              >
                🛡️ Admin
              </NavLink>
            </>
          )}
        </nav>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <div />
          <div className="topbar-user">
            <span className="avatar-initials">{initials(user?.name)}</span>
            <span>{user?.name}</span>
            <button className="btn btn-ghost" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
