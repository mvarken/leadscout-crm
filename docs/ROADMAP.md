# LeadScout CRM Roadmap

Diese Roadmap haelt die Entwicklung bewusst in klaren Phasen. Jede Phase soll lauffaehig, getestet und dokumentiert abgeschlossen werden, bevor die naechste beginnt.

## Phase 1: Grundsystem

Status: in Arbeit

- Next.js App Router
- TypeScript
- PostgreSQL mit Docker Compose
- Prisma ORM
- datenbankgestuetzte Authentifizierung
- Rollen `ADMIN` und `USER`
- geschuetztes Admin-Layout
- Dashboard-Grundgeruest
- Platzhalter fuer Leads, Datensammlung und Wiedervorlagen

Abschlusskriterien:

- Admin kann per Seed-Skript angelegt werden
- Login funktioniert
- Logout funktioniert
- interne Seiten sind ohne Login nicht erreichbar
- TypeScript, Linting und Tests laufen durch

Offen fuer lokalen Abschluss:

- Docker oder PostgreSQL lokal verfuegbar machen
- Migration und Seed gegen echte Datenbank ausfuehren
- Login/Logout im Browser manuell pruefen

## Phase 2: Leadverwaltung

- Lead-Datenmodell
- Leads anlegen und bearbeiten
- Statuswerte
- Historie fuer Statusaenderungen und Notizen
- Suche und Filter
- Duplikatpruefung nach Domain, E-Mail, Telefon und aehnlichem Namen am selben Ort

## Phase 3: Websitepruefung

- URL-Normalisierung
- Erreichbarkeit
- HTTPS/SSL
- WordPress-Erkennung
- Impressum-Erkennung
- Datenschutz-Erkennung
- Kontaktseite
- technische Pruefprotokolle

## Phase 4: Datensammlung

- Suchauftraege
- Provider-Schnittstelle
- erste Quelle nach rechtlicher und technischer Pruefung
- Ergebnisliste
- Uebernahme ausgewaehlter Ergebnisse als Lead

## Phase 5: Automatisierung

- Hintergrundjobs
- Wiedervorlagen
- erneute Websitepruefung
- Lead-Score
- Ausschlussliste

## Phase 6: Kommunikation

- E-Mail-Vorlagen
- Versandprotokoll
- Kontaktverlauf
- spaetere SMTP- oder Gmail-Anbindung
