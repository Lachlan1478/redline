import { parseDocx } from './docx';
import { parsePdf } from './pdf';

export interface LoadedDocument {
  name: string;
  paragraphs: string[];
}

export class ParseError extends Error {}

/** Parse a dropped/selected file into paragraphs, dispatching on file type. */
export async function parseFile(file: File): Promise<LoadedDocument> {
  const name = file.name;
  const extension = name.toLowerCase().split('.').pop() ?? '';

  let paragraphs: string[];
  try {
    if (extension === 'docx') {
      paragraphs = await parseDocx(file);
    } else if (extension === 'pdf') {
      paragraphs = await parsePdf(file);
    } else {
      throw new ParseError(`Unsupported file type ".${extension}" — please use .docx or .pdf.`);
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
  return { name, paragraphs };
}
