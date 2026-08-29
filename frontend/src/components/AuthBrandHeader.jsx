import { Link } from 'react-router-dom';
import { useBrand } from '../context/BrandContext';

/**
 * Shown above the card on every auth page (Login/Register/Forgot/Reset) —
 * a logo needs a light backdrop of its own to stay legible regardless of
 * its own colors, since it sits directly on the page's dark animated
 * gradient; the text fallback (no logo uploaded) reads fine on its own.
 *
 * The whole thing links back to "/" — logged-in visitors land on their
 * dashboard, logged-out ones bounce to /login via ProtectedRoute, which is
 * exactly what clicking a site logo is expected to do everywhere.
 */
export default function AuthBrandHeader() {
  const { brand } = useBrand();

  return (
    <Link to="/" className="auth-brand" aria-label={`${brand.brand_name} home`}>
      {brand.logo_url ? (
        <span className="auth-brand-logo-chip">
          <img src={brand.logo_url} alt={brand.brand_name} className="auth-brand-logo" />
        </span>
      ) : (
        <span className="auth-brand-name">{brand.brand_name}</span>
      )}
    </Link>
  );
}
