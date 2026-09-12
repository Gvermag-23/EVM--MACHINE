import { useCallback, useEffect, useState } from 'react';
import { electionApi } from '../api.js';
import { useApp } from '../AppContext.jsx';
import { executeVote, hasVoted } from '../contract.js';
import { electionStatus, STATUS_STYLES } from './Home.jsx';

export default function Election({ electionId, onBack }) {
  const { isConnected, isLoggedIn, account, busy, notify, connect, login } = useApp();
  const [detail, setDetail] = useState(null);
  const [voted, setVoted] = useState(false);
  const [pending, setPending] = useState(false);
  const [rebuild, setRebuild] = useState(0);

  const refresh = useCallback(() => setRebuild((n) => n + 1), []);

  const load = useCallback(async () => {
    try {
      const { data } = await electionApi.get(electionId);
      setDetail(data);
      if (account) {
        setVoted(await hasVoted(electionId, account));
      } else {
        setVoted(false);
      }
    } catch (e) {
      notify(e?.response?.data?.error ?? 'Could not load election');
    }
  }, [electionId, account, notify]);

  useEffect(() => {
    load();
  }, [load, rebuild]);

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

  const castVote = async (candidateId) => {
    if (!(await ensureReady())) return;
    setPending(true);
    try {
      await executeVote(electionId, candidateId);
      notify('Vote recorded on-chain.');
      setVoted(true);
      refresh();
    } catch (e) {
      notify(e?.message ?? 'Vote transaction failed');
    } finally {
      setPending(false);
    }
  };

  if (!detail) {
    return (
      <div>
        <button onClick={onBack} className="text-sm text-slate-400 hover:text-emerald-300">
          ← Back
        </button>
        <p className="mt-6 text-slate-400">Loading election…</p>
      </div>
    );
  }

  const { election, candidates, totalVotes, winnerId, note } = detail;
  const status = !election.isActive && !election.ended ? 'scheduled' : electionStatus(election, detail.currentBlockTs);
  const maxVotes = Math.max(1, ...candidates.map((c) => c.voteCount));
  const canVote = status === 'active' && !voted;
  const showResults = status === 'ended' || voted;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="text-sm text-slate-400 hover:text-emerald-300">
          ← Back
        </button>
        <span className={`rounded-full border px-3 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>{status}</span>
      </div>

      <header className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
        <h1 className="text-2xl font-bold">
          #{election.id} {election.name}
        </h1>
        {election.description && <p className="mt-2 text-slate-300">{election.description}</p>}
        {note && <p className="mt-2 text-sm text-emerald-300">{note}</p>}
        <p className="mt-2 text-xs text-slate-500">
          Duration {election.duration / 60} min · {totalVotes} vote{totalVotes === 1 ? '' : 's'} cast
        </p>
        {status === 'active' && election.endTime && (
          <p className="text-xs text-slate-500">Voting ends at {new Date(election.endTime * 1000).toLocaleTimeString()}</p>
        )}
      </header>

      {!isConnected && (
        <section className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          Connect your wallet and sign in to vote.
          <button
            onClick={() => connect().then((ok) => ok && login())}
            disabled={busy}
            className="ml-3 text-amber-300 underline disabled:opacity-50"
          >
            Connect
          </button>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Candidates</h2>
        {candidates.length === 0 ? (
          <p className="text-slate-400">No candidates have been added yet.</p>
        ) : (
          <ul className="space-y-3">
            {candidates.map((c) => {
              const pct = showResults ? Math.round((c.voteCount / maxVotes) * 100) : 0;
              const isWinner = winnerId === c.id;
              return (
                <li
                  key={c.id}
                  className={`rounded-xl border p-4 ${
                    isWinner && showResults ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-slate-800 bg-slate-900/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {c.name}
                        {isWinner && showResults && <span className="ml-2 text-xs text-emerald-300">winner</span>}
                      </p>
                      {c.description && <p className="mt-0.5 text-sm text-slate-400">{c.description}</p>}
                      {c.bio && <p className="mt-0.5 text-xs text-slate-500">Bio: {c.bio}</p>}
                    </div>
                    {canVote && (
                      <button
                        onClick={() => castVote(c.id)}
                        disabled={pending || busy}
                        className="shrink-0 rounded-md bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                      >
                        Vote
                      </button>
                    )}
                  </div>
                  {showResults && (
                    <div className="mt-3">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-slate-400">{c.voteCount} votes</p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="flex items-center gap-3 text-sm">
        {status === 'active' && voted && <p className="text-emerald-300">You voted in this election.</p>}
        {status === 'active' && !voted && isConnected && <p className="text-slate-400">Pick a candidate above to vote.</p>}
        {status === 'ended' && <p className="text-slate-400">This election has ended.</p>}
        <button onClick={refresh} className="text-slate-400 underline hover:text-emerald-300">
          Refresh
        </button>
      </div>
    </div>
  );
}