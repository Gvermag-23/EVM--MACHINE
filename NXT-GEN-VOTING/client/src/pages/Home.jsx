import { useCallback, useEffect, useState } from 'react';
import { electionApi } from '../api.js';
import { useApp } from '../AppContext.jsx';
import { executeAddCandidate, executeCreateElection, executeEndElection, executeStartElection } from '../contract.js';

export function electionStatus(e, nowTs) {
  if (e.ended || (e.isActive && e.endTime && nowTs > e.endTime)) return 'ended';
  if (e.isActive) return 'active';
  return 'scheduled';
}

export const STATUS_STYLES = {
  scheduled: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  active: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  ended: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
};

export default function Home({ navigateToElection }) {
  const { isConnected, isLoggedIn, isAdmin, busy, notify, connect, login } = useApp();
  const [elections, setElections] = useState({ elections: [], currentBlockTs: 0, loaded: false });
  const [pendingTx, setPendingTx] = useState(false);

  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDuration, setNewDuration] = useState('15');

  const [candidateElection, setCandidateElection] = useState('');
  const [candidateName, setCandidateName] = useState('');
  const [candidateDesc, setCandidateDesc] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await electionApi.list();
      setElections({ ...data, loaded: true });
    } catch (e) {
      notify(e?.response?.data?.error ?? 'Could not load elections');
    }
  }, [notify]);

  useEffect(() => {
    load();
  }, [load]);

  const ensureReady = async () => {
    if (!isConnected) {
      const ok = await connect();
      if (!ok) return false;
    }
    if (!isLoggedIn) {
      const ok = await login();
      if (!ok) return false;
    }
    return true;
  };

  const runWrite = async (fn) => {
    setPendingTx(true);
    try {
      await fn();
      await load();
    } catch (e) {
      notify(e?.message ?? 'Transaction failed');
    } finally {
      setPendingTx(false);
    }
  };

  const createElection = async (event) => {
    event.preventDefault();
    if (!(await ensureReady())) return;
    const durationSeconds = Math.round(Number(newDuration) * 60);
    if (!newName.trim() || !durationSeconds) return notify('Name and a positive duration are required');
    await runWrite(() => executeCreateElection(newName.trim(), newDesc.trim(), durationSeconds));
    setNewName('');
    setNewDesc('');
  };

  const addCandidate = async (event) => {
    event.preventDefault();
    if (!(await ensureReady())) return;
    const target = Number(candidateElection);
    if (!target || !candidateName.trim()) return notify('Pick an election and enter a candidate name');
    await runWrite(() => executeAddCandidate(target, candidateName.trim(), candidateDesc.trim()));
    setCandidateName('');
    setCandidateDesc('');
  };

  const scheduled = elections.elections.filter((e) => electionStatus(e, elections.currentBlockTs) === 'scheduled');

  return (
    <div className="space-y-8">
      {!isConnected ? (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center">
          <h1 className="text-3xl font-bold">Decentralized voting on the EVM</h1>
          <p className="mx-auto mt-3 max-w-md text-slate-400">
            Elections live on-chain. Connect any EVM wallet and sign in to review candidates and cast your vote.
          </p>
          <button
            onClick={() => connect().then((ok) => ok && login())}
            disabled={busy}
            className="mt-6 rounded-lg bg-emerald-500 px-6 py-2.5 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
          >
            {busy ? 'Connecting...' : 'Connect wallet & sign in'}
          </button>
        </section>
      ) : (
        <>
          {isAdmin && (
            <section className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
              <h2 className="text-lg font-semibold text-emerald-300">Admin panel</h2>

              <form onSubmit={createElection} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Election name"
                  className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
                />
                <input
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Short description"
                  className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  min="1"
                  value={newDuration}
                  onChange={(e) => setNewDuration(e.target.value)}
                  placeholder="Duration (minutes)"
                  className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  disabled={pendingTx}
                  className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                >
                  Create election
                </button>
              </form>

              {scheduled.length > 0 && (
                <form onSubmit={addCandidate} className="mt-5 grid grid-cols-1 gap-3 border-t border-emerald-500/20 pt-5 sm:grid-cols-2">
                  <select
                    value={candidateElection}
                    onChange={(e) => setCandidateElection(e.target.value)}
                    className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
                  >
                    <option value="">Add candidate to...</option>
                    {scheduled.map((e) => (
                      <option key={e.id} value={e.id}>
                        #{e.id} — {e.name}
                      </option>
                    ))}
                  </select>
                  <input
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    placeholder="Candidate name"
                    className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
                  />
                  <input
                    value={candidateDesc}
                    onChange={(e) => setCandidateDesc(e.target.value)}
                    placeholder="Candidate description"
                    className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={pendingTx}
                    className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                  >
                    Add candidate
                  </button>
                </form>
              )}
            </section>
          )}

          <section>
            <h2 className="mb-3 text-xl font-semibold">Elections</h2>
            {!elections.loaded ? (
              <p className="text-slate-400">Loading elections…</p>
            ) : elections.elections.length === 0 ? (
              <p className="text-slate-400">No elections yet{isAdmin ? ' — create one above' : ''}.</p>
            ) : (
              <ul className="space-y-3">
                {elections.elections.map((e) => {
                  const status = electionStatus(e, elections.currentBlockTs);
                  const active = status === 'active';
                  return (
                    <li key={e.id} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <button
                          onClick={() => navigateToElection(e.id)}
                          className="text-left font-semibold hover:text-emerald-300"
                        >
                          #{e.id} {e.name}
                        </button>
                        <span className={`rounded-full border px-3 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>
                          {status}
                        </span>
                      </div>
                      {e.description && <p className="mt-1 text-sm text-slate-400">{e.description}</p>}
                      <p className="mt-1 text-xs text-slate-500">
                        Duration {e.duration / 60} min
                        {active && e.endTime && ` · ends ${new Date(e.endTime * 1000).toLocaleTimeString()}`}
                      </p>
                      {isAdmin && (
                        <div className="mt-3 flex gap-2">
                          {status === 'scheduled' && (
                            <button
                              onClick={() => runWrite(() => executeStartElection(e.id))}
                              disabled={pendingTx}
                              className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold hover:bg-emerald-500 disabled:opacity-50"
                            >
                              Start
                            </button>
                          )}
                          {status === 'active' && (
                            <button
                              onClick={() => runWrite(() => executeEndElection(e.id))}
                              disabled={pendingTx}
                              className="rounded-md bg-red-600 px-3 py-1 text-xs font-semibold hover:bg-red-500 disabled:opacity-50"
                            >
                              End
                            </button>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}