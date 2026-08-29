import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/client';
import AuthBrandHeader from '../components/AuthBrandHeader';
import Icon from '../components/Icon';

// SSLCommerz confirms payment synchronously before redirecting the buyer's
// browser here, so the order is normally already 'paid' by the time this
// loads — this short poll is just a safety margin for the rare case the
// IPN/validation call is still in flight.
const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 10;

export default function OrderStatus() {
  const { tranId } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const pollCount = useRef(0);

  useEffect(() => {
    let timer;

    const load = () => {
      api
        .get(`/orders/${tranId}`)
        .then((res) => {
          setOrder(res.data);
          pollCount.current += 1;
          if (res.data.status === 'pending' && pollCount.current < MAX_POLLS) {
            timer = setTimeout(load, POLL_INTERVAL_MS);
          }
        })
        .catch(() => setError('Could not find this order.'));
    };

    load();
    return () => clearTimeout(timer);
  }, [tranId]);

  return (
    <div className="shop-page">
      <AuthBrandHeader />
      <div className="shop-content shop-content--narrow">
        <div className="card order-status-card">
          {error ? (
            <>
              <Icon name="alert" size={40} className="order-status-icon order-status-icon--error" />
              <h2>Order not found</h2>
              <p className="muted">{error}</p>
            </>
          ) : !order ? (
            <>
              <span className="page-loading-spinner" />
              <p className="muted">Loading your order...</p>
            </>
          ) : order.status === 'paid' ? (
            <>
              <Icon name="check" size={40} className="order-status-icon order-status-icon--success" />
              <h2>Payment successful!</h2>
              <p className="muted">
                Thanks for buying <strong>{order.product_title}</strong> (৳{order.amount}).
              </p>
              <a className="btn btn-primary btn-block" href={order.download_url}>
                Download your file
              </a>
            </>
          ) : order.status === 'pending' ? (
            <>
              <span className="page-loading-spinner" />
              <h2>Confirming your payment...</h2>
              <p className="muted">This usually takes just a few seconds.</p>
            </>
          ) : (
            <>
              <Icon name="alert" size={40} className="order-status-icon order-status-icon--error" />
              <h2>Payment {order.status}</h2>
              <p className="muted">
                Your payment for <strong>{order.product_title}</strong> was not completed. No charge
                was made — feel free to try again.
              </p>
            </>
          )}

          <p className="shop-footer-nav">
            <Link to="/shop">← Back to Shop</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
