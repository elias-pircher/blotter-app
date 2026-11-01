import { Nav, Footer } from './chrome';

export function Legal({ title, children }) {
  return (
    <>
      <Nav />
      <main className="wrap legal">
        <h1>{title}</h1>
        <div className="draft"><b>Entwurf.</b> Rot markierte Stellen sind Platzhalter. Vor dem Start bitte vollständig ausfüllen und von einer Fachperson (z. B. Rechtsanwalt oder WKO-Beratung) prüfen lassen.</div>
        {children}
      </main>
      <Footer />
    </>
  );
}
export const Ph = ({ children }) => <span className="ph">[{children}]</span>;
