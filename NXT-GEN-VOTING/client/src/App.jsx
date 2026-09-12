import { useState } from 'react';
import Nav from './components/Nav.jsx';
import Home from './pages/Home.jsx';
import Election from './pages/Election.jsx';
import { useApp } from './AppContext.jsx';

export default function App() {
  const { error, setError } = useApp();
  const [view, setView] = useState({ name: 'home' });

  const goToElection = (id) => setView({ name: 'election', id });
  const goHome = () => setView({ name: 'home' });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Nav onHome={goHome} />
      {error && (
        <div className="mx-auto mt-4 max-w-3xl rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
          <button className="ml-3 text-red-300 underline" onClick={() => setError('')}>
            dismiss
          </button>
        </div>
      )}
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        {view.name === 'home' && <Home navigateToElection={goToElection} />}
        {view.name === 'election' && <Election electionId={view.id} onBack={goHome} />}
      </main>
    </div>
  );
}