import { useEffect, useMemo, useState } from 'react';
import { DealFileError, parseDealFile, serializeDeal } from '../../lib/assemble/dealFile';
import { exportDocxBlob } from '../../lib/assemble/exportDocx';
import { collectOptionalBlocks, blockTitles } from '../../lib/assemble/optionalBlocks';
import { renderDocument } from '../../lib/assemble/render';
import { sampleMsa } from '../../lib/assemble/templates/sampleMsa';
import type { DealState } from '../../lib/assemble/types';
import { AssembleToolbar } from './AssembleToolbar';
import { ClauseLibrary } from './ClauseLibrary';
import { DocumentPreview } from './DocumentPreview';
import { TermSheet } from './TermSheet';

function autosaveKey(templateId: string): string {
  return `redline-deal-${templateId}`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function loadAutosaved(templateId: string): DealState | undefined {
  try {
    const stored = localStorage.getItem(autosaveKey(templateId));
    if (!stored) return undefined;
    return parseDealFile(stored, sampleMsa);
  } catch {
    return undefined;
  }
}

export function AssembleView() {
  const template = sampleMsa;
  const [deal, setDeal] = useState<DealState>(
    () =>
      loadAutosaved(template.id) ?? {
        templateId: template.id,
        fieldValues: {},
        included: {},
      },
  );
  const [loadError, setLoadError] = useState<string>();

  const rendered = useMemo(() => renderDocument(template, deal), [template, deal]);
  const optionalBlocks = useMemo(() => collectOptionalBlocks(template.blocks), [template.blocks]);
  const titles = useMemo(() => blockTitles(template.blocks), [template.blocks]);
  const issueCount = rendered.warnings.missingFields.length + rendered.warnings.brokenRefs.length;

  useEffect(() => {
    localStorage.setItem(autosaveKey(template.id), serializeDeal(deal));
  }, [template.id, deal]);

  const handleToggle = (blockId: string, include: boolean) => {
    setDeal((previous) => ({
      ...previous,
      included: { ...previous.included, [blockId]: include },
    }));
    if (include) {
      // Show the newly added clause once React has rendered it.
      requestAnimationFrame(() => {
        document
          .getElementById(`assemble-${blockId}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  };

  const handleExport = async () => {
    if (issueCount > 0) {
      const proceed = window.confirm(
        `This draft has ${issueCount} open issue(s) — unfilled terms export as [● …] placeholders. Export anyway?`,
      );
      if (!proceed) return;
    }
    downloadBlob(await exportDocxBlob(template, deal), `${template.id}.docx`);
  };

  const handleSave = () => {
    downloadBlob(
      new Blob([serializeDeal(deal)], { type: 'application/json' }),
      `${template.id}-deal.json`,
    );
  };

  const handleLoad = async (file: File) => {
    setLoadError(undefined);
    try {
      setDeal(parseDealFile(await file.text(), template));
    } catch (cause) {
      setLoadError(
        cause instanceof DealFileError ? cause.message : `Could not read "${file.name}".`,
      );
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AssembleToolbar
        templateName={template.name}
        issueCount={issueCount}
        onExport={() => void handleExport()}
        onSave={handleSave}
        onLoad={(file) => void handleLoad(file)}
        loadError={loadError}
      />
      <div className="flex min-h-0 flex-1">
        <TermSheet
          fields={template.fields}
          values={deal.fieldValues}
          missingFieldIds={rendered.warnings.missingFields}
          onChange={(fieldId, value) =>
            setDeal((previous) => ({
              ...previous,
              fieldValues: { ...previous.fieldValues, [fieldId]: value },
            }))
          }
        />
        <DocumentPreview doc={rendered} title={template.name} />
        <ClauseLibrary
          optionalBlocks={optionalBlocks}
          included={deal.included}
          warnings={rendered.warnings}
          titles={titles}
          fields={template.fields}
          onToggle={handleToggle}
        />
      </div>
    </div>
  );
}
