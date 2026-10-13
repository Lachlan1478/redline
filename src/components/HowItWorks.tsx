import type { ReactNode } from 'react';

const REPO = 'https://github.com/Lachlan1478/redline';

const STEPS: Array<{ title: string; body: ReactNode }> = [
  {
    title: 'Load the drafts',
    body: (
      <>
        Drop the <b>Original</b> and the <b>Change</b> into Compare as .docx, .pdf or .txt, or paste
        the text. Add the draft before last as <b>Earlier</b> to catch points that were quietly
        reverted.
      </>
    ),
  },
  {
    title: 'Read the amendments',
    body: (
      <>
        Every changed clause or sub-paragraph gets one entry, labelled with the words that changed
        — <code>cl 11(a): "three" → "five"</code>. Unchanged text folds away, and changed numbers are
        listed under <b>Figures changed</b>.
      </>
    ),
  },
  {
    title: 'Check the cover email',
    body: (
      <>
        Click <b>Check cover note</b> and paste their email, or your own before you send it. Each
        amendment is marked by how well the email accounts for it, and <b>Next issue</b> steps through
        the gaps.
      </>
    ),
  },
  {
    title: 'Send it back',
    body: (
      <>
        <b>Copy amendment summary</b> gives a numbered list for your email. <b>Export tracked
        changes</b> produces a Word document whose differences are real tracked changes the other
        side can accept or reject.
      </>
    ),
  },
];

const FLAGS: Array<{ label: string; className: string; meaning: string }> = [
  { label: 'Not in cover note', className: 'bg-signal text-white', meaning: 'The email never refers to this clause.' },
  {
    label: 'Edit not described',
    className: 'bg-caution text-white',
    meaning: 'The email discusses the clause, but neither the old nor the new wording of an edit appears in what it says. Hover to see which edit.',
  },
  {
    label: 'Only partly described',
    className: 'bg-caution/15 text-caution',
    meaning: 'The email gives one side of a change but not the other — say the new figure without the old one.',
  },
  { label: 'Reverts to earlier draft', className: 'bg-signal/10 text-signal', meaning: 'The change puts back wording from the Earlier draft.' },
  { label: 'Figure', className: 'bg-caution/10 text-caution', meaning: 'A number, amount, percentage or period changed.' },
  { label: 'Obligation', className: 'bg-dawn/10 text-dawn', meaning: 'Words like may, must, shall, not, only or unless changed.' },
  { label: 'Risk term', className: 'bg-signal/10 text-signal', meaning: 'Liability, fraud, indemnity, warranty, consent, termination and similar terms changed.' },
];

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-card p-5">
      <h2 className="eyebrow mb-3">{title}</h2>
      {children}
    </section>
  );
}

export function HowItWorks({ onStart }: { onStart: () => void }) {
  return (
    <main className="min-h-0 flex-1 overflow-y-auto" data-testid="how-it-works">
      <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-8">
        <header className="mb-2">
          <h1 className="font-display text-2xl font-bold text-ink">How Redline works</h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
            Redline compares two drafts of a contract, shows each change clause by clause, and checks
            the counterparty’s cover email against what actually changed. It all runs in your browser.
          </p>
          <button type="button" onClick={onStart} className="btn btn-primary mt-4">
            Compare two drafts
          </button>
        </header>

        <Card title="Reviewing a markup">
          <ol className="grid gap-4 sm:grid-cols-2">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-dawn font-mono text-sm text-white">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-display text-[15px] font-bold text-ink">{step.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-4 border-t border-line pt-3 text-sm leading-relaxed text-ink-soft">
            <b className="text-ink">Drafting instead?</b> Assemble builds a first draft from a template
            and a term sheet, renumbers clauses and cross-references as you add or remove them, and
            checks for unfilled terms, undefined terms and broken references.
          </p>
        </Card>

        <Card title="What the flags mean">
          <ul className="space-y-2">
            {FLAGS.map((flag) => (
              <li key={flag.label} className="flex flex-col gap-1 text-sm sm:flex-row sm:items-baseline sm:gap-3">
                <span className="shrink-0 sm:w-44">
                  <span className={`rounded px-1.5 py-px text-[11px] font-medium ${flag.className}`}>{flag.label}</span>
                </span>
                <span className="leading-relaxed text-ink">{flag.meaning}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            <b className="text-ink">Drafting checks</b> list capitalised terms that look defined but
            aren’t, definitions never used, and references to clauses that don’t exist or are marked
            deleted.
          </p>
        </Card>

        <Card title="Where your documents go">
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink">
            <li>
              <b>Nowhere.</b> Reading, comparing and exporting all happen in JavaScript on your device.
              No server receives document content, and there are no accounts, analytics or tracking.
            </li>
            <li>
              <b>It works offline.</b> Once the page has loaded, you can turn your internet off and
              keep comparing. The only network requests are for Redline’s own code and fonts.
            </li>
            <li>
              <b>Compare keeps nothing.</b> Documents and cover emails are held in memory and are gone
              when you close the tab.
            </li>
            <li>
              <b>Assemble saves locally.</b> Your deal’s terms and any imported templates are saved in
              this browser’s local storage so you don’t lose work. Clearing the site’s data in your
              browser removes them.
            </li>
            <li>
              <b>The clipboard</b> is only read or written when you click Paste or Copy.
            </li>
            <li>
              <b>The code is open.</b> Your IT team can{' '}
              <a href={REPO} className="text-dawn underline" target="_blank" rel="noreferrer">
                read the source
              </a>{' '}
              or host their own copy; it is a static site with no backend.
            </li>
          </ul>
        </Card>

        <Card title="What it doesn’t do">
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink">
            <li>
              <b>It doesn’t replace reading the draft.</b> The cover-note check matches clause
              references and wording, so treat its flags as where to look first, not as proof that a
              change was or wasn’t disclosed.
            </li>
            <li>
              <b>It compares text, not formatting.</b> Bold, fonts and numbering styles are ignored.
              Page headers, footers and watermarks are not read; footnotes are.
            </li>
            <li>
              <b>Tracked changes already in a .docx are read as accepted.</b> Accept or reject them in
              Word first if you want to compare a particular state.
            </li>
            <li>
              <b>PDFs need real text.</b> Scanned, image-only PDFs can’t be read.
            </li>
            <li>
              <b>A moved clause shows as deleted in one place and added in another.</b>
            </li>
          </ul>
        </Card>
      </div>
    </main>
  );
}
