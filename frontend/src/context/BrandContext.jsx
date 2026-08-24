import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../api/client';
import { useAuth } from './AuthContext';

const DEFAULTS = {
  brand_name: 'Social SaaS',
  primary_color: '#4f46e5',
  logo_url: null,
  favicon_url: null,
};

const BrandContext = createContext(null);

function applyToDocument(brand) {
  document.title = brand.brand_name || DEFAULTS.brand_name;
  document.documentElement.style.setProperty('--primary', brand.primary_color || DEFAULTS.primary_color);

  let link = document.querySelector("link[rel~='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = brand.favicon_url || '/vite.svg';
}

export function BrandProvider({ children }) {
  const { user } = useAuth();
  const [brand, setBrand] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    if (!user) {
      setBrand(DEFAULTS);
      applyToDocument(DEFAULTS);
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .get('/brand-settings')
      .then((res) => {
        const merged = { ...DEFAULTS, ...res.data };
        setBrand(merged);
        applyToDocument(merged);
      })
      .catch(() => {
        setBrand(DEFAULTS);
        applyToDocument(DEFAULTS);
      })
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <BrandContext.Provider value={{ brand, loading, reload }}>
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand() {
  return useContext(BrandContext);
}
