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

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-line bg-card px-4 py-2">
      <select
        value={activeTemplateId}
        onChange={(event) => onTemplateChange(event.target.value)}
        aria-label="Active template"
        className="max-w-64 truncate rounded-md border border-line bg-card px-2 py-1 text-sm font-medium text-ink"
      >
        {templates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      {issueCount > 0 && (
        <span className="rounded-full bg-caution/10 px-2.5 py-0.5 font-mono text-xs text-caution">
          {issueCount} open issue{issueCount === 1 ? '' : 's'}
        </span>
      )}
      {error && <span className="max-w-96 truncate text-xs text-signal">{error}</span>}
      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          data-testid="import-contract"
          className="btn"
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
          className="btn"
        >
          {mode === 'deviation' ? 'Back to draft' : 'Redline vs base'}
        </button>
        <button type="button" className="btn" onClick={() => dealInputRef.current?.click()}>
          Load deal
        </button>
        <button type="button" className="btn" onClick={onSave}>
          Save deal
        </button>
        <button
          type="button"
          data-testid="export-docx"
          onClick={onExport}
          className="btn btn-primary"
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
