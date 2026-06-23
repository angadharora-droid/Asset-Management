import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { login as apiLogin, getMe, clearAuth } from '../api/authApi.js';
import { getToken } from '../api/assetApi.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
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
