# Redline — Legal Document Comparison Dashboard (v1 Design)

Date: 2026-07-15
Status: Approved by user

## Purpose

Counterparties iterate on long circulars (often ~100 pages) many times. Reviewers
only care about what changed between two iterations. Redline lets a user load an
**Original** document and a **Change** document and review only the differences,
presented side by side like a legal redline / track changes view.

## Decisions (user-confirmed)

- **Input formats:** `.docx` (via mammoth) and PDF (via pdf.js). Plain-text paste
  can be added later.
- **Architecture:** client-only React SPA. All parsing and diffing happens in the
  browser — confidential documents never leave the user's machine.
- **Repo:** public GitHub repository (`Lachlan1478/redline`), deployed to GitHub
  Pages via GitHub Actions.
- **Location:** `C:\Users\User\Projects\redline` (outside OneDrive).

## Architecture

React + TypeScript + Vite. Tailwind CSS for styling. No backend.

```
src/
  lib/
    parse/      docx.ts, pdf.ts        → File → string[] (paragraphs)
    diff/       types.ts, align.ts,
                wordDiff.ts, diffDocuments.ts
  components/   FileDropzone, DiffView, DiffRow, ChangeSidebar, Toolbar
  App.tsx
```

### Diff engine (two passes)

1. **Paragraph alignment** (`align.ts`): align the two paragraph arrays with an
   LCS diff (jsdiff `diffArrays`). Produces runs of unchanged / removed / added
   paragraphs. Adjacent removed+added runs are paired by text similarity into
   *modified* paragraph pairs; unpaired leftovers stay pure removals/additions.
2. **Word-level diff** (`wordDiff.ts`): within each modified pair, jsdiff
   `diffWordsWithSpace` produces inline segments (unchanged / added / removed).

Output model: an array of aligned **rows**, each with an optional left cell and
right cell plus a type (`unchanged | modified | added | removed`). Changed rows
get a sequential change index for navigation.

### UI

- **Single scroll container, two aligned columns** (GitHub split-view style):
  each row renders its left and right cells at the same height, so the panes can
  never drift out of alignment. This *is* the dual-scroll experience — both
  documents scroll together, anchored by matched paragraphs.
- **Additions** highlighted green in the right (Change) pane. **Deletions** shown
  red strikethrough in the left pane, with an empty red placeholder cell on the
  right marking where text was removed.
- **Collapse unchanged runs**: runs of >5 unchanged paragraphs collapse to an
  expandable "N unchanged paragraphs" bar, keeping 2 paragraphs of context around
  each change. This is the core "only review the changes" experience and keeps
  the DOM small for 100-page documents.
- **Change sidebar**: list of all changes with type badges; prev/next buttons and
  a change counter; clicking a change scrolls to it.
- **Toolbar**: two file inputs (drag-and-drop + click to browse), labelled
  Original and Change; parse errors surface as friendly messages.

## Error handling

- Unsupported file type, failed parse, empty document → inline error message on
  the dropzone, app stays usable.
- PDF extraction is best-effort (layout artifacts possible); noted in UI.

## Testing

- Vitest unit tests for `align.ts`, `wordDiff.ts`, `diffDocuments.ts` (written
  test-first). Target: full coverage of the diff engine, which is the risky logic.
- Manual + Playwright end-to-end check of the running app with sample documents.

## Future features (backlog, not v1)

- Export redline to Word/PDF; printable view.
- AI plain-English summary of changes.
- Version timeline across many iterations of one circular.
- Ignore whitespace/formatting-only changes toggle.
- Clause-level tagging against prudential standard section numbers.
- Plain-text paste input.
