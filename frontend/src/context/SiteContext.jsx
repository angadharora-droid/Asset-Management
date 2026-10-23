import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getSiteCode, setSiteCode } from '../api/assetApi.js';
import { findSite } from '../constants/sites.js';
import { useAuth } from './AuthContext.jsx';

const SiteContext = createContext(null);

// The site whose register is open — null until one is picked on the site
// picker. Every asset request carries it (see the X-Site header in assetApi).
export function SiteProvider({ children }) {
  const { user, loading } = useAuth();
  const [site, setSite] = useState(() => findSite(getSiteCode()));

  const selectSite = useCallback((code) => {
    const next = findSite(code);
    setSiteCode(next?.code || null);
    setSite(next);
  }, []);

  // Signing out closes the site too, so the next sign-in starts at the picker.
  useEffect(() => {
    if (!loading && !user) selectSite(null);
  }, [user, loading, selectSite]);

  return <SiteContext.Provider value={{ site, selectSite }}>{children}</SiteContext.Provider>;
}

export function useSite() {
  return useContext(SiteContext);
}
