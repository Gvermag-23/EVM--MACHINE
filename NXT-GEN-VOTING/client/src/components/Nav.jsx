import { useApp } from '../AppContext.jsx';

function shortAddress(address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function Nav({ onHome }) {
  const { isConnected, isLoggedIn, account, busy, connect, login, logout } = useApp();

  const handleConnect = async () => {
    const connected = await connect();
    if (connected) await login();
  };

  return (
    <header className="border-b border-slate-800 bg-slate-900/60">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3">
        <button onClick={onHome} className="text-lg font-bold tracking-tight text-emerald-400">
          NXT-GEN-VOTING
        </button>

        <div className="flex items-center gap-3">
          {isConnected && (
            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">
              {isLoggedIn ? shortAddress(account) : `${shortAddress(account)} (not signed in)`}
            </span>
          )}
          {isConnected && isLoggedIn ? (
            <button
              onClick={logout}
              className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
            >
              Logout
            </button>
          ) : (
            <button
              onClick={handleConnect}
              disabled={busy}
              className="rounded-md bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
            >
              {busy ? 'Connecting...' : 'Connect wallet'}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}