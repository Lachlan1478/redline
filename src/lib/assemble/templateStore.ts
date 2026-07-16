import type { ImportNote } from './import';
import type { ContractTemplate } from './types';

export interface StoredImport {
  template: ContractTemplate;
  notes: ImportNote[];
}

const STORE_KEY = 'redline-imported-templates';

/** Imported templates persisted in the browser — nothing leaves the machine. */
export function loadImportedTemplates(): StoredImport[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is StoredImport =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as StoredImport).template?.id === 'string' &&
        Array.isArray((entry as StoredImport).template?.blocks),
    );
  } catch {
    return [];
  }
}

export function saveImportedTemplate(entry: StoredImport): StoredImport[] {
  const existing = loadImportedTemplates().filter((e) => e.template.id !== entry.template.id);
  const next = [...existing, entry];
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(next));
  } catch {
    // Quota exceeded — the template still works for this session.
  }
  return next;
}
