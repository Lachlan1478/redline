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
    <div className="flex h-full flex-col bg-desk">
      <header className="flex items-center gap-6 border-b border-desk-line/60 bg-desk-deep px-5 py-3">
        <h1 className="font-serif text-xl font-bold tracking-[0.08em] text-paper">
          R<span className="text-[0.85em]">EDLINE</span>
        </h1>
        <nav className="flex gap-1" aria-label="Workspaces">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              aria-current={tab === id ? 'page' : undefined}
              className={`rounded-sm px-3 py-1.5 font-mono text-[12px] uppercase tracking-[0.14em] transition-colors ${
                tab === id
                  ? 'bg-desk text-highlighter shadow-[inset_0_-2px_0_var(--color-highlighter)]'
                  : 'text-desk-muted hover:text-desk-text'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
        <span className="ml-auto hidden font-sans text-[11px] text-desk-muted lg:inline">
          documents never leave your browser
        </span>
      </header>
      {tab === 'compare' ? <CompareView /> : <AssembleView />}
    </div>
  );
}
