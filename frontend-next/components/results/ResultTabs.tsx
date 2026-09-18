'use client';

import { useId, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export type ResultTabId = 'overview' | 'charts' | 'comments';

export interface ResultTabsProps {
  overview: React.ReactNode;
  charts: React.ReactNode;
  comments: React.ReactNode;
}

const TABS: { id: ResultTabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'charts', label: 'Charts' },
  { id: 'comments', label: 'Comments' },
];

/**
 * Accessible tabs: role="tablist"/"tab"/"tabpanel", roving tabindex, arrow-key
 * navigation (Left/Right/Home/End), aria-selected. Visual indicator is a thin
 * ink underline — editorial, not a chunky filled pill.
 */
export function ResultTabs({ overview, charts, comments }: ResultTabsProps) {
  const [active, setActive] = useState<ResultTabId>('overview');
  const baseId = useId();
  const tabRefs = useRef<Record<ResultTabId, HTMLButtonElement | null>>({
    overview: null,
    charts: null,
    comments: null,
  });

  function focusTab(id: ResultTabId) {
    setActive(id);
    tabRefs.current[id]?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusTab(TABS[(index + 1) % TABS.length].id);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focusTab(TABS[(index - 1 + TABS.length) % TABS.length].id);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusTab(TABS[0].id);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusTab(TABS[TABS.length - 1].id);
    }
  }

  const panels: Record<ResultTabId, React.ReactNode> = { overview, charts, comments };

  return (
    <div>
      <div
        role="tablist"
        aria-label="Results view"
        className="flex gap-6 border-b border-hairline"
      >
        {TABS.map((tab, index) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              ref={(node) => {
                tabRefs.current[tab.id] = node;
              }}
              role="tab"
              id={`${baseId}-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActive(tab.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={cn(
                'title-sm relative pb-3 pt-1 transition-colors',
                isActive ? 'text-ink' : 'text-muted hover:text-body',
              )}
            >
              {tab.label}
              <span
                aria-hidden="true"
                className={cn(
                  'absolute inset-x-0 -bottom-px h-[2px] transition-opacity',
                  isActive ? 'bg-[var(--color-ink)] opacity-100' : 'opacity-0',
                )}
              />
            </button>
          );
        })}
      </div>

      {TABS.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${baseId}-panel-${tab.id}`}
          aria-labelledby={`${baseId}-tab-${tab.id}`}
          hidden={active !== tab.id}
          tabIndex={0}
          className="pt-8"
        >
          {active === tab.id ? panels[tab.id] : null}
        </div>
      ))}
    </div>
  );
}

export default ResultTabs;
