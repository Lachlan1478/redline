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
      ? `${doc.name} · ${doc.paragraphs.length} paragraphs`
      : 'Drop a .docx or .pdf, or click to browse';

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
        className={`flex items-center gap-3 rounded-lg border-2 border-dashed px-4 py-2 text-left transition-colors ${
          dragging
            ? 'border-blue-500 bg-blue-50'
            : doc
              ? 'border-slate-300 bg-white hover:border-blue-400'
              : 'border-slate-300 bg-slate-50 hover:border-blue-400'
        }`}
      >
        <span className="shrink-0 rounded bg-slate-800 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-white">
          {label}
        </span>
        <span className={`truncate text-sm ${doc ? 'font-medium text-slate-800' : 'text-slate-500'}`}>
          {status}
        </span>
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
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
