import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from './AuthContext';

const DEFAULTS = {
  telegram_channel_url: null,
  telegram_button_enabled: false,
};

const SiteSettingContext = createContext(null);

export function SiteSettingProvider({ children }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState(DEFAULTS);

  const reload = useCallback(() => {
    if (!user) {
      setSettings(DEFAULTS);
      return;
    }
    api
      .get('/site-settings')
      .then((res) => setSettings({ ...DEFAULTS, ...res.data }))
      .catch(() => setSettings(DEFAULTS));
  }, [user]);

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
