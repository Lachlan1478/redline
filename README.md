# Redline

Side-by-side comparison dashboard for legal documents and prudential standards.

Counterparties often iterate on circulars that run to 100+ pages, where each
round changes only a handful of clauses. Redline lets you load an **Original**
and a **Change** version of a document and review *only* what changed —
additions highlighted in green, removals in red strikethrough, and long
unchanged sections collapsed out of the way.

**Everything runs in your browser.** Documents are parsed and diffed entirely
client-side — nothing is ever uploaded to a server.

## Features

- **Input formats:** `.docx` (via [mammoth](https://github.com/mwilliamson/mammoth.js))
  and PDF (via [pdf.js](https://mozilla.github.io/pdf.js/), best-effort paragraph
  detection). Drag-and-drop or click to browse.
- **Two-pass diff engine:** paragraphs are aligned first (LCS diff plus a
  similarity-based pairing of edited paragraphs), then a word-level diff runs
  inside each modified paragraph — so a 100-page document with three edits
  shows exactly three changes.
- **Aligned side-by-side view:** matched paragraphs always sit next to each
  other; both panes scroll together and can never drift out of alignment.
- **Collapse unchanged sections:** long unchanged runs fold into an expandable
  bar, keeping two paragraphs of context around each change.
- **Change navigation:** a sidebar lists every change with prev/next buttons
  and a `Change 3 of 12` counter; click any change to jump to it.

## Usage

Hosted at **https://lachlan1478.github.io/redline/** — or run locally:

```bash
npm install
npm run dev        # http://localhost:5173/redline/
```

Load an Original document on the left dropzone and the Change document on the
right. The right pane is the Change document: green text was added; red
struck-through text in the left pane was removed (a striped marker on the
right shows where).

## Development

```bash
npm run dev                     # dev server
npx vitest run                  # unit tests (diff engine + collapse logic)
npm run build                   # type-check + production build
node scripts/make-fixtures.mjs  # regenerate sample docs in e2e/fixtures/
```

Sample documents for trying the app live in `e2e/fixtures/` (a fictional
prudential standard in original/changed form, as both .docx and .pdf).

### Architecture

```
src/
  lib/parse/    File → paragraphs (docx.ts, pdf.ts)
  lib/diff/     align.ts (paragraph alignment) → wordDiff.ts (word-level)
                → diffDocuments.ts (rows + navigable change hunks)
  components/   FileDropzone, DiffView (collapsing), DiffRowView, ChangeSidebar
```

The design spec lives in `docs/superpowers/specs/`.

## Roadmap

- Export the redline to Word/PDF; printable view
- AI plain-English summary of what changed between versions
- Version timeline across many iterations of one circular
- Toggle to ignore whitespace/formatting-only changes
- Clause-level tagging against prudential standard section numbers
- Plain-text paste input
