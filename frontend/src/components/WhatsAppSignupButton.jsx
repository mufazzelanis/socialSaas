import { useEffect, useRef, useState } from 'react';
import api from '../api/client';

const SDK_URL = 'https://connect.facebook.net/en_US/sdk.js';

function loadFacebookSdk(appId, version) {
  return new Promise((resolve, reject) => {
    const init = () => {
      window.FB.init({ appId, autoLogAppEvents: true, xfbml: false, version });
      resolve(window.FB);
    };

    if (window.FB) return init();

    window.fbAsyncInit = init;

    if (document.getElementById('facebook-jssdk')) return;

    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.src = SDK_URL;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("Couldn't load Facebook's login script. Check your connection or ad blocker."));
    document.body.appendChild(script);
  });
}

/**
 * WhatsApp Embedded Signup: opens Meta's own popup where the customer logs in
 * and picks or adds their WhatsApp Business number. Two things come back
 * separately and in either order — the one-time `code` (from FB.login's
 * callback) and the chosen WABA/phone ids (a `postMessage` from the popup) —
 * so both are collected and only sent to the backend once both have arrived.
 */
export default function WhatsAppSignupButton({ config, onConnected, onError }) {
  const [busy, setBusy] = useState(false);
  const session = useRef({ code: null, phoneNumberId: null, wabaId: null, done: false });

  useEffect(() => {
    const onMessage = (event) => {
      if (!event.origin.endsWith('facebook.com')) return;

      let data = event.data;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch {
          return;
        }
      }

      if (data?.type !== 'WA_EMBEDDED_SIGNUP') return;

      if (data.event === 'FINISH' || data.event === 'FINISH_ONLY_WABA' || data.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING') {
        session.current.phoneNumberId = data.data?.phone_number_id ?? null;
        session.current.wabaId = data.data?.waba_id ?? null;
        submitIfReady();
      } else if (data.event === 'CANCEL') {
        finish();
        onError?.('WhatsApp signup was cancelled before it finished.');
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = () => {
    session.current = { code: null, phoneNumberId: null, wabaId: null, done: false };
    setBusy(false);
  };

  const submitIfReady = async () => {
    const s = session.current;
    if (s.done || !s.code || !s.phoneNumberId || !s.wabaId) return;
    s.done = true;

    try {
      await api.post('/social-accounts/whatsapp/embedded-signup', {
        code: s.code,
        phone_number_id: s.phoneNumberId,
        waba_id: s.wabaId,
      });
      onConnected?.();
    } catch (err) {
      const errors = err.response?.data?.errors;
      const first = errors ? Object.values(errors)[0]?.[0] : null;
      onError?.(first || err.response?.data?.message || 'Could not connect WhatsApp.');
    } finally {
      finish();
    }
  };

  const handleClick = async () => {
    setBusy(true);
    session.current = { code: null, phoneNumberId: null, wabaId: null, done: false };

    try {
      const FB = await loadFacebookSdk(config.app_id, config.graph_version);

      FB.login(
        (response) => {
          if (response.authResponse?.code) {
            session.current.code = response.authResponse.code;
            submitIfReady();
          } else {
            finish();
            onError?.('WhatsApp login was cancelled or not completed.');
          }
        },
        {
          config_id: config.config_id,
          response_type: 'code',
          override_default_response_type: true,
          extras: { setup: {}, featureType: '', sessionInfoVersion: '3' },
        }
      );
    } catch (err) {
      finish();
      onError?.(err.message);
    }
  };

  return (
    <button className="btn btn-primary" disabled={busy} onClick={handleClick}>
      {busy ? 'Connecting...' : '💬 Connect WhatsApp'}
    </button>
  );
}
