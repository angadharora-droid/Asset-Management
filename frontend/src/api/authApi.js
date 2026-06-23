import api, { unwrap, setToken } from './assetApi.js';

export async function login(email, password) {
  const data = await unwrap(api.post('/auth/login', { email, password }));
  setToken(data.token);
  return data.user;
}

export const getMe = () => unwrap(api.get('/auth/me')).then((d) => d.user);

export const listUsers = () => unwrap(api.get('/auth/users'));
export const createUser = (payload) => unwrap(api.post('/auth/users', payload));
export const updateUser = (id, payload) => unwrap(api.patch(`/auth/users/${id}`, payload));

export function clearAuth() {
  setToken(null);
}
