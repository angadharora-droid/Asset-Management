import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'cpa_token';

const api = axios.create({ baseURL });

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

// Attach the bearer token to every request.
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
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
export const getNextCode = (categoryCode, itemCode, count = 1) =>
  unwrap(api.get('/assets/meta/next-code', { params: { categoryCode, itemCode, count } }));
// Public, read-only — used by scanned barcode tags (lookup by scan token).
export const getPublicAsset = (scanId, unit) =>
  unwrap(api.get(`/public/asset/${encodeURIComponent(scanId)}`, { params: unit != null ? { unit } : {} }));

export default api;
