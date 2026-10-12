import { useRef, useState } from 'react';
import type { DragEvent } from 'react';
import type { LoadedDocument } from '../lib/parse';

interface FileDropzoneProps {
  label: string;
  doc?: LoadedDocument;
  loading: boolean;
  error?: string;
  onFile: (file: File) => void;
  /** Status text shown before a document is loaded. */
  emptyHint?: string;
  /** Called with clipboard text when the user chooses to paste a document. */
  onPasteText?: (text: string) => void;
}

export function FileDropzone({ label, doc, loading, error, emptyHint, onFile, onPasteText }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [pasteError, setPasteError] = useState<string>();

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) onFile(file);
  };

  const handlePaste = async () => {
    setPasteError(undefined);
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        setPasteError('Clipboard is empty — copy the document text first.');
        return;
      }
      onPasteText?.(text);
    } catch {
      setPasteError('Clipboard unavailable — grant permission or use a .txt file.');
    }
  };

  const status = loading
    ? 'Reading…'
    : doc
      ? `${doc.name} · ${doc.paragraphs.length} ¶`
      : (emptyHint ?? 'Drop .docx, .pdf or .txt — click to browse');

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <div className="flex items-stretch gap-1">
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
          className={`flex min-w-0 flex-1 items-center gap-3 rounded-md border border-dashed px-3 py-2 text-left transition-colors ${
            dragging ? 'border-dawn bg-dawn/5' : 'border-line hover:border-dawn-light hover:bg-hover'
          }`}
        >
          <span
            className={`eyebrow shrink-0 rounded px-1.5 py-0.5 text-[11px] ${
              label === 'Change' ? 'bg-dawn text-white' : 'bg-page text-ink'
            }`}
          >
            {label}
          </span>
          <span
            className={`truncate text-[13px] ${doc ? 'font-medium text-ink' : 'text-ink-soft'}`}
          >
            {status}
          </span>
        </button>
        {onPasteText && (
          <button
            type="button"
            aria-label={`Paste ${label} document from clipboard`}
            title="Paste document text from the clipboard"
            onClick={() => void handlePaste()}
            className="btn shrink-0"
          >
            Paste
          </button>
        )}
      </div>
      {(error || pasteError) && <p className="text-xs text-signal">{error ?? pasteError}</p>}
      <input
        ref={inputRef}
        type="file"
        accept=".docx,.pdf,.txt,.md"
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
