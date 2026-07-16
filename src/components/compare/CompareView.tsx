import { useCallback, useMemo, useRef, useState } from 'react';
import { diffDocuments } from '../../lib/diff/diffDocuments';
import { documentFromText, parseFile, ParseError } from '../../lib/parse';
import type { LoadedDocument } from '../../lib/parse';
import { DiffWorkspace } from '../DiffWorkspace';
import { FileDropzone } from '../FileDropzone';

interface DocumentSlot {
  doc?: LoadedDocument;
  loading: boolean;
  error?: string;
  load: (file: File) => void;
  loadText: (name: string, text: string) => void;
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

  const loadText = useCallback((name: string, text: string) => {
    requestId.current += 1; // supersede any in-flight file parse
    setLoading(false);
    try {
      setDoc(documentFromText(name, text));
      setError(undefined);
    } catch (cause) {
      setDoc(undefined);
      setError(cause instanceof ParseError ? cause.message : 'Could not read the pasted text.');
    }
  }, []);

  return { doc, loading, error, load, loadText };
}

export function CompareView() {
  const original = useDocumentSlot();
  const change = useDocumentSlot();

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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex gap-3 border-b border-desk-line/60 bg-desk-deep px-5 py-2.5">
        <div className="flex min-w-0 max-w-3xl flex-1 gap-3">
          <FileDropzone
            label="Original"
            {...original}
            onFile={original.load}
            onPasteText={(text) => original.loadText('Pasted original', text)}
          />
          <FileDropzone
            label="Change"
            {...change}
            onFile={change.load}
            onPasteText={(text) => change.loadText('Pasted change', text)}
          />
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        {diff && original.doc && change.doc ? (
          <DiffWorkspace
            diff={diff}
            leftName={original.doc.name}
            rightName={change.doc.name}
            identicalNote="The documents are identical — no differences found."
          />
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
