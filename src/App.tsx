import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { diffDocuments } from './lib/diff/diffDocuments';
import { parseFile, ParseError } from './lib/parse';
import type { LoadedDocument } from './lib/parse';
import { ChangeSidebar } from './components/ChangeSidebar';
import { DiffView } from './components/DiffView';
import { FileDropzone } from './components/FileDropzone';

interface DocumentSlot {
  doc?: LoadedDocument;
  loading: boolean;
  error?: string;
  load: (file: File) => void;
}

function useDocumentSlot(): DocumentSlot {
  const [doc, setDoc] = useState<LoadedDocument>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  // Guards against a slow, superseded parse resolving after a newer one.
  const requestId = useRef(0);

  const load = useCallback((file: File) => {
    const token = ++requestId.current;
    setLoading(true);
    setError(undefined);
    parseFile(file)
      .then((parsed) => {
        if (token !== requestId.current) return;
        setDoc(parsed);
      })
      .catch((cause: unknown) => {
        if (token !== requestId.current) return;
        setDoc(undefined);
        setError(cause instanceof ParseError ? cause.message : `Could not read "${file.name}".`);
      })
      .finally(() => {
        if (token === requestId.current) setLoading(false);
      });
  }, []);

  return { doc, loading, error, load };
}

export default function App() {
  const original = useDocumentSlot();
  const change = useDocumentSlot();
  const [activeHunk, setActiveHunk] = useState<number>();

  const diff = useMemo(
    () =>
      original.doc && change.doc
        ? diffDocuments(original.doc.paragraphs, change.doc.paragraphs)
        : undefined,
    [original.doc, change.doc],
  );

  useEffect(() => {
    setActiveHunk(diff && diff.hunks.length > 0 ? 0 : undefined);
  }, [diff]);

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <header className="flex flex-wrap items-center gap-4 border-b border-slate-200 bg-white px-4 py-3">
        <h1 className="text-lg font-bold tracking-tight text-slate-800">
          Redline
          <span className="ml-2 hidden text-xs font-normal text-slate-400 sm:inline">
            side-by-side document comparison
          </span>
        </h1>
        <div className="flex min-w-0 flex-1 gap-3">
          <FileDropzone label="Original" {...original} onFile={original.load} />
          <FileDropzone label="Change" {...change} onFile={change.load} />
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        {diff && original.doc && change.doc ? (
          <>
            <ChangeSidebar hunks={diff.hunks} activeHunk={activeHunk} onSelect={setActiveHunk} />
            <main className="min-w-0 flex-1 overflow-y-auto bg-white">
              {diff.hunks.length === 0 && (
                <p className="border-b border-slate-200 bg-blue-50 px-4 py-2 text-sm text-blue-800">
                  The documents are identical — no differences found.
                </p>
              )}
              <DiffView
                diff={diff}
                originalName={original.doc.name}
                changeName={change.doc.name}
                activeHunk={activeHunk}
              />
            </main>
          </>
        ) : (
          <main className="flex flex-1 items-center justify-center p-8">
            <div className="max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <h2 className="mb-2 text-xl font-semibold text-slate-800">Compare two documents</h2>
              <p className="mb-4 text-sm leading-relaxed text-slate-600">
                Load an <strong>Original</strong> and a <strong>Change</strong> document above.
                Additions are highlighted in <span className="rounded bg-green-200 px-1">green</span>,
                removals in <span className="rounded bg-red-200 px-1 line-through">red</span>, and
                unchanged sections collapse so you review only what changed.
              </p>
              <p className="text-xs text-slate-400">
                Supports .docx and .pdf. Documents are processed entirely in your browser — nothing
                is uploaded to any server.
              </p>
            </div>
          </main>
        )}
      </div>
    </div>
  );
}
