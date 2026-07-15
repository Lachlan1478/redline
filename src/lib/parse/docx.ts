import * as mammoth from 'mammoth';
import { splitParagraphs } from './paragraphs';

/** Extract paragraphs from a .docx file, entirely in the browser. */
export async function parseDocx(file: File): Promise<string[]> {
  const arrayBuffer = await file.arrayBuffer();
  const { value } = await mammoth.extractRawText({ arrayBuffer });
  return splitParagraphs(value);
}
