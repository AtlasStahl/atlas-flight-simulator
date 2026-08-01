---
name: release-management
description: >-
  Erstellt und verwaltet Releases für Atlas LLM Gateway (ALG) mit Semantic Versioning,
  Release Notes, Git-Tags und GitHub-Release-Vorbereitung.
  Nutze diesen Skill IMMER wenn der User sagt: "release erstellen", "neuen release machen",
  "version bumpen", "release vorbereiten", "pushen/push", "release pushen",
  "neue Version", "bugfix release", "patch release", "minor release", "major release",
  oder ähnliche Release-/Versions-bezogene Anfragen stellt.
  Auch nutzen bei: "RELEASE_NOTES updaten", "Changelog schreiben", "Version erhöhen".
---

# Release Management — Atlas LLM Gateway

## Workflow-Übersicht

Ein Release umfasst diese Schritte:

1. Änderungen analysieren (was wurde seit letztem Release geändert?)
2. Versionsnummer bestimmen (Semantic Versioning)
3. `AppVersion` in `internal/httpapi/version.go` aktualisieren
4. `RELEASE_NOTES.md` schreiben (Pflichtformat aus AGENTS.md §20)
5. Qualitätssicherung ausführen (`go build`, `go vet`, `go test`, `npm run build`)
6. Git-Commit, Tag und Push-Befehle vorbereiten

## Schritt 1: Änderungen analysieren

Ermittle alle Änderungen seit dem letzten Release:

```bash
git log --oneline v<PREV>..HEAD
git diff --stat v<PREV>..HEAD
```

Falls kein Tag existiert, nutze `git log --oneline -30` und frage den User nach dem Umfang.

Kategorisiere jede Änderung als:
- **Bugfix** — Fehlerbehebung bestehender Funktionalität
- **Feature** — Neue Funktionalität oder Erweiterung
- **Breaking Change** — Inkompatible Änderung (API, DB-Schema, ENV-Variablen)
- **Intern** — Refactoring, Tests, Docs (muss nicht in Release Notes erwähnt werden)

## Schritt 2: Versionsnummer bestimmen (Semantic Versioning)

Format: `MAJOR.MINOR.PATCH` — aktuelle Version aus `internal/httpapi/version.go` lesen.

**PATCH (x.x.+1)** — Bugfixes, kleine Korrekturen:
- Fehlerbehebungen ohne API-Änderung
- Performance-Verbesserungen ohne neue Features
- Dependency-Updates ohne funktionale Änderung
- Typo-Fixes, Log-Verbesserungen

**MINOR (x.+1.0)** — Neue Features, abwärtskompatibel:
- Neue Endpoints oder Funktionalität
- Neue ENV-Variablen (mit sinnvollen Defaults)
- Neue DB-Migrationen (die automatisch laufen)
- Neue WebUI-Seiten oder -Funktionen
- Neue Driver oder Backend-Typen

**MAJOR (+1.0.0)** — Breaking Changes oder grundlegende Umbauten:
- Entfernte oder inkompatibel geänderte API-Endpoints
- Pflicht-ENV-Variablen ohne Fallback
- DB-Schema-Änderungen die manuelle Migration erfordern
- Umbenennung des Projekts oder grundlegende Architekturänderung
- Entfernung von Legacy-Support

**Im Zweifel:** User fragen. Vorschlag machen mit Begründung.

## Schritt 3: Version in Code aktualisieren

Die Datei `internal/httpapi/version.go` enthält die aktuelle Version:

```go
const AppVersion = "v2.1.0"
```

Aktualisiere `AppVersion` auf die neue Versionsnummer.

## Schritt 4: RELEASE_NOTES.md schreiben

Die `RELEASE_NOTES.md` im Repo-Root wird **überschrieben** (es gibt immer nur eine aktive Datei).

### Pflichtformat (MANDATORY)

