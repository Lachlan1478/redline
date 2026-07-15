/** Minimal shape needed to filter page furniture; pdf.ts lines satisfy it. */
export interface PageLine {
  text: string;
}

/** A line must repeat on at least this share of pages to count as furniture. */
const REPEAT_SHARE = 0.6;
/** Repetition is only meaningful with at least this many pages. */
const MIN_PAGES = 3;
/** How many lines at the top/bottom of a page are header/footer candidates. */
const EDGE_LINES = 2;
/** Short lines (a watermark like "DRAFT") are candidates anywhere on the page. */
const SHORT_LINE_WORDS = 3;

function normalize(text: string): string {
  return text.replace(/\d+/g, '#').replace(/\s+/g, ' ').trim().toLowerCase();
}

function isPageNumber(text: string): boolean {
  const trimmed = text.trim();
  return /^page\s+\S+(\s+of\s+\S+)?$/i.test(trimmed) || /^[-–—\s]*\d+[-–—\s]*$/.test(trimmed);
}

function isCandidate(page: PageLine[], index: number): boolean {
  const nearEdge = index < EDGE_LINES || index >= page.length - EDGE_LINES;
  const short = page[index].text.trim().split(/\s+/).length <= SHORT_LINE_WORDS;
  return nearEdge || short;
}

/**
 * Remove running page furniture from PDF text: headers and footers repeated on
 * most pages, watermarks stamped on every page, and page numbers. PDFs have no
 * structural notion of any of these — they are just more page text — so
 * without this, every page boundary shift between two versions of a document
 * would surface as a spurious difference.
 */
export function filterRunningLines<T extends PageLine>(pages: T[][]): T[][] {
  if (pages.length < MIN_PAGES) {
    return pages.map((page) => page.filter((l) => !isPageNumber(l.text)));
  }

  const repeatCounts = new Map<string, number>();
  for (const page of pages) {
    const seen = new Set<string>();
    for (let i = 0; i < page.length; i++) {
      if (!isCandidate(page, i)) continue;
      const key = normalize(page[i].text);
      if (!seen.has(key)) {
        seen.add(key);
        repeatCounts.set(key, (repeatCounts.get(key) ?? 0) + 1);
      }
    }
  }

  const threshold = Math.max(2, Math.ceil(pages.length * REPEAT_SHARE));
  return pages.map((page) =>
    page.filter((lineItem, i) => {
      if (isPageNumber(lineItem.text)) return false;
      if (!isCandidate(page, i)) return true;
      return (repeatCounts.get(normalize(lineItem.text)) ?? 0) < threshold;
    }),
  );
}
