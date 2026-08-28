import { useBrand } from '../context/BrandContext';

/**
 * Shown above the card on every auth page (Login/Register/Forgot/Reset) —
 * a logo needs a light backdrop of its own to stay legible regardless of
 * its own colors, since it sits directly on the page's dark animated
 * gradient; the text fallback (no logo uploaded) reads fine on its own.
 */
export default function AuthBrandHeader() {
  const { brand } = useBrand();

  return (
    <div className="auth-brand">
      {brand.logo_url ? (
        <span className="auth-brand-logo-chip">
          <img src={brand.logo_url} alt={brand.brand_name} className="auth-brand-logo" />
        </span>
      ) : (
        <span className="auth-brand-name">{brand.brand_name}</span>
      )}
    </div>
  );
}
