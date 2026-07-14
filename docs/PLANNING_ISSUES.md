# Geplante GitHub-Issues

Die Codex-GitHub-Verbindung kann das Repository lesen, hat aktuell aber keine Berechtigung zum Erstellen von Issues. Diese Liste kann direkt als Grundlage fuer GitHub-Issues verwendet werden.

## 1. Phase 1 abschliessen: Datenbank, Migration, Seed und Login manuell pruefen

Ziel: Phase 1 soll lokal vollstaendig startbar und manuell geprueft sein.

Aufgaben:

- Docker oder PostgreSQL lokal verfuegbar machen
- `.env` aus `.env.example` erstellen
- Datenbank starten
- Prisma Migration ausfuehren
- Admin per Seed-Skript anlegen
- Anwendung starten
- Login pruefen
- Logout pruefen
- Routenschutz ohne Login pruefen

Akzeptanzkriterien:

- Admin kann sich anmelden
- interne Seiten sind ohne Login nicht erreichbar
- Logout beendet die Session
- README-Schritte funktionieren auf einem frischen Setup

Pruefung:

- `npm run typecheck`
- `npm run lint`
- `npm run test`

## 2. Phase 2 planen: Leadverwaltung mit Status, Historie und Suche

Ziel: Die Leadverwaltung soll als naechster Entwicklungsabschnitt fachlich und technisch vorbereitet werden.

Geplanter Umfang:

- Lead-Datenmodell
- Lead-Liste
- Lead-Detailseite
- Statuswerte
- Statusaenderungen mit Historie
- Notizen
- Suche und Filter
- Duplikatpruefung nach Domain, E-Mail, Telefon und aehnlichem Namen am selben Ort

Nicht enthalten:

- Scraper
- 11880-Anbindung
- Websiteanalyse
- E-Mail-Versand

Akzeptanzkriterien:

- Datenmodell ist migrationsfaehig
- Leads koennen manuell angelegt und bearbeitet werden
- Statuswechsel erzeugen Historieneintraege
- Suche und Filter funktionieren grundlegend

## 3. Deployment vorbereiten: Server, PostgreSQL, HTTPS und Secrets

Ziel: LeadScout CRM soll spaeter sicher auf einem Server laufen koennen.

Klaerungspunkte:

- Zielserver oder Hosting-Anbieter
- PostgreSQL: verwaltet oder Docker-basiert
- HTTPS/Domain
- Backup-Strategie
- Umgebungsvariablen und Secrets
- Migrationsprozess
- Startprozess fuer Next.js

Akzeptanzkriterien:

- Deployment-Ziel ist entschieden
- benoetigte Serverdienste sind dokumentiert
- Produktions-Checkliste liegt im Repository

## 4. Security-Upgrade planen: Node aktualisieren und Next.js Audit-Warnungen beheben

Hintergrund: `npm audit --omit=dev` meldet Produktionswarnungen fuer Next.js/PostCSS. Der von npm vorgeschlagene Fix hebt Next auf `16.2.10`; diese Version benoetigt Node `>=20.9.0`. Lokal ist aktuell Node `20.3.1` vorhanden.

Aufgaben:

- Node lokal auf mindestens `20.9.0` aktualisieren
- Next.js-Upgrade pruefen
- Breaking Changes bewerten
- TypeScript, Linting und Tests erneut ausfuehren
- Audit erneut ausfuehren

Akzeptanzkriterien:

- `npm audit --omit=dev` meldet keine relevanten Produktionswarnungen mehr
- lokale Pruefungen laufen erfolgreich durch
