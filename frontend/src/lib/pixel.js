// Thin wrapper around window.fbq so the rest of the app can fire events
// (e.g. "someone clicked Contact on WhatsApp") without caring whether the
// admin has actually turned the Pixel on, or whether it's even finished
// loading yet — this is always a safe no-op otherwise.
export function trackPixelEvent(eventName, params) {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return;
  window.fbq('track', eventName, params);
}
