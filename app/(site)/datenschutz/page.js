import { Legal, Ph } from '../legal';
export const metadata = { title: 'Datenschutz – Blotter' };
export default function Datenschutz() {
  return (
    <Legal title="Datenschutzerklärung">
      <h2>Verantwortlicher</h2>
      <p><Ph>Name, Anschrift, E-Mail wie im Impressum</Ph></p>
      <h2>Welche Daten wir verarbeiten</h2>
      <ul>
        <li>Konto: E-Mail-Adresse, Anmeldezeitpunkte.</li>
        <li>Journal-Inhalte: Trades, Learnings, Outlooks, Screenshots und deine Einstellungen. Diese Inhalte sind nur für dich sichtbar.</li>
        <li>Abo: Abo-Status und Zahlungsreferenzen. Kartendaten verarbeitet ausschließlich Stripe, wir sehen sie nicht.</li>
      </ul>
      <h2>Zweck und Rechtsgrundlage</h2>
      <p>Wir verarbeiten diese Daten, um dir das Journal bereitzustellen und das Abo abzurechnen (Vertragserfüllung, Art. 6 Abs. 1 lit. b DSGVO). <Ph>prüfen und ergänzen</Ph></p>
      <h2>Auftragsverarbeiter</h2>
      <ul>
        <li>Supabase (Datenbank, Anmeldung, Dateispeicher), Serverstandort <Ph>Frankfurt, EU</Ph></li>
        <li>Stripe (Zahlungsabwicklung)</li>
        <li>Vercel (Hosting der Website)</li>
        <li><Ph>E-Mail-Versanddienst, z. B. Resend</Ph></li>
      </ul>
      <p><Ph>Hinweise zu Datenübermittlungen in Drittländer und den jeweiligen Garantien ergänzen</Ph></p>
      <h2>Speicherdauer</h2>
      <p><Ph>z. B. bis zur Löschung des Kontos; Rechnungsdaten nach gesetzlicher Aufbewahrungspflicht</Ph></p>
      <h2>Deine Rechte</h2>
      <p>Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch sowie das Recht, dich bei der Österreichischen Datenschutzbehörde zu beschweren. Schreib uns an <Ph>kontakt@deine-domain.at</Ph>.</p>
      <h2>Cookies</h2>
      <p>Wir verwenden nur technisch notwendige Cookies für die Anmeldung. Keine Werbe- oder Tracking-Cookies.</p>
    </Legal>
  );
}
