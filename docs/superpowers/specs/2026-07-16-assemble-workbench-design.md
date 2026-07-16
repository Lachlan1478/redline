# Assemble — Contract Assembly Workbench (Design)

Date: 2026-07-16
Status: Approved by user (design discussion 2026-07-16)

## Purpose

Deal teams start from a base contract (e.g. an ISDA-style agreement), fill in
deal-specific terms, and add/remove optional clauses. Today that means
copy-paste from the last deal's Word file and hand-fixing every clause number
and cross-reference. Assemble makes the contract a structured, manipulable
object: fields populate everywhere at once, clauses toggle in and out, and all
numbering and cross-references recompute mechanically.

**End goal (user-stated):** a user drops in *their own* contract and the tool
cuts it into pieces that can be added/removed at will. v1 proves the engine and
UI on a built-in fictional template; the import pipeline is v2. Everything in
v1 is built against the model that import will produce.

## Decisions (user-confirmed)

- Lives in the same app as the diff dashboard: tabs **Compare** | **Assemble**.
- v1 ships a fictional numbered-clause agreement (real ISDA text is copyrighted
  and stays out of the public repo; ISDA Schedule-style election parts are
  supported by the same block model — an election is a block with fields).
- **.docx export is in v1.**
- Field identification on import (v2): auto-detect candidates + select-text →
  "make this a field" manual marking.
- All client-side: deal terms never leave the browser.

## Core model

A contract is a tree of **blocks** with stable IDs. Numbers and cross-references
are **computed at render time from the included blocks — never stored as text**.

```ts
interface ContractTemplate {
  id: string;
  name: string;
  fields: FieldDef[];
  blocks: Block[];            // tree
}
interface Block {
  id: string;                 // stable, never reused
  kind: 'preamble' | 'clause' | 'definition';
  title?: string;
  body: Inline[];
  children: Block[];
  optional?: boolean;         // can be toggled by the user
  includedByDefault?: boolean;// initial toggle state for optional blocks
}
type Inline =
  | { t: 'text'; text: string }
  | { t: 'field'; fieldId: string }   // renders the field value or a placeholder
  | { t: 'ref'; targetId: string };   // renders the target's computed number
interface FieldDef {
  id: string;
  label: string;
  type: 'text' | 'party' | 'date' | 'currency' | 'number';
  required: boolean;
}
```

Deal state: `{ templateId, fieldValues: Record<fieldId, string>, included: Record<blockId, boolean> }`.

### Numbering & reference engine (Phase 1, the risky core)

- `computeNumbering(blocks, included)` walks included blocks and assigns labels
  by depth: `1.` / `(a)` / `(i)` (style table per level). Returns
  `Map<blockId, label>`.
- Rendering resolves `ref` tokens through that map. A ref whose target is
  excluded or missing renders a visible `[missing clause]` marker AND surfaces
  in a warnings list `{ fromId, targetId }` — never silent.
- `renderDocument(template, deal)` → `{ paragraphs, warnings }` where
  paragraphs are `{ blockId, label, text }` — the same flat paragraph shape the
  diff engine consumes (deviation redline falls out of this).
- Missing required fields render as `[● Label]` and are listed in warnings.

## UI (Phase 2–3)

Three panels in the chambers design language:

- **Term sheet (left):** form generated from `fields`, typed inputs, required
  checklist. Unfilled required fields glow highlighter; filled settle to ink.
- **Document (centre):** live paper preview; field values and clause numbers
  update as you type/toggle.
- **Clause library (right):** optional blocks with one-click add/remove (e.g.
  "Right of First Refusal"), plus the warnings list (broken refs, missing
  fields).

## Export & persistence (Phase 4)

- **.docx export** via the `docx` package with computed numbers baked in as
  literal text (deterministic; no reliance on Word auto-numbering). Export is
  gated by a required-fields/broken-refs check with explicit override.
  Tests re-import the exported file with mammoth and assert content.
- **Deal files:** save/load deal state as a local JSON file; autosave to
  localStorage. No accounts, nothing uploaded.

## Deviation redline (Phase 5)

One click renders `renderDocument(template, baseDefaults)` vs
`renderDocument(template, currentDeal)` through the existing `diffDocuments`
and DiffView — the reviewer reads only what this deal changed.

## v2: import pipeline (designed-for, not built in v1)

.docx → mammoth HTML → block tree via numbering-pattern detection ("5.",
"5.1", "(a)", "(i)") → cross-reference detection ("Clause 9(b)" → ref token
linked to target) → placeholder auto-detection ([●], underscores, repeated
proper nouns) → **"review the cut"** UI: merge/split blocks the parser got
wrong; select any text → "make this a field" (mark "ABC Bank plc" once, every
occurrence becomes the Party A field).

## Sample template (v1)

Fictional **"Master Equity Swap Agreement (Sample)"**: ~30 clauses across
parts, nested sub-clauses, a definitions section, ~12 fields (parties,
underlying, notional, dates, governing law), 4 optional clauses (Right of
First Refusal, Key Person, Substitution, Early Termination Fee) with
cross-references into and out of them so renumbering is genuinely exercised.

## Build order (each phase = branch + PR)

1. Model + numbering/cross-ref/render engine — pure TS, TDD.
2. Workbench UI with sample template (term sheet + live document).
3. Clause library, toggling, warnings.
4. .docx export + deal save/load.
5. Deviation redline.

## Testing

- Engine: exhaustive unit tests (numbering across exclusions, nested labels,
  ref resolution, broken refs, field substitution, paragraph output).
- UI: Playwright end-to-end on the workbench (fill fields, toggle ROFR,
  verify renumbering in the rendered document, export).
