# Agreement Layer — Multi-Contract Deal Workspaces (Design)

Date: 2026-07-17
Status: **Specified, build gated.** Implementation starts only after the import
pipeline has been validated against real documents (per the 2026-07-16 review
board ruling). This spec exists so the build can begin the day that gate clears.

## Purpose

Deals are rarely one contract. A derivatives relationship is Master Agreement +
Schedule + Credit Support Annex + Confirmations; a financing is Facility
Agreement + Security Deed + Guarantee. The documents form one commercial
agreement held together by mechanical connective tissue that today is maintained
by hand and breaks silently:

1. **Shared facts** — the same parties, dates and amounts appear in every
   document; updating one and missing another is a classic execution error.
2. **Cross-document references** — "Clause 14 of the Intercreditor Agreement"
   rots when the Intercreditor renumbers.
3. **Consistency constraints** — the swap's Termination Date must equal the
   notes' Maturity Date; one entity must be "Trustee" everywhere.
4. **Existence dependencies** — the Guarantee exists because there is a
   guarantor; which documents a deal needs is a function of its terms.
5. **The closing checklist** — every document's conditions precedent,
   maintained manually by the most junior person on the deal.

The Agreement layer makes the *suite* the unit of work: one deal workspace,
many documents, all five kinds of connective tissue computed rather than
remembered.

## Principles (user-confirmed 2026-07-16)

- **Mechanics only in the core.** Every feature in this spec is deterministic.
  Inference (LLM-assisted mapping of messy imports into the structure) is a
  separate, opt-in, human-confirmed assist and is out of scope here.
- **Client-side, always.** The workspace, its documents and its files live in
  the browser and on the user's disk. Nothing changes about the privacy model.
- **Two sample suites ship with v1**: an ISDA-style suite and a
  lending/security suite (both fictional). The engine is suite-agnostic; the
  samples prove it twice.
- **Success metric** is the author's own desk time, not team adoption
  (multi-user collaboration is explicitly out of scope).

## Data model

The existing single-contract model (`ContractTemplate`, `DealState`, blocks
with computed numbering) is unchanged. The Agreement layer composes it.

```ts
interface DealWorkspace {
  id: string;
  name: string;                       // "Project Falcon"
  version: 1;                         // workspace-file schema version
  /** Deal-level fields shared across documents. */
  fields: FieldDef[];
  fieldValues: Record<string, string>;
  documents: WorkspaceDocument[];
  rules: ConsistencyRule[];
  /** Checklist tick-state, keyed "docKey/blockId". */
  checklist: Record<string, boolean>;
}

interface WorkspaceDocument {
  /** Stable handle used by cross-document references: "master", "csa", "guarantee". */
  key: string;
  /** Display title used when rendering references: "Credit Support Annex". */
  title: string;
  /** Self-contained template (sample or imported) — copied into the workspace by value. */
  template: ContractTemplate;
  /** Per-document elections and any fields NOT bound to the deal level. */
  deal: DealState;
  /** templateFieldId → workspaceFieldId. Unbound fields stay document-local. */
  bindings: Record<string, string>;
  /** Whether this document exists in the deal. Default: always. */
  inclusion?: InclusionRule;
  /** Manual override of the inclusion rule (tri-state: rule / force-in / force-out). */
  inclusionOverride?: boolean;
}

type InclusionRule =
  | { kind: 'always' }
  | { kind: 'fieldNonEmpty'; fieldId: string };   // e.g. Guarantee iff guarantor named

type ConsistencyRule =
  | { kind: 'equal'; fieldIds: string[]; message: string }
  | { kind: 'dateOrder'; earlierId: string; laterId: string; message: string }
  | { kind: 'sum'; partIds: string[]; totalId: string; message: string };
```

### Field binding and resolution

When a document renders, its effective field values are:

```
effectiveValue(templateFieldId) =
  workspace.fieldValues[bindings[templateFieldId]]   if bound
  document.deal.fieldValues[templateFieldId]          otherwise
```

