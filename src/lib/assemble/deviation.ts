import { diffDocuments } from '../diff/diffDocuments';
import type { DocumentDiff } from '../diff/types';
import { renderDocument } from './render';
import type { ContractTemplate, DealState } from './types';

/**
 * Redline the assembled deal against the template's default elections.
 *
 * The base side uses the deal's own field values, so filled-in terms are not
 * noise — the deviations shown are the clause elections this deal made, plus
 * the renumbering/reference ripple they cause.
 */
export function deviationDiff(template: ContractTemplate, deal: DealState): DocumentDiff {
  const base: DealState = {
    templateId: deal.templateId,
    fieldValues: deal.fieldValues,
    included: {},
  };
  const baseParagraphs = renderDocument(template, base).paragraphs.map((p) => p.text);
  const dealParagraphs = renderDocument(template, deal).paragraphs.map((p) => p.text);
  return diffDocuments(baseParagraphs, dealParagraphs);
}
