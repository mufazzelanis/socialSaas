import { useEffect, useState } from 'react';
import api from '../api/client';
import BrandIcon from './BrandIcon';
import Icon from './Icon';

function whatsappUrl(service) {
  if (!service.whatsapp_number) return null;
  const digits = service.whatsapp_number.replace(/\D/g, '');
  if (!digits) return null;
  const message = service.whatsapp_message || `Hi, I'm interested in ${service.title}.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

function WhatsAppButton({ service, className = 'btn btn-primary btn-block' }) {
  const url = whatsappUrl(service);
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`whatsapp-btn ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <BrandIcon name="whatsapp" size={16} />
      Contact on WhatsApp
    </a>
  );
}

export default function ServicesSection() {
  const [services, setServices] = useState([]);
  const [active, setActive] = useState(null);

  useEffect(() => {
    api
      .get('/services')
      .then((res) => setServices(res.data))
      .catch(() => setServices([]));
  }, []);

  useEffect(() => {
    document.body.style.overflow = active ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [active]);

  useEffect(() => {
    if (!active) return undefined;
    const onKey = (e) => e.key === 'Escape' && setActive(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);

  if (services.length === 0) return null;

  return (
    <div className="card">
      <h2>Our Services</h2>
      <div className="service-grid">
        {services.map((service) => (
          <div className="service-card" key={service.id}>
            <button type="button" className="service-card-image" onClick={() => setActive(service)}>
              {service.image_url ? (
                <img src={service.image_url} alt={service.title} />
              ) : (
                <span className="service-card-image-empty">{service.title[0]}</span>
              )}
            </button>
            <div className="service-card-body">
              <button type="button" className="service-card-title" onClick={() => setActive(service)}>
                {service.title}
              </button>
              {service.short_description && <p className="muted small">{service.short_description}</p>}
              <WhatsAppButton service={service} className="btn btn-primary btn-small btn-block" />
            </div>
          </div>
        ))}
      </div>

      {active && (
        <div className="modal-overlay" onClick={() => setActive(null)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setActive(null)} aria-label="Close">
              <Icon name="x" size={18} />
            </button>
            {active.image_url && <img src={active.image_url} alt={active.title} className="modal-image" />}
            <h2>{active.title}</h2>
            {active.details && <p className="modal-details">{active.details}</p>}
            <WhatsAppButton service={active} />
          </div>
        </div>
      )}
    </div>
  );
}
