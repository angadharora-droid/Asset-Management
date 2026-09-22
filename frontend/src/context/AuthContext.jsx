import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { login as apiLogin, loginWithSso, getMe, clearAuth } from '../api/authApi.js';
import { getToken } from '../api/assetApi.js';
import { resolveSsoToken, ssoLogout } from '../lib/sso.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    ssoLogout(); // ends the portal session too; no-op unless VITE_AUTH_URL is set
    clearAuth();
    setUser(null);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      if (getToken()) {
        try {
          const u = await getMe();
          if (active) setUser(u);
        } catch {
          clearAuth();
        }
      } else {
        // Central sign-on: no local session, so ask the CPG portal whether this
        // visitor is already signed in there. No-op unless VITE_AUTH_URL is set;
        // anything short of success falls through to the normal login page.
        try {
          const ssoToken = await resolveSsoToken();
          if (ssoToken) {
            const u = await loginWithSso(ssoToken);
            if (active) setUser(u);
          }
        } catch {
          clearAuth();
        }
      }
      if (active) setLoading(false);
    })();

    // The axios interceptor fires this when a token is rejected mid-session.
    const onExpired = () => setUser(null);
    window.addEventListener('cpa-auth-expired', onExpired);
    return () => {
      active = false;
      window.removeEventListener('cpa-auth-expired', onExpired);
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const u = await apiLogin(email, password);
    setUser(u);
    return u;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
