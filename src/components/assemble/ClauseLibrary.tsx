import { isIncluded } from '../../lib/assemble/numbering';
import type { Block, FieldDef, RenderWarnings } from '../../lib/assemble/types';

interface ClauseLibraryProps {
  optionalBlocks: Block[];
  included: Record<string, boolean>;
  warnings: RenderWarnings;
  titles: Map<string, string>;
  fields: FieldDef[];
  onToggle: (blockId: string, include: boolean) => void;
}

export function ClauseLibrary({
  optionalBlocks,
  included,
  warnings,
  titles,
  fields,
  onToggle,
}: ClauseLibraryProps) {
  const fieldLabel = (id: string) => fields.find((f) => f.id === id)?.label ?? id;
  const issueCount = warnings.brokenRefs.length + warnings.missingFields.length;

  return (
    <aside className="flex w-72 shrink-0 flex-col border-l border-desk-line/60 bg-desk">
      <div className="border-b border-desk-line/60 px-4 pb-3 pt-4">
        <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-desk-muted">
          Clause library
        </h2>
        <p className="mt-2 font-mono text-sm text-desk-text">
          {optionalBlocks.filter((b) => isIncluded(b, included)).length} of {optionalBlocks.length}{' '}
          optional clauses in
        </p>
      </div>
      <ul className="flex-1 overflow-y-auto py-1">
        {optionalBlocks.map((block) => {
          const active = isIncluded(block, included);
          return (
            <li key={block.id} className="border-b border-desk-line/30 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span
                  className={`flex-1 font-serif text-[13px] leading-snug ${
                    active ? 'text-desk-text' : 'text-desk-muted'
                  }`}
                >
                  {block.title ?? block.id}
                </span>
                <button
                  type="button"
                  data-testid={`toggle-${block.id}`}
                  aria-pressed={active}
                  onClick={() => onToggle(block.id, !active)}
                  className={`shrink-0 rounded-sm border px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.1em] transition-colors ${
                    active
                      ? 'border-added-edge/70 bg-added-bg/20 text-added-bg hover:bg-removed-bg/20'
                      : 'border-desk-line text-desk-muted hover:border-desk-text/60 hover:text-desk-text'
                  }`}
                >
                  {active ? 'Remove' : 'Add'}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-desk-line/60 px-4 py-3" data-testid="warnings-panel">
        <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-desk-muted">
          {issueCount === 0 ? 'No issues' : `${issueCount} issue${issueCount === 1 ? '' : 's'}`}
        </h3>
        {warnings.brokenRefs.length > 0 && (
          <ul className="mt-2 space-y-1">
            {warnings.brokenRefs.map((broken, i) => (
              <li key={i} className="text-[11px] leading-snug text-removed-bg">
                Broken reference: “{titles.get(broken.fromId) ?? broken.fromId}” cites the excluded
                clause “{titles.get(broken.targetId) ?? broken.targetId}”.
              </li>
            ))}
          </ul>
        )}
        {warnings.missingFields.length > 0 && (
          <p className="mt-2 text-[11px] leading-snug text-highlighter/90">
            Unfilled terms: {warnings.missingFields.map(fieldLabel).join(', ')}.
          </p>
        )}
      </div>
    </aside>
  );
}
