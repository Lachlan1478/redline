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
  const earlier = useDocumentSlot();
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
      <div className="flex gap-3 border-b border-line bg-card px-4 py-2.5">
        <div className="flex min-w-0 max-w-5xl flex-1 gap-3">
          <FileDropzone
            label="Earlier"
            {...earlier}
            emptyHint="Optional — flags clauses reverted to it"
            onFile={earlier.load}
          />
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
            earlier={earlier.doc?.paragraphs}
            identicalNote="The documents are identical — no differences found."
          />
        ) : (
          <main className="flex flex-1 items-center justify-center p-8">
            <div className="max-w-md rounded-lg border border-line bg-card p-8">
              <p className="eyebrow">For review</p>
              <h2 className="mb-3 mt-1 font-display text-xl font-bold text-ink">
                Compare two documents
              </h2>
              <p className="mb-4 text-[15px] leading-relaxed text-ink">
                Load an <strong>Original</strong> and a <strong>Change</strong> document above.
                Additions are marked in{' '}
                <span className="rounded-[2px] bg-added-bg px-1 text-added-ink">green</span>,
                removals in{' '}
                <span className="rounded-[2px] bg-removed-bg px-1 text-removed-ink line-through">
                  red
                </span>
                , and unchanged sections fold away so you review only what changed.
              </p>
              <p className="text-xs text-ink-soft">
                Supports .docx, .pdf and .txt. Documents are processed entirely in your browser — nothing
                is uploaded to any server.
              </p>
            </div>
          </main>
        )}
      </div>
    </div>
  );
}
