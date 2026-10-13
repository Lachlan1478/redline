import { isIncluded } from '../../lib/assemble/numbering';
import type { ImportNote } from '../../lib/assemble/import';
import type { DraftingNote } from '../../lib/drafting';
import type { Block, FieldDef, RenderWarnings } from '../../lib/assemble/types';
import { SidePanel } from './SidePanel';

interface ClauseLibraryProps {
  optionalBlocks: Block[];
  included: Record<string, boolean>;
  warnings: RenderWarnings;
  titles: Map<string, string>;
  fields: FieldDef[];
  importNotes?: ImportNote[];
  draftingNotes: DraftingNote[];
  onToggle: (blockId: string, include: boolean) => void;
}

export function ClauseLibrary({
  optionalBlocks,
  included,
  warnings,
  titles,
  fields,
  importNotes = [],
  draftingNotes,
  onToggle,
}: ClauseLibraryProps) {
  const fieldLabel = (id: string) => fields.find((f) => f.id === id)?.label ?? id;
  const activeCount = optionalBlocks.filter((b) => isIncluded(b, included)).length;
  const issueCount =
    warnings.brokenRefs.length + warnings.missingFields.length + importNotes.length + draftingNotes.length;
  const analysed = fields.length > 0 || optionalBlocks.length > 0;
  const issueHeading = issueCount === 0 ? 'No issues found' : `${issueCount} issue${issueCount === 1 ? '' : 's'}`;

  return (
    <SidePanel
      side="right"
      title="Clauses"
      badge={`${activeCount}/${optionalBlocks.length}`}
      badgeAttention={warnings.brokenRefs.length > 0}
      subtitle={
        <p className="mt-1 text-xs text-ink">
          {optionalBlocks.length === 0
            ? 'No optional clauses detected'
            : `${activeCount} of ${optionalBlocks.length} optional clauses in`}
        </p>
      }
      footer={
        <div className="border-t border-line px-4 py-2.5" data-testid="warnings-panel">
          <h3 className="eyebrow">
            {issueHeading}
          </h3>
          <p className="mt-1 text-[11px] leading-snug text-ink-soft">
            {analysed
              ? 'Checked: unfilled terms, clause references, defined terms.'
              : 'Checked: clause references and defined terms only — no fields or optional clauses were detected. Select text in the draft to mark a field.'}
          </p>
          {draftingNotes.length > 0 && (
            <ul className="mt-1.5 space-y-1">
              {draftingNotes.map((note, i) => (
                <li key={i} className="text-[11px] leading-snug text-caution">
                  {note.message}
                </li>
              ))}
            </ul>
          )}
          {warnings.brokenRefs.length > 0 && (
            <ul className="mt-1.5 space-y-1">
              {warnings.brokenRefs.map((broken, i) => (
                <li key={i} className="text-[11px] leading-snug text-signal">
                  Broken reference: “{titles.get(broken.fromId) ?? broken.fromId}” cites the
                  excluded clause “{titles.get(broken.targetId) ?? broken.targetId}”.
                </li>
              ))}
            </ul>
          )}
          {warnings.missingFields.length > 0 && (
            <p className="mt-1.5 text-[11px] leading-snug text-caution">
              Unfilled terms: {warnings.missingFields.map(fieldLabel).join(', ')}.
            </p>
          )}
          {importNotes.length > 0 && (
            <ul className="mt-1.5 space-y-1">
              {importNotes.map((note, i) => (
                <li key={i} className="text-[11px] leading-snug text-ink-soft">
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
            <li key={block.id} className="border-b border-line px-4 py-2">
              <div className="flex items-center gap-2">
                <span
                  className={`flex-1 text-[13px] leading-snug ${active ? 'font-medium text-ink' : 'text-ink-soft'}`}
                >
                  {block.title ?? block.id}
                </span>
                <button
                  type="button"
                  data-testid={`toggle-${block.id}`}
                  aria-pressed={active}
                  onClick={() => onToggle(block.id, !active)}
                  className="btn shrink-0 px-2 py-0.5 text-xs"
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
