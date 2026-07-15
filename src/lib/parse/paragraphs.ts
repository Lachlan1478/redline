/** Split extracted text into clean, non-empty paragraphs. */
export function splitParagraphs(text: string): string[] {
  return text
    .split(/\r?\n+/)
    .map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}
