import { Legal, Ph } from '../legal';
export const metadata = { title: 'AGB – Blotter' };
export default function AGB() {
  return (
    <Legal title="Allgemeine Geschäftsbedingungen">
      <h2>1. Geltungsbereich</h2>
      <p>Diese AGB gelten für die Nutzung von Blotter, angeboten von <Ph>Name/Firma</Ph>.</p>
      <h2>2. Leistung</h2>
      <p>Blotter ist ein Online-Trading-Journal. Es dokumentiert eigene Trades, Learnings und Outlooks und bietet keine Anlageberatung.</p>
      <h2>3. Preis und Zahlung</h2>
      <p>Das Abo kostet 7,99 € pro Monat <Ph>inkl. USt. oder Hinweis Kleinunternehmerregelung</Ph> und wird monatlich im Voraus über Stripe abgerechnet.</p>
      <h2>4. Laufzeit und Kündigung</h2>
      <p>Das Abo verlängert sich jeweils um einen Monat und kann jederzeit zum Ende des laufenden Abrechnungsmonats gekündigt werden, direkt im Journal unter Einstellungen.</p>
      <h2>5. Rücktrittsrecht für Verbraucher</h2>
      <p><Ph>Belehrung über das Rücktrittsrecht nach FAGG einschließlich Muster-Rücktrittsformular einfügen</Ph></p>
      <p>Verlangt der Verbraucher ausdrücklich den sofortigen Beginn der Leistung und bestätigt er seine Kenntnis vom Verlust des Rücktrittsrechts, erlischt das Rücktrittsrecht mit Beginn der Leistung. <Ph>Formulierung prüfen lassen</Ph></p>
      <h2>6. Verfügbarkeit</h2>
      <p><Ph>Regelung zur Verfügbarkeit und Wartung</Ph></p>
      <h2>7. Haftung</h2>
      <p><Ph>Haftungsregelung</Ph></p>
      <h2>8. Daten nach Kündigung</h2>
      <p><Ph>z. B. Daten bleiben 30 Tage erhalten und können exportiert werden, danach Löschung</Ph></p>
      <h2>9. Schlussbestimmungen</h2>
      <p>Es gilt österreichisches Recht unter Ausschluss der Verweisungsnormen; zwingende Verbraucherschutzbestimmungen bleiben unberührt. <Ph>prüfen</Ph></p>
    </Legal>
  );
}
