import type { FieldDef } from '../../lib/assemble/types';

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
    <aside className="flex w-80 shrink-0 flex-col border-r border-desk-line/60 bg-desk">
      <div className="border-b border-desk-line/60 px-4 pb-3 pt-4">
        <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-desk-muted">
          Term sheet
        </h2>
        <p className="mt-2 font-mono text-sm text-desk-text" data-testid="termsheet-progress">
          {filled} of {required.length} required terms filled
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {fields.map((fieldDef) => {
          const isMissing = missing.has(fieldDef.id);
          return (
            <label key={fieldDef.id} className="mb-3 block">
              <span className="mb-1 flex items-baseline gap-1 font-mono text-[11px] uppercase tracking-[0.1em] text-desk-muted">
                {fieldDef.label}
                {fieldDef.required && (
                  <span className={isMissing ? 'text-highlighter' : 'text-desk-muted'}>*</span>
                )}
              </span>
              <input
                type="text"
                value={values[fieldDef.id] ?? ''}
                placeholder={TYPE_HINTS[fieldDef.type]}
                onChange={(event) => onChange(fieldDef.id, event.target.value)}
                className={`w-full rounded-sm border bg-desk-deep px-2.5 py-1.5 text-[13px] text-desk-text placeholder:text-desk-muted/60 ${
                  isMissing ? 'border-highlighter/70' : 'border-desk-line'
                }`}
              />
            </label>
          );
        })}
      </div>
      <p className="border-t border-desk-line/60 px-4 py-3 text-[11px] leading-snug text-desk-muted">
        Terms populate the document as you type. Nothing is uploaded — deal terms stay in your
        browser.
      </p>
    </aside>
  );
}
