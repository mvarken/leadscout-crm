# Architektur

LeadScout CRM ist als modulare Full-Stack-Anwendung geplant. Phase 1 legt nur das technische Fundament an.

## Anwendung

- Next.js mit App Router fuer Oberflaeche und Serverrouten
- TypeScript fuer gemeinsame Typsicherheit
- Tailwind CSS fuer ein ruhiges, wartbares Admin-UI
- Prisma als Datenbankschicht
- PostgreSQL als relationale Datenbank

## Authentifizierung

- Benutzer werden in der Datenbank gespeichert
- Passwoerter werden mit Argon2id gehasht
- Sessions werden als Hash in der Datenbank gespeichert
- Der Browser bekommt nur ein `HttpOnly` Session-Cookie
- Eine oeffentliche Registrierung ist nicht vorhanden

## Zugriffsschutz

- Middleware blockiert interne Bereiche ohne Session-Cookie
- Serverkomponenten pruefen den aktuellen Benutzer erneut gegen die Datenbank
- Inaktive Benutzer erhalten keinen Zugriff
- Redirects werden auf lokale Pfade begrenzt

## Spaetere Module

Die spaeteren Bereiche sollen getrennt wachsen:

- `Leads`: CRM-Daten, Status, Historie, Suche, Duplikate
- `Websitepruefung`: technische Analyse von Unternehmenswebsites
- `Datensammlung`: Provider-System fuer externe Quellen
- `Jobs`: Hintergrundverarbeitung, Fortschritt und Wiederholungen

## Deployment-Idee

Fuer den spaeteren Serverbetrieb:

- GitHub als Quellcode- und Planungsort
- PostgreSQL als verwaltete Datenbank oder Docker-Dienst
- HTTPS vor der Anwendung
- Umgebungsvariablen fuer Secrets
- Migrationen im Deployment-Prozess
