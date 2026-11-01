# Blotter – Verkaufsversion

Das Blotter Trading Journal als eigene Web-App mit Login, getrennten Kundendaten und Stripe-Abo (7,99 €/Monat, monatlich kündbar).

**Technik:** Next.js (Hosting auf Vercel) · Supabase (Login, Datenbank, Screenshot-Speicher, Server in Frankfurt) · Stripe (Abo, Bezahlung, Kundenportal)

## Was drin ist

| Adresse | Was es tut |
|---|---|
| `/` | Verkaufsseite mit Funktionen, Preis und Fragen |
| `/login` | Anmelden oder registrieren per E-Mail-Link, ohne Passwort |
| `/abo` | Abo abschließen (AGB- und Rücktrittsrecht-Bestätigung) → Stripe Checkout |
| `/abo/danke` | Bestätigt die Zahlung direkt bei Stripe und öffnet das Journal |
| `/app` | Das Journal. Nur mit aktivem Abo. Neue Kunden starten mit dem Einrichtungs-Assistenten |
| `/api/stripe/webhook` | Stripe meldet hier Abschluss, Verlängerung und Kündigung |
| `/impressum`, `/datenschutz`, `/agb` | **Entwürfe mit Platzhaltern**, vor dem Start ausfüllen und prüfen lassen |

Jeder Kunde sieht nur seine eigenen Daten. Das erzwingt die Datenbank selbst (Row Level Security), nicht nur die Oberfläche. Ohne aktives Abo kann niemand schreiben oder Screenshots hochladen.

---

## Einrichtung Schritt für Schritt

### 1 · Supabase
1. Neues Projekt, Region **Frankfurt (eu-central-1)**.
2. **SQL Editor** → Inhalt von `supabase/schema.sql` einfügen → **Run**.
3. **Authentication → URL Configuration**
   - Site URL: deine Adresse, z. B. `https://blotter-app.vercel.app` (später deine Domain)
   - Redirect URLs: `https://DEINE-ADRESSE/auth/callback` und `http://localhost:3000/auth/callback`
4. **Project Settings → API**: Project URL und anon/publishable key notieren (öffentlich). Den service_role/secret key **geheim halten**.
5. **Authentication → Emails → Templates**: Bei „Magic Link“ und „Confirm signup“ den Inhalt aus `supabase/email-templates/` einsetzen. Dann enthält die E-Mail einen Code und einen Link, der in jedem Browser und auf jedem Gerät funktioniert.
6. Für echte Kunden: **Authentication → Emails → SMTP** mit einem eigenen Versanddienst (z. B. Resend) einrichten. Der eingebaute Versand ist nur zum Testen gedacht und stark begrenzt.

### 2 · Stripe (erst im Testmodus)
1. **Produktkatalog → Produkt hinzufügen**: „Blotter Journal“, Preis **7,99 EUR**, **wiederkehrend, monatlich**. Die **Preis-ID** (`price_…`) notieren.
2. **Einstellungen → Billing → Kundenportal**: aktivieren, „Abos kündigen“ erlauben (zum Ende des Abrechnungszeitraums), „Zahlungsmethode aktualisieren“ erlauben.
3. **Entwickler → Webhooks → Endpoint hinzufügen**
   - URL: `https://DEINE-ADRESSE/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.paused`, `customer.subscription.resumed`
   - Das **Signing secret** (`whsec_…`) ist geheim.
4. **Entwickler → API-Schlüssel**: Den **Secret key** (`sk_test_…`) geheim halten.

### 3 · Vercel
1. Mit GitHub anmelden → **Add New → Project** → Repository `blotter-app` importieren.
2. **Environment Variables** eintragen (siehe `.env.example`):

| Name | Wert | geheim? |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://DEINE-ADRESSE` | nein |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL | nein |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/publishable key | nein |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role/secret key | **ja** |
| `STRIPE_SECRET_KEY` | `sk_test_…` | **ja** |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` | **ja** |
| `STRIPE_PRICE_ID` | `price_…` | nein |
| `STRIPE_AUTOMATIC_TAX` | `false` (später `true` mit Stripe Tax) | nein |

3. **Deploy**.

### 4 · Testen (ohne echtes Geld)
1. Website öffnen → **Starten** → E-Mail eingeben → Link im selben Browser öffnen.
2. Beide Häkchen setzen → **Weiter zur Zahlung**.
3. Testkarte `4242 4242 4242 4242`, beliebiges Ablaufdatum in der Zukunft, beliebige Prüfziffer.
4. Du landest im Einrichtungs-Assistenten. Trade mit Screenshot eintragen, neu laden, auf dem Handy anmelden: alles sollte da sein.
5. Einstellungen → **Abo verwalten oder kündigen** → im Stripe-Portal kündigen → das Abo läuft bis Monatsende.

### 5 · Live gehen
- Impressum, Datenschutz und AGB vollständig ausfüllen und prüfen lassen.
- Umsatzsteuer klären (Kleinunternehmer oder USt.-pflichtig, EU-Verkauf über OSS); bei Bedarf Stripe Tax aktivieren.
- Eigene Domain in Vercel verbinden, `NEXT_PUBLIC_SITE_URL` und die Supabase-URLs anpassen.
- Stripe auf **Live** umstellen: Live-Produkt und -Preis, Live-Webhook, Live-Schlüssel in Vercel eintragen.

---

## Design des Journals aktualisieren
Das Journal-Design kommt aus der Claude-Version (`design/blotter.html`). Nach Änderungen dort:
`python3 scripts/extract-journal.py` erzeugt `public/journal/journal.js`, `app/(journal)/journal.css` und `app/(journal)/app/markup.js` neu.

## Lokal starten (optional)
```
cp .env.example .env.local   # Werte eintragen
npm install
npm run dev                  # http://localhost:3000
```
