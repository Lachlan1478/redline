import { useState } from 'react';
import type { ReactNode } from 'react';

interface SidePanelProps {
  side: 'left' | 'right';
  title: string;
  /** Compact status shown in the header and on the collapsed rail, e.g. "9/11". */
  badge?: string;
  /** Highlights the badge when attention is needed (missing terms, issues). */
  badgeAttention?: boolean;
  subtitle?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * A workbench side panel that collapses to a slim labelled rail, so the
 * document keeps the screen. Starts collapsed on narrower windows.
 */
export function SidePanel({
  side,
  title,
  badge,
  badgeAttention,
  subtitle,
  footer,
  children,
}: SidePanelProps) {
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 1280,
  );
  const borderSide = side === 'left' ? 'border-r' : 'border-l';
  const expandChevron = side === 'left' ? '›' : '‹';
  const collapseChevron = side === 'left' ? '‹' : '›';

  if (collapsed) {
    return (
      <aside className={`flex w-9 shrink-0 flex-col items-center bg-page ${borderSide} border-line`}>
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          aria-label={`Expand ${title}`}
          aria-expanded={false}
          className="flex h-full w-full flex-col items-center gap-3 pt-3 text-ink-soft hover:bg-hover hover:text-ink"
        >
          <span aria-hidden className="font-mono text-sm">{expandChevron}</span>
          {badge && (
            <span
              className={`rounded px-0.5 font-mono text-[10px] ${
                badgeAttention ? 'bg-caution/10 text-caution' : 'text-ink-soft'
              }`}
            >
              {badge}
            </span>
          )}
          <span className="eyebrow text-[11px] [writing-mode:vertical-rl]">
            {title}
          </span>
        </button>
      </aside>
    );
  }

  return (
    <aside
      className={`flex w-72 shrink-0 flex-col bg-page ${borderSide} border-line`}
    >
      <div className="flex items-start gap-2 border-b border-line px-4 pb-2.5 pt-3">
        <div className="min-w-0 flex-1">
          <h2 className="eyebrow">
            {title}
            {badge && (
              <span
                className={`ml-2 rounded px-1 font-mono text-[11px] font-normal normal-case tracking-normal ${
                  badgeAttention ? 'bg-caution/10 text-caution' : 'text-ink'
                }`}
              >
                {badge}
              </span>
            )}
          </h2>
          {subtitle}
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          aria-label={`Collapse ${title}`}
          aria-expanded
          className="rounded px-1.5 py-0.5 font-mono text-sm text-ink-soft hover:bg-hover hover:text-ink"
        >
          {collapseChevron}
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      {footer}
    </aside>
  );
}