Typing "Beta Fund LP" once at the deal level populates every bound occurrence
in every included document. Binding suggestions are mechanical: exact
normalised-label match between a template field and a workspace field
("Party B" ↔ "Party B"). Anything fuzzier ("Termination Date" ↔ "Maturity
Date") is proposed **only** as an unticked suggestion in the binding UI —
the user confirms; the engine never guesses silently.

### Cross-document references

The inline reference token gains an optional document dimension:

```ts
| { t: 'ref'; targetId: string; word?: string; docKey?: string }
```

- `docKey` absent → same-document reference (existing behaviour, unchanged).
- `docKey` present → resolved against the *target document's* computed
  numbering **under that document's current elections**, and rendered as
  `"{word} {label} of the {target.title}"` — e.g. "Clause 14 of the
  Intercreditor Agreement".

Failure modes are loud, never silent:

| Condition | Rendering | Warning |
|---|---|---|
| Target block excluded in target doc | `[missing clause]` | broken cross-doc ref (from, to) |
| Target document excluded from the deal | `[missing document]` | broken cross-doc ref |
| Unknown docKey | `[missing document]` | broken cross-doc ref |

Renumbering ripples across documents: toggling a clause in the Master
renumbers it, and every reference to it from the CSA re-renders with the new
number on the next render pass — same computed-not-stored guarantee as within
one document.

### Consistency rules

Evaluated over workspace field values on every render. Each violation yields a
warning `{ ruleIndex, message, fieldIds }` shown in the deal-level issues
panel and counted into the export gate. Rules reference workspace field ids
only (bind first, then constrain). Empty fields do not fire `equal`/`sum`
violations (they already fire missing-field warnings); `dateOrder` compares
only when both sides parse as dates.

### Document inclusion

`isDocumentIncluded(doc, workspace)`:
`inclusionOverride` if set, else evaluate `inclusion` (default `always`).
Excluded documents: not rendered, not exported, their CP items leave the
checklist, and references *to* them break loudly (see table above).

### Closing checklist

`Block` gains an optional `tags?: string[]`. Blocks tagged `"cp"` in any
included document are harvested into one deal-level checklist:

```ts
interface ChecklistItem {
  docKey: string; blockId: string;
  documentTitle: string; label: string;   // computed clause number
  text: string;                            // rendered paragraph text
  done: boolean;                           // stored in workspace.checklist
}
```

The two sample suites ship pre-tagged. For imported documents, v1 offers a
mechanical assist: a clause whose title matches /conditions? precedent/i has
its children suggested as CP items, user-confirmed. Tick-state lives in the
workspace (it is deal state, not document state).

## Exports (Phase A4)

- **Per-document .docx** — existing exporter, fed effective field values.
- **Deal summary** — one generated document: parties/fields table of the term
  sheet, per-document election list (which optional clauses are in/out vs the
  template default), consistency-rule status, the closing checklist with
  tick-state, and outstanding issues. This is the sheet that gets emailed to
  the deal team.
- **Workspace file** — one versioned JSON containing the whole workspace
  (including templates by value, so it opens on another machine with no
  dependencies). Same strict validation discipline as deal files: unknown
  ids/mistyped values stripped, wrong `kind`/`version` rejected with a clear
  message. Autosave to localStorage under `redline-workspace-{id}`.

## UI (Phase A3)

A third top-level tab: **Deal** (Compare | Assemble | Deal).

- **Left panel — deal term sheet**: workspace fields with the same
  filled/missing treatment as Assemble; below them, consistency-rule status
  (green tick / violation message).
- **Centre — the document rack**: one card per document: title, inclusion
  state (rule-driven state shown, override toggle), issue count (missing
  fields, broken refs incl. cross-doc), and **Open** — which opens the
  existing Assemble workbench *scoped to the workspace* (field edits write
  through bindings to the deal level; unbound fields edit locally).
- **Right panel — deal issues & checklist**: all documents' warnings in one
  list (each naming its document), plus the closing checklist with
  check-off.
- **Toolbar**: workspace picker (the two sample suites + saved workspaces),
  New from samples, Add document (pick any template: sample or imported),
  Save/Load workspace, Export all (.docx per document + deal summary).

AssembleView changes are additive: an optional `workspace` context prop; when
present, bound fields render from and write to the workspace, and a breadcrumb
returns to the Deal tab. No behaviour change when absent.

## Sample suites (v1 content)

**ISDA-style suite** ("Sample Swap Suite"): the existing Master Equity Swap
Agreement + a fictional Credit Support Annex (~15 clauses: eligible
collateral, thresholds, transfer timing, with 3+ cross-doc refs into Master
clauses) + a fictional Confirmation (~10 blocks, field-dense, refs into both).
Shared fields: parties, trade/effective dates, notional, governing law.
Rules: `equal(master.termination_date, confirmation.termination_date)`.

**Lending suite** ("Sample Facility Suite"): fictional Facility Agreement
(~20 clauses incl. a tagged Conditions Precedent clause) + Security Deed
(~12 clauses, refs into Facility) + Guarantee (~8 clauses,
`inclusion: fieldNonEmpty(guarantor)`). Rules: `sum(tranche_a, tranche_b →
total_commitments)`, `dateOrder(signing_date, maturity_date)`.

Both suites are fictional wording; no real ISDA/LMA text.

## Build phases (each = branch + PR, TDD throughout)

- **A1 — workspace engine**: model, binding resolution, cross-doc reference
  resolution with the failure table above; pure TS. *Exit test:* toggle a
  clause in doc 1, a reference in doc 2 renumbers; exclude doc 1, that
  reference breaks loudly.
- **A2 — rules + inclusion**: consistency rules, inclusion rules with
  override, aggregated warnings. *Exit test:* emptying the guarantor field
  drops the Guarantee and flags every reference to it.
- **A3 — Deal tab UI**: term sheet, document rack, open-in-Assemble
  write-through, workspace files + autosave, sample suites.
- **A4 — checklist + exports**: cp tags, harvest, check-off, deal summary
  export, export-all.
- **A5 — cross-doc import linking**: detect "Clause X of the {Title}" in
  imported documents and propose xref tokens against a user-confirmed
  document-title mapping. (Mechanical string matching + confirmation; the
  first step that touches the import pipeline, hence sequenced last.)

## Testing

- Engine phases: unit tests at the same standard as the numbering engine
  (binding precedence, cross-doc resolution and every failure mode, rule
  evaluation edge cases, inclusion + override matrix, workspace-file
  validation/round-trip).
- Integration: a scripted two-document negotiation over a suite (the
  margin-loan simulation pattern) exercising shared-field edits and cross-doc
  renumber ripples end-to-end.
- Performance: trivial by construction (N × single-document render; a
  10-document suite at ISDA scale ≈ 10 × 6ms idle baseline), but A1 adds a
  perf test to hold that.

## Explicitly out of scope

- Multi-user/shared state, server sync, permissions.
- LLM-assisted semantic field matching or conflict detection (future opt-in
  assist; must never be silently authoritative).
- Tables (tracked separately; a prerequisite for real ISDA Schedules/CSAs and
  therefore likely to land before or alongside A3).
- Cross-document *defined-term* resolution ("as defined in the Facility
  Agreement") — natural A6 candidate once the orphaned-term checker exists
  for single documents.

## Open questions (resolve before A1 starts)

1. Template updates: when an imported template is edited (field marked) after
   being added to a workspace, does the workspace copy update? Proposal:
   workspace copies are frozen snapshots; re-add to refresh. Simple,
   predictable, matches "workspace file is self-contained".
2. Workspace-file size: templates by value could reach a few MB with many
   imports — acceptable for JSON download/localStorage, but revisit if real
   usage says otherwise.
3. Whether the Deal tab replaces the Assemble template picker (a workspace of
   one document subsumes it) — decide after A3 ships, based on use.
