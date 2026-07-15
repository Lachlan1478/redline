import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

interface PositionedItem {
  str: string;
  transform: number[];
  height: number;
}

interface PositionedLine {
  y: number;
  height: number;
  text: string;
}

const LINE_Y_TOLERANCE = 2;
/** A vertical gap this many times the line height starts a new paragraph. */
const PARAGRAPH_GAP_FACTOR = 1.5;

function linesFromTextContent(items: PositionedItem[]): PositionedLine[] {
  // Bucket lines by rounded y so lookup is O(1) per item instead of scanning
  // every existing line (text-dense statute pages have thousands of items).
  const byRoundedY = new Map<number, PositionedLine>();
  for (const item of items) {
    if (!item.str.trim()) continue;
    const y = item.transform[5];
    let line: PositionedLine | undefined;
    const rounded = Math.round(y);
    for (let key = rounded - LINE_Y_TOLERANCE; key <= rounded + LINE_Y_TOLERANCE; key++) {
      const candidate = byRoundedY.get(key);
      if (candidate && Math.abs(candidate.y - y) <= LINE_Y_TOLERANCE) {
        line = candidate;
        break;
      }
    }
    if (line) {
      line.text += ` ${item.str}`;
    } else {
      byRoundedY.set(rounded, { y, height: item.height || 10, text: item.str });
    }
  }
  return [...byRoundedY.values()].sort((a, b) => b.y - a.y);
}

function paragraphsFromLines(lines: PositionedLine[]): string[] {
  const paragraphs: string[] = [];
  let current = '';
  let previous: PositionedLine | undefined;
  for (const line of lines) {
    const gap = previous ? previous.y - line.y : 0;
    const threshold = Math.max(previous?.height ?? 0, line.height) * PARAGRAPH_GAP_FACTOR;
    if (previous && gap > threshold && current) {
      paragraphs.push(current);
      current = '';
    }
    current = current ? `${current} ${line.text}` : line.text;
    previous = line;
  }
  if (current) paragraphs.push(current);
  return paragraphs.map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

/**
 * Extract paragraphs from a PDF, entirely in the browser.
 *
 * Best-effort: PDFs carry no real paragraph structure, so lines are grouped
 * into paragraphs by their vertical spacing on each page.
 */
export async function parsePdf(file: File): Promise<string[]> {
  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data });
  const doc = await loadingTask.promise;
  try {
    const paragraphs: string[] = [];
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();
      const items = content.items.flatMap((item): PositionedItem[] =>
        'str' in item ? [{ str: item.str, transform: item.transform, height: item.height }] : [],
      );
      paragraphs.push(...paragraphsFromLines(linesFromTextContent(items)));
    }
    return paragraphs;
  } finally {
    await loadingTask.destroy();
  }
}
