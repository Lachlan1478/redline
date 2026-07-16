import { useCallback, useEffect, useMemo, useState } from 'react';
import { DealFileError, parseDealFile, serializeDeal } from '../../lib/assemble/dealFile';
import { deviationDiff } from '../../lib/assemble/deviation';
import { exportDocxBlob } from '../../lib/assemble/exportDocx';
import { importContract } from '../../lib/assemble/import';
import { detectPlaceholderFields, makeFieldDef, markField } from '../../lib/assemble/import/fields';
import { collectOptionalBlocks, blockTitles } from '../../lib/assemble/optionalBlocks';
import { renderDocument } from '../../lib/assemble/render';
import { sampleMsa } from '../../lib/assemble/templates/sampleMsa';
import { loadImportedTemplates, saveImportedTemplate } from '../../lib/assemble/templateStore';
import type { StoredImport } from '../../lib/assemble/templateStore';
import type { ContractTemplate, DealState } from '../../lib/assemble/types';
import { parseFile, ParseError } from '../../lib/parse';
import { DiffWorkspace } from '../DiffWorkspace';
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

function freshDeal(templateId: string): DealState {
  return { templateId, fieldValues: {}, included: {} };
}

function loadAutosaved(template: ContractTemplate): DealState {
  try {
    const stored = localStorage.getItem(autosaveKey(template.id));
    if (!stored) return freshDeal(template.id);
    return parseDealFile(stored, template);
  } catch {
    return freshDeal(template.id);
  }
}

interface PendingSelection {
  text: string;
  x: number;
  y: number;
}

export function AssembleView() {
  const [imports, setImports] = useState<StoredImport[]>(() => loadImportedTemplates());
  const [activeId, setActiveId] = useState<string>(sampleMsa.id);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string>();
  const [mode, setMode] = useState<'draft' | 'deviation'>('draft');
  const [selection, setSelection] = useState<PendingSelection>();

  const activeImport = imports.find((entry) => entry.template.id === activeId);
  const template = activeImport?.template ?? sampleMsa;

  const [deal, setDeal] = useState<DealState>(() => loadAutosaved(template));
  useEffect(() => {
    if (deal.templateId !== template.id) setDeal(loadAutosaved(template));
  }, [template, deal.templateId]);

  useEffect(() => {
    if (deal.templateId === template.id) {
      localStorage.setItem(autosaveKey(template.id), serializeDeal(deal));
    }
  }, [template.id, deal]);

  const rendered = useMemo(() => renderDocument(template, deal), [template, deal]);
  const deviation = useMemo(
    () => (mode === 'deviation' ? deviationDiff(template, deal) : undefined),
    [mode, template, deal],
  );
  const optionalBlocks = useMemo(() => collectOptionalBlocks(template.blocks), [template.blocks]);
  const titles = useMemo(() => blockTitles(template.blocks), [template.blocks]);
  const importNotes = activeImport?.notes ?? [];
  const issueCount =
    rendered.warnings.missingFields.length +
    rendered.warnings.brokenRefs.length +
    importNotes.length;

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

  const handleImport = async (file: File) => {
    setImporting(true);
    setError(undefined);
    try {
      const { paragraphs } = await parseFile(file);
      const baseName = file.name.replace(/\.(docx|pdf)$/i, '');
      const { template: raw, notes } = importContract(paragraphs, baseName);
      const { template: withFields, detected } = detectPlaceholderFields(raw);
      const taken = new Set([sampleMsa.id, ...imports.map((e) => e.template.id)]);
      const id = taken.has(withFields.id) ? `${withFields.id}-${Date.now() % 10000}` : withFields.id;
      const entry: StoredImport = {
        template: { ...withFields, id },
        notes,
      };
      setImports(saveImportedTemplate(entry));
      setActiveId(id);
      setMode('draft');
      console.info(
        `[redline] import: "${file.name}" → ${paragraphs.length} ¶, ${notes.length} notes, ${detected.length} fields detected`,
      );
    } catch (cause) {
      setError(cause instanceof ParseError ? cause.message : `Could not import "${file.name}".`);
    } finally {
      setImporting(false);
    }
  };

  const updateActiveTemplate = useCallback(
    (next: ContractTemplate) => {
      if (!activeImport) return;
      setImports(saveImportedTemplate({ ...activeImport, template: next }));
    },
    [activeImport],
  );

  const handlePreviewMouseUp = (event: React.MouseEvent) => {
    if (!activeImport || mode !== 'draft') return;
    const selected = window.getSelection()?.toString().trim() ?? '';
    if (selected.length >= 3 && selected.length <= 120 && !selected.includes('\n')) {
      setSelection({ text: selected, x: event.clientX, y: event.clientY });
    } else {
      setSelection(undefined);
    }
  };

  const handleMakeField = () => {
    if (!selection) return;
    const label = window.prompt('Field label:', selection.text.slice(0, 40));
    setSelection(undefined);
    if (!label?.trim()) return;
    const { template: marked, occurrences } = markField(
      template,
      selection.text,
      makeFieldDef(label.trim()),
    );
    if (occurrences === 0) {
      setError('That exact text was not found as plain text (it may already be a field).');
      return;
    }
    updateActiveTemplate(marked);
  };

  const handleExport = async () => {
    const exportIssues = rendered.warnings.missingFields.length + rendered.warnings.brokenRefs.length;
    if (exportIssues > 0) {
      const proceed = window.confirm(
        `This draft has ${exportIssues} open issue(s) — unfilled terms export as [● …] placeholders. Export anyway?`,
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
    setError(undefined);
    try {
      setDeal(parseDealFile(await file.text(), template));
    } catch (cause) {
      setError(cause instanceof DealFileError ? cause.message : `Could not read "${file.name}".`);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AssembleToolbar
        templates={[
          { id: sampleMsa.id, name: sampleMsa.name },
          ...imports.map((entry) => ({ id: entry.template.id, name: entry.template.name })),
        ]}
        activeTemplateId={template.id}
        onTemplateChange={(id) => {
          setActiveId(id);
          setMode('draft');
          setSelection(undefined);
        }}
        issueCount={issueCount}
        mode={mode}
        onModeChange={setMode}
        onImport={(file) => void handleImport(file)}
        onExport={() => void handleExport()}
        onSave={handleSave}
        onLoad={(file) => void handleLoad(file)}
        importing={importing}
        error={error}
      />
      {mode === 'deviation' && deviation ? (
        <DiffWorkspace
          diff={deviation}
          leftName="Base template"
          rightName="This deal"
          identicalNote="This deal makes no clause elections beyond the base template."
        />
      ) : (
        <div className="relative flex min-h-0 flex-1">
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
          <div className="flex min-w-0 flex-1" onMouseUp={handlePreviewMouseUp}>
            <DocumentPreview doc={rendered} title={template.name} />
          </div>
          <ClauseLibrary
            optionalBlocks={optionalBlocks}
            included={deal.included}
            warnings={rendered.warnings}
            titles={titles}
            fields={template.fields}
            importNotes={importNotes}
            onToggle={handleToggle}
          />
          {selection && (
            <button
              type="button"
              data-testid="make-field"
              onClick={handleMakeField}
              style={{ position: 'fixed', left: selection.x + 8, top: selection.y + 12 }}
              className="z-20 rounded-sm border border-highlighter bg-desk-deep px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.1em] text-highlighter shadow-lg"
            >
              Make “{selection.text.length > 24 ? `${selection.text.slice(0, 24)}…` : selection.text}” a
              field
            </button>
          )}
        </div>
      )}
    </div>
  );
}
