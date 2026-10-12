import type { FieldDef } from '../../lib/assemble/types';
import { SidePanel } from './SidePanel';

const TYPE_HINTS: Record<FieldDef['type'], string> = {
  party: 'e.g. Alpha Bank plc',
  date: 'e.g. 16 July 2026',
  currency: 'e.g. USD 10,000,000',
  number: 'e.g. 85',
  text: '',
};

interface TermSheetProps {
  fields: FieldDef[];
  values: Record<string, string>;
  missingFieldIds: string[];
  onChange: (fieldId: string, value: string) => void;
}

export function TermSheet({ fields, values, missingFieldIds, onChange }: TermSheetProps) {
  const required = fields.filter((f) => f.required);
  const filled = required.filter((f) => values[f.id]?.trim()).length;
  const missing = new Set(missingFieldIds);

  return (
    <SidePanel
      side="left"
      title="Term sheet"
      badge={`${filled}/${required.length}`}
      badgeAttention={filled < required.length}
      subtitle={
        <p className="mt-1 text-xs text-ink" data-testid="termsheet-progress">
          {fields.length === 0
            ? 'No fields detected — select text in the draft to mark one'
            : `${filled} of ${required.length} required terms filled`}
        </p>
      }
      footer={
        <p className="border-t border-line px-4 py-2 text-[11px] leading-snug text-ink-soft">
          Terms populate the document as you type — nothing leaves your browser.
        </p>
      }
    >
      <div className="px-4 py-2.5">
        {fields.map((fieldDef) => {
          const isMissing = missing.has(fieldDef.id);
          return (
            <label key={fieldDef.id} className="mb-2 block">
              <span className="mb-0.5 flex items-baseline gap-1 text-xs font-medium text-ink-soft">
                {fieldDef.label}
                {fieldDef.required && (
                  <span className={isMissing ? 'text-caution' : 'text-ink-soft'}>*</span>
                )}
              </span>
              <input
                type="text"
                value={values[fieldDef.id] ?? ''}
                placeholder={TYPE_HINTS[fieldDef.type]}
                onChange={(event) => onChange(fieldDef.id, event.target.value)}
                className={`w-full rounded-md border bg-card px-2 py-1 text-[13px] text-ink placeholder:text-ink-soft/60 ${
                  isMissing ? 'border-caution/50' : 'border-line'
                }`}
              />
            </label>
          );
        })}
      </div>
    </SidePanel>
  );
}
