import Link from 'next/link';

export interface FooterLinkItem {
  href: string;
  label: string;
}

export interface FooterColumn {
  title: string;
  links: FooterLinkItem[];
}

export interface FooterProps {
  columns?: FooterColumn[];
}

const DEFAULT_COLUMNS: FooterColumn[] = [
  {
    title: 'Product',
    links: [
      { href: '/#analyse-form', label: 'Analyse a video' },
      { href: '/playground', label: 'Playground' },
      { href: '/about', label: 'About' },
    ],
  },
  {
    title: 'Labels',
    links: [
      { href: '/about#labels', label: 'How scoring works' },
      { href: '/about#privacy', label: 'Data & privacy' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { href: 'https://developers.google.com/youtube/v3', label: 'YouTube Data API' },
      { href: '/about#faq', label: 'FAQ' },
    ],
  },
];

/**
 * Closing footer: `canvas` background, `body-sm` muted text, multi-column
 * link grid, 64px/48px padding per DESIGN.md's `footer` component.
 */
export function Footer({ columns = DEFAULT_COLUMNS }: FooterProps) {
  return (
    <footer className="border-t border-hairline bg-canvas">
      <div className="editorial-container py-16 md:px-12 md:py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <span className="display-sm text-ink">ToxiScan</span>
            <p className="body-sm mt-3 max-w-[32ch] text-muted">
              Read the room before you read the comments.
            </p>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <p className="caption-uppercase text-muted-soft">{column.title}</p>
              <ul className="mt-4 flex flex-col gap-3">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="body-sm text-body hover:text-ink">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-hairline pt-6">
          <p className="body-sm text-muted-soft">
            © {new Date().getFullYear()} ToxiScan. Not affiliated with YouTube or Google.
          </p>
        </div>
      </div>
    </footer>
  );
}
