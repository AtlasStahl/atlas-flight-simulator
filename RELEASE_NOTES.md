# Release Notes — Atlas Flight Simulator

Format: `MAJOR.MINOR.PATCH` (Semantic Versioning). Neueste Version oben.

---

## 0.7.0 — Gelände, See und Flughafen

**Typ:** Bugfix- und Verbesserungs-Release
**Bearbeitet von:** Claude Opus 5 (GitHub Copilot)
**Anlass:** Gemeldete Symptome — „das Terrain mit den stehenden Seen" und
„das zerstreute Flughafengelände".

### 1. Gelände war gegenüber der Höhenabfrage gespiegelt — *schwerwiegend*

`PlaneGeometry` liegt in der lokalen XY-Ebene; durch `rotation.x = -PI/2` wird lokales
**+Y zu Welt −Z**. Der Terrain-Aufbau hat `position.getY()` aber als Welt-Z behandelt.
Ergebnis: Das **gerenderte Gelände war in Z gespiegelt** gegenüber `Terrain.getHeight()` —
also gegenüber Bodenkollision, Baum- und Dorfplatzierung.

Gemessen vor dem Fix:

| Position | Mesh-Höhe | `getHeight()` |
|---|---|---|
| (300, −1400) | 42,28 m | −8,60 m |
| (300, +1400) | −8,60 m | 42,28 m |
| (0, +1000) | 20,09 m | 60,98 m |
| (0, −1000) | 60,98 m | 20,09 m |

Man konnte also in sichtbar freies Gelände fliegen und trotzdem „aufsetzen", während
sichtbare Berge keine Kollision auslösten. Nach dem Fix stimmen Mesh und Höhenabfrage an
allen geprüften Punkten exakt überein.

### 2. Der See stand senkrecht statt zu liegen

Der Gerstner-Wellen-Shader rechnete auf den falschen lokalen Achsen: Er las `position.xz`
(lokales z ist bei `PlaneGeometry` immer 0) und schrieb die **Höhen**auslenkung auf lokal Y
(nach der Drehung waagerecht) und die **horizontale** Auslenkung auf lokal Z (nach der
Drehung senkrecht). Zusätzlich war die horizontale Auslenkung `sin(w) / c` mit
c = 0,0067 — also bis zu **±150 m** — während die Höhe nur `steepness` = 0,04 m betrug.

Die Wasserfläche wurde dadurch zu einem senkrechten, gekräuselten Segel neben der Bahn.

**Fix:** Wellen werden über `position.xy` ausgewertet, die Höhe liegt auf `position.z`, und
die Gerstner-Formel ist korrekt (`k = 2π/L`, `a = steepness / k`, `ω = sqrt(g·k)`). Die
Normale entsteht aus dem Kreuzprodukt der Tangenten der ausgelenkten Fläche.

### 3. Der See lag auf einem Hang statt in einer Mulde

Die Wasserfläche war eine 300 × 300 m große Platte bei (400, 300) — direkt neben der
Startbahn, quer über die Kante der flachen Flughafenzone.

**Fix:** Das Höhenfeld enthält jetzt ein echtes Seebecken bei (300, −1400): 9 m tief, mit
Uferzone und Uferwall, sauber ins umgebende Gelände geblendet. `Terrain.lake` ist die
einzige Quelle für Position, Wasserspiegel und Radius; `main.ts` baut die Wasserfläche
daraus. Der Wasserspiegel (0,4 m) liegt unter der Mindesthöhe für Bewuchs (0,5 m), deshalb
wächst nichts unter Wasser. Die Wasserlinie im Gelände liegt bewusst 60 m weiter außen als
die gerenderte Fläche — gemessene Restfreiheit zum Seegrund: 0,43 m, damit weder
Ufer-Dreiecke noch Wellentäler durch die Oberfläche stechen.

Weiter: kreisrunde Wasserfläche mit weicher Uferkante statt Quadrat, dunkler Seegrund statt
durchscheinender Wiese, und auf Binnensee-Maß reduzierte Wellenamplitude (~0,22 m statt
~0,55 m).

### 4. Flughafengelände war über die ganze Bahn verstreut

