import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ensureChain, getSigner, hasMetaMask } from './contract.js';
import { authApi, electionApi, getToken, setToken, clearToken } from './api.js';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const notify = useCallback((message) => setError(message), []);

  const refreshAccount = useCallback(async () => {
    try {
      const signer = await getSigner();
      const address = await signer.getAddress();
      const network = await signer.provider.getNetwork();
      setAccount(address.toLowerCase());
      setChainId(Number(network.chainId));
    } catch {
      setAccount(null);
    }
  }, []);

  const connect = useCallback(async () => {
    if (!hasMetaMask()) {
      notify('MetaMask is required. Install it and reload.');
      return null;
    }
    setBusy(true);
    setError('');
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      await ensureChain();
      await refreshAccount();
      return true;
    } catch (e) {
      notify(e?.message ?? 'Could not connect wallet');
      return null;
    } finally {
      setBusy(false);
    }
  }, [refreshAccount, notify]);

  const login = useCallback(async () => {
    if (!account) {
      notify('Connect your wallet first');
      return false;
    }
    setBusy(true);
    setError('');
    try {
      const { data } = await authApi.challenge(account);
      const signer = await getSigner();
      const signature = await signer.signMessage(data.message);
      const { data: verified } = await authApi.verify(account, signature);
      setToken(verified.token);
      setUser(verified.user);
      const { data: admin } = await electionApi.isAdmin();
      setIsAdmin(admin.isAdmin);
      return true;
    } catch (e) {
      notify(e?.response?.data?.error ?? e?.message ?? 'Sign-in failed');
      return false;
    } finally {
      setBusy(false);
    }
  }, [account, notify]);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    setIsAdmin(false);
  }, []);

  const restoreSession = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const { data } = await authApi.me();
      setUser(data.user);
      const adminRes = await electionApi.isAdmin();
      setIsAdmin(adminRes.data.isAdmin);
    } catch {
      clearToken();
    }
  }, []);

  useEffect(() => {
    restoreSession();
    if (hasMetaMask()) {
      window.ethereum?.on?.('accountsChanged', refreshAccount);
      window.ethereum?.on?.('chainChanged', refreshAccount);
      return () => {
        window.ethereum?.removeListener?.('accountsChanged', refreshAccount);
        window.ethereum?.removeListener?.('chainChanged', refreshAccount);
      };
    }
  }, [restoreSession, refreshAccount]);

  const isConnected = Boolean(account);
  const isLoggedIn = Boolean(user);

  const value = useMemo(
    () => ({ account, chainId, user, isAdmin, isConnected, isLoggedIn, busy, error, setError, notify, connect, login, logout, refreshAccount }),
    [account, chainId, user, isAdmin, isConnected, isLoggedIn, busy, error, notify, connect, login, logout, refreshAccount],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}