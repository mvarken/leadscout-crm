# LeadScout CRM

LeadScout CRM ist ein produktionsnah strukturiertes CRM fuer Datensammlung, Websitepruefung, Leadverwaltung, Wiedervorlagen und Kommunikation.

## Voraussetzungen

- Node.js 20 oder neuer
- npm 9 oder neuer
- Docker Desktop oder eine kompatible Docker-Umgebung

## Installation

```bash
npm install
```

## Umgebungsvariablen

Kopiere die Beispieldatei:

```bash
cp .env.example .env
```

Passe anschliessend mindestens diese Werte an:

- `DATABASE_URL`
- `SESSION_SECRET`
- `ADMIN_NAME`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

Speichere keine echten Secrets im Repository. Die Datei `.env` ist bewusst ignoriert.

## Docker-Start

PostgreSQL lokal starten:

```bash
docker compose up -d
```

Der Dienst stellt PostgreSQL auf `localhost:5432` bereit.

## Datenbankmigration

Prisma Client erzeugen und Migration ausfuehren:

```bash
npm run prisma:generate
npm run prisma:migrate
```

Bei Deployment-Umgebungen:

```bash
npm run prisma:deploy
```

## Admin-Benutzer anlegen

Der erste Administrator wird ueber Umgebungsvariablen angelegt:

```bash
npm run db:seed
```

Die Registrierung ist absichtlich nicht oeffentlich verfuegbar.

## Entwicklungsstart

```bash
npm run dev
```

Danach im Browser oeffnen:

```text
http://localhost:3000
```

## Testbefehle

```bash
npm run typecheck
npm run lint
npm run test
npm run format
```

## Kommunikation

Im Bereich `Kommunikation` koennen E-Mail-Vorlagen fuer Copy-Paste angelegt werden. Vorlagen nutzen Platzhalter:

- `{{firma}}`
- `{{ansprechpartner}}`
- `{{stadt}}`
- `{{website}}`
- `{{email}}`

Beim Lead kann im Kontaktformular eine Vorlage ausgewaehlt werden. Bleiben Betreff oder Nachricht leer, werden sie aus der Vorlage und den Lead-Stammdaten erzeugt. Der fertige Text kann kopiert und extern versendet werden; der Kontakt wird anschliessend im Verlauf protokolliert.

## Sicherheitsnotizen

- Passwoerter werden mit Argon2id gehasht.
- Sessions werden datenbankgestuetzt gespeichert.
- Session-Cookies sind `HttpOnly`, `SameSite=Lax` und in Produktion `Secure`.
- Interne Seiten sind serverseitig geschuetzt.
- Login-Eingaben werden serverseitig validiert.
- Weiterleitungen nach Login werden auf lokale Pfade begrenzt.
- Eine einfache Rate-Limit-Vorbereitung fuer Login-Versuche ist vorhanden.
- Es werden keine Passwoerter oder Secrets im Quellcode gespeichert.

## Produktionshinweise

- Setze `SESSION_SECRET` auf einen langen, zufaelligen Wert.
- Verwende eine verwaltete oder abgesicherte PostgreSQL-Datenbank.
- Aktiviere HTTPS vor der Anwendung.
- Fuehre Migrationen mit `npm run prisma:deploy` aus.
- Lege Admins ueber einen kontrollierten Prozess an, nicht ueber eine oeffentliche Registrierung.
- Ersetze die In-Memory-Rate-Limit-Vorbereitung bei mehreren Serverinstanzen durch Redis oder einen vergleichbaren zentralen Speicher.

## Projektstruktur

```text
prisma/
  schema.prisma
  seed.ts
src/
  app/
    (auth)/login/
    (protected)/
    api/auth/
  components/
  lib/
  tests/
```
