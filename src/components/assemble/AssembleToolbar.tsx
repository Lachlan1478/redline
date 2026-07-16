import { useRef } from 'react';

interface TemplateOption {
  id: string;
  name: string;
}

interface AssembleToolbarProps {
  templates: TemplateOption[];
  activeTemplateId: string;
  onTemplateChange: (id: string) => void;
  issueCount: number;
  mode: 'draft' | 'deviation';
  onModeChange: (mode: 'draft' | 'deviation') => void;
  onImport: (file: File) => void;
  onExport: () => void;
  onSave: () => void;
  onLoad: (file: File) => void;
  importing: boolean;
  error?: string;
}

export function AssembleToolbar({
  templates,
  activeTemplateId,
  onTemplateChange,
  issueCount,
  mode,
  onModeChange,
  onImport,
  onExport,
  onSave,
  onLoad,
  importing,
  error,
}: AssembleToolbarProps) {
  const dealInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const buttonClass =
    'rounded-sm border border-desk-line px-3 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-desk-text hover:border-desk-text/60 hover:bg-desk-deep';

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-desk-line/60 bg-desk-deep px-5 py-2">
      <select
        value={activeTemplateId}
        onChange={(event) => onTemplateChange(event.target.value)}
        aria-label="Active template"
        className="max-w-64 truncate rounded-sm border border-desk-line bg-desk px-2 py-1 font-serif text-sm italic text-desk-text"
      >
        {templates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      {issueCount > 0 && (
        <span className="rounded-sm bg-highlighter/20 px-2 py-0.5 font-mono text-[11px] text-highlighter">
          {issueCount} open issue{issueCount === 1 ? '' : 's'}
        </span>
      )}
      {error && <span className="max-w-96 truncate text-xs text-removed-bg">{error}</span>}
      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          data-testid="import-contract"
          className={buttonClass}
          disabled={importing}
          onClick={() => importInputRef.current?.click()}
        >
          {importing ? 'Importing…' : 'Import contract'}
        </button>
        <button
          type="button"
          data-testid="toggle-deviation"
          aria-pressed={mode === 'deviation'}
          onClick={() => onModeChange(mode === 'deviation' ? 'draft' : 'deviation')}
          className={`rounded-sm border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.12em] ${
            mode === 'deviation'
              ? 'border-stamp bg-stamp/20 text-removed-bg'
              : 'border-desk-line text-desk-text hover:border-desk-text/60 hover:bg-desk-deep'
          }`}
        >
          {mode === 'deviation' ? 'Back to draft' : 'Redline vs base'}
        </button>
        <button type="button" className={buttonClass} onClick={() => dealInputRef.current?.click()}>
          Load deal
        </button>
        <button type="button" className={buttonClass} onClick={onSave}>
          Save deal
        </button>
        <button
          type="button"
          data-testid="export-docx"
          onClick={onExport}
          className="rounded-sm border border-highlighter/70 bg-highlighter/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-highlighter hover:bg-highlighter/20"
        >
          Export .docx
        </button>
      </div>
      <input
        ref={importInputRef}
        type="file"
        accept=".docx,.pdf"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onImport(file);
          event.target.value = '';
        }}
      />
      <input
        ref={dealInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onLoad(file);
          event.target.value = '';
        }}
      />
    </div>
  );
}
