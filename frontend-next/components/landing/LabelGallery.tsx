'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { LABEL_META, LABEL_ORDER } from '@/lib/labels';

const ITEM_WIDTH = 480;
const GAP = 30;

/**
 * The five toxicity-state cards as a pinned horizontal gallery.
 *
 * Structure follows the Motion `ScrollHorizontal` reference exactly:
 * a 300vh scroll container, a sticky wrapper one card wide, and a flex
 * gallery whose `x` maps scroll progress from the first card centred to
 * the last card centred.
 */
export function LabelGallery() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // Move from first item centered to last item centered
  const totalDistance = (LABEL_ORDER.length - 1) * (ITEM_WIDTH + GAP);
  const x = useTransform(scrollYProgress, [0, 1], [0, -totalDistance]);

  return (
    <div className="label-gallery">
      <div ref={containerRef} className="scroll-container">
        <div className="sticky-wrapper">
          <motion.div className="gallery" style={{ x }}>
            {LABEL_ORDER.map((label, i) => {
              const meta = LABEL_META[label];
              return (
                <article
                  key={label}
                  className="gallery-item hairline-card"
                  style={
                    {
                      '--item-color': meta.pastel,
                      '--item-ink': meta.ink,
                    } as React.CSSProperties
                  }
                >
                  <div className="item-orb" aria-hidden="true" />
                  <div className="item-content">
                    <span className="item-number">0{i + 1}</span>
                    <h3>{meta.display}</h3>
                    <p>{meta.description}</p>
                    <span className="item-tag">
                      {meta.harmful ? 'Harmful' : 'Clean'}
                    </span>
                  </div>
                </article>
              );
            })}
          </motion.div>
        </div>
      </div>

      <StyleSheet />
    </div>
  );
}

function StyleSheet() {
  return (
    <style>{`
      .label-gallery {
        height: auto;
        overflow: visible;
        background: var(--color-surface-strong);
      }

      .label-gallery .scroll-container {
        height: 300vh;
        position: relative;
        /* The gallery track is far wider than the viewport, so it has to be
           clipped or it widens the page and produces a horizontal scrollbar.
           clip-path clips without establishing the scroll container that
           overflow: hidden would — which would break the sticky wrapper. */
        clip-path: inset(0);
      }

      /* Pinned clear of the 60px sticky nav rather than flush against the top
         edge, so the cards breathe under the header instead of touching it.
         The height gives back what the offset takes. */
      .label-gallery .sticky-wrapper {
        position: sticky;
        top: 92px;
        height: 680px;
        max-height: calc(100vh - 92px);
        width: ${ITEM_WIDTH}px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        justify-content: flex-start;
        overflow: visible;
      }

      .label-gallery .gallery {
        position: relative;
        z-index: 1;
        display: flex;
        gap: ${GAP}px;
        will-change: transform;
      }

      .label-gallery .gallery-item {
        flex-shrink: 0;
        z-index: 1;
        width: ${ITEM_WIDTH}px;
        height: 560px;
        position: relative;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        padding: 48px;
      }

      .label-gallery .item-orb {
        position: absolute;
        right: -80px;
        top: -80px;
        width: 320px;
        height: 320px;
        border-radius: 50%;
        background: var(--item-color);
        filter: blur(60px);
        opacity: 0.55;
      }

      .label-gallery .item-content {
        position: relative;
        z-index: 1;
      }

      .label-gallery .item-number {
        display: block;
        margin-bottom: 20px;
        font-size: 13px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--item-ink);
      }

      .label-gallery .gallery-item h3 {
        margin: 0;
        font-size: 40px;
        line-height: 1.1;
        font-weight: 500;
        color: var(--item-ink);
      }

      .label-gallery .gallery-item p {
        margin: 16px 0 0;
        font-size: 18px;
        line-height: 1.55;
        color: var(--color-body);
        max-width: 34ch;
      }

      .label-gallery .item-tag {
        display: inline-block;
        margin-top: 28px;
        padding: 6px 14px;
        border-radius: var(--radius-pill);
        background: var(--color-surface-strong);
        color: var(--item-ink);
        font-size: 12px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      @media (max-width: 600px) {
        .label-gallery .sticky-wrapper {
          width: 300px;
        }

        .label-gallery .gallery {
          gap: 15px;
        }

        .label-gallery .gallery-item {
          width: 300px;
          height: 420px;
          padding: 28px;
        }

        .label-gallery .gallery-item h3 {
          font-size: 28px;
        }

        .label-gallery .gallery-item p {
          font-size: 15px;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .label-gallery .gallery {
          transform: none !important;
        }
        .label-gallery .scroll-container {
          height: auto;
        }
        .label-gallery .sticky-wrapper {
          position: relative;
          height: auto;
          width: 100%;
          overflow-x: auto;
          padding: 50px 24px;
        }
      }
    `}</style>
  );
}

export default LabelGallery;
