import { useRef, useState } from 'react';
import type { DragEvent } from 'react';
import type { LoadedDocument } from '../lib/parse';

interface FileDropzoneProps {
  label: string;
  doc?: LoadedDocument;
  loading: boolean;
  error?: string;
  onFile: (file: File) => void;
}

export function FileDropzone({ label, doc, loading, error, onFile }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) onFile(file);
  };

  const status = loading
    ? 'Reading…'
    : doc
      ? `${doc.name} · ${doc.paragraphs.length} ¶`
      : 'Drop .docx or .pdf, or click to browse';

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <button
        type="button"
        aria-label={`Load ${label} document`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`flex items-center gap-3 rounded-sm border border-dashed px-3 py-2 text-left transition-colors ${
          dragging
            ? 'border-highlighter bg-desk-deep'
            : 'border-desk-line hover:border-desk-text/60 hover:bg-desk-deep/60'
        }`}
      >
        <span
          className={`shrink-0 rounded-[2px] border px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em] ${
            label === 'Change'
              ? 'border-highlighter/70 text-highlighter'
              : 'border-desk-muted text-desk-text'
          }`}
        >
          {label}
        </span>
        <span
          className={`truncate text-[13px] ${doc ? 'font-medium text-desk-text' : 'text-desk-muted'}`}
        >
          {status}
        </span>
      </button>
      {error && <p className="text-xs text-removed-bg">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept=".docx,.pdf"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = '';
        }}
      />
    </div>
  );
}
