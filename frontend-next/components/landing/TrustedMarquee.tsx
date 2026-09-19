'use client';

import type { ReactNode } from 'react';

/**
 * The kinds of people ToxiScan is built for. Deliberately roles and surfaces,
 * not invented company logos — the site does not claim customers it does not
 * have, so the strip reads as "who this is for", not as a fake logo wall.
 */
const TRUSTED = [
  { label: 'Creators', icon: 'play' as const },
  { label: 'Community moderators', icon: 'shield' as const },
  { label: 'Trust & safety teams', icon: 'check' as const },
  { label: 'Educators', icon: 'book' as const },
  { label: 'Researchers', icon: 'chart' as const },
  { label: 'Brand managers', icon: 'tag' as const },
  { label: 'Agencies', icon: 'layers' as const },
];

function Icon({ kind }: { kind: (typeof TRUSTED)[number]['icon'] }): ReactNode {
  const common = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  switch (kind) {
    case 'play':
      return (
        <svg {...common}>
          <rect x="2" y="5" width="20" height="14" rx="4" />
          <path d="M10 9.5v5l4-2.5z" />
        </svg>
      );
    case 'shield':
      return (
        <svg {...common}>
          <path d="M12 3l7 3v5c0 4.2-2.9 8.1-7 10-4.1-1.9-7-5.8-7-10V6z" />
        </svg>
      );
    case 'check':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M8.5 12.5l2.5 2.5 4.5-5" />
        </svg>
      );
    case 'book':
      return (
        <svg {...common}>
          <path d="M4 5.5A1.5 1.5 0 015.5 4H19v14H5.5A1.5 1.5 0 004 19.5z" />
          <path d="M19 18v2H5.5" />
        </svg>
      );
    case 'chart':
      return (
        <svg {...common}>
          <path d="M4 19V5" />
          <path d="M4 19h16" />
          <path d="M8 16v-5M12 16V8M16 16v-3" />
        </svg>
      );
    case 'tag':
      return (
        <svg {...common}>
          <path d="M3 12V5a2 2 0 012-2h7l9 9-9 9z" />
          <circle cx="7.5" cy="7.5" r="1.5" />
        </svg>
      );
    case 'layers':
      return (
        <svg {...common}>
          <path d="M12 3l9 5-9 5-9-5z" />
          <path d="M3 13l9 5 9-5" />
        </svg>
      );
  }
}

/**
 * An endlessly scrolling strip of the roles ToxiScan is built for.
 *
 * The track holds the list twice, side by side, and translates by exactly
 * -50% — at which point the second copy sits precisely where the first
 * started, so the loop restarts with no visible seam. Pure CSS, so it costs
 * nothing on the main thread and keeps running while JS is busy elsewhere.
 *
 * Hovering pauses the strip; `prefers-reduced-motion` stops it entirely and
 * lets the row wrap into static rows instead.
 */
export function TrustedMarquee() {
  const items = [...TRUSTED, ...TRUSTED];

  return (
    <div className="trusted-marquee">
      <div className="marquee-viewport">
        <div className="marquee-track">
          {items.map((item, i) => (
            <div
              className="marquee-item"
              key={`${item.label}-${i}`}
              /* The duplicated half is decorative — screen readers read the
                 first pass only. */
              aria-hidden={i >= TRUSTED.length ? true : undefined}
            >
              <span className="marquee-icon">
                <Icon kind={item.icon} />
              </span>
              <span className="marquee-label">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <StyleSheet />
    </div>
  );
}

function StyleSheet() {
  return (
    <style>{`
      .trusted-marquee {
        position: relative;
        width: 100%;
      }

      .trusted-marquee .marquee-viewport {
        overflow: hidden;
        /* Both edges fade into the band so items enter and leave the strip
           rather than popping at a hard boundary. */
        mask-image: linear-gradient(
          to right,
          transparent 0,
          #000 12%,
          #000 88%,
          transparent 100%
        );
        -webkit-mask-image: linear-gradient(
          to right,
          transparent 0,
          #000 12%,
          #000 88%,
          transparent 100%
        );
      }

      .trusted-marquee .marquee-track {
        display: flex;
        width: max-content;
        gap: 18px;
        animation: trusted-marquee-scroll 38s linear infinite;
      }

      .trusted-marquee:hover .marquee-track {
        animation-play-state: paused;
      }

      @keyframes trusted-marquee-scroll {
        from { transform: translate3d(0, 0, 0); }
        to   { transform: translate3d(-50%, 0, 0); }
      }

      .trusted-marquee .marquee-item {
        flex-shrink: 0;
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 14px 22px;
        border-radius: var(--radius-pill);
        background: var(--color-surface-card);
        border: 1px solid var(--color-hairline);
        white-space: nowrap;
        transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1),
                    box-shadow 0.35s cubic-bezier(0.22, 1, 0.36, 1);
      }

      .trusted-marquee .marquee-item:hover {
        transform: translateY(-3px);
        box-shadow: var(--shadow-soft-drop);
      }

      .trusted-marquee .marquee-icon {
        display: inline-flex;
        color: var(--color-body);
      }

      .trusted-marquee .marquee-label {
        font-size: 15px;
        letter-spacing: -0.01em;
        color: var(--color-body-strong);
      }

      @media (max-width: 639px) {
        .trusted-marquee .marquee-item {
          padding: 11px 17px;
        }

        .trusted-marquee .marquee-label {
          font-size: 14px;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .trusted-marquee .marquee-viewport {
          mask-image: none;
          -webkit-mask-image: none;
        }

        .trusted-marquee .marquee-track {
          animation: none;
          width: 100%;
          flex-wrap: wrap;
          justify-content: center;
        }

        /* With no scroll there is nothing to loop, so the duplicated second
           half would just repeat every role on screen. */
        .trusted-marquee .marquee-item[aria-hidden='true'] {
          display: none;
        }
      }
    `}</style>
  );
}

export default TrustedMarquee;
