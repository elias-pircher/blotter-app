import './site.css';
import { getLang, getPath } from '@/lib/i18n-server';
import { lp } from '@/lib/i18n';

export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export function generateMetadata() {
  const lang = getLang(), path = getPath();
  return {
    metadataBase: new URL('https://blotterjournal.com'),
    title: lang === 'en' ? 'Blotter – The Trading Journal' : 'Blotter – Das Trading Journal',
    description: lang === 'en'
      ? 'Trading journal with a calendar, TP/BE/SL, screenshots, learnings and outlooks for €7.99 a month, with backtesting for €14.99, with prop accounts for futures and CFDs for €22.99. Try it free for 3 days, cancel monthly.'
      : 'Trading Journal mit Kalender, TP/BE/SL, Screenshots, Learnings und Outlooks für 7,99 € im Monat, mit Backtesting für 14,99 €, mit Prop-Konten für Futures und CFDs für 22,99 €. 3 Tage kostenlos testen, monatlich kündbar.',
    alternates: { canonical: lp(lang, path), languages: { de: path, en: lp('en', path), 'x-default': path } },
  };
}

export default function SiteLayout({ children }) {
  return (
    <html lang={getLang()}>
      <head>
        <link rel="preload" href="/fonts/sora-wght.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="stylesheet" href="/fonts/fonts.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
