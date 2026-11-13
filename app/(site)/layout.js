import './site.css';

export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export const metadata = {
  title: 'Blotter – Das Trading Journal',
  description: 'Trading Journal mit Kalender, TP/BE/SL, Screenshots, Learnings und Outlooks. 7,99 € im Monat, monatlich kündbar.',
};

export default function SiteLayout({ children }) {
  return (
    <html lang="de">
      <head>
        <link rel="preload" href="/fonts/archivo-wdth.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="preload" href="/fonts/plex-sans-400.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="stylesheet" href="/fonts/fonts.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
