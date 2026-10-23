import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'cpa_token';
const SITE_KEY = 'cpa_site';

const api = axios.create({ baseURL });

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

// The open site's code. Kept per browser tab (sessionStorage): a reload stays
// on the same site, but a fresh tab starts at the site picker, so nobody logs
// assets into yesterday's site by accident.
export function getSiteCode() {
  try {
    return sessionStorage.getItem(SITE_KEY);
  } catch {
    return null;
  }
}
export function setSiteCode(code) {
  try {
    if (code) sessionStorage.setItem(SITE_KEY, code);
    else sessionStorage.removeItem(SITE_KEY);
  } catch {
    // storage blocked — the site still applies until the tab reloads
  }
}

// Attach the bearer token and the open site to every request — the server
// picks that site's register from X-Site.
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const site = getSiteCode();
  if (site) config.headers['X-Site'] = site;
  return config;
});

// If the server rejects our token, drop it and let the app fall back to login.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401 && getToken()) {
      setToken(null);
      window.dispatchEvent(new Event('cpa-auth-expired'));
    }
    return Promise.reject(err);
  }
);

// Normalise server / network errors into a thrown Error with a useful message.
export function unwrap(promise) {
  return promise
    .then((res) => res.data)
    .catch((err) => {
      const message =
        err?.response?.data?.message ||
        (err?.code === 'ERR_NETWORK'
          ? 'Cannot reach the server. Is the backend running?'
          : err.message) ||
        'Request failed';
      const e = new Error(message);
      e.status = err?.response?.status;
      throw e;
    });
}

export const getSites = () => unwrap(api.get('/sites'));
export const getAssets = () => unwrap(api.get('/assets'));
export const getAsset = (code) => unwrap(api.get(`/assets/${encodeURIComponent(code)}`));
export const createAsset = (payload) => unwrap(api.post('/assets', payload));
export const updateAsset = (code, payload) =>
  unwrap(api.put(`/assets/${encodeURIComponent(code)}`, payload));
export const updateStatus = (code, payload) =>
  unwrap(api.patch(`/assets/${encodeURIComponent(code)}/status`, payload));
export const updateTagDetails = (code, payload) =>
  unwrap(api.patch(`/assets/${encodeURIComponent(code)}/tag`, payload));
export const deleteAsset = (code) => unwrap(api.delete(`/assets/${encodeURIComponent(code)}`));
export const markLabelsPrinted = (codes) => unwrap(api.post('/assets/labels-printed', { codes }));
export const getNextCode = (categoryCode, itemCode, count = 1) =>
  unwrap(api.get('/assets/meta/next-code', { params: { categoryCode, itemCode, count } }));
// Public, read-only — used by scanned barcode tags (lookup by scan token).
export const getPublicAsset = (scanId, unit) =>
  unwrap(api.get(`/public/asset/${encodeURIComponent(scanId)}`, { params: unit != null ? { unit } : {} }));

export default api;
