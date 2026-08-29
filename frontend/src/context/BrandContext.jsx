import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../api/client';

const DEFAULTS = {
  brand_name: 'Social SaaS',
  primary_color: '#4f46e5',
  logo_url: null,
  favicon_url: null,
};

const BrandContext = createContext(null);

// A pre-React inline script in index.html reads this on every load and
// applies it immediately, before BrandProvider's own fetch can resolve —
// see the comment there for why that gap is exactly when a reload would
// otherwise flash (or get stuck on) the generic default favicon.
const CACHE_KEY = 'brand_cache';

function applyToDocument(brand) {
  document.title = brand.brand_name || DEFAULTS.brand_name;
  const color = brand.primary_color || DEFAULTS.primary_color;
  document.documentElement.style.setProperty('--primary', color);

  let link = document.querySelector("link[rel~='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = brand.favicon_url || '/favicon.svg';

  // index.html's tag ships with type="image/svg+xml" for the default
  // favicon.svg — a browser that respects a declared type strictly will
  // silently refuse to show an uploaded PNG/JPG/ICO through that same
  // stale type, so it must be cleared (or set correctly) whenever the
  // href changes to something else.
  if (brand.favicon_url) {
    link.removeAttribute('type');
  } else {
    link.type = 'image/svg+xml';
  }

  // Same deal for the home-screen/bookmark icon on iOS — it was never
  // wired up to the tenant's branding at all before, so it silently kept
  // showing the generic default forever regardless of what was uploaded.
  let touchIcon = document.querySelector("link[rel='apple-touch-icon']");
  if (!touchIcon) {
    touchIcon = document.createElement('link');
    touchIcon.rel = 'apple-touch-icon';
    document.head.appendChild(touchIcon);
  }
  touchIcon.href = brand.favicon_url || brand.logo_url || '/favicon.svg';

  // Keeps the mobile browser chrome / PWA status bar tinted to the tenant's
  // brand color, so an installed app matches their branding too.
  let themeColor = document.querySelector("meta[name='theme-color']");
  if (!themeColor) {
    themeColor = document.createElement('meta');
    themeColor.name = 'theme-color';
    document.head.appendChild(themeColor);
  }
  themeColor.content = color;
}

function cacheBrand(brand) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(brand));
  } catch (e) {
    // Private browsing / storage disabled — the index.html script just has
    // nothing to read next time, no worse than before this existed.
  }
}

export function BrandProvider({ children }) {
  // /brand-settings is a public endpoint (nothing sensitive in it) — fetched
  // regardless of auth state so the login/register/forgot/reset pages show
  // the tenant's own branding too, not just the dashboard behind a session.
  const [brand, setBrand] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setLoading(true);
    api
      .get('/brand-settings')
      .then((res) => {
        const merged = { ...DEFAULTS, ...res.data };
        setBrand(merged);
        applyToDocument(merged);
        // Only cache a confirmed-good fetch — a transient network failure
        // falling through to the catch below must NOT overwrite this with
        // the generic defaults, or the next reload's pre-React flash would
        // show the wrong (default) icon even though the real branding is
        // fine and just a request away.
        cacheBrand(merged);
      })
      .catch(() => {
        setBrand(DEFAULTS);
        applyToDocument(DEFAULTS);
      })
      .finally(() => setLoading(false));
  }, []);

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
