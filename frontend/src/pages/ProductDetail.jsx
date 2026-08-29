import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/client';
import AuthBrandHeader from '../components/AuthBrandHeader';
import { CheckoutModal, WhatsAppOrderButton, formatBDT } from '../components/ShopCheckout';
import { useBrand } from '../context/BrandContext';
import { useSiteSettings } from '../context/SiteSettingContext';

export default function ProductDetail() {
  const { id } = useParams();
  const { settings } = useSiteSettings();
  const { brand } = useBrand();
  const [product, setProduct] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  useEffect(() => {
    api
      .get(`/products/${id}`)
      .then((res) => setProduct(res.data))
      .catch(() => setNotFound(true));
  }, [id]);

  // A real page title per product — this is exactly what a shared /shop
  // link should show as the browser tab / link preview, not the generic
  // "Digital Products" title every page would otherwise carry.
  useEffect(() => {
    if (product) document.title = `${product.title} — ${brand.brand_name}`;
  }, [product, brand.brand_name]);

  return (
    <div className="shop-page">
      <AuthBrandHeader />
      <div className="shop-content shop-content--narrow">
        <p className="shop-footer-nav mb-2">
          <Link to="/shop">← Back to Shop</Link>
        </p>

        {notFound ? (
          <div className="card">
            <h2>Product not found</h2>
            <p className="muted">
              This product may have been removed or is no longer available.
            </p>
          </div>
        ) : !product ? (
          <p className="muted">Loading...</p>
        ) : (
          <div className="card product-detail-card">
            {product.image_url && (
              <img src={product.image_url} alt={product.title} className="modal-image" />
            )}
            <h1 className="product-detail-title">{product.title}</h1>
            {product.description && (
              <p className="shop-details-desc">{product.description}</p>
            )}

            <div className="shop-card-footer mt-3.5">
              <span className="shop-price product-detail-price">{formatBDT(product.price_bdt)}</span>
              <button type="button" className="btn btn-primary" onClick={() => setCheckoutOpen(true)}>
                Buy Now
              </button>
            </div>

            {settings.shop_whatsapp_number && (
              <div className="mt-2.5">
                <WhatsAppOrderButton product={product} whatsappNumber={settings.shop_whatsapp_number} />
              </div>
            )}
          </div>
        )}
      </div>

      {checkoutOpen && product && (
        <CheckoutModal
          product={product}
          whatsappNumber={settings.shop_whatsapp_number}
          onClose={() => setCheckoutOpen(false)}
        />
      )}
    </div>
  );
}