Die Gebäude standen kompakt am Ostende (x ≈ 700–1075), die **Bodenausrüstung aber entlang
der Startbahn** (x ≈ −380 bis 250): Fluggastbrücken ohne Terminal, Gate-Schilder A–D über
1 km verteilt, ein Tankwagen 1,2 km vom Terminal entfernt, Flutlichtmasten und Absperrungen
quer über das Feld. Zusätzlich war das gesamte 2000 × 400 m große Areal als Asphalt
eingefärbt.

**Fix:**

- Neues Vorfeld (Apron) als zentrale Definition in `AirportLayout.ts`; nur diese Fläche ist
  asphaltiert, der Rest des Flugplatzes ist gemähtes Grün wie in der Realität.
- Fluggastbrücken sitzen an der Terminalfront, Gate-Schilder an den zugehörigen Standplätzen.
- Tankwagen, Catering, Schlepper, Gepäckwagen, Bus und Gepäckzüge stehen auf dem Vorfeld.
- Flutlichtmasten rahmen das Vorfeld ein, Absperrungen begrenzen die Servicestraße.
- Der zweite Hangar stand bei x = 1050 **außerhalb** der flachen Zone (|x| < 1000) und damit
  am Hang; beide Hangars stehen jetzt innerhalb der Zone, die Tore zum Vorfeld.
- Rollwege verbinden Bahn, Vorfeld und Hangars passend zum neuen Layout.

### Geänderte Dateien

- `src/environment/Terrain.ts` — Z-Spiegelung, Seebecken, `lake`-Getter, Flugplatz-Grün
- `src/environment/DynamicWater.ts` — korrekte Wellenachsen und Gerstner-Formel, runde Fläche
- `src/environment/AirportLayout.ts` — Vorfeld-Definition
- `src/environment/AirportBuildings.ts` — Hangars und Rollwege
- `src/environment/AirportVehicles.ts` — Bodenausrüstung auf dem Vorfeld
- `src/main.ts` — Wasserfläche aus `terrain.lake`

### Verifikation

- `npm run build`, `npm test` (87 Tests), `npm run lint` — alle grün
- Browser: Mesh-Höhe gegen `getHeight()` an fünf Stichproben identisch; kein Gittervertex
  innerhalb der Wasserfläche über dem Spiegel (max. −0,029 m); See liegt flach in der Mulde
  mit Uferzone; Flughafen von oben als geschlossene Anlage geprüft; keine Konsolenfehler

### Bekannte, nicht behobene Punkte

- Straßen und Brücken liegen auf fester Höhe (`y = 0.05`) und folgen dem Gelände nicht.
- F-16, Su-27 und Boeing 737 beschleunigen weit über ihre konfigurierte `maxSpeed` hinaus
  (Jet-Schub ohne Geschwindigkeits- und Höhenabhängigkeit).

---

## 0.6.1 — Flugsteuerung repariert

**Typ:** Bugfix-Release
**Bearbeitet von:** Claude Opus 5 (GitHub Copilot)
**Anlass:** Gemeldete Symptome — „Beim Rollen mit der Extra 300 (A/D halten) verhält sich
das Flugzeug völlig unkontrolliert und steuert in eine falsche Richtung" sowie
„Die Cessna 172 hat zu wenig Schub für den Steigflug". Ein vorheriger Versuch mit einem
kleineren Modell (Qwen3.6-27B) konnte die Ursache nicht finden.

### Zusammenfassung

Die Steuerung war durch **zwei unabhängige Fehler in `FlightModel`** kaputt. Beide sind
behoben, mit numerischem Nachweis und Regressionstests.

### 1. Rotationsachse: Weltachse statt Körperachse — *Hauptursache*

`FlightModel` baute die Steuer-Quaternionen aus **weltraumbezogenen** Achsen
(`this._forward`, `this._right`, `this._up`), wandte sie aber per **Post-Multiplikation**
(`aircraft.quaternion.multiply(dq)`) an. Post-Multiplikation interpretiert die Achse jedoch
bereits im **Körpersystem**. Die Achse wurde dadurch doppelt transformiert.

Solange das Flugzeug waagerecht flog, waren Welt- und Körperachsen identisch und der Fehler
unsichtbar. Sobald das Flugzeug nickte oder rollte, driftete die Rollachse weg: Ein reines
Querruderkommando erzeugte Nick- und Gieranteile. Bei der Extra 300 (420 °/s Rollrate)
kippte die Steuerung dadurch schon nach ~1 s vollständig weg.

