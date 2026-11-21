import './site.css';

export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export const metadata = {
  title: 'Blotter – Das Trading Journal',
  description: 'Trading Journal mit Kalender, TP/BE/SL, Screenshots, Learnings und Outlooks für 7,99 € im Monat, mit Backtesting für 14,99 €. 3 Tage kostenlos testen, monatlich kündbar.',
};

export default function SiteLayout({ children }) {
  return (
    <html lang="de">
      <head>
        <link rel="preload" href="/fonts/sora-wght.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="stylesheet" href="/fonts/fonts.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
