import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../api/client';

const DEFAULTS = {
  telegram_channel_url: null,
  telegram_button_enabled: false,
  facebook_pixel_id: null,
  facebook_pixel_enabled: false,
};

const SiteSettingContext = createContext(null);

export function SiteSettingProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULTS);

  // Public endpoint, fetched regardless of login state — the Telegram
  // button and (especially) the Facebook Pixel both need to be live on the
  // logged-out Login/Register pages too, not just once someone's signed in.
  const reload = useCallback(() => {
    api
      .get('/site-settings')
      .then((res) => setSettings({ ...DEFAULTS, ...res.data }))
      .catch(() => setSettings(DEFAULTS));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <SiteSettingContext.Provider value={{ settings, reload }}>
      {children}
    </SiteSettingContext.Provider>
  );
}

export function useSiteSettings() {
  return useContext(SiteSettingContext);
}
