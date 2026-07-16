import { useMemo, useState } from 'react';
import { collectOptionalBlocks, blockTitles } from '../../lib/assemble/optionalBlocks';
import { renderDocument } from '../../lib/assemble/render';
import { sampleMsa } from '../../lib/assemble/templates/sampleMsa';
import type { DealState } from '../../lib/assemble/types';
import { ClauseLibrary } from './ClauseLibrary';
import { DocumentPreview } from './DocumentPreview';
import { TermSheet } from './TermSheet';

export function AssembleView() {
  const template = sampleMsa;
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [included, setIncluded] = useState<Record<string, boolean>>({});

  const deal: DealState = useMemo(
    () => ({ templateId: template.id, fieldValues, included }),
    [template.id, fieldValues, included],
  );
  const rendered = useMemo(() => renderDocument(template, deal), [template, deal]);
  const optionalBlocks = useMemo(() => collectOptionalBlocks(template.blocks), [template.blocks]);
  const titles = useMemo(() => blockTitles(template.blocks), [template.blocks]);

  const handleToggle = (blockId: string, include: boolean) => {
    setIncluded((previous) => ({ ...previous, [blockId]: include }));
    if (include) {
      // Show the newly added clause once React has rendered it.
      requestAnimationFrame(() => {
        document
          .getElementById(`assemble-${blockId}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  };

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
      <ClauseLibrary
        optionalBlocks={optionalBlocks}
        included={included}
        warnings={rendered.warnings}
        titles={titles}
        fields={template.fields}
        onToggle={handleToggle}
      />
    </div>
  );
}
