import { Legal, Ph } from '../legal';
export const metadata = { title: 'Impressum – Blotter' };
export default function Impressum() {
  return (
    <Legal title="Impressum">
      <p>Informationen gemäß § 5 E-Commerce-Gesetz und Offenlegung gemäß § 25 Mediengesetz.</p>
      <h2>Anbieter</h2>
      <p><Ph>Vor- und Nachname bzw. Firmenname</Ph><br /><Ph>Straße und Hausnummer</Ph><br /><Ph>PLZ Ort</Ph>, Österreich</p>
      <h2>Kontakt</h2>
      <p>E-Mail: <Ph>kontakt@deine-domain.at</Ph></p>
      <h2>Unternehmensangaben</h2>
      <p>Unternehmensgegenstand: Bereitstellung einer Software für Trading-Journale<br />
        UID-Nummer: <Ph>ATU… oder „keine“</Ph><br />
        Gewerbe: <Ph>Gewerbewortlaut</Ph>, Gewerbebehörde: <Ph>Bezirkshauptmannschaft / Magistrat</Ph><br />
        Mitglied der Wirtschaftskammer <Ph>Bundesland</Ph></p>
      <h2>Verbraucherstreitbeilegung</h2>
      <p>Verbraucher haben die Möglichkeit, Beschwerden an die Online-Streitbeilegungsplattform der EU oder an die für den Anbieter zuständige Stelle zu richten. <Ph>Aktuellen Hinweis prüfen</Ph></p>
      <h2>Kein Anlageberatungsangebot</h2>
      <p>Blotter ist ein Werkzeug zur Dokumentation eigener Trades. Es gibt keine Anlage-, Steuer- oder Rechtsberatung.</p>
    </Legal>
  );
}
