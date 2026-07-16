import { useRef } from 'react';

interface AssembleToolbarProps {
  templateName: string;
  issueCount: number;
  onExport: () => void;
  onSave: () => void;
  onLoad: (file: File) => void;
  loadError?: string;
}

export function AssembleToolbar({
  templateName,
  issueCount,
  onExport,
  onSave,
  onLoad,
  loadError,
}: AssembleToolbarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const buttonClass =
    'rounded-sm border border-desk-line px-3 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-desk-text hover:border-desk-text/60 hover:bg-desk-deep';

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-desk-line/60 bg-desk-deep px-5 py-2">
      <span className="font-serif text-sm italic text-desk-text">{templateName}</span>
      {issueCount > 0 && (
        <span className="rounded-sm bg-highlighter/20 px-2 py-0.5 font-mono text-[11px] text-highlighter">
          {issueCount} open issue{issueCount === 1 ? '' : 's'}
        </span>
      )}
      {loadError && <span className="text-xs text-removed-bg">{loadError}</span>}
      <div className="ml-auto flex items-center gap-2">
        <button type="button" className={buttonClass} onClick={() => inputRef.current?.click()}>
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
        ref={inputRef}
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
