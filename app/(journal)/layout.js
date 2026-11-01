import './journal.css';

export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export const metadata = {
  title: 'Blotter Trading Journal',
  robots: { index: false },
};

const SKIN = 'try{var k=localStorage.getItem("blotter.skin");if(k&&/^[a-z]+$/.test(k))document.documentElement.setAttribute("data-skin",k)}catch(e){}';

export default function JournalLayout({ children }) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,500..800&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
        <script dangerouslySetInnerHTML={{ __html: SKIN }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
