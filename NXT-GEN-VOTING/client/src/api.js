import axios from 'axios';
import { config } from './config.js';

export const api = axios.create({ baseURL: config.apiUrl });

const TOKEN_KEY = 'nxt_gen_voting_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

api.interceptors.request.use((req) => {
  const token = getToken();
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

export const authApi = {
  challenge: (walletAddress) => api.post('/auth/challenge', { walletAddress }),
  verify: (walletAddress, signature) => api.post('/auth/verify', { walletAddress, signature }),
  me: () => api.get('/auth/me'),
};

export const electionApi = {
  list: () => api.get('/elections'),
  get: (id) => api.get(`/elections/${id}`),
  isAdmin: () => api.get('/elections/admin/isAdmin'),
  setNote: (id, note) => api.post(`/elections/${id}/note`, { note }),
  setBio: (id, candidateId, bio) => api.post(`/elections/${id}/candidates/${candidateId}/bio`, { bio }),
  myTxns: () => api.get('/elections/me/txns'),
};