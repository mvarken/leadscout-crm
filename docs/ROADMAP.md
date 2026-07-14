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

Status: umgesetzt als erster manueller CRM-Ausbau

- Lead-Datenmodell
- Leads anlegen und bearbeiten
- Statuswerte
- Historie fuer Statusaenderungen und Notizen
- Suche und Filter
- Duplikatpruefung nach Domain, E-Mail, Telefon und aehnlichem Namen am selben Ort

Abschlusskriterien:

- Leads koennen manuell angelegt werden
- Lead-Detailseiten sind erreichbar
- Stammdaten koennen bearbeitet werden
- Statuswechsel erzeugen Historieneintraege
- Notizen werden chronologisch in der Historie gespeichert
- Dashboard-Karten nutzen echte Lead-Zahlen

## Phase 3: Websitepruefung

Status: umgesetzt als manuell ausloesbare Lead-Pruefung

- URL-Normalisierung
- Erreichbarkeit
- HTTPS/SSL
- WordPress-Erkennung
- Impressum-Erkennung
- Datenschutz-Erkennung
- Kontaktseite
- technische Pruefprotokolle

Abschlusskriterien:

- Websitepruefung kann aus der Lead-Detailseite gestartet werden
- Ergebnisse werden am Lead gespeichert
- Historie erhaelt einen Eintrag zur Websitepruefung
- WordPress wird mit mehreren HTML-Signalen erkannt
- Impressum, Datenschutz, Kontaktseite, E-Mail und Telefonnummer werden aus HTML-Hinweisen ermittelt

## Phase 4: Datensammlung

Status: umgesetzt als gespeicherter Suchauftrag mit Mock-Provider

- Suchauftraege
- Provider-Schnittstelle
- Mock-Verzeichnis als erste sichere Quelle
- Ergebnisliste
- Uebernahme ausgewaehlter Ergebnisse als Lead

Abschlusskriterien:

- Suchauftraege werden gespeichert
- Provider liefern ein einheitliches Ergebnisformat
- Ergebnisse werden pro Suchauftrag angezeigt
- Ergebnisse koennen per Plus als Lead uebernommen werden
- Duplikate werden vor der Uebernahme markiert
- Ergebnisse koennen ignoriert werden

Noch bewusst offen:

- echte externe Provider wie 11880 erst nach Pruefung von Nutzungsbedingungen, robots.txt und Zugriffsvorgaben

## Phase 5: Automatisierung

Status: umgesetzt als erster Automatisierungs-Ausbau

- Wiedervorlagen mit offenen und erledigten Aufgaben
- Lead-Score mit manueller Neuberechnung und Aktualisierung nach Websitepruefung
- Ausschlussliste fuer Domains, E-Mail-Adressen, Telefonnummern und Firmennamen
- Datensammlung respektiert aktive Ausschluesse vor der Lead-Uebernahme
- Leadlisten zeigen Score und naechste Wiedervorlage
- Dashboard zaehlt offene Wiedervorlagen aus echten Daten

Abschlusskriterien:

- Wiedervorlagen koennen pro Lead angelegt werden
- Wiedervorlagen koennen als erledigt markiert werden
- der naechste offene Termin wird am Lead gespeichert
- gesperrte Eintraege verhindern neue Leads und blockierte Uebernahmen aus der Datensammlung
- Lead-Score wird aus technischen Pruefergebnissen und Kontaktinformationen berechnet

Noch bewusst offen:

- echte Hintergrund-Worker fuer zeitgesteuerte Wiederholungen
- automatische Intervall-Pruefung von Websites ohne manuellen Start

## Phase 6: Kommunikation

- E-Mail-Vorlagen
- Versandprotokoll
- Kontaktverlauf
- spaetere SMTP- oder Gmail-Anbindung
