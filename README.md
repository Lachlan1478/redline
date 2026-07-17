# Redline

**A private workbench for legal documents — compare versions, assemble contracts, and
review only what changed. Everything runs in your browser: no uploads, no accounts, no server.**

Built for the reality of deal work: circulars and agreements that run to 100+ pages,
iterate many times between counterparties, and change in only a handful of places each
round.

![Redline demo: comparing two versions of a circular, then assembling a contract from a term sheet](docs/demo/redline-demo.gif)

🎬 **[Full-quality video](docs/demo/redline-demo.webm)** · 🚀 **[Use it now](https://lachlan1478.github.io/redline/)** (nothing you load ever leaves your machine)

---

## Setup

Use the hosted version at **https://lachlan1478.github.io/redline/** — no installation
needed, and because all parsing/diffing happens client-side, your documents stay on
your computer even on the hosted site.

Or run it locally:

```bash
git clone https://github.com/Lachlan1478/redline.git
cd redline
npm install
npm run dev        # opens at http://localhost:5173/redline/
```

Other commands:

```bash
npx vitest run                    # unit tests (diff + assembly engines)
npm run build                     # type-check + production build
node scripts/make-samples.mjs     # regenerate sample documents in e2e/fixtures/
node scripts/record-demo.mjs      # re-record the demo video (after build)
node scripts/make-demo-gif.mjs    # regenerate the README gif (needs ffmpeg)
```

Sample documents to try immediately are in `e2e/fixtures/` — a fictional prudential
standard (`long-original` / `long-change`, ~15 pages, 5 planted changes) in both
.docx and .pdf form.

## The two workspaces

### Compare — read the redline, not the document

Load an **Original** and a **Change** version of a document (.docx, .pdf, .txt, or
pasted text). You get a side-by-side redline: additions in green, deletions struck
out in red, and long unchanged stretches folded away so a 100-page document reads
as its five real changes.

- **Index of amendments** — every change listed with prev/next navigation; click to jump.
- **Margin rail** — a whole-document overview strip with one tick per change.
- **Copy amendment summary** — one click produces the numbered plain-text list of
  changes, ready to paste into a cover email.
- PDF parsing automatically strips repeated page headers/footers, watermarks and page
  numbers so pagination shifts don't show up as false changes. Footnotes in .docx
  files are included in the comparison (they're where changes hide).

### Assemble — build a contract from a term sheet

Start from a contract template, type the deal's terms once, and toggle optional
clauses in and out — with every clause number and every cross-reference in the
document recomputing instantly. No more hand-fixing "subject to Clause 9(b)" after
inserting a clause.

- **Term sheet** (left panel): the deal's fields — parties, dates, amounts. Type once,
  populates everywhere. Unfilled required terms glow yellow as `[● Party A]`.
- **Clause library** (right panel): optional clauses with one-click Add/Remove.
  Adding a clause renumbers everything after it and updates every reference to match.
- **Import contract**: drop in *your own* .docx/.pdf/.txt and Redline cuts it into
  clauses, links its cross-references, and turns `[● …]`-style placeholders into
  term-sheet fields. Select any text (a party name, an amount) and click
  **"Make … a field"** to templatise it everywhere it appears.
- **Redline vs base**: one click shows what this deal changed relative to the
  template — a reviewer reads the deviations, not the whole contract.
- **Export .docx** with the computed numbering baked in; export is gated so unfilled
  terms can't silently reach an execution copy. **Save/Load deal** keeps the whole
  setup as a local JSON file; work also autosaves in your browser.

## Privacy model

Every feature — parsing, diffing, importing, assembling, exporting, saving — executes
in your browser. Specifically:

- **Compare / Import**: files are read locally with JavaScript; no network request
  carries document content.
- **Deal save/load**: a JSON file downloaded to/read from your own disk.
- **Autosave / imported templates**: your browser's local storage on your machine.
- **Export**: the Word file is generated in the browser and downloaded.

The site itself is static (GitHub Pages). There is no backend to receive anything.

## Glossary

| Term | Meaning |
|---|---|
| **Redline** | The marked-up view of differences between two versions (green = added, red struck = removed) — from the lawyers' tradition of marking changes in red ink. |
| **Amendment / hunk** | One contiguous run of changed paragraphs, navigable from the index. |
| **Template** | A contract held in structured form: clauses with stable identities, fields, and computed numbering. |
| **Field / term sheet** | A deal-specific value (party, date, amount) entered once and populated everywhere it appears. |
| **The cut** | What import does to your document: slicing it into individual clauses so they can be toggled, renumbered and templatised. |
| **Deviation redline** | The comparison between an assembled deal and its base template — "what did this deal change?" |
| **Deal file** | A small local JSON file holding your field values and clause elections (not the document text itself). |

## Architecture

```
src/
  lib/parse/      File → paragraphs (docx via mammoth, pdf via pdf.js + furniture
                  filtering, plain text)
  lib/diff/       Two-pass diff: paragraph alignment, then word-level marks;
                  amendment grouping; summary export
  lib/assemble/   Block model with computed numbering & cross-references; renderer;
                  .docx export; deal files; deviation redline
  lib/assemble/import/   Structure cutter, reference linker, field detection
  components/     Compare workspace, Assemble workbench (chambers design)
```

Design principle: clause numbers and cross-references are **computed at render time,
never stored as text** — toggling a clause can't leave a stale reference behind.
Design specs live in `docs/superpowers/specs/`.

## Roadmap

Version chain (diff any two of many versions) · verification view for imported cuts ·
orphaned-defined-term checker · table support (ISDA schedules are tables) · export
redline to Word · multi-contract deal suites with shared terms.

## Disclaimer

Redline is a document tooling project. Sample documents are entirely fictional; the
tool does not provide legal advice, and outputs should be reviewed by a qualified
person before use.
