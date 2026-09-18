import type { Metadata, Viewport } from 'next';
import { EB_Garamond, Inter } from 'next/font/google';
import './globals.css';

/**
 * Waldenburg Light is licensed; DESIGN.md names EB Garamond at 300 as the
 * open substitute. Display copy stays at weight 300 everywhere — the
 * editorial signature. Inter is the family ElevenLabs itself uses for body.
 */
const ebGaramond = EB_Garamond({
  subsets: ['latin'],
  weight: ['400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-eb-garamond',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ToxiScan — Read the room before you read the comments',
  description:
    'Analyse the comment section of any public YouTube video. ToxiScan scores every comment for insults, obscenity, threats and dangerous content, then shows you the shape of the conversation.',
  keywords: [
    'YouTube comments',
    'toxicity analysis',
    'content moderation',
    'comment analysis',
    'sentiment',
  ],
  openGraph: {
    title: 'ToxiScan — YouTube comment toxicity analysis',
    description:
      'Score any public YouTube comment section for insults, obscenity, threats and dangerous content.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#f5f5f5',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${ebGaramond.variable} ${inter.variable}`}>
      <body className="bg-canvas text-body antialiased">{children}</body>
    </html>
  );
}
