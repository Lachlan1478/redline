import { parseDocx } from './docx';
import { splitParagraphs } from './paragraphs';

export interface LoadedDocument {
  name: string;
  paragraphs: string[];
}

export class ParseError extends Error {}

/** Build a document straight from text — pasted content or a .txt file. */
export function documentFromText(name: string, text: string): LoadedDocument {
  const paragraphs = splitParagraphs(text);
  if (paragraphs.length === 0) {
    throw new ParseError('No text found — the pasted content is empty.');
  }
  return { name, paragraphs };
}

/** Parse a dropped/selected file into paragraphs, dispatching on file type. */
export async function parseFile(file: File): Promise<LoadedDocument> {
  const name = file.name;
  const extension = name.toLowerCase().split('.').pop() ?? '';
  const started = performance.now();

  let paragraphs: string[];
  try {
    if (extension === 'docx') {
      paragraphs = await parseDocx(file);
    } else if (extension === 'pdf') {
      // Lazy import: pdf.js is heavy and browser-only; splitting it keeps the
      // main bundle lean and lets this module load in non-DOM environments.
      const { parsePdf } = await import('./pdf');
      paragraphs = await parsePdf(file);
    } else if (extension === 'txt' || extension === 'md') {
      paragraphs = splitParagraphs(await file.text());
    } else {
      throw new ParseError(
        `Unsupported file type ".${extension}" — please use .docx, .pdf or .txt.`,
      );
    }
  } catch (error) {
    if (error instanceof ParseError) throw error;
    // Keep the original cause inspectable — the UI message is deliberately generic.
    console.error(`Failed to parse "${name}"`, error);
    throw new ParseError(
      `Could not read "${name}". The file may be corrupted or password-protected.`,
    );
  }

  if (paragraphs.length === 0) {
    throw new ParseError(`No text found in "${name}". Is it a scanned/image-only document?`);
  }
  console.info(
    `[redline] parse: "${name}" → ${paragraphs.length} ¶ in ${Math.round(performance.now() - started)}ms`,
  );
  return { name, paragraphs };
}
