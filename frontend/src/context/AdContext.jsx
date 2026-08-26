import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from './AuthContext';

const AdContext = createContext(null);

export function AdProvider({ children }) {
  const { user } = useAuth();
  const [ads, setAds] = useState({});

  const reload = useCallback(() => {
    if (!user) {
      setAds({});
      return;
    }
    api
      .get('/ad-slots')
      .then((res) => {
        const map = {};
        (res.data || []).forEach((slot) => {
          map[slot.placement] = slot.code;
        });
        setAds(map);
      })
      .catch(() => setAds({}));
  }, [user]);

  useEffect(() => {
    reload();
  }, [reload]);

  const getAd = (placement) => ads[placement] || null;

  return <AdContext.Provider value={{ getAd, reload }}>{children}</AdContext.Provider>;
}

export function useAds() {
  return useContext(AdContext);
}
