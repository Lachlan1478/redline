import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { diffDocuments } from './lib/diff/diffDocuments';
import { parseFile, ParseError } from './lib/parse';
import type { LoadedDocument } from './lib/parse';
import { AmendmentRail } from './components/AmendmentRail';
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

  const diff = useMemo(() => {
    if (!original.doc || !change.doc) return undefined;
    const started = performance.now();
    const result = diffDocuments(original.doc.paragraphs, change.doc.paragraphs);
    console.info(
      `[redline] diff: ${original.doc.paragraphs.length}×${change.doc.paragraphs.length} ¶ → ` +
        `${result.rows.length} rows, ${result.hunks.length} hunks in ${Math.round(performance.now() - started)}ms`,
    );
    return result;
  }, [original.doc, change.doc]);

  useEffect(() => {
    setActiveHunk(diff && diff.hunks.length > 0 ? 0 : undefined);
  }, [diff]);

  return (
    <div className="flex h-full flex-col bg-desk">
      <header className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-desk-line/60 bg-desk-deep px-5 py-3">
        <h1 className="font-serif text-xl font-bold tracking-[0.08em] text-paper">
          R<span className="text-[0.85em]">EDLINE</span>
          <span className="ml-3 hidden border-l border-desk-line pl-3 font-sans text-[11px] font-normal tracking-normal text-desk-muted lg:inline">
            side-by-side comparison for circulars &amp; prudential standards
          </span>
        </h1>
        <div className="flex min-w-0 max-w-3xl flex-1 gap-3">
          <FileDropzone label="Original" {...original} onFile={original.load} />
          <FileDropzone label="Change" {...change} onFile={change.load} />
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        {diff && original.doc && change.doc ? (
          <>
            <ChangeSidebar hunks={diff.hunks} activeHunk={activeHunk} onSelect={setActiveHunk} />
            <AmendmentRail diff={diff} activeHunk={activeHunk} onSelect={setActiveHunk} />
            <main className="min-w-0 flex-1 overflow-y-auto bg-paper">
              {diff.hunks.length === 0 && (
                <p className="border-b border-rule bg-paper-shade px-7 py-2 font-serif text-sm italic text-ink-muted">
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
            <div className="max-w-md border-2 border-double border-ink/60 bg-paper p-10 text-center shadow-[0_18px_40px_-18px_rgb(0_0_0/0.55)]">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
                For review
              </p>
              <h2 className="mb-4 mt-2 font-serif text-2xl font-semibold text-ink">
                Compare two documents
              </h2>
              <p className="mb-5 font-serif text-[15px] leading-relaxed text-ink">
                Load an <strong>Original</strong> and a <strong>Change</strong> document above.
                Additions are marked in{' '}
                <span className="rounded-[2px] bg-added-bg px-1 text-added-ink">green</span>,
                removals in{' '}
                <span className="rounded-[2px] bg-removed-bg px-1 text-removed-ink line-through">
                  red
                </span>
                , and unchanged sections fold away so you review only what changed.
              </p>
              <p className="text-xs text-ink-muted">
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
