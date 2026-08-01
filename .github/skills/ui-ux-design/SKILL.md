---
name: ui-ux-design
description: Verwende dieses Skill, wenn du UI-Komponenten, Layouts, Formulare, Navigation oder komplette Interaktionsflüsse (Web/Mobile/Desktop) implementierst oder refaktorierst. Fokus: Rams’ „Weniger, aber besser“ – nützlich, verständlich, unaufdringlich, ehrlich, langlebig und barrierefrei.
---

# UI/UX Design Skill (Rams-first) für GitHub Copilot Coding Agent

## Zielbild
Baue Interfaces, die **Aufgaben schnell, sicher und angenehm** lösen – mit **maximaler Klarheit** und **minimaler Ablenkung**.

**Leitmotiv:** *Less, but better.* („So wenig Design wie möglich“ = so wenig **Ballast** wie möglich, nicht „kalt“ oder „leer“.)

## Wann aktiv anwenden
- Neue Screens, Seiten, Dialoge, Widgets, Formulare, Tabellen, Dashboards
- Redesign/Refactor von UX-Flows (z. B. Checkout, Angebotskalkulation, Stammdaten, Suche)
- Jede Änderung, die Informationsarchitektur, Interaktion, Microcopy, States oder Accessibility betrifft

---

# A. Rams-Prinzipien → Software-UI Regeln (direkt anwendbar)

> Nutze diese Regeln als harte Leitplanken beim Schreiben von UI-Code.

## 1) Innovativ – aber niemals Selbstzweck
- Nutze neue Patterns/Animation/Tech nur, wenn sie **messbar**: schneller, verständlicher, fehlerärmer oder zugänglicher macht.
- Bevorzuge etablierte UI-Standards, außer ein neues Pattern löst ein konkretes Problem besser.

**Code-Implikation**
- Kein „Custom UI“ ohne klaren Nutzen. Nutze Framework-/Design-System-Komponenten, wenn vorhanden.

## 2) Nützlich (brauchbar) = Hauptaufgabe dominiert
- Pro Screen **eine** Hauptaufgabe + **eine** klare Primäraktion.
- Sekundäres: nachrangig, optional, in Sektionen/Accordion/Overflow.

**Code-Implikation**
- Reduziere Optionen. Nutze progressive disclosure statt alles gleichzeitig zu zeigen.

## 3) Ästhetik dient Orientierung
- Ästhetik ist nicht Deko – sie macht Information **scanbar**.
- Hierarchie durch: **Spacing, Typografie, Gruppierung, Kontrast**.

**Code-Implikation**
- Verwende ein konsistentes Spacing-System (z. B. 4/8px Raster).
- Keine visuellen „Schreier“ (zu viele Akzente, Rahmen, Badges).

## 4) Verständlich ohne Erklärung
- UI muss beantworten: **Was sehe ich? Was kann ich tun? Was passiert dann?**
- Labels > Icons (Icons nur mit Label/Tooltip).

**Code-Implikation**
- Immer sichtbare Feld-Labels (keine Placeholder-only Labels).
- Navigation/Buttons mit eindeutiger Sprache (kein „OK“ ohne Kontext).

## 5) Unaufdringlich (Tool-Charakter)
- UI tritt zurück: keine unnötigen Modals, Popups, Autoplay, aggressive Animationen.
- Notifications: selten, relevant, abschaltbar.

**Code-Implikation**
- Modals nur für irreversible/gefährliche Aktionen oder fokussierte Pflicht-Entscheidungen.
- Animationen nur für Orientierung (z. B. sanfte Transitions), niemals als Selbstzweck.

## 6) Ehrlich (keine Dark Patterns)
- Keine versteckten Kosten/Schritte, keine manipulatives Wording, kein „Opt-out verstecken“.
- Status korrekt: *loading ≠ done*, *gespeichert ≠ gesendet*, *lokal ≠ serverseitig*.

**Code-Implikation**
- Klare Zustandsanzeigen, klare Konsequenzen, Undo wo sinnvoll.
- Consent/Tracking nur transparent und granular.

## 7) Langlebig
- Vermeide Modeeffekte. Nutze zeitlose Patterns, stabile Struktur, robuste Komponenten.
- Konsistenz über das Produkt ist wichtiger als „einmalig schönes“ UI.

**Code-Implikation**
- Komponenten wiederverwendbar, themable, mit klaren Props/Contracts.
- Keine hardcodierten Pixel-Layouts ohne Responsiveness.

## 8) Gründlich bis ins Detail
- Jede Interaktion hat States: **Default, Hover, Active, Focus, Disabled, Loading, Success, Error, Empty**.
- Fehlermeldungen helfen: *was*, *warum*, *wie lösen*.

**Code-Implikation**
- Implementiere State-Matrix vollständig (siehe Abschnitt C).
- Fokus sichtbar, Tastatur vollständig nutzbar.

## 9) Ressourcen- & Aufmerksamkeits-schonend
- Performance ist UX. Vermeide schwere UI, unnötige Daten, übermäßige Effekte.
- Reduziere „visual pollution“: Overlays, Badges, „attention traps“.

**Code-Implikation**
- Lazy-load schwere Inhalte. Vermeide unnötige Re-Renders.
- Bilder/Assets optimieren; keine großen Hintergrundvideos o. Ä.

## 10) So wenig Design wie möglich
- Entferne alles, was keinen Nutzwert hat.
- Weniger Optionen, weniger Schritte, weniger Lärm – **mehr Klarheit**.