Messung bei 16° Nickwinkel und konstantem Rollkommando:

| Zeit | vorher (Weltachse) | nachher (Körperachse) |
|---|---|---|
| 0,00 s | Nick 16°, Bank 4° | Nick 16°, Bank 5° |
| 0,25 s | Nick 17°, Bank 66° | Nick 16°, Bank 80° |
| 0,50 s | Nick 38°, Bank 73° | Nick 16°, Bank 155° |
| 0,75 s | Nick 36°, Bank −18° | Nick 16°, Bank −130° |
| 1,25 s | Nick −20°, Bank −137° | Nick 16°, Bank 20° |

Vorher wanderte der Nickwinkel unkontrolliert und die Rolle blieb stecken; nachher bleibt
der Nickwinkel exakt konstant und der Bankwinkel läuft linear mit der konfigurierten Rate
durch 360°.

**Fix:** Die Steuerdrehungen verwenden jetzt die konstanten Körperachsen. Die
weltraumbezogenen Achsen werden weiterhin für die Aerodynamik (Anstellwinkel,
Auftriebsrichtung, Schubrichtung) benutzt und stammen jetzt direkt aus dem autoritativen
Quaternion statt aus dem abgeleiteten Euler-Winkel.

Derselbe Fehler steckte in der Absturzanimation von `GroundCollision` und wurde mitbehoben.

### 2. „Rolldämpfung", die das Querruder aufhob

Die vorhandene Rolldämpfung wirkte auf den **Bankwinkel** statt auf die **Rollrate** — das
ist physikalisch eine Feder, keine Dämpfung. Ihre Stärke stieg mit dem Staudruck (∝ v²).
Bei der Extra 300 überstieg sie ab ca. 80 m/s die gesamte Querruderautorität: Der
Bankwinkel lief auf ~56° hoch und **sank danach wieder ab, obwohl die Taste gehalten
wurde**. Eine Fassrolle war unmöglich.

**Fix:** Ersetzt durch echte Rollratendämpfung — das Querruderkommando ist ein
Rollraten-Sollwert, dem die Ist-Rollrate mit einer Zeitkonstante von 0,06 s folgt
(`ROLL_TIME_CONSTANT`). Das Flugzeug hält jeden Bankwinkel, rollt beliebig weit durch und
stoppt beim Loslassen innerhalb von ~0,2 s.

### 3. Cessna 172: zu wenig Schub

`maxThrust` lag bei 1300 N gegenüber 10 791 N Gewicht. Der Startlauf dauerte über 35 s und
der Steigflug war praktisch nicht möglich.

Neu ist ein **Propellermodell mit konstanter Leistung**: volle Standschubkraft bis zur
Referenzgeschwindigkeit, darüber `Schub = maxThrust × (v_ref / v)`. Das neue optionale
Konfigurationsfeld `propThrustRefSpeed` gilt nur für Propellerflugzeuge; Jets behalten
geschwindigkeitsunabhängigen Schub.

| Wert | vorher | nachher |
|---|---|---|
| Cessna `maxThrust` | 1300 N | 2600 N (Standschub, ~180 hp) |
| Cessna `propThrustRefSpeed` | — | 41 m/s (≈107 kW Vortriebsleistung) |
| Cessna Beschleunigung am Boden | ~1,1 m/s² | ~2,15 m/s² (im Browser gemessen) |
| Cessna Steigrate bei 11° Nick | ~240 ft/min | ~900–990 ft/min (im Browser gemessen) |
| Cessna Vmax im Horizontalflug | unbegrenzt ansteigend | 256 km/h |

### 4. Extra 300: unrealistische Eckwerte

`maxSpeed` stand auf 220 m/s (790 km/h) — vermutlich eine Verwechslung von Knoten und m/s.
Da `maxSpeed` die Ruderwirksamkeit skaliert (`cruiseSpeed = maxSpeed × 0,6`), war die
Querruderautorität bei realistischen Geschwindigkeiten dauerhaft gedrosselt.

| Wert | vorher | nachher |
|---|---|---|
| `maxSpeed` | 220 m/s (790 km/h) | 114 m/s (410 km/h, reale Vne) |
| `maxThrust` | 8000 N | 6500 N Standschub (~300 hp) |
| `propThrustRefSpeed` | — | 27,5 m/s (≈179 kW) |
| `maxClimbRate` (Anzeige) | 30 m/s | 16 m/s (~3200 ft/min) |
| Vmax im Horizontalflug | unbegrenzt ansteigend | 405 km/h |
| 360°-Rolle | unmöglich | ~0,9 s |

