import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import AuthBrandHeader from '../components/AuthBrandHeader';
import { CheckoutModal, WhatsAppOrderButton, formatBDT } from '../components/ShopCheckout';
import { useSiteSettings } from '../context/SiteSettingContext';

export default function Shop() {
  const { settings } = useSiteSettings();
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
                {/* Its own real URL — /shop/product/:id — rather than a
                    client-side-only modal, so a product can be linked or
                    shared directly (e.g. in a post's caption). */}
                <Link to={`/shop/product/${product.id}`} className="shop-card-image">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.title} />
                  ) : (
                    <span className="shop-card-image-empty">{product.title[0]}</span>
                  )}
                </Link>
                <div className="shop-card-body">
                  <Link to={`/shop/product/${product.id}`} className="shop-card-title">
                    {product.title}
                  </Link>
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

      {checkoutProduct && (
        <CheckoutModal
          product={checkoutProduct}
          whatsappNumber={settings.shop_whatsapp_number}
          onClose={() => setCheckoutProduct(null)}
        />
      )}
    </div>
  );
}