```markdown
# 🚀 Atlas LLM Gateway — Release v<VERSION>

> **Datum:** TT. Monat JJJJ · **Vorgänger:** v<PREV> · **Branch:** `main` · **Tag:** `v<VERSION>`

---

## 📋 Zusammenfassung

<1–3 Sätze: Was wurde geändert und warum?>

---

## 🐛 Bugfixes

### <Titel des Bugs>

**Problem:** <Was ging schief?>
**Ursache:** <Warum ging es schief?>
**Fix:** <Was wurde geändert?>
**Ergebnis:** <Was ist jetzt besser?>

---

## ✨ Neue Features

### <Feature-Titel>

<Beschreibung des Features, Endpoints, ENV-Variablen, etc.>

---

## ⚠️ Breaking Changes

<Was muss der Betreiber tun?>

---

## 📁 Geänderte Dateien

| Datei | Änderung |
|-------|----------|
| `path/to/file` | Kurzbeschreibung |

---

## ⬆️ Upgrade-Hinweise

<DB-Migration? ENV-Variablen? Sonst "Keine besonderen Maßnahmen erforderlich.">

---

## ✅ Qualitätssicherung

| Prüfung | Ergebnis |
|---------|----------|
| `go build ./...` | ✅/❌ |
| `go vet ./...` | ✅/❌ |
| `go test ./...` | ✅/❌ |
| `npm run build` | ✅/❌ |
```

### Format-Regeln

- **Haupttitel**: Immer `# 🚀 Atlas LLM Gateway — Release v<VERSION>`
- **Infoblock**: Blockquote (`>`) mit Datum (deutsch, z.B. "27. Februar 2026"), Vorgänger, Branch, Tag
- **Emoji-Präfixe**: `📋` `🐛` `✨` `⚠️` `📁` `⬆️` `✅` für alle `##`-Abschnitte
- **Leere Abschnitte weglassen**: Kein `🐛 Bugfixes` Block wenn keine Bugfixes. Kein `⚠️ Breaking Changes` wenn keine Breaking Changes. `📋`, `📁`, `⬆️` und `✅` sind immer Pflicht
- **QA als Tabelle**: Nicht als Liste
- **Sprache**: Deutsch für Prosa, Englisch für Dateinamen/Commands/Code
- Bugfix-Einträge MÜSSEN alle vier Felder haben: Problem, Ursache, Fix, Ergebnis
- Feature-Einträge: Klare Beschreibung mit konkreten Details (Endpoints, ENV-Variablen, UI-Änderungen)
- Geänderte Dateien: Alle relevanten Dateien auflisten (nicht nur die offensichtlichsten)

## Schritt 5: Qualitätssicherung

Führe alle QA-Checks aus und trage die Ergebnisse in die Release Notes ein:

```bash
go build ./...
go vet ./...
go test ./...
cd webui && npm run build
```

Wenn ein Check fehlschlägt: Fix implementieren BEVOR der Release weitergeht. Die Release Notes MÜSSEN ehrliche Ergebnisse zeigen.

## Schritt 6: Git-Workflow vorbereiten

Nach Abschluss aller Schritte, die Git-Befehle für den User vorbereiten:

```bash
git add RELEASE_NOTES.md internal/httpapi/version.go <alle weiteren geänderten Dateien>
git commit -m "v<VERSION>: <Zusammenfassung>"
git tag v<VERSION>
git push origin main
git push origin v<VERSION>
```

**WICHTIG:** Git-Push-Befehle NICHT automatisch ausführen — nur vorbereiten und dem User zeigen. Push ist eine irreversible Aktion auf shared systems.

## GitHub Release vorbereiten

Zusätzlich zum Git-Tag: Schlage dem User einen **GitHub Release Title** und eine **Release Description** vor.

**Release Title:** `v<VERSION>: <Kurztitel>`

Beispiele:
- `v2.1.1: Bugfix für Streaming-Timeout und Health-Check-Intervall`
- `v2.2.0: RBAC und Client-Key-Management`
- `v3.0.0: OpenAI Responses API und Multi-Provider-Routing`

**Release Description:** Übernimm die `📋 Zusammenfassung` aus den Release Notes, ergänzt um:
- Link auf vollständige Release Notes: "Siehe `RELEASE_NOTES.md` für Details."
- Highlight der wichtigsten Änderung (1 Satz)
- Bei Breaking Changes: Upgrade-Hinweis direkt in die Description

## Checkliste (vor Abschluss prüfen)

- [ ] Version in `internal/httpapi/version.go` aktualisiert
- [ ] `RELEASE_NOTES.md` im Pflichtformat geschrieben
- [ ] Alle leeren Abschnitte entfernt (keine leeren Bugfix/Feature/Breaking-Blöcke)
- [ ] Datum korrekt (deutsches Format: "TT. Monat JJJJ")
- [ ] Vorgänger-Version korrekt referenziert
- [ ] QA-Checks ausgeführt und Ergebnisse eingetragen
- [ ] Geänderte Dateien vollständig aufgelistet
- [ ] Git-Befehle vorbereitet (nicht ausgeführt)
- [ ] GitHub Release Title und Description vorgeschlagen
