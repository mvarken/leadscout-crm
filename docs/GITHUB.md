# GitHub-Setup

Dieses Projekt ist lokal bereits als Git-Repository vorbereitet.

## Empfohlener Repository-Name

```text
leadscout-crm
```

## Neues Repository auf GitHub anlegen

1. In GitHub ein neues Repository erstellen.
2. Kein README, keine `.gitignore` und keine Lizenz automatisch erzeugen, weil diese Dateien lokal bereits vorhanden sind.
3. Die Repository-URL kopieren.

## Remote verbinden

Beispiel mit HTTPS:

```bash
git remote add origin https://github.com/DEIN-NAME/leadscout-crm.git
git branch -M main
git push -u origin main
```

## Planung in GitHub

Empfohlene Issues fuer den Start:

- Phase 1 abschliessen: Datenbank lokal starten, Migration ausfuehren, Admin seeden, Login testen
- Phase 2 planen: Lead-Datenmodell, Status, Historie, Suche, Duplikate
- Deployment vorbereiten: Serverziel, PostgreSQL, HTTPS, Secrets, Migrationsprozess
- Security-Upgrade: Node auf mindestens 20.9.0 aktualisieren und Next.js-Sicherheitsupdate pruefen

## Codex mit GitHub nutzen

Wenn das Repository in GitHub liegt und die GitHub-App Zugriff darauf hat, koennen spaetere Aufgaben direkt gegen das Repository geplant werden:

- Issues als Arbeitspakete nutzen
- pro Phase eigene Branches anlegen
- Pull Requests fuer abgeschlossene Aufgaben verwenden
- Tests und Review vor dem Merge ausfuehren
