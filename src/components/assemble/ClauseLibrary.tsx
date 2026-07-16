import { isIncluded } from '../../lib/assemble/numbering';
import type { ImportNote } from '../../lib/assemble/import';
import type { Block, FieldDef, RenderWarnings } from '../../lib/assemble/types';
import { SidePanel } from './SidePanel';

interface ClauseLibraryProps {
  optionalBlocks: Block[];
  included: Record<string, boolean>;
  warnings: RenderWarnings;
  titles: Map<string, string>;
  fields: FieldDef[];
  importNotes?: ImportNote[];
  onToggle: (blockId: string, include: boolean) => void;
}

export function ClauseLibrary({
  optionalBlocks,
  included,
  warnings,
  titles,
  fields,
  importNotes = [],
  onToggle,
}: ClauseLibraryProps) {
  const fieldLabel = (id: string) => fields.find((f) => f.id === id)?.label ?? id;
  const activeCount = optionalBlocks.filter((b) => isIncluded(b, included)).length;
  const issueCount =
    warnings.brokenRefs.length + warnings.missingFields.length + importNotes.length;

  return (
    <SidePanel
      side="right"
      title="Clauses"
      badge={`${activeCount}/${optionalBlocks.length}`}
      badgeAttention={warnings.brokenRefs.length > 0}
      subtitle={
        <p className="mt-1 font-mono text-xs text-desk-text">
          {activeCount} of {optionalBlocks.length} optional clauses in
        </p>
      }
      footer={
        <div className="border-t border-desk-line/60 px-4 py-2.5" data-testid="warnings-panel">
          <h3 className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-desk-muted">
            {issueCount === 0 ? 'No issues' : `${issueCount} issue${issueCount === 1 ? '' : 's'}`}
          </h3>
          {warnings.brokenRefs.length > 0 && (
            <ul className="mt-1.5 space-y-1">
              {warnings.brokenRefs.map((broken, i) => (
                <li key={i} className="text-[11px] leading-snug text-removed-bg">
                  Broken reference: “{titles.get(broken.fromId) ?? broken.fromId}” cites the
                  excluded clause “{titles.get(broken.targetId) ?? broken.targetId}”.
                </li>
              ))}
            </ul>
          )}
          {warnings.missingFields.length > 0 && (
            <p className="mt-1.5 text-[11px] leading-snug text-highlighter/90">
              Unfilled terms: {warnings.missingFields.map(fieldLabel).join(', ')}.
            </p>
          )}
          {importNotes.length > 0 && (
            <ul className="mt-1.5 space-y-1">
              {importNotes.map((note, i) => (
                <li key={i} className="text-[11px] leading-snug text-desk-muted">
                  Import: {note.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      }
    >
      <ul className="py-1">
        {optionalBlocks.map((block) => {
          const active = isIncluded(block, included);
          return (
            <li key={block.id} className="border-b border-desk-line/30 px-4 py-2">
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
                  className={`shrink-0 rounded-sm border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors ${
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
    </SidePanel>
  );
}
