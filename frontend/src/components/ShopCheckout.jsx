import { useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../api/client';
import BrandIcon from './BrandIcon';
import Icon from './Icon';

export function formatBDT(amount) {
  return '৳' + Number(amount).toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// Purely illustrative — brand-colored text badges rather than real logos,
// so this never depends on an external image loading. The actual choice of
// method happens on SSLCommerz's own hosted page after checkout; this row
// just signals up front that it's not "one fixed way to pay".
export function PaymentMethodsRow() {
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

export function WhatsAppOrderButton({ product, whatsappNumber, small = false, label = 'Order via WhatsApp instead' }) {
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
      // Buttons like this sit on top of other clickable elements (a card,
      // a details page) elsewhere — stop the click bubbling up further.
      onClick={(e) => e.stopPropagation()}
    >
      <BrandIcon name="whatsapp" size={small ? 14 : 16} />
      {label}
    </a>
  );
}

export function CheckoutModal({ product, whatsappNumber, onClose }) {
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

        {whatsappNumber && (
          <>
            <p className="shop-checkout-or">or</p>
            <WhatsAppOrderButton product={product} whatsappNumber={whatsappNumber} />
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
