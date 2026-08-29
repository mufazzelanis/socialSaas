import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../api/client';
import AuthBrandHeader from '../components/AuthBrandHeader';
import BrandIcon from '../components/BrandIcon';
import Icon from '../components/Icon';
import { useSiteSettings } from '../context/SiteSettingContext';

function formatBDT(amount) {
  return '৳' + Number(amount).toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function WhatsAppOrderButton({ product, whatsappNumber }) {
  if (!whatsappNumber) return null;
  const digits = whatsappNumber.replace(/\D/g, '');
  if (!digits) return null;

  const message = `Hi, I'd like to order "${product.title}" (${formatBDT(product.price_bdt)}).`;
  const url = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="whatsapp-btn btn btn-block">
      <BrandIcon name="whatsapp" size={16} />
      Order via WhatsApp instead
    </a>
  );
}

function CheckoutModal({ product, onClose }) {
  const { settings } = useSiteSettings();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await api.post('/orders', {
        digital_product_id: product.id,
        buyer_name: name,
        buyer_email: email,
        buyer_phone: phone || undefined,
      });
      // A full navigation, not an SPA route — SSLCommerz's hosted payment
      // page lives outside this app entirely.
      window.location.href = res.data.redirect_url;
    } catch (err) {
      setError(err.response?.data?.message || 'Could not start checkout — please try again.');
      setBusy(false);
    }
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <Icon name="x" size={18} />
        </button>

        <h2>{product.title}</h2>
        <p className="shop-checkout-price">{formatBDT(product.price_bdt)}</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="form-grid">
          <label className="field">
            <span>Your Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label className="field">
            <span>Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="field">
            <span>Phone (optional)</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" />
          </label>

          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Redirecting to payment...' : `Pay ${formatBDT(product.price_bdt)}`}
          </button>
        </form>

        {settings.shop_whatsapp_number && (
          <>
            <p className="shop-checkout-or">or</p>
            <WhatsAppOrderButton product={product} whatsappNumber={settings.shop_whatsapp_number} />
          </>
        )}
      </div>
    </div>,
    document.body
  );
}

export default function Shop() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkoutProduct, setCheckoutProduct] = useState(null);

  useEffect(() => {
    api
      .get('/products')
      .then((res) => setProducts(res.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="shop-page">
      <AuthBrandHeader />
      <div className="shop-content">
        <h1 className="shop-title">Digital Products</h1>
        <p className="shop-subtitle">Instant download after payment.</p>

        {loading ? (
          <p className="muted">Loading...</p>
        ) : products.length === 0 ? (
          <p className="muted">No products available right now — check back soon.</p>
        ) : (
          <div className="shop-grid">
            {products.map((product) => (
              <div className="shop-card" key={product.id}>
                <div className="shop-card-image">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.title} />
                  ) : (
                    <span className="shop-card-image-empty">{product.title[0]}</span>
                  )}
                </div>
                <div className="shop-card-body">
                  <h3 className="shop-card-title">{product.title}</h3>
                  {product.description && <p className="muted small">{product.description}</p>}
                  <div className="shop-card-footer">
                    <span className="shop-price">{formatBDT(product.price_bdt)}</span>
                    <button
                      type="button"
                      className="btn btn-primary btn-small"
                      onClick={() => setCheckoutProduct(product)}
                    >
                      Buy Now
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {checkoutProduct && (
        <CheckoutModal product={checkoutProduct} onClose={() => setCheckoutProduct(null)} />
      )}
    </div>
  );
}
