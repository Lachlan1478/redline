import * as mammoth from 'mammoth';

/**
 * Extract paragraphs from a .docx file, entirely in the browser.
 *
 * Goes via mammoth's HTML conversion rather than raw text because raw text
 * silently drops footnotes/endnotes — where legal documents love to hide
 * changes. Footnote bodies come out as list items at the end of the document.
 * Word page headers/footers and watermarks are not part of the document body
 * and are not extracted (a mammoth limitation).
 */
export async function parseDocx(file: File): Promise<string[]> {
  const arrayBuffer = await file.arrayBuffer();
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer });
  const dom = new DOMParser().parseFromString(html, 'text/html');

  const paragraphs: string[] = [];
  for (const block of dom.body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li')) {
    // A footnote <li> wraps its own <p>; skip the wrapper so text isn't doubled.
    if (block.tagName === 'LI' && block.querySelector('p')) continue;
    const text = (block.textContent ?? '')
      .replace(/\s+/g, ' ')
      .replace(/\s*↑\s*$/, '') // mammoth's footnote back-reference arrow
      .trim();
    if (text) paragraphs.push(text);
  }
  return paragraphs;
}
