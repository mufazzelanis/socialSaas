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

// Purely illustrative — brand-colored text badges rather than real logos,
// so this never depends on an external image loading. The actual choice of
// method happens on SSLCommerz's own hosted page after checkout; this row
// just signals up front that it's not "one fixed way to pay".
function PaymentMethodsRow() {
  const methods = [
    { name: 'bKash', color: '#e2136e' },
    { name: 'Nagad', color: '#f6921e' },
    { name: 'Rocket', color: '#8c3494' },
    { name: 'Visa', color: '#1a1f71' },
    { name: 'Mastercard', color: '#eb001b' },
  ];
  return (
    <div className="payment-methods-row">
      <span className="payment-methods-label">Pay with:</span>
      {methods.map((m) => (
        <span key={m.name} className="payment-badge" style={{ background: m.color }}>
          {m.name}
        </span>
      ))}
    </div>
  );
}

function WhatsAppOrderButton({ product, whatsappNumber, small = false, label = 'Order via WhatsApp instead' }) {
  if (!whatsappNumber) return null;
  const digits = whatsappNumber.replace(/\D/g, '');
  if (!digits) return null;

  const message = `Hi, I'd like to order "${product.title}" (${formatBDT(product.price_bdt)}).`;
  const url = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={'whatsapp-btn btn btn-block' + (small ? ' btn-small' : '')}
      // Buttons like this sit on top of a clickable card elsewhere on this
      // page — stop the click from also bubbling up to a card-level handler.
      onClick={(e) => e.stopPropagation()}
    >
      <BrandIcon name="whatsapp" size={small ? 14 : 16} />
      {label}
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

          <PaymentMethodsRow />

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

function DetailsModal({ product, onClose, onBuy, whatsappNumber }) {
  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <Icon name="x" size={18} />
        </button>

        {product.image_url && <img src={product.image_url} alt={product.title} className="modal-image" />}
        <h2>{product.title}</h2>
        {product.description && <p className="shop-details-desc">{product.description}</p>}

        <div className="shop-card-footer mt-3.5">
          <span className="shop-price">{formatBDT(product.price_bdt)}</span>
          <button type="button" className="btn btn-primary" onClick={onBuy}>
            Buy Now
          </button>
        </div>

        {whatsappNumber && (
          <div className="mt-2.5">
            <WhatsAppOrderButton product={product} whatsappNumber={whatsappNumber} />
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export default function Shop() {
  const { settings } = useSiteSettings();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailsProduct, setDetailsProduct] = useState(null);
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
                <button
                  type="button"
                  className="shop-card-image"
                  onClick={() => setDetailsProduct(product)}
                >
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.title} />
                  ) : (
                    <span className="shop-card-image-empty">{product.title[0]}</span>
                  )}
                </button>
                <div className="shop-card-body">
                  <button
                    type="button"
                    className="shop-card-title"
                    onClick={() => setDetailsProduct(product)}
                  >
                    {product.title}
                  </button>
                  {product.description && (
                    <p className="shop-card-desc line-clamp-2">{product.description}</p>
                  )}
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
                  {settings.shop_whatsapp_number && (
                    <WhatsAppOrderButton
                      product={product}
                      whatsappNumber={settings.shop_whatsapp_number}
                      small
                      label="Order via WhatsApp"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {detailsProduct && (
        <DetailsModal
          product={detailsProduct}
          onClose={() => setDetailsProduct(null)}
          onBuy={() => {
            setCheckoutProduct(detailsProduct);
            setDetailsProduct(null);
          }}
          whatsappNumber={settings.shop_whatsapp_number}
        />
      )}

      {checkoutProduct && (
        <CheckoutModal product={checkoutProduct} onClose={() => setCheckoutProduct(null)} />
      )}
    </div>
  );
}