**Code-Implikation**
- Default-Werte, sinnvolle Voreinstellungen, Autocomplete – aber jederzeit korrigierbar.
- Progressive disclosure statt „Alles auf einen Screen“.

---

# B. UI/UX Mindeststandards, die du IM CODE liefern musst

## 1) Informationsarchitektur & Hierarchie
- **1 Primary Action** pro Screen (visuell eindeutig).
- Überschriften strukturieren, Inhalte in 3–5 klaren Gruppen.
- Wichtige Infos oben; sekundäre nach unten oder in Tabs/Accordion.

## 2) Microcopy (UX Writing) – Regeln
- Buttons = Verb + Objekt: „Angebot speichern“, „PDF exportieren“, „Position hinzufügen“.
- Fehlertexte: freundlich, konkret, lösungsorientiert (keine Schuldzuweisung).
- Hilfetexte sind kurz und neben dem Feld (nicht in langen Tooltips verstecken).

## 3) Feedback & Status (Systemstatus ist Pflicht)
- Loading: Skeleton/Spinner mit eindeutiger Aussage, was geladen wird.
- Success: ruhig (Toast/Inline), kein modal „Erfolg“-Popup.
- Error: Inline nahe Ursache + optional Zusammenfassung oben.
- Undo/Retry, wo sinnvoll.

## 4) Accessibility (A11y) – nicht verhandelbar
- Semantisches Markup (Buttons, Labels, Headings).
- Tastaturbedienung vollständig; Fokus sichtbar.
- Kontrast ausreichend; Information nie nur über Farbe.
- Touch Targets groß genug (Mobile).
- ARIA nur wenn nötig und korrekt.

## 5) Responsiveness & Dichte
- Layout muss bei kleinen Screens/Zoom funktionieren.
- Inhalt geht vor Deko. Kein horizontales Scrollen für Kernaufgaben.

---

# C. Implementierungs-Checklisten (für den Agenten vor „final answer“)

## C1: Screen-Checklist (jede neue Seite / jeder Flow)
- [ ] Hauptaufgabe in 1 Satz klar
- [ ] Primäraktion eindeutig; sekundäre Aktionen visuell zurückhaltend
- [ ] Logische Gruppierung, klare Überschriften
- [ ] Vollständige State-Matrix: loading/success/error/empty
- [ ] Microcopy eindeutig (keine generischen Labels)
- [ ] Keyboard + Fokus + Labels + Kontrast geprüft
- [ ] Keine Dark Patterns / keine irreführenden Defaults
- [ ] Performance: keine unnötigen großen Daten/Assets

## C2: Component-Checklist (jede neue Komponente)
- [ ] API klar (Props), kontrollierbar, testbar
- [ ] Semantik korrekt (button vs. div)
- [ ] Disabled/Loading korrekt (auch für Screenreader)
- [ ] Focus-Styles sichtbar; Tab-Reihenfolge logisch
- [ ] Fehlerzustände: inline + erklärend
- [ ] Styling über Tokens/Theme statt hardcoded (wenn im Projekt vorhanden)

## C3: Form-Checklist (Formulare sind UX-Kern)
- [ ] Label immer sichtbar; Placeholder nur als Beispiel
- [ ] Inline-Validierung mit hilfreicher Message
- [ ] Pflichtfelder klar (und nicht nur über Farbe)
- [ ] „Enter“ sendet nur, wenn sinnvoll; sonst verhindert
- [ ] Speichern: klare Bestätigung; „dirty state“ sichtbar (z. B. „Ungespeichert“)
- [ ] Fehlersumme oben + Fokus auf erstes fehlerhaftes Feld

## C4: Tabellen & Listen (Business-Apps)
- [ ] Spalten: klare Überschrift, sinnvolle Alignment (Zahlen rechts)
- [ ] Sort/Filter klar sichtbar, nicht versteckt
- [ ] Empty State erklärt, wie man Daten bekommt (Filter leeren, Import, etc.)
- [ ] Zeilenaktionen nicht überladen: wichtigste sichtbar, Rest im Overflow
- [ ] Pagination/Virtualization, wenn groß

---

# D. Anti-Patterns (vermeiden) + bessere Alternativen

- **Feature-Überladung** → progressive disclosure, klare Defaults, „weniger Optionen“
- **Zu viele Akzentfarben/Badges** → Hierarchie über Typo/Spacing statt „Lärm“
- **Modal-Kaskaden** → Inline-Flow, Drawer, oder Fokusbereich statt Popup-Spam
- **Generische Buttons („OK“, „Weiter“)**
  → spezifische Verben („Speichern“, „Senden“, „Zurücksetzen“)
- **Placeholder als Label** → echte Labels + Helper Text
- **Nur Farbe als Signal** → Icon/Text + ARIA + Kontrast
- **Fake-Ladezustände / irreführender Progress** → echter Status, echte Dauer

---

# E. Quellen (Primär)
- Rams Foundation – „10 Thesen zum guten Design“ (Fassung von 2002): https://rams-foundation.org/die-stiftung/designverstandnis/thesen/
- Vitsœ – „Ten principles for good design“ (offizielle Darstellung): https://www.vitsoe.com/eu/about/good-design
- Vitsœ – „Design by Vitsœ“ (Rede, Dez. 1976; PDF): https://www.vitsoe.com/files/assets/1000/17/VITSOE_Dieter_Rams_speech.pdf
- Vitra Design Museum / design-museum.de – Interview mit Dieter Rams (Mateo Kries): https://www.design-museum.de/en/ueber-design/interviews/detailseiten/interview-dieter-rams.html
