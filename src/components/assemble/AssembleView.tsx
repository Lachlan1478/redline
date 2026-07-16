import { useMemo, useState } from 'react';
import { renderDocument } from '../../lib/assemble/render';
import { sampleMsa } from '../../lib/assemble/templates/sampleMsa';
import type { DealState } from '../../lib/assemble/types';
import { DocumentPreview } from './DocumentPreview';
import { TermSheet } from './TermSheet';

export function AssembleView() {
  const template = sampleMsa;
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [included] = useState<Record<string, boolean>>({});

  const deal: DealState = useMemo(
    () => ({ templateId: template.id, fieldValues, included }),
    [template.id, fieldValues, included],
  );
  const rendered = useMemo(() => renderDocument(template, deal), [template, deal]);

  return (
    <div className="flex min-h-0 flex-1">
      <TermSheet
        fields={template.fields}
        values={fieldValues}
        missingFieldIds={rendered.warnings.missingFields}
        onChange={(fieldId, value) =>
          setFieldValues((previous) => ({ ...previous, [fieldId]: value }))
        }
      />
      <DocumentPreview doc={rendered} title={template.name} />
    </div>
  );
}
