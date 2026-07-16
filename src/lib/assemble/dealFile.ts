import { collectOptionalBlocks } from './optionalBlocks';
import type { ContractTemplate, DealState } from './types';

const FILE_VERSION = 1;

export class DealFileError extends Error {}

/** Serialise a deal for download / localStorage. */
export function serializeDeal(deal: DealState): string {
  return JSON.stringify(
    {
      app: 'redline',
      kind: 'deal',
      version: FILE_VERSION,
      templateId: deal.templateId,
      fieldValues: deal.fieldValues,
      included: deal.included,
    },
    null,
    2,
  );
}

/**
 * Parse and validate a deal file against a template. Unknown field/block ids
 * and wrongly-typed values are stripped rather than trusted — deal files are
 * external input.
 */
export function parseDealFile(json: string, template: ContractTemplate): DealState {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new DealFileError('This is not a Redline deal file (invalid JSON).');
  }
  if (
    typeof raw !== 'object' ||
    raw === null ||
    (raw as Record<string, unknown>).app !== 'redline' ||
    (raw as Record<string, unknown>).kind !== 'deal'
  ) {
    throw new DealFileError('This is not a Redline deal file.');
  }
  const data = raw as Record<string, unknown>;
  if (data.templateId !== template.id) {
    throw new DealFileError(
      `This deal file belongs to a different template ("${String(data.templateId)}").`,
    );
  }

  const knownFields = new Set(template.fields.map((f) => f.id));
  const fieldValues: Record<string, string> = {};
  if (typeof data.fieldValues === 'object' && data.fieldValues !== null) {
    for (const [key, value] of Object.entries(data.fieldValues)) {
      if (knownFields.has(key) && typeof value === 'string') fieldValues[key] = value;
    }
  }

  const knownOptional = new Set(collectOptionalBlocks(template.blocks).map((b) => b.id));
  const included: Record<string, boolean> = {};
  if (typeof data.included === 'object' && data.included !== null) {
    for (const [key, value] of Object.entries(data.included)) {
      if (knownOptional.has(key) && typeof value === 'boolean') included[key] = value;
    }
  }

  return { templateId: template.id, fieldValues, included };
}
