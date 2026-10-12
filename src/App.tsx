import { useState } from 'react';
import { AssembleView } from './components/assemble/AssembleView';
import { CompareView } from './components/compare/CompareView';

type Tab = 'compare' | 'assemble';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'compare', label: 'Compare' },
  { id: 'assemble', label: 'Assemble' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('compare');

  return (
    <div className="flex h-full flex-col bg-page">
      <header className="flex h-12 shrink-0 items-center gap-6 border-b border-line bg-page px-4">
        <h1 className="font-display text-sm font-bold text-ink">Redline</h1>
        <nav className="flex gap-5 text-sm font-medium" aria-label="Workspaces">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              aria-current={tab === id ? 'page' : undefined}
              className={`border-b-2 pb-1 transition-colors ${
                tab === id
                  ? 'border-dawn text-dawn'
                  : 'border-transparent text-ink-soft hover:text-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
        <span className="ml-auto hidden font-mono text-xs text-ink-soft lg:inline">
          documents never leave your browser
        </span>
      </header>
      {tab === 'compare' ? <CompareView /> : <AssembleView />}
    </div>
  );
}