### 5. Rollen am Boden beim Rollen auf der Bahn

`FlightModel` erkannte Bodenkontakt über eine feste Schwelle `position.y <= 1.0`. Auf der
Bahn liegt die Cessna bei ~2,1 m — die Sperre griff also nie. A/D haben gleichzeitig
gelenkt (`GroundCollision`) **und** das Flugzeug um die Längsachse gekippt.

**Fix:** `FlightModel.update()` bekommt den Bodenzustand jetzt als optionalen Parameter von
`GroundCollision.taxiMode` (dem Eigentümer dieses Zustands). Die alte Höhenheuristik bleibt
als Rückfallwert erhalten.

### 6. HUD: künstlicher Horizont

- Bank und Nickwinkel wurden aus `rotation.x` / `rotation.z` gelesen. `rotation.x` ist die
  mittlere Achse der YXZ-Euler-Reihenfolge und **klappt bei ±90° Bank um**. Neu:
  `Aircraft.getBankAngle()` und `Aircraft.getPitchAngle()` lesen direkt das Quaternion und
  sind über volle 360°-Rollen stabil.
- Der Bankwinkel wurde linear geglättet, obwohl er bei ±180° springt — beim Durchrollen lief
  der Horizont rückwärts durch den gesamten Bereich. Neu: Glättung über die kürzeste
  Winkeldifferenz (wie beim Kurs bereits vorhanden).
- Die Glättungszeitkonstante für die Fluglage lag bei 0,5 s und machte den Horizont im
  Kunstflug unbrauchbar. Neu: 0,08 s.

### Geänderte Dateien

- `src/physics/FlightModel.ts` — Körperachsen für Steuerdrehungen, Rollratendämpfung,
  Propellerschubmodell, Bodenzustand als Parameter
- `src/physics/GroundCollision.ts` — Körperachse in der Absturzanimation
- `src/aircraft/AircraftConfig.ts` — `propThrustRefSpeed`, Cessna- und Extra-Werte
- `src/aircraft/Aircraft.ts` — `getBankAngle()`, `getPitchAngle()`
- `src/ui/HUD.ts` — winkelrichtige Glättung und kürzere Zeitkonstante für die Fluglage
- `src/main.ts` — gimbalfeste Fluglage ans HUD, Bodenzustand an `FlightModel`
- `test/flightBehavior.test.ts` — 6 neue Regressionstests
- `AGENTS.md` — Rotations- und Fluglagenvertrag ergänzt

### Verifikation

- `npm run build` — erfolgreich
- `npm test` — 87 Tests in 8 Dateien, alle grün (6 neue Regressionstests)
- `npm run lint` — keine Befunde
- Browser (`npm run dev`, 60 fps):
  - Extra 300: zwei durchgehende 360°-Rollen bei konstantem Nickwinkel von 14°;
    Rollstopp beim Loslassen; A rollt links, D rollt rechts
  - Nickkommando bei ~125° Bank ändert den Bankwinkel nicht
  - Cessna 172: Start, Steigflug mit ~900–990 ft/min bei 11° Nick
  - Rollen auf der Bahn lenkt, ohne das Flugzeug zu kippen
  - Künstlicher Horizont stimmt mit der gemessenen Fluglage überein
  - Drei Zyklen Menü → Flug → Kameramodus → Menü ohne Konsolenfehler

### Bekannte, nicht behobene Punkte

- F-16, Su-27 und Boeing 737 beschleunigen im Horizontalflug weit über ihre konfigurierte
  `maxSpeed` hinaus (F-16 gemessen: 2526 km/h). Ursache ist der geschwindigkeits- und
  höhenunabhängige Jet-Schub ohne Kompressibilitätswiderstand. Außerhalb des gemeldeten
  Fehlerbilds, daher bewusst nicht angefasst.
- Die Anzeige `rotateSpeed` der Cessna (158 km/h) liegt über der tatsächlichen
  Abhebegeschwindigkeit von ~133 km/h. Reiner Anzeigewert, physikalisch wirkungslos.
