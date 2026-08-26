import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useSiteSettings } from '../context/SiteSettingContext';

// Meta's standard base pixel snippet, translated out of the inline-script
// form Meta hands you into a plain function so it can be loaded exactly
// once, on demand, instead of living in index.html for every visitor
// whether or not an admin has ever set a Pixel ID.
function loadPixelScript() {
  /* eslint-disable */
  if (window.fbq) return;
  var n = (window.fbq = function () {
    n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
  });
  window._fbq || (window._fbq = n);
  n.push = n;
  n.loaded = true;
  n.version = '2.0';
  n.queue = [];
  var t = document.createElement('script');
  t.async = true;
  t.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.appendChild(t);
  /* eslint-enable */
}

/**
 * Mounted once near the app root (outside the login-gated routes, so it's
 * live on the public Login/Register pages too — that's most of the funnel
 * an ad campaign actually needs to measure). Loads the base pixel once a
 * super admin has set a Pixel ID and enabled it, then fires a PageView on
 * every route change — a React Router navigation never reloads the page,
 * so without this only the very first page a visitor lands on would ever
 * be tracked.
 */
export default function FacebookPixel() {
  const ctx = useSiteSettings();
  const settings = ctx?.settings;
  const location = useLocation();
  const initializedFor = useRef(null);

  const pixelId = settings?.facebook_pixel_enabled ? settings.facebook_pixel_id : null;

  useEffect(() => {
    if (!pixelId) return;

    if (initializedFor.current !== pixelId) {
      loadPixelScript();
      window.fbq('init', pixelId);
      initializedFor.current = pixelId;
    }

    window.fbq('track', 'PageView');
  }, [pixelId, location.pathname]);

  return null;
}
