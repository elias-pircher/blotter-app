import './journal.css';

export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export const metadata = {
  title: 'Blotter Trading Journal',
  robots: { index: false },
};

const SKIN = 'try{var k=localStorage.getItem("blotter.skin"),o={ocean:"slate",royal:"navy",copper:"mocha",arctic:"paper"};if(k&&/^[a-z]+$/.test(k))document.documentElement.setAttribute("data-skin",o[k]||k)}catch(e){}';

export default function JournalLayout({ children }) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <link rel="preload" href="/fonts/archivo-wdth.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="preload" href="/fonts/plex-sans-400.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="stylesheet" href="/fonts/fonts.css" />
        <script dangerouslySetInnerHTML={{ __html: SKIN }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
