import type { ParagraphSegment, RenderedDocument } from '../../lib/assemble/types';

function SegmentSpan({ segment }: { segment: ParagraphSegment }) {
  switch (segment.kind) {
    case 'field':
      return <span className="rounded-[2px] bg-added-bg/40">{segment.text}</span>;
    case 'field-missing':
      return (
        <span className="rounded-[2px] bg-highlighter px-0.5 font-medium">{segment.text}</span>
      );
    case 'ref':
      return <span className="underline decoration-ink-muted/50 decoration-dotted">{segment.text}</span>;
    case 'ref-broken':
      return (
        <span className="rounded-[2px] bg-removed-bg px-0.5 font-medium text-removed-ink">
          {segment.text}
        </span>
      );
    default:
      return <span>{segment.text}</span>;
  }
}

/** Nesting depth from a full label like "3(a)(i)" → 2. */
function depthOf(label: string): number {
  return (label.match(/\(/g) ?? []).length;
}

interface DocumentPreviewProps {
  doc: RenderedDocument;
  title: string;
}

export function DocumentPreview({ doc, title }: DocumentPreviewProps) {
  return (
    <main className="min-w-0 flex-1 overflow-y-auto bg-paper" data-testid="assemble-preview">
      <div className="mx-auto max-w-3xl px-10 py-10">
        <h2 className="mb-1 text-center font-serif text-xl font-bold tracking-wide text-ink">
          {title}
        </h2>
        <p className="mb-8 border-b-2 border-double border-ink/60 pb-3 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
          Live draft — for review
        </p>
        {doc.paragraphs.map((paragraph) => (
          <p
            key={paragraph.blockId}
            id={`assemble-${paragraph.blockId}`}
            className="mb-3 font-serif text-[15px] leading-relaxed text-ink"
            style={{ marginLeft: `${depthOf(paragraph.label) * 1.5}rem` }}
          >
            {paragraph.segments.map((segment, i) => (
              <SegmentSpan key={i} segment={segment} />
            ))}
          </p>
        ))}
      </div>
    </main>
  );
}
