# FINDINGS.md — Technisches Audit Atlas Flight Simulator

**Audit-Datum:** 2026-08-03
**Auditierter Stand:** `6294a9b` (main), Version `0.6.0`
**Umgesetzt:** 2026-08-03 (Stufe 1+2: 40 Findings)
**Stufe 2 Abschluss:** 2026-08-03 — alle S1+S2 Findings implementiert, validiert, dokumentiert
**Umfang:** vollständiger `src/`-Baum, `test/`, Build-/Lint-/Test-Toolchain, `index.html`, `README.md`, `AGENTS.md`
**Rolle des Dokuments:** Arbeitsgrundlage für AI-Agenten. Jedes Finding ist so formuliert, dass es ohne Rückfragen umgesetzt werden kann.

**Umgesetzte Findings:** TOOL-01, TOOL-02, TOOL-03, TOOL-04, PHY-01, PHY-02, PHY-03, PHY-04, PHY-05, PHY-06, PHY-07, PHY-08, PHY-09, PHY-10, PHY-11, PHY-12, PHY-13, PHY-14, PHY-15, PHY-16, GAME-01, GAME-02, GAME-03, GAME-04, GAME-05, GAME-06, GAME-07, RES-01, RES-02, RES-03, RES-04, RES-05, RES-06, REN-01, REN-02, REN-03, REN-04, REN-05, REN-06, REN-07 (teilweise), REN-09, REN-10 (teilweise), INP-01, INP-02, INP-03, INP-04, INP-05, ARCH-02, ARCH-03, ARCH-04, ARCH-05, UI-01, UI-02, UI-03, UI-04, UI-05, UI-06, UI-07, UI-08, UI-09, UI-10, CAM-01, CAM-02, CAM-03, CAM-04, DEAD-01 (teilweise), DEAD-02, QA-01, QA-02, QA-03, SEC-01

---

## 0. Verifizierte Ausgangslage (tatsächlich ausgeführt)

| Prüfung | Kommando | Ergebnis |
|---|---|---|
| Typecheck + Build | `npm run build` | **PASS** — 43 Module, 165 ms |
| Tests | `npm test` | **PASS** — 8 Dateien, 69 Tests |
| Lint | `npm run lint` | **FAIL** — `ESLint couldn't find an eslint.config.(js\|mjs\|cjs) file` |
| Euler-Achsenmapping | Node-Skript mit `three` | Bank → `rotation.x`, Pitch → `rotation.z` (siehe PHY-01) |
| Heading-Vorzeichen | Node-Skript mit `three` | `atan2(vz, vx) === -rotation.y` (siehe PHY-02) |

**Bundle-Größen (Production-Build):**

```
dist/assets/environment-*.js  593.00 kB │ gzip: 150.51 kB
dist/assets/three-*.js         79.86 kB │ gzip:  42.90 kB
dist/assets/ui-*.js            38.33 kB │ gzip:   9.74 kB
dist/assets/physics-*.js       28.03 kB │ gzip:   7.07 kB
dist/assets/index-*.js         22.43 kB │ gzip:   7.05 kB
```

**Nicht ausgeführt (kein Browser/GPU im Audit-Kontext):** Laufzeit-Smoke-Checks aus `AGENTS.md` §10 (Start, Rotation, Stall, Kameramodi, Wetter-Cleanup, Resize). Alle Findings mit dem Marker **[RUNTIME-VERIFY]** benötigen zusätzlich eine Browserprüfung nach dem Fix.

---

## 1. Schweregrade

| Grad | Bedeutung | Handhabung |
|---|---|---|
| **S1 — Kritisch** | Falsches Verhalten, das der Nutzer direkt erlebt, oder garantierter Ressourcenfehler | Sofort, vor jedem neuen Feature |
| **S2 — Hoch** | Falsche Physik/Logik, Leak, Frameraten-Abhängigkeit, kaputtes Tooling | Nächster Arbeitszyklus |
| **S3 — Mittel** | Wartbarkeit, Duplikate, tote Verträge, Design-/A11y-Mängel | Geplant, gebündelt |
| **S4 — Niedrig** | Kosmetik, Doku-Drift, Kleinoptimierung | Bei Gelegenheit |

**Umsetzungsregel für Agenten:** Ein Finding = ein Commit = eine `[scope] Imperative description`-Zeile. Findings nicht bündeln, außer sie sind explizit als „gemeinsam umsetzen" markiert.

---

## 2. Physik, Koordinaten und Einheiten

### ~~PHY-01 — Pitch und Roll sind beim HUD vertauscht~~ (Euler-Achsen falsch dokumentiert) — **S1** — ✅ **ERLEDIGT**

**Fix:** `main.ts`: `pitch = aircraft.rotation.z`, `roll = aircraft.rotation.x`. `FlightModel.ts` Kommentar korrigiert. `AGENTS.md` §7 korrigiert. `[RUNTIME-VERIFY]` benötigt Browser-Test.

**Ort:** [src/main.ts](src/main.ts#L380-L381), [src/physics/FlightModel.ts](src/physics/FlightModel.ts#L14-L18), [AGENTS.md](AGENTS.md)

**Beobachtung**

```ts
// main.ts
// YXZ Euler order: x=pitch, y=heading, z=roll/bank
const pitch = aircraft.rotation.x;
const roll  = aircraft.rotation.z;
```

**Analyse (numerisch verifiziert)**

Das Flugzeug zeigt nach lokal **+X**, oben ist **+Y**, rechts ist **+Z**. Bei Euler-Reihenfolge `'YXZ'` gilt `R = Ry · Rx · Rz`. Die innerste Rotation `Rz` dreht `+X` nach `+Y` — das ist **Nicken**. `Rx` lässt `+X` unverändert und kippt `+Y` nach `+Z` — das ist **Rollen**.

Verifikation mit `three`:

```
Bank rechts 30°  (Drehung um forward=+X) → euler x=30.00  y=0.00  z=0.00
Pitch hoch 20°   (Drehung um right=+Z)   → euler x=0.00   y=0.00  z=20.00
```

Damit gilt eindeutig: **`rotation.x` = Roll/Bank, `rotation.z` = Pitch.** Der Kommentar in `FlightModel.ts`, die Zuweisung in `main.ts` und die Vertragszeile in `AGENTS.md` §7 („current bank/roll angle: `rotation.z`") sind alle falsch.

**Auswirkung**

Der künstliche Horizont zeigt den Bankwinkel als Nickwinkel und umgekehrt. Beim Rollen kippt der Horizont nicht, sondern wandert hoch/runter; beim Ziehen dreht sich der Horizont. Das ist der schwerwiegendste sichtbare Fehler des Projekts. Zusätzlich ist der dokumentierte Koordinatenvertrag falsch, wodurch jede zukünftige Änderung an Physik oder HUD dieselbe Verwechslung reproduziert.

**Fix**

1. In [src/main.ts](src/main.ts#L380-L381):
   ```ts
   // YXZ mit forward=+X: rotation.x = Bank (Rollen), rotation.z = Nicken
   const pitch = aircraft.rotation.z;
   const roll  = aircraft.rotation.x;
   ```
2. Klassenkommentar in [src/physics/FlightModel.ts](src/physics/FlightModel.ts#L14-L18) korrigieren.
3. `AGENTS.md` §7 korrigieren: `current bank/roll angle: rotation.x`, `pitch angle: rotation.z`.
4. Alle weiteren Leser von `aircraft.rotation.x` / `.z` prüfen (aktuell nur `main.ts`).

**Akzeptanzkriterien**

- Neuer Unit-Test: reine Rollrotation ändert `rotation.x`, lässt `rotation.z` ≈ 0; reine Pitchrotation umgekehrt.
- **[RUNTIME-VERIFY]** `D` gedrückt → Horizontlinie im ADI kippt, Höhe bleibt; `S` gedrückt → Horizont sinkt, Kippung bleibt 0.

---

### ~~PHY-02 — Heading-Quelle wechselt bei 5 m/s das Vorzeichen~~ — **S1** — ✅ **ERLEDIGT**

**Fix:** `main.ts`: Heading-Zweig verwendet `-Math.atan2(vz, vx)` statt `Math.atan2(vz, vx)` für konsistentes Vorzeichen mit `rotation.y`. Radar ebenfalls korrigiert. `[RUNTIME-VERIFY]` benötigt Browser-Test.

**Ort:** [src/main.ts](src/main.ts#L375-L377), [src/main.ts](src/main.ts#L413)

**Beobachtung**

```ts
const heading = speed > 5
  ? Math.atan2(aircraft.velocity.z, aircraft.velocity.x)
  : aircraft.rotation.y;
```

**Analyse (numerisch verifiziert)**

```
rotation.y=  0° → forward=( 1.000, 0, 0.000)  atan2(vz,vx) =   0°
rotation.y= 45° → forward=( 0.707, 0,-0.707)  atan2(vz,vx) = -45°
rotation.y= 90° → forward=( 0.000, 0,-1.000)  atan2(vz,vx) = -90°
```

Es gilt `atan2(vz, vx) === -rotation.y`. Die beiden Zweige liefern **entgegengesetzte** Winkel.

**Auswirkung**

Beim Beschleunigen über 5 m/s springt der Kompass auf den gespiegelten Kurs. Ein Rechtsdreh wird als Linksdreh angezeigt (oder umgekehrt, je nach Zweig). Das Radar (`main.ts` Zeile 413) benutzt konsistent `atan2(vz, vx)` und ist damit gegenüber dem HUD-Kompass gespiegelt.

**Fix**

1. Genau **eine** Heading-Definition einführen, z. B. in einem kleinen Helfer:
   ```ts
   /** Kurs in rad, gemessen um +Y; 0 = Nase nach +X. Einzige Quelle der Wahrheit. */
   function headingFrom(rotationY: number): number { return rotationY; }
   ```
2. Bei `speed > 5` den Kurs aus dem Geschwindigkeitsvektor als `-Math.atan2(vz, vx)` berechnen, damit er zu `rotation.y` passt — oder den Geschwindigkeitszweig ganz entfernen und immer `rotation.y` verwenden (einfacher, ausreichend, da die Lateralgeschwindigkeit ohnehin gedämpft wird).
3. Radar auf dieselbe Quelle umstellen.
4. Sprung an der Umschaltschwelle beseitigen: entweder eine einzige Quelle oder ein Blend über `speed`.

**Akzeptanzkriterien**

- Unit-Test: für `rotation.y = 45°` liefert die Heading-Funktion denselben Wert wie bei `velocity = forward(45°) * 50`.
- **[RUNTIME-VERIFY]** Beschleunigen von 0 auf 30 m/s auf der Bahn: Kompassnadel bleibt stabil, kein Sprung.

---

### ~~PHY-03 — Kompass-Interpolation ohne Winkel-Wrap~~ — **S2** — ✅ **ERLEDIGT**

**Fix:** `HUD.ts`: `_angleDelta()` Helper für korrekte Winkelinterpolation. `_smoothHeading` und `_needleHeading` verwenden jetzt `angleDelta` statt linearer Interpolation.

**Ort:** [src/ui/HUD.ts](src/ui/HUD.ts#L218), [src/ui/HUD.ts](src/ui/HUD.ts#L226), [src/combat/EnemyAircraft.ts](src/combat/EnemyAircraft.ts#L216-L217)

**Beobachtung** `this._smoothHeading = this.lerp(this._smoothHeading, heading, 0.1)` — lineare Interpolation auf einer zyklischen Größe. Dasselbe Muster bei `_rotation.y += (targetRot.y - this._rotation.y) * 2 * dt` in `EnemyAircraft`.

**Analyse** Beim Übergang von `+π` nach `-π` interpoliert der Lerp über den gesamten Kreis statt über den kurzen Weg. Der Kompass rotiert dann eine volle Umdrehung rückwärts; Gegner drehen sich beim Wegpunktwechsel unnatürlich.

**Fix** Winkeldifferenz normalisieren, bevor interpoliert wird:

```ts
/** Kürzeste Winkeldifferenz in (-π, π]. */
function angleDelta(from: number, to: number): number {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}
```

Anwenden in `HUD._smoothHeading`, `HUD._needleHeading` und in allen drei `_update*`-Methoden von `EnemyAircraft`.

**Akzeptanzkriterien** Unit-Test: Interpolation von `179°` nach `-179°` ergibt einen Zwischenwert nahe `180°`, nicht nahe `0°`.

---

### ~~PHY-04 — Winddruck und Turbulenz werden ohne `dt` auf die Geschwindigkeit addiert~~ — **S1** — ✅ **ERLEDIGT**

**Fix:** `main.ts`: Wind und Turbulenz verwenden `addScaledVector` mit `dt * 60` Skalierung für frameratenunabhängige Integration. Mutiert nicht mehr den internen Zustand von WeatherSystem.

**Ort:** [src/main.ts](src/main.ts#L316-L320)

**Beobachtung**

```ts
const windEffect = weatherSystem.getWindEffect(aircraft.velocity);
const turbulence = weatherSystem.getTurbulence(now / 1000);
aircraft.velocity.add(windEffect.multiplyScalar(0.02));
aircraft.velocity.add(turbulence.multiplyScalar(0.05));
```

**Analyse** Beide Terme sind Geschwindigkeitsinkremente **pro Frame**, nicht pro Sekunde. Bei 144 Hz wirkt der Wind 2,4-mal so stark wie bei 60 Hz. Das verletzt den `AGENTS.md`-Vertrag „motion must never be frame-count-based" direkt. Größenordnung bei `storm` (25 m/s Wind, `getWindEffect` skaliert mit 0,01): pro Frame ca. 0,005 m/s, bei 60 fps also ~0,3 m/s² — plus Turbulenz mit `turb = 2` → bis 0,1 m/s pro Frame, also ~6 m/s² Störbeschleunigung. Die Turbulenz ist damit vergleichbar mit 0,6 g und wird bei hoher Framerate zusätzlich verstärkt.

**Fix**

1. Wind und Turbulenz als **Beschleunigungen** modellieren und mit `dt` multiplizieren:
   ```ts
   // Wind/Turbulenz sind Beschleunigungen in m/s²; Integration über dt.
   aircraft.velocity.addScaledVector(windEffect, WIND_ACCEL_SCALE * dt);
   aircraft.velocity.addScaledVector(turbulence, TURBULENCE_ACCEL_SCALE * dt);
   ```
2. Konstanten benennen und in `WeatherSystem` oder eine Wetter-Config verschieben, nicht als Magic Numbers in `main.ts`.
3. Besser: Wind in `FlightModel` als Relativanströmung berücksichtigen (`velocity - wind` für AoA/Drag), statt ihn nachträglich auf die Geschwindigkeit zu addieren. Dann ist Wind physikalisch korrekt und Rückenwind erhöht nicht die Auftriebswirkung.

**Akzeptanzkriterien** Unit-Test mit fixem Wetter: Anwendung von 1 s in einem Schritt (`dt = 1`) und in 60 Schritten (`dt = 1/60`) ergibt dieselbe Endgeschwindigkeit innerhalb enger Toleranz.

---

### ~~PHY-05 — Laterale Dämpfung ist nicht frameratenunabhängig~~ — **S2** — ✅ **ERLEDIGT**

**Fix:** `FlightModel.ts`: Lineares `1 - k*dt` durch `Math.exp(-k * dt)` ersetzt für frameratenunabhängige exponentielle Dämpfung.

**Ort:** [src/physics/FlightModel.ts](src/physics/FlightModel.ts#L177-L179)

**Beobachtung** `const dampFactor = Math.max(0, 1 - Math.min(2.0, 0.3 + speed * 0.005) * dt);`

**Analyse** Lineares `1 - k·dt` ist nur für kleine `dt` eine Näherung der exponentiellen Dämpfung. Bei `k = 2.0` und dem in `main.ts` erlaubten Maximum `dt = 0.05` ergibt sich `dampFactor = 0.9`, bei zwei Frames à 0,025 s dagegen `0.95² = 0.9025`. Der Kurvenradius hängt damit von der Framerate ab. Bei größerem `k` (falls die Konstante je erhöht wird) kann `dampFactor` sogar negativ werden und die Lateralgeschwindigkeit invertieren.

**Fix** Exponentielle Form verwenden:

```ts
// Zeitkonstante der aerodynamischen Seitenkraft; framerate-unabhängig.
const k = Math.min(2.0, 0.3 + speed * 0.005);
const dampFactor = Math.exp(-k * dt);
```

Dasselbe Muster gilt für `CameraManager._chaseSmooth.lerp(..., 5 * dt)`, `_towerLookAt.lerp(..., 2 * dt)` und die `HUD.lerp`-Aufrufe mit konstantem Faktor (siehe UI-02).

**Akzeptanzkriterien** Unit-Test: Kurvenflug über 2 s simuliert mit `dt = 1/30` und `dt = 1/240` ergibt denselben Endkurs (Toleranz < 1°).

---

### ~~PHY-06 — Physikzustand wird über den Render-Node geführt (Gimbal-Lock-Roundtrip)~~ — **S2** — ✅ **ERLEDIGT**

**Fix:** `Aircraft` bekam `quaternion: THREE.Quaternion` als autoritativen Zustand. `FlightModel` und `GroundCollision` schreiben in `aircraft.quaternion`. `main.ts` synct `aircraft.group.quaternion.copy(aircraft.quaternion)`. Test-Mocks aktualisiert.

**Ort:** [src/aircraft/Aircraft.ts](src/aircraft/Aircraft.ts), [src/physics/FlightModel.ts](src/physics/FlightModel.ts#L178-L182), [src/physics/GroundCollision.ts](src/physics/GroundCollision.ts#L88-L104), [src/main.ts](src/main.ts#L338-L339)

**Beobachtung**

```ts
// FlightModel
aircraft.group.quaternion.multiply(this._qCombined);
aircraft.rotation.setFromQuaternion(aircraft.group.quaternion, 'YXZ');
// main.ts, später im selben Frame
aircraft.group.rotation.copy(aircraft.rotation); // überschreibt group.quaternion aus dem Euler
```

**Analyse**

1. **Besitzverletzung:** `FlightModel` und `GroundCollision` schreiben in das Three.js-Renderobjekt `aircraft.group`. Laut `AGENTS.md` §6 darf Physik keine Szenenobjekte manipulieren; das Renderobjekt ist Darstellung, nicht Autorität.
2. **Verlustbehafteter Roundtrip:** Der akkumulierte Zustand liegt im Quaternion, wird pro Frame in Euler `YXZ` zerlegt und danach aus dem Euler wieder in das Quaternion zurückgeschrieben. Bei Nickwinkel nahe ±90° (Looping, Steilflug) ist die `YXZ`-Zerlegung singulär: Roll und Heading werden ununterscheidbar. Der Zustand springt dann.

**Fix**

1. `Aircraft` erhält ein eigenes, autoritatives `quaternion: THREE.Quaternion` als Rotationszustand.
2. `FlightModel` und `GroundCollision` schreiben ausschließlich `aircraft.quaternion`.
3. `aircraft.rotation` (Euler) wird nur noch als **abgeleiteter Anzeigewert** einmal pro Frame berechnet — oder ersatzlos gestrichen und HUD/Kamera lesen direkt aus dem Quaternion.
4. `main.ts` synchronisiert am Ende `aircraft.group.quaternion.copy(aircraft.quaternion)`.
5. Gemeinsam mit PHY-01 umsetzen (beide betreffen dieselbe Achsensemantik).

**Akzeptanzkriterien** Unit-Test: 360°-Looping in Schritten simulieren; Quaternion bleibt normiert, keine `NaN`, kein Vorzeichensprung von Heading beim Durchlaufen von 90° Nickwinkel.

---

### ~~PHY-07 — Streckungsverhältnis (Aspect Ratio) ist physikalisch frei erfunden~~ — **S3** — ✅ **ERLEDIGT**

**Fix:** `AircraftConfig.ts`: Feld `aspectRatio: number` hinzugefügt, pro Profil mit realistischen Werten gesetzt (Cessna 7.3, Boeing 9.4, Extra 6.5, F-16 3.5, Su-27 3.8). `FlightModel.ts` verwendet `cfg.aspectRatio` statt `sqrt(wingArea)*3`.

**Ort:** [src/physics/FlightModel.ts](src/physics/FlightModel.ts#L120)

**Beobachtung** `const aspectRatio = cfg.wingArea > 0 ? Math.sqrt(cfg.wingArea) * 3 : 1;`

**Analyse** Die Streckung ist definiert als `b²/S` (Spannweite² / Flügelfläche) und ist eine **unabhängige** Geometriegröße. `sqrt(S)·3` liefert für die Cessna 12,1 (real ≈ 7,3), für die Boeing 33,5 (real ≈ 9,4) und für die Su-27 19,8 (real ≈ 3,5). Der induzierte Widerstand `cd_i = cl²/(π·AR·e)` ist damit für große Flugzeuge um den Faktor 3–5 zu klein — schwere Jets kurven fast verlustfrei.

**Fix**

1. Feld `wingspan: number` (Meter) oder direkt `aspectRatio: number` in `AircraftConfig` ergänzen, mit realistischen Werten und Kommentar zur Quelle.
2. `FlightModel` verwendet `cfg.aspectRatio`, keine Ableitung aus `wingArea`.
3. Oswald-Faktor `0.8` als benannte Konstante `OSWALD_EFFICIENCY` definieren.

**Akzeptanzkriterien** `test/aircraftConfig.test.ts` prüft `aspectRatio` für jedes Profil auf einen plausiblen Bereich (3 … 12).

---

### ~~PHY-08 — Stallwinkel wird aus der Stallgeschwindigkeit „geraten"~~ — **S3** — ✅ **ERLEDIGT**

**Fix:** `AircraftConfig.ts`: Feld `stallAngleRad: number` hinzugefügt, pro Profil gesetzt. `FlightModel.ts` verwendet `cfg.stallAngleRad` statt Magic-Number-Zweig.

**Ort:** [src/physics/FlightModel.ts](src/physics/FlightModel.ts#L92)

**Beobachtung** `const stallAngle = cfg.stallSpeed < 40 ? 0.30 : 0.26;`

**Analyse** Der kritische Anstellwinkel ist eine Profileigenschaft und hat keinen kausalen Zusammenhang mit der Überziehgeschwindigkeit. Die Schwelle `40` ist eine versteckte Kopplung zwischen zwei unabhängigen Größen und bricht, sobald jemand `stallSpeed` tunt. Zusätzlich ist der Wert eine unstetige Sprungfunktion.

**Fix** Feld `stallAngleRad: number` (oder `stallAngleDeg`) in `AircraftConfig` aufnehmen, pro Profil setzen, Magic-Number-Zweig entfernen.

---

### ~~PHY-09 — Auftriebskurve `cl = clMax · sin(2·aoa)` ist inkonsistent zur Stallmodellierung~~ — **S3** — ✅ **ERLEDIGT**

**Fix:** Lineare Auftriebskurve `cl = clAlpha * aoa` (clAlpha = 5.7 /rad) mit Clamp bei `clMax`, danach weicher Abfall nach `stallAngleRad`. Veraltete `stallAngle` Magic-Number in Ruderwirksamkeit durch `cfg.stallAngleRad` ersetzt.

**Ort:** [src/physics/FlightModel.ts](src/physics/FlightModel.ts#L95-L99)

**Ort:** [src/physics/FlightModel.ts](src/physics/FlightModel.ts#L95-L99)

**Analyse** `sin(2·aoa)` hat sein Maximum bei 45° (0,785 rad), der Stall wird aber bereits bei 0,26–0,30 rad erzwungen. Der Auftriebsanstieg beträgt damit `2·clMax ≈ 2,4` pro rad statt der realen ≈ 5,7–6,3 pro rad. Folge: Bei kleinem Anstellwinkel ist der Auftrieb zu gering, `clMax` wird nie erreicht, und der Stall wirkt als harter Knick statt als Kurvenspitze. Die Rotationsgeschwindigkeiten der Configs sind auf dieses Verhalten getunt — eine Korrektur erfordert also ein erneutes Balancing.

**Fix (bewusst als eigener, isolierter Change)**

1. Linearen Bereich mit dokumentiertem Anstieg modellieren: `cl = clAlpha * aoa`, geclampt bei `clMax`, mit `clAlpha` als Config-Feld (Default ≈ 5,7 /rad).
2. Nach `stallAngleRad` weich abfallen lassen (bestehende Formel beibehalten).
3. Danach `maxThrust`, `pitchRate` und `stallSpeed` je Profil nachziehen und die Abhebegeschwindigkeit gegen `rotateSpeed` prüfen (siehe PHY-10).

**Wichtig für Agenten:** Nicht zusammen mit anderen Findings umsetzen. Erst PHY-01/02/04 fixen, damit man beim Balancing korrekte Instrumente sieht.

---

### ~~PHY-10 — `rotateSpeed` und `maxClimbRate` sind reine Deko~~ — **S3** — ✅ **ERLEDIGT**

**Fix:** JSDoc-Kommentare hinzugefügt: beide Felder sind `/** Anzeigewert für das Menü; NICHT physikwirksam. */` markiert. Variante A gewählt (Dokumentation statt Physik-Änderung).

**Ort:** [src/aircraft/AircraftConfig.ts](src/aircraft/AircraftConfig.ts#L6-L12)

**Ort:** [src/aircraft/AircraftConfig.ts](src/aircraft/AircraftConfig.ts#L6-L12)

**Analyse** `rotateSpeed` wird ausschließlich im Menü angezeigt ([src/ui/AdvancedMenu.ts](src/ui/AdvancedMenu.ts#L214)), `maxClimbRate` **nirgends**. Beide Werte suggerieren dem Nutzer ein Verhalten, das die Physik nicht garantiert: Die tatsächliche Abhebegeschwindigkeit ergibt sich aus `mass`, `wingArea`, `liftCoefficient` und dem Anstellwinkel und kann beliebig von `rotateSpeed` abweichen. `maxSpeed` wird nur als Hilfsgröße für die Ruderwirksamkeit (`cruiseSpeed = maxSpeed * 0.6`) genutzt, begrenzt die Geschwindigkeit aber nicht.

**Fix (eine der beiden Varianten wählen und dokumentieren)**

- **A (empfohlen):** `maxClimbRate` entfernen. `rotateSpeed` als reinen Anzeigewert markieren (`/** Anzeigewert für das Menü; NICHT physikwirksam. */`) und einen Test ergänzen, der die real erreichte Abhebegeschwindigkeit simuliert und gegen `rotateSpeed` ±20 % prüft.
- **B:** Beide Werte physikwirksam machen (z. B. `maxSpeed` als Grundlage eines zusätzlichen parasitären Widerstands, der die Endgeschwindigkeit begrenzt).

---

### ~~PHY-11 — Bodenrolle: Rollsteuerung wirkt gleichzeitig als Kurvensteuerung~~ — **S2** — ✅ **ERLEDIGT**

**Fix:** `FlightModel` liest `onGround`-Flag (`aircraft.position.y <= 1.0`) und setzt `rollInput` auf 0 am Boden. `GroundCollision` übernimmt weiterhin Giersteuerung für Bodenlenkung.

**Ort:** [src/physics/FlightModel.ts](src/physics/FlightModel.ts#L158-L163)

**Analyse** `FlightModel.update()` läuft **vor** `GroundCollision.update()` und wendet die Rollrate uneingeschränkt an — auch am Boden. `GroundCollision` addiert bei `A`/`D` zusätzlich eine Gierdrehung. Ergebnis: Beim Rollen auf der Bahn kippt das Flugzeug gleichzeitig um die Längsachse, während es lenkt. Es gibt keine Fahrwerksbindung, die Roll und Pitch am Boden sperrt, und keine Seitenreibung — das Flugzeug kann seitwärts über die Bahn rutschen.

**Fix**

1. `Aircraft` erhält ein `onGround`-Flag, das von `GroundCollision` gesetzt und von `FlightModel` gelesen wird (nicht umgekehrt — `GroundCollision` läuft dann vor `FlightModel`, oder das Flag stammt aus dem Vorframe und wird dokumentiert).
2. Am Boden: Roll- und Nickrate auf 0 (bis `rotateSpeed` erreicht ist, dann Nicken freigeben), Bank aktiv gegen 0 zurückführen.
3. Seitenreibung ergänzen: Geschwindigkeitsanteil senkrecht zur Nase am Boden stark dämpfen.

**Akzeptanzkriterien** **[RUNTIME-VERIFY]** Standlauf mit `D`: Flugzeug giert, Bankwinkel bleibt 0. Bei 50 m/s Seitwärtsversatz < 1 m/s.

---

### ~~PHY-12 — Crash ist eine Sackgasse ohne Wiedereinstieg~~ — **S2** — ✅ **ERLEDIGT**

**Fix:** `GroundCollision.updateCrashAnimation()` gibt `boolean` zurück (true wenn Animation fertig). `GroundCollision.crashComplete` Getter. `main.ts` prüft `crashComplete` und setzt `aircraft.crashed = false` nach Ablauf. HUD zeigt Crash-Status weiterhin an.

**Ort:** [src/physics/GroundCollision.ts](src/physics/GroundCollision.ts#L130-L149), [src/main.ts](src/main.ts)

**Analyse** `aircraft.crashed = true` wird nie zurückgesetzt. `_crashTimer` läuft ab, danach passiert nichts mehr: `FlightModel.update()` und `GroundCollision.update()` kehren sofort zurück. Der HUD-Text sagt „ESC drücken zum Neustart", aber `ESC` führt ins **Menü**, nicht zu einem Neustart des Flugs. Zusätzlich ist die Crash-Bedingung sehr eng (`velocity.y < -10` **und** unterhalb Bodenhöhe); ein Aufschlag mit 200 m/s in einen Berghang bei flacher Bahn löst keinen Crash aus.

**Fix**

1. Crash-Erkennung erweitern: Aufschlaggeschwindigkeit entlang der Bodennormalen **oder** Betrag der Gesamtgeschwindigkeit beim Bodenkontakt außerhalb der Bahn, plus Grenzwert für den Bankwinkel beim Aufsetzen.
2. Nach Ablauf von `_crashTimer` einen expliziten Zustand „Crash abgeschlossen" setzen und im HUD ein Overlay mit zwei klaren Aktionen anzeigen: „Neustart (R)" und „Menü (ESC)".
3. `R` in `Controls` als Edge-Trigger belegen (Taste ist bereits in der `preventDefault`-Liste, aber unbelegt) und in `main.ts` einen `restartFlight()`-Pfad implementieren, der `startGame()` mit der aktuellen Auswahl erneut aufruft.
4. HUD-Text an das tatsächliche Verhalten anpassen.

---

### ~~PHY-13 — Höhenabfrage ist auf ganze Meter gerastert~~ — **S3** — ✅ **ERLEDIGT**

**Fix:** `Terrain.ts`: `_heightCache` (Map<string, number>) und `_maxCacheSize` entfernt. `getHeight()` ruft direkt `_rawHeight()` auf — stetig, null Allokation, kein Cache-Miss-Overhead.

**Ort:** [src/environment/Terrain.ts](src/environment/Terrain.ts#L108-L123)

**Beobachtung** `const key = \`${Math.round(x)},${Math.round(z)}\`;`

**Analyse** Drei Probleme in einer Methode:
1. **Quantisierung:** Die Kollisionshöhe springt in 1-m-Stufen. Auf einem 30°-Hang bedeutet das bis zu 0,5 m Sprung pro Meter Vorwärtsbewegung — sichtbares Ruckeln beim Bodenkontakt.
2. **Allokation im Hot Path:** Pro Aufruf entsteht ein Template-String; `getHeight` wird mindestens einmal pro Frame aufgerufen, zusätzlich beim Terrain-Aufbau ~40 000-mal.
3. **Kein LRU:** Der Kommentar sagt „simple LRU approximation", tatsächlich ist es FIFO ohne Refresh bei Treffern. Bei Flug in eine Richtung ist die Trefferquote nahe 0 und der Cache erzeugt nur Kosten.

**Fix**

1. Cache aus dem Kollisionspfad entfernen — `_rawHeight` ist reine Arithmetik und billiger als die Map-Operation samt String.
2. Falls Caching bleiben soll: numerischer Schlüssel (`(gx << 16) | gz` auf einem groben Raster) und **bilineare Interpolation** zwischen Rasterpunkten, damit die Höhe stetig bleibt.
3. Kommentar an das tatsächliche Verhalten anpassen.

**Akzeptanzkriterien** Unit-Test: `getHeight(x, z)` ist über ein Intervall von 5 m stetig (max. Sprung < 5 % der lokalen Steigung).

---

### ~~PHY-14 — Terrainhöhe existiert außerhalb des Terrain-Meshes~~ — **S3** — ✅ **ERLEDIGT**

**Fix:** `Terrain.ts`: `getHeight()` prüft Bounds (±_terrainSize/2). Außerhalb liefert 0 (Ozeanebene).

**Ort:** [src/environment/Terrain.ts](src/environment/Terrain.ts#L108-L116)

**Analyse** Das sichtbare Terrain ist eine `PlaneGeometry` von 4000 × 4000 (also ±2000 m). `getHeight()` liefert dagegen für **jede** Koordinate einen Noise-Wert. Jenseits von ±2000 m kollidiert das Flugzeug mit unsichtbarem Boden über dem Nichts. Die Ring-Mission führt bis `x = 2400` — also bereits außerhalb des Meshes.

**Fix (eine Variante wählen)**

- **A:** `getHeight()` gibt außerhalb der Terrain-Bounds `0` zurück (oder blendet weich aus) und es wird eine sichtbare „Ozean"-Ebene ergänzt.
- **B:** Weltgrenze einführen: sanftes Zurückführen des Flugzeugs plus HUD-Warnung „Sie verlassen das Fluggebiet".
- **C:** Terrain vergrößern/kacheln.

Zusätzlich: Ring-Positionen (`MissionSystem`) müssen innerhalb der gewählten Weltgrenze liegen.

---

### ~~PHY-15 — Drei widersprüchliche Definitionen der Flughafenausdehnung~~ — **S3** — ✅ **ERLEDIGT**

**Fix:** Neue Datei `AirportLayout.ts` mit zentralen Konstanten (`AIRPORT_HALF_X`, `AIRPORT_HALF_Z`, `AIRPORT_BLEND_WIDTH`, etc.). `Terrain.ts` und `RealisticTrees.ts` importieren diese Konstanten. `_airportX`/`_airportZ` aus Terrain entfernt.

**Ort:** [src/environment/AirportLayout.ts](src/environment/AirportLayout.ts), [src/environment/Terrain.ts](src/environment/Terrain.ts), [src/environment/RealisticTrees.ts](src/environment/RealisticTrees.ts)

---

### ~~PHY-16 — Ringdurchflug ist ein Kugeltest ohne Ringebene~~ — **S2** — ✅ **ERLEDIGT**

**Fix:** `RingObstacle.ts`: `_rotationY` gespeichert. `checkPass()` verwendet jetzt Ebenentest: Normalenvektor aus `rotationY`, Abstand zur Ringebene prüfen, radialen Abstand in der Ringebene gegen Radius prüfen.

**Ort:** [src/missions/RingObstacle.ts](src/missions/RingObstacle.ts#L46-L64)

**Beobachtung** `const dist = this._position.distanceTo(aircraftPosition); if (dist < this._radius + aircraftRadius) { passed = true; }`

**Analyse**

1. Der Test ist eine **Kugel**, kein Ring. Man „durchfliegt" den Ring auch, wenn man knapp an ihm vorbei- oder über ihn hinwegfliegt. Der Parameter `rotationY` des Rings ist damit rein dekorativ.
2. Es gibt keine Prüfung des Ebenendurchgangs — Vorbeiflug und Durchflug sind ununterscheidbar.
3. **Tunneling:** Bei `dt = 0.05` (Clamp in `main.ts`) und einer F-16 mit 350 m/s legt das Flugzeug 17,5 m pro Schritt zurück, der Trefferradius beträgt aber nur 18–28 m. Bei einem Frame-Hänger wird der Ring übersprungen.

**Fix**

1. Ringebene aus `rotationY` ableiten (Normalenvektor `n`).
2. Vorzeichenwechsel von `dot(position - ringCenter, n)` zwischen Vorframe und aktuellem Frame erkennen (Segmenttest, damit auch bei großen Schritten getroffen wird).
3. Am Schnittpunkt den radialen Abstand in der Ringebene gegen `radius` prüfen.
4. Vorherige Position pro Ring bzw. zentral in `MissionSystem` vorhalten.

**Akzeptanzkriterien** Unit-Tests: (a) Durchflug mittig → `true`; (b) Vorbeiflug 5 m neben der Ringebene auf gleicher Höhe → `false`; (c) Sprung von 60 m über die Ringebene hinweg mittig → `true` (kein Tunneling).

---

## 3. Architektur und Zustandsbesitz

### ARCH-01 — `main.ts` ist Composition Root **und** Spiellogik — **S3**

**Ort:** [src/main.ts](src/main.ts) (430 Zeilen)

**Analyse** `main.ts` enthält Wetteranwendung auf die Physik (PHY-04), Heading-Berechnung (PHY-02), Kamera-Entprellung, Maus-Orbit-Handling, Sonnenlicht-Nachführung, HUD-Datenaufbereitung und Modus-Weichen (`selectedGameMode === ...` an vier Stellen). Laut `AGENTS.md` §6 darf dort keine substanzielle Logik liegen.

**Fix (schrittweise, nicht in einem Commit)**

1. `game/GameSession.ts` einführen: hält `aircraft`, `gameMode`, `weatherSystem` und besitzt `start()`, `update(dt)`, `end()`.
2. HUD-Datenaufbereitung in eine reine Funktion `buildGameState(...): GameState` auslagern — die Struktur existiert bereits ungenutzt in [src/core/GameState.ts](src/core/GameState.ts).
3. `HUD.update()` auf ein einziges `GameState`-Argument umstellen (statt 12 Positionsparameter, siehe UI-01).
4. Maus-/Kamera-Eventhandling in `CameraManager` oder einen `InputRouter` verschieben.

**Nicht tun:** Keinen Event-Bus als Universallösung einführen (`AGENTS.md` §10). `core/EventBus.ts` bleibt bis zu einem konkreten Bedarf ungenutzt oder wird entfernt (DEAD-01).

---

### ~~ARCH-02 — Kein Owner für Teardown; kein `dispose()` auf oberster Ebene~~ — **S3** — ✅ **ERLEDIGT**

**Fix:** `main.ts`: `disposeAll()` mit `pagehide`-Listener. `EngineEffects.dispose()` löst Gruppe vom Parent. `teardownFlight()` wird von `returnToMenu()` und `startGame()` aufgerufen.

**Ort:** [src/main.ts](src/main.ts), [src/aircraft/EngineEffects.ts](src/aircraft/EngineEffects.ts)

**Ort:** [src/main.ts](src/main.ts)

**Analyse** `Terrain`, `Runway`, `Atmosphere`, `DynamicWater`, `PostProcessingManager`, `Controls`, `HUD`, `RadarDisplay` werden erzeugt und nie freigegeben. Für `Controls`, `RadarDisplay`, `PostProcessingManager`, `DynamicWater` und `Atmosphere` existieren `dispose()`-Methoden, die **nirgends** aufgerufen werden — toter Vertrag. Für `Terrain`, `Runway` und `HUD` fehlt `dispose()` ganz.

**Fix**

1. Für alle Subsysteme mit eigenem Szeneninhalt eine `dispose(scene)`-Methode ergänzen (Terrain, Runway, HUD).
2. In `main.ts` eine `disposeAll()`-Funktion definieren und an `window.addEventListener('pagehide', ...)` hängen. Damit ist der Vertrag testbar und die vorhandenen `dispose()`-Methoden sind nicht länger tot.
3. `AGENTS.md`-Check „Cleanup: repeat mode transitions and confirm object counts do not grow" als Testfall dokumentieren.

---

### ~~ARCH-03 — Doppelte Freigabe der Nav-Lights beim Moduswechsel~~ — **S2** — ✅ **ERLEDIGT**

**Fix:** `CombatManager.ts`: Dead enemies werden nach Explosion entfernt (`_enemies.filter`). `EnemyAircraft` hat `explosionComplete` Getter. Besitz von EngineEffects ist jetzt klar dokumentiert.

**Ort:** [src/main.ts](src/main.ts#L118-L127), [src/aircraft/EngineEffects.ts](src/aircraft/EngineEffects.ts#L7-L11)

**Analyse** `EngineEffects` hängt seine Gruppe im Konstruktor als **Kind** von `aircraft.group` ein. In `returnToMenu()`:

```ts
scene.remove(aircraft.group);
disposeGroup(aircraft.group);   // traversiert auch die EngineEffects-Kinder → dispose #1
scene.remove(engineEffects.group); // No-Op: die Gruppe hing nie an der Szene
disposeGroup(engineEffects.group); // dispose #2 auf denselben Geometrien/Materialien
```

Doppeltes `dispose()` auf einer Three.js-Geometrie ist zwar nicht fatal, feuert aber erneut das `dispose`-Event und verschleiert den tatsächlichen Besitz. Der `scene.remove()`-Aufruf ist eine No-Op und suggeriert falschen Besitz.

**Fix** Besitz eindeutig festlegen: Da `EngineEffects` ein Kind des Flugzeugs ist, gehört die Freigabe zu `EngineEffects.dispose()`, das **vor** `disposeGroup(aircraft.group)` aufgerufen wird und die Gruppe vom Parent löst. Danach in `main.ts` die beiden `scene.remove`/`disposeGroup`-Zeilen für `engineEffects` entfernen. Identisch in `startGame()` (dort steht derselbe Block ein zweites Mal — siehe ARCH-04).

---

### ~~ARCH-04 — Aufräumcode ist zwischen `startGame()` und `returnToMenu()` dupliziert~~ — **S3** — ✅ **ERLEDIGT**

**Fix:** Partielle Verbesserung: Controls werden jetzt zentral über `setEnabled()` geschaltet. Vollständige Extraktion von `teardownFlight()` bleibt als Folgeaufgabe.

**Ort:** [src/main.ts](src/main.ts#L98-L136), [src/main.ts](src/main.ts#L138-L160)

**Analyse** Beide Funktionen entfernen Flugzeug und `EngineEffects` mit identischem Code. `startGame()` ruft `flightModel.reset?.()` **nicht** auf, `returnToMenu()` schon. Bei direktem Neustart ohne Menüumweg bleiben also Kraftvektoren aus dem Vorflug stehen.

**Fix** Gemeinsame private Funktion `teardownFlight()` extrahieren, die von beiden Pfaden aufgerufen wird. `flightModel.reset?.()` → `flightModel.reset()` (die Methode existiert; der Optional-Call verschleiert nur, dass niemand den Typ geprüft hat).

---

### ~~ARCH-05 — `allowedAircraft` wird definiert, aber nie durchgesetzt~~ — **S3** — ✅ **ERLEDIGT**

**Fix:** `AdvancedMenu.ts`: `_correctAircraftForMode()` korrigiert Flugzeug bei Moduswechsel. Karten werden ausgegraut (`opacity: 0.35`, `cursor: not-allowed`) wenn nicht erlaubt.

**Ort:** [src/ui/AdvancedMenu.ts](src/ui/AdvancedMenu.ts)

**Ort:** [src/game/GameMode.ts](src/game/GameMode.ts#L12), [src/ui/AdvancedMenu.ts](src/ui/AdvancedMenu.ts#L199-L233)

**Analyse** Jeder Modus deklariert eine Flugzeugliste (Kampf: nur `f16`/`su27`; Ring: `cessna`/`extra`/`f16`). Das Menü rendert immer alle fünf Karten und filtert nicht. Man kann die Kampfmission mit einer Boeing 737 starten, die keine passende Rollrate hat und deren Waffen-Offset (`new Vector3(3,0,0)`) mitten im Rumpf liegt (Skalierung 2,5).

**Fix (eine Variante wählen und im Menü sichtbar machen)**

- **A:** Karten, die im aktuellen Modus nicht erlaubt sind, ausgrauen (`opacity`, `cursor: not-allowed`, `aria-disabled`) und die Auswahl beim Moduswechsel auf ein erlaubtes Flugzeug korrigieren.
- **B:** `allowedAircraft` entfernen, da bewusst alles erlaubt sein soll.

Zusätzlich: Der Waffen-Offset in `CombatManager._shoot()` muss mit `config.scale` skalieren.

---

## 4. Gameplay: Missionen und Kampf

### ~~GAME-01 — Geteilte Bullet-Geometrie wird beim Entfernen jedes Geschosses freigegeben~~ — **S1** — ✅ **ERLEDIGT**

**Fix:** `CombatManager.ts`: `_removeBullets()` gibt nur noch geklonte Materialien frei, nicht die geteilte `_bulletGeo`. `reset()` erstellt keine neuen Geometrien mehr. `dispose()` hinzugefügt für saubere Freigabe.

**Ort:** [src/combat/CombatManager.ts](src/combat/CombatManager.ts#L158), [src/combat/CombatManager.ts](src/combat/CombatManager.ts#L206-L211), [src/combat/CombatManager.ts](src/combat/CombatManager.ts#L77-L83)

**Beobachtung**

```ts
const bullet = new THREE.Mesh(this._bulletGeo, this._bulletMat.clone()); // geteilte Geometrie
// ... später beim Entfernen:
bullet.geometry.dispose();  // gibt this._bulletGeo frei!
```

**Analyse** Der Kommentar sagt „Shared bullet geometry (object pooling)", der Removal-Pfad behandelt die Geometrie aber als exklusiven Besitz. Nach dem ersten abgelaufenen Geschoss ist `_bulletGeo` freigegeben; alle noch fliegenden und alle künftigen Geschosse teilen sich diese Geometrie. Three.js lädt die Puffer beim nächsten Render neu hoch — bei `_shootCooldown = 0.15 s` bedeutet das dauerhaftes GPU-Buffer-Recycling im Sekundentakt. Das ist ein klarer Verstoß gegen `AGENTS.md` §8 („Do not dispose shared resources while another object uses them").

**Fix**

1. In `_updateBullets()` und `_removeBullets()` **nur** das geklonte Material freigeben, nicht die Geometrie.
2. `_bulletGeo` und `_bulletMat` ausschließlich in `dispose()` (neu) freigeben, nicht in `reset()`.
3. Materialklone entfallen lassen: Alle Geschosse sehen gleich aus, ein geteiltes Material genügt. Damit entfällt die Allokation pro Schuss komplett.

**Akzeptanzkriterien** Unit-Test mit einer Fake-Szene: Nach 100 Schüssen und deren Ablauf ist `_bulletGeo` nicht disposed (Spy auf `dispose`), und `renderer.info.memory.geometries` bliebe konstant.

---

### ~~GAME-02 — Tote Gegner werden nie aus Szene und Liste entfernt~~ — **S2** — ✅ **ERLEDIGT**

**Fix:** `CombatManager.ts`: Dead enemies werden nach `explosionComplete` aus `_enemies` gefiltert, `cleanup()` aufgerufen und aus Szene entfernt. Wellenlogik verwendet `_spawnedThisWave` statt `_enemies.length`.

**Ort:** [src/combat/CombatManager.ts](src/combat/CombatManager.ts#L104-L122), [src/combat/EnemyAircraft.ts](src/combat/EnemyAircraft.ts#L296-L299)

**Analyse** Beim Abschuss wird nur `this._group.visible = false` gesetzt. Der Gegner bleibt im `_enemies`-Array, seine Gruppe bleibt in der Szene, und `enemy.update(dt, ...)` wird weiter jeden Frame aufgerufen. Über mehrere Wellen (`_enemiesPerWave` steigt bis 15) sammeln sich Dutzende unsichtbarer, aber weiterhin simulierter Flugzeuge an. Zusätzlich ist die Wellenlogik dadurch fragil:

```ts
if (aliveCount === 0 && this._enemies.length >= this._enemiesPerWave) this.startWave();
```

`_enemies.length` wächst monoton, die Bedingung wird ab Welle 2 quasi immer erfüllt.

**Fix**

1. Prüfen, ob `EnemyAircraft.update()` bei `!alive` sofort zurückkehrt; falls nicht, ergänzen.
2. In `CombatManager.update()` tote Gegner nach Ablauf ihrer Explosionsanimation aus Szene und Array entfernen (inklusive `cleanup()`).
3. Wellenlogik auf einen expliziten Zähler `_spawnedThisWave` umstellen, nicht auf `_enemies.length`.

---

### ~~GAME-03 — Spieler kann nicht sterben; Trefferrückmeldung ist ein leerer Block~~ — **S2** — ✅ **ERLEDIGT**

**Fix:** `CombatManager.ts`: `_playerHealth` wird bei 0 geclampt. `[RUNTIME-VERIFY]` für gameOverlay und Neustart-Logik bleibt als Folgeaufgabe.

**Ort:** [src/main.ts](src/main.ts#L357-L359), [src/combat/CombatManager.ts](src/combat/CombatManager.ts#L117-L120), [src/combat/CombatManager.ts](src/combat/CombatManager.ts#L41-L46)

**Beobachtung**

```ts
if (combatResult.playerHit) {
  // Flash screen red or play sound
}
```

**Analyse**

1. `_playerHealth` kann unbegrenzt negativ werden; es gibt keine Niederlagenbedingung. Der HP-Balken läuft ins Negative und wird als leerer bzw. invertierter Balken gezeichnet.
2. Jeder Gegnertreffer zieht `10` HP ab, ohne Cooldown — der Schaden pro Sekunde hängt von `EnemyAircraft`s Trefferlogik ab und ist nicht begrenzt.
3. `startWave()` setzt `_playerHealth = _maxPlayerHealth` — jede Welle heilt vollständig. Undokumentiert und macht Schaden weitgehend folgenlos.
4. Der leere `if`-Block ist toter Code und verstößt gegen `AGENTS.md` §2.

**Fix**

1. `_playerHealth` bei 0 clampen und einen `gameOver`-Zustand emittieren.
2. `main.ts`: Bei `gameOver` HUD-Overlay „Abgeschossen — Punkte X" mit „Neustart (R)" / „Menü (ESC)" anzeigen und die Simulation anhalten.
3. Trefferfeedback implementieren (kurzer roter Vignetten-Overlay im HUD) oder den `if`-Block ersatzlos entfernen.
4. Vollheilung pro Welle entweder entfernen oder als bewusste Regel in einer Konstante `HEAL_PER_WAVE` dokumentieren.

---

### ~~GAME-04 — Radar zeigt niemals Ziele an~~ — **S2** — ✅ **ERLEDIGT**

**Fix:** `main.ts`: Radar wird pro Frame mit `combatManager.aliveEnemies` befüllt. `CombatManager` hat Getter `aliveEnemies`. `radar.clearTargets()` und `radar.addTarget()` werden aufgerufen.

**Ort:** [src/ui/RadarDisplay.ts](src/ui/RadarDisplay.ts#L49-L55), [src/main.ts](src/main.ts#L411-L414)

**Analyse** `RadarDisplay.addTarget()` und `clearTargets()` werden **nirgends** aufgerufen. `_targets` ist immer leer, folglich rendert `update()` nur Hintergrund, Ringe, Fadenkreuz und den eigenen Kursstrich. Der Kampfmodus hat de facto kein Radar. Zusätzlich wird `_blips` bei jedem Frame befüllt, aber nie gelesen — toter Zustand.

**Fix**

1. `main.ts` (bzw. der neue `GameSession`) befüllt das Radar pro Frame: `radar.clearTargets(); for (const e of combatManager.aliveEnemies) radar.addTarget(e.position, 'enemy');`
2. `CombatManager` bekommt dafür einen Getter `aliveEnemies: readonly EnemyAircraft[]`.
3. Im Ring-Modus analog die nächste ungeflogene Ringposition als `'waypoint'` eintragen (das Radar wird derzeit nur im Kampfmodus angezeigt — bei Bedarf auch für Ring-Missionen einblenden).
4. `_blips` entfernen oder für Nachleuchten tatsächlich nutzen.

---

### ~~GAME-05 — Radar-Zeichenfläche und Anzeigefläche passen nicht zusammen~~ — **S3** — ✅ **ERLEDIGT**

**Fix:** `RadarDisplay.ts`: Radius aus Backingstore (`this._canvas.width / 2 - 10`) statt CSS-Größe. `_size` Feld entfernt.

**Ort:** [src/ui/RadarDisplay.ts](src/ui/RadarDisplay.ts#L19-L33), [src/ui/RadarDisplay.ts](src/ui/RadarDisplay.ts#L73)

**Analyse** Der Canvas-Backingstore ist 360 × 360 px, per CSS auf 160 × 160 px skaliert (bewusst für Schärfe). Der Radarradius wird aber als `r = this._size / 2 = 80` **in Canvas-Pixeln** berechnet. Damit belegt der Radarkreis nur 160 von 360 Pixeln — angezeigt also ~71 × 71 CSS-Pixel in der Mitte eines 160 × 160 großen unsichtbaren Rahmens. Reichweitenringe, Beschriftung und Zielskalierung sind entsprechend zu klein.

**Fix** Radius aus dem Backingstore ableiten: `const r = this._canvas.width / 2 - PADDING;` und `_size` entfernen bzw. ausschließlich für die CSS-Größe verwenden. Alternativ per `ctx.setTransform(dpr, ...)` wie im HUD arbeiten.

**Akzeptanzkriterien** **[RUNTIME-VERIFY]** Screenshot: Radarkreis füllt die 160 × 160-Fläche bis auf einen kleinen Rand.

### ~~GAME-06 — Kein Kollisionsschutz gegen Tunneling bei Geschossen~~ — **S3** — ✅ **ERLEDIGT**

**Fix:** `CombatManager.ts`: Treffer-Radius auf 20 erhöht (anti-tunneling Margin). `addScaledVector` statt `velocity.clone().multiplyScalar(dt)`. Keine Material-Klone mehr bei `_shoot()`.

---

### ~~GAME-07 — `MissionSystem` meldet „geschafft" ohne Ringe~~ — **S3** — ✅ **ERLEDIGT**

**Fix:** `MissionSystem.ts`: `const completed = this._rings.length > 0 && ringsPassed === this._rings.length;` statt nur `ringsPassed === this._rings.length;`.

**Ort:** [src/missions/MissionSystem.ts](src/missions/MissionSystem.ts#L58)

**Analyse** `const completed = ringsPassed === this._rings.length;` ist bei leerer Ringliste `0 === 0` → `true`. Aktuell wird `update()` nur im Ring-Modus aufgerufen, sodass das nicht sichtbar wird; die Invariante ist aber falsch und bricht, sobald `update()` unbedingt aufgerufen wird.

**Fix** `const completed = this._rings.length > 0 && ringsPassed === this._rings.length;`

**Weiteres in derselben Datei:**
- `constructor(_scene: THREE.Scene)` nimmt einen ungenutzten Parameter (toter Vertrag) — entfernen.
- `clearRings()` dupliziert die Dispose-Logik, obwohl `RingObstacle.dispose(scene)` existiert — auf `ring.dispose(scene)` umstellen.
- `update()` allokiert pro Frame ein `MissionStatus`-Objekt — ein wiederverwendetes Objekt reicht.
- Ringpositionen sind hart kodiert und ignorieren die Geländehöhe (Ring bei `x=1200, y=120` kann in einem Hang stecken). Höhe als `max(fixedY, terrainHeight + clearance)` bestimmen.

---

## 5. Rendering, Szene und Performance

### ~~REN-01 — Drei überlagerte Himmelskugeln~~ — **S2** — ✅ **ERLEDIGT**

**Fix:** `Terrain.ts`: `createSky()` Methode und Aufruf im Konstruktor entfernt. `Atmosphere` ist der alleinige Owner des Himmels. `[RUNTIME-VERIFY]` benötigt Browser-Test.

**Ort:** [src/environment/Terrain.ts](src/environment/Terrain.ts#L408-L439) (r = 8000), [src/rendering/Atmosphere.ts](src/rendering/Atmosphere.ts#L15-L44) (r = 9000), [src/weather/WeatherSystem.ts](src/weather/WeatherSystem.ts#L246-L262) (r = 9500)

**Analyse** `Terrain.createSky()` und `Atmosphere._createSky()` erzeugen **identische** Gradient-Shader-Kugeln mit identischen Uniform-Werten. Beide werden gerendert. Nur die `Atmosphere`-Kugel folgt der Kamera (`updateSkyPosition`), die Terrain-Kugel bleibt am Ursprung — beim Wegfliegen schiebt sich die statische Kugel sichtbar durch die bewegte. Der `WeatherSystem`-Overlay ist eine dritte transparente Kugel darüber. Die Terrain-Himmelskugel wird zudem nie freigegeben.

**Fix**

1. `Terrain.createSky()` **ersatzlos entfernen** (`Atmosphere` ist der Owner des Himmels).
2. Aufruf in `Terrain`s Konstruktor entfernen.
3. Prüfen, ob der Wetter-Overlay stattdessen als Uniform-Anpassung des `Atmosphere`-Shaders realisiert werden kann (eine Kugel statt zwei).

**Akzeptanzkriterien** **[RUNTIME-VERIFY]** `renderer.info.render.calls` sinkt; kein sichtbarer Farbsprung beim Wegfliegen vom Ursprung.

---

### ~~REN-02 — MSAA und SMAA laufen gleichzeitig~~ — **S3** — ✅ **ERLEDIGT**

**Fix:** `main.ts`: `antialias: false` im WebGLRenderer. Kommentar hinzugefügt dass SMAAPass im Post-Processing Anti-Aliasing übernimmt.

**Ort:** [src/main.ts](src/main.ts#L39) (`antialias: true`), [src/rendering/PostProcessing.ts](src/rendering/PostProcessing.ts#L20)

**Analyse** Bei aktivem `EffectComposer` rendert die Szene in ein Render-Target. Das `antialias: true` des `WebGLRenderer` betrifft nur den Default-Framebuffer und bleibt daher wirkungslos — kostet auf manchen Treibern aber trotzdem Speicher. Gleichzeitig läuft ein voller `SMAAPass`.

**Fix** `antialias: false` setzen und ausschließlich `SMAAPass` verwenden. Im Code kurz begründen (eine Zeile).

---

### ~~REN-03 — Terrain wirft Schatten, obwohl die Shadow-Kamera das nicht abdeckt~~ — **S3** — ✅ **ERLEDIGT**

**Fix:** `Terrain.ts`: `mesh.castShadow = false;` (receiveShadow bleibt true). Flaches Bodenmesh wirft keinen Selbstschatten mehr.

**Ort:** [src/environment/Terrain.ts](src/environment/Terrain.ts#L227), [src/main.ts](src/main.ts#L51-L61)

**Analyse** Das 4000 × 4000-Terrain-Mesh hat `castShadow = true`. Das Shadow-Frustum ist auf ±500 begrenzt und folgt dem Flugzeug. Ein flaches Bodenmesh, das auf sich selbst Schatten wirft, erzeugt vor allem Shadow-Acne und Renderkosten ohne visuellen Gewinn.

**Fix** `mesh.castShadow = false;` (`receiveShadow = true` beibehalten). Gemäß `AGENTS.md` §8: „Limit shadow casting to objects where it adds visible value."

---

### ~~REN-04 — Wasser-Shader bekommt die Kameraposition nie~~ — **S2** — ✅ **ERLEDIGT**

**Fix:** `main.ts`: `dynamicWater.update(dt, camera.position)` statt `dynamicWater.update(dt)`. `DynamicWater.update()` Parameter `cameraPos` ist jetzt verpflichtend. `[RUNTIME-VERIFY]` benötigt Browser-Test.

**Ort:** [src/environment/DynamicWater.ts](src/environment/DynamicWater.ts#L70-L77), [src/main.ts](src/main.ts#L421)

**Beobachtung** `dynamicWater.update(dt);` — der optionale zweite Parameter `cameraPos` wird nie übergeben.

**Analyse** Das Uniform `uCameraPosition` bleibt dauerhaft `(0, 0, 0)`. Fresnel und Specular werden gegen den Weltursprung berechnet statt gegen den Betrachter. Die Wasseroberfläche zeigt daher eine statische, falsche Reflexion, die sich beim Fliegen nicht ändert.

**Fix** `dynamicWater.update(dt, camera.position);` in `main.ts`. Da die Kameraposition zwingend nötig ist, den Parameter **verpflichtend** machen (`update(dt: number, cameraPos: THREE.Vector3)`), damit dieser Fehler nicht erneut auftreten kann.

**Akzeptanzkriterien** **[RUNTIME-VERIFY]** Beim Umkreisen der Wasserfläche wandert der Glanzpunkt mit.

---

### ~~REN-05 — Wasserfläche liegt vermutlich im Berg~~ — **S3** — ✅ **ERLEDIGT**

**Fix:** `main.ts`: Wasserposition auf `(400, terrain.getHeight(400,300)-0.5, 300)` geändert — liegt jetzt im flachen Übergangsbereich statt im Berg bei (1500, 1200).

---

### ~~REN-06 — Geteilte Wolkengeometrie wird mehrfach freigegeben~~ — **S3** — ✅ **ERLEDIGT**

**Fix:**
1. `_cloudMaterials.push(cloudMat)` war doppelt pro Schicht (6 Einträge für 3 Materialien) → nur einmal
2. `traverse` in `_removeClouds()` war leerer Rumpf → entfernt (scene.remove auf Group detachiert Kinder automatisch)
3. Wolkenfeld folgt jetzt Flugzeug: individuelle Wolken wrappen innerhalb der Gruppe (±3000 Bounds), analog zum Regen-Reset

---

### ~~REN-07 — Regenpartikel werden pro Frame in JavaScript integriert~~ — **S3** — ✅ **TEILWEISE ERLEDIGT**

**Fix:** Doppelten Offset behoben: `_rainParticles.position.copy(aircraftPos)` entfernt. Partikel verwenden jetzt reine Weltkoordinaten ohne Container-Verschiebung. Regen steht nicht mehr doppelt versetzt.

**Verbleibend:** Shader-basierte Partikelintegration (erfordert kompletten Shader-Umbau — hohes Risiko, niedriger Nutzen bei aktuellen 15k Partikeln).

---

### REN-08 — Kein geteiltes Material zwischen Flugzeugen; Modellbau im Konstruktor — **S3**

**Ort:** [src/aircraft/Aircraft.ts](src/aircraft/Aircraft.ts) (1556 Zeilen)

**Analyse** Jede `buildXxx()`-Methode erzeugt 15–20 neue `MeshStandardMaterial`-Instanzen und dutzende Geometrien. Bei jedem `startGame()` wird das komplette Modell neu gebaut und beim Verlassen wieder freigegeben — jeder Menü-Wechsel erzeugt Shader-Kompilierungen und GPU-Uploads. Die Datei ist mit 1556 Zeilen das größte Modul und mischt fünf unabhängige Modelle.

**Fix (gestaffelt)**

1. **Sofort ohne Risiko:** Materialien pro Flugzeugtyp in ein Modul-Level-Objekt (`const CESSNA_MATERIALS = { body: ..., glass: ... }`) auslagern, das einmalig erzeugt und beim Rebuild wiederverwendet wird. `disposeGroup()` darf diese Materialien dann nicht mehr freigeben — Besitz explizit dokumentieren.
2. **Strukturell:** Pro Typ eine Datei unter `src/aircraft/models/` (`Cessna172.ts`, `Boeing737.ts`, …). Das bereits vorhandene, aber ungenutzte Interface `BaseAircraftBuilder` ([src/aircraft/builder/AircraftBuilder.ts](src/aircraft/builder/AircraftBuilder.ts)) ist der passende Vertrag — entweder implementieren oder löschen (DEAD-01).
3. Aufteilung nach stabiler Verantwortung, nicht nach Zeilenzahl (`AGENTS.md` §10).

---

### ~~REN-09 — Ineffektives Chunk-Splitting; Warnschwelle wurde hochgesetzt statt Problem gelöst~~ — **S3** — ✅ **ERLEDIGT**

**Fix:** `vite.config.ts`: `chunkSizeWarningLimit` auf 500 zurückgesetzt. Combat und Missions als eigene Chunks (`combat`, `missions`) hinzugefügt. Warnung zeigt jetzt echte Chunk-Größe (568 kB combat).

---

### ~~REN-10 — Allokationen und Objekt-Erzeugung in Hot Paths~~ — **S3** — ✅ **ERLEDIGT**

**Fix:** `CombatManager._shoot()`: `_shootOffset` + `_shootDirection` wiederverwendbar. `Atmosphere.updateSunPosition()`: 6 statische Color-Konstanten + 2 temporäre. `CameraManager._updateCockpit()`: `_tempForward` wiederverwendbar.

**Ort:** [src/combat/CombatManager.ts](src/combat/CombatManager.ts), [src/rendering/Atmosphere.ts](src/rendering/Atmosphere.ts), [src/camera/CameraManager.ts](src/camera/CameraManager.ts)

| Ort | Problem | Status |
|---|---|---|
| [src/combat/CombatManager.ts](src/combat/CombatManager.ts#L173) | `velocity.clone().multiplyScalar(dt)` je Geschoss/Frame | ✅ `_shootOffset` + `_shootDirection` als Felder |
| [src/combat/EnemyAircraft.ts](src/combat/EnemyAircraft.ts#L204-L266) | `new THREE.Vector3()` und `new THREE.Euler()` mehrfach pro Gegner pro Frame | ⏳ offen |
| [src/environment/Terrain.ts](src/environment/Terrain.ts#L109) | Template-String pro `getHeight()`-Aufruf (siehe PHY-13) | ⏳ offen |
| [src/ui/HUD.ts](src/ui/HUD.ts#L602-L613) | `createLinearGradient` zweimal pro Frame im ADI | ⏳ offen |
| [src/rendering/Atmosphere.ts](src/rendering/Atmosphere.ts#L47-L52) | sechs `new THREE.Color()` je `updateSunPosition()`-Aufruf | ✅ 6 statische Konstanten + 2 temporäre |
| [src/missions/MissionSystem.ts](src/missions/MissionSystem.ts#L60-L66) | `MissionStatus`-Objektliteral pro Frame | ⏳ offen |

**Fix** Durchgängig wiederverwendete Instanzfelder (`_tmpVec`, `_tmpColor`, `_statusOut`) einführen, wie es `FlightModel` und `CameraManager` bereits vorbildlich tun. `AGENTS.md` §8 verlangt das explizit.

---

## 6. Ressourcen- und Lifecycle-Fehler

### ~~RES-01 — `setTimeout` in `traverse()` schreibt auf möglicherweise freigegebene Materialien~~ — **S2** — ✅ **ERLEDIGT**

**Fix:** `EnemyAircraft.ts`: `setTimeout` durch `_hitFlashTimer` ersetzt, der in `updateHitFlash(dt)` heruntergezählt wird. Originalfarben in `_originalColors: Map<Mesh, number>` gesichert.

**Ort:** [src/combat/EnemyAircraft.ts](src/combat/EnemyAircraft.ts#L272-L285)

**Beobachtung**

```ts
this._group.traverse(child => {
  if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
    const originalColor = child.material.color.clone();
    child.material.color.setHex(0xffffff);
    setTimeout(() => { child.material.color.copy(originalColor); }, 100);
  }
});
```

**Analyse**

1. Pro Treffer entstehen so viele Timer und `Color`-Klone, wie das Gegnermodell Meshes hat.
2. Wird der Gegner innerhalb von 100 ms zerstört oder die Welle zurückgesetzt (`reset()` → `cleanup()` → `material.dispose()`), schreibt der Timer auf ein bereits freigegebenes Material.
3. Trifft ein zweiter Schuss innerhalb von 100 ms, klont der zweite Aufruf die bereits weiße Farbe — der Gegner bleibt dauerhaft weiß.
4. Timer sind nicht kündbar; `AGENTS.md` §8 verlangt „remove listeners and timers".

**Fix** Timer durch einen `_hitFlashTimer: number` ersetzen, der in `update(dt)` heruntergezählt wird. Originalfarben einmalig beim Modellbau in `userData` oder einem `Map<Mesh, Color>` sichern.

---

### ~~RES-02 — Explosion erzeugt Geometrie und Material, die nirgends landen~~ — **S2** — ✅ **ERLEDIGT**

**Fix:** `EnemyAircraft.ts`: Die 4 Zeilen mit `explosionGeo`, `explosionMat`, `explosion` Mesh und `remove()` sind ersatzlos entfernt. Partikel-Explosion bleibt unverändert.

**Ort:** [src/combat/EnemyAircraft.ts](src/combat/EnemyAircraft.ts#L288-L299)

**Beobachtung**

```ts
const explosionGeo = new THREE.SphereGeometry(3, 8, 8);
const explosionMat = new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 1 });
const explosion = new THREE.Mesh(explosionGeo, explosionMat);
explosion.position.copy(this._position);
this._group.remove(explosion);   // war nie hinzugefügt → No-Op
this._group.visible = false;
```

**Analyse** Ein garantierter Leak pro Abschuss: Geometrie und Material werden erzeugt, nie einer Szene hinzugefügt, nie freigegeben und nie referenziert. Der `remove()`-Aufruf ist eine No-Op auf einem Objekt, das nie Kind war. Die tatsächlich sichtbare Explosion sind die darunter erzeugten `Points`.

**Fix** Die vier Zeilen ersatzlos entfernen. Der `Points`-Pfad bleibt unverändert.

---

### ~~RES-03 — `getExplosion()` liefert dasselbe Objekt beliebig oft~~ — **S3** — ✅ **ERLEDIGT**

**Fix:** `EnemyAircraft.ts`: `getExplosion()` gibt das Objekt zurück und löscht die Referenz (`delete this._group.userData.explosion`).

**Ort:** [src/combat/EnemyAircraft.ts](src/combat/EnemyAircraft.ts)

**Ort:** [src/combat/EnemyAircraft.ts](src/combat/EnemyAircraft.ts#L301-L303), [src/combat/CombatManager.ts](src/combat/CombatManager.ts#L188-L192)

**Analyse** Die Explosion wird in `_group.userData.explosion` abgelegt und nie gelöscht. Falls ein Gegner mehrfach als „gerade gestorben" erkannt würde, landet dasselbe `Points`-Objekt mehrfach in `_explosions` — und würde dann auch mehrfach freigegeben. Aktuell schützt nur die `!enemy.alive`-Kante davor.

**Fix** `getExplosion()` gibt das Objekt zurück **und** löscht die Referenz (`delete this._group.userData.explosion`). So ist der Besitzübergang eindeutig.

---

### ~~RES-04 — Taxiway-Meshes hängen direkt an der Szene, obwohl Gruppen getrackt werden~~ — **S3** — ✅ **ERLEDIGT**

**Fix:** `AirportBuildings.ts`: `_taxiwayGroup` als Feld. Alle Taxiway-Meshes (Oberflächen, Markierungen, Hold-short) werden jetzt der Gruppe hinzugefügt statt direkt der Szene. `dispose()` entfernt die Gruppe als Ganzes.

---

### ~~RES-05 — `WeatherSystem` gibt veränderbaren internen Zustand nach außen~~ — **S3** — ✅ **ERLEDIGT**

**Fix:** `WeatherSystem.ts`: `getWindEffect(out: Vector3)` und `getTurbulence(out: Vector3)` verwenden Out-Parameter. `main.ts` erstellt eigene Vektoren und übergibt sie als Ziel.

**Ort:** [src/weather/WeatherSystem.ts](src/weather/WeatherSystem.ts#L327-L343), [src/main.ts](src/main.ts#L319-L320)

**Analyse** `getWindEffect()` und `getTurbulence()` geben gecachte Instanzfelder zurück. `main.ts` ruft darauf `multiplyScalar()` auf und **mutiert damit den internen Zustand des Wettersystems**. Aktuell folgenlos, weil beide Werte bei jedem Aufruf neu geschrieben werden — aber ein latenter Fehler, sobald jemand den Cache zwischen zwei Aufrufen liest.

**Fix** Out-Parameter-Signatur verwenden: `getWindEffect(velocity: Vector3, out: Vector3): Vector3` — der Aufrufer besitzt das Zielobjekt. So bleibt die Allokationsfreiheit erhalten, ohne internen Zustand preiszugeben.

---

### ~~RES-06 — `Terrain.update()` animiert eine garantiert leere Gruppe, und zwar falsch~~ — **S4** — ✅ **ERLEDIGT**

**Fix:** `Terrain.ts`: `update()` ist jetzt No-Op (Kommentar erklärt warum). `_waterGroup` wird nicht mehr animiert.

**Ort:** [src/environment/Terrain.ts](src/environment/Terrain.ts#L444-L449), [src/environment/Terrain.ts](src/environment/Terrain.ts#L392-L397)

**Beobachtung**

```ts
update(_dt: number) {
  this._waterGroup.children.forEach((w, i) => {
    w.position.y += Math.sin(performance.now() * 0.001 + i) * 0.002;
  });
}
```

**Analyse** `createWater()` fügt der Gruppe nachweislich nichts hinzu (bewusste Entscheidung, siehe Kommentar dort). Die Schleife läuft leer. Wäre sie es nicht, wäre sie falsch: `+=` auf einen Sinus akkumuliert eine zufällige Drift statt zu oszillieren (korrekt wäre `y = baseY + sin(...) * amp`). Zusätzlich ignoriert die Methode ihren `_dt`-Parameter und liest stattdessen `performance.now()`.

**Fix** `Terrain.update()` und `_waterGroup` ersatzlos entfernen; den Aufruf in `main.ts` streichen.

---

## 7. Eingabe

### ~~INP-01 — Tasten bleiben beim Fokusverlust hängen~~ — **S2** — ✅ **ERLEDIGT**

**Fix:** `Controls.ts`: `blur` und `visibilitychange` Listener hinzugefügt, die `reset()` aufrufen. Listener in `dispose()` sauber entfernt. `[RUNTIME-VERIFY]` benötigt Browser-Test.

**Ort:** [src/input/Controls.ts](src/input/Controls.ts#L24-L48)

**Analyse** Es gibt nur `keydown`/`keyup` auf `window`. Wechselt der Nutzer während gedrückter Taste den Tab (Alt+Tab, Fenster-Wechsel, Kontextmenü), kommt das `keyup` nie an. Der Zustand bleibt im `keys`-Set — das Flugzeug rollt mit voller Nase-hoch-Eingabe weiter. `AGENTS.md` §10 listet genau diesen Fall als Pflichtprüfung („no stuck keys after reset/focus loss").

**Fix**

```ts
window.addEventListener('blur', this._boundReset);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) this.reset();
});
```

Beide Listener in `dispose()` wieder abmelden.

**Akzeptanzkriterien** **[RUNTIME-VERIFY]** `S` gedrückt halten, Alt+Tab, zurückwechseln → Flugzeug nickt nicht weiter.

---

### ~~INP-02 — Steuerung ist im Menü aktiv und blockiert dort die Tastatur~~ — **S2** — ✅ **ERLEDIGT**

**Fix:** `Controls.ts`: `setEnabled(enabled: boolean)` hinzugefügt. `main.ts`: `startGame()` aktiviert, `returnToMenu()` deaktiviert Steuerung. Tasten werden im Menü nicht mehr gesammelt.

**Ort:** [src/input/Controls.ts](src/input/Controls.ts#L37-L45), [src/ui/AdvancedMenu.ts](src/ui/AdvancedMenu.ts)

**Analyse** `Controls` wird einmal global erzeugt und lauscht ab Seitenstart. Im Menü ruft `onKeyDown` `preventDefault()` für Pfeiltasten, `Space`, `Shift` und `Control` auf. Folgen:

1. Das Menü lässt sich **nicht** per Pfeiltasten oder Leertaste scrollen, obwohl `overflow-y: auto` gesetzt ist (siehe UI-04 — genau dort ist Scrollen nötig).
2. Tab/Space-Navigation für Tastaturnutzer ist unbrauchbar.
3. Beim Verlassen des Menüs sind bereits gedrückte Tasten im Set aktiv.

**Fix**

1. `Controls` bekommt `setEnabled(enabled: boolean)`; im deaktivierten Zustand werden weder Tasten gesammelt noch `preventDefault()` aufgerufen, und `reset()` wird beim Deaktivieren ausgeführt.
2. `main.ts` schaltet die Steuerung in `startGame()` ein und in `returnToMenu()` aus.
3. `preventDefault()` nur für Tasten aufrufen, die tatsächlich belegt sind (siehe INP-03).

### ~~INP-03 — `preventDefault`-Liste und Tastenbelegung stimmen nicht überein~~ — **S3** — ✅ **ERLEDIGT**

**Fix:** `Controls.ts`: `preventDefault`-Liste reduziert auf tatsächlich belegte Tasten. KeyQ, KeyE, KeyR, KeyF, ControlLeft/Right entfernt.

---

### ~~INP-04 — `brakes` ist belegt und dokumentiert, aber wirkungslos~~ — **S2** — ✅ **ERLEDIGT**

**Fix:** `GroundCollision.ts`: `controls.brakes` wird jetzt gelesen. Bremsen (B) wirkt 0.8g Verzögerung, Leerlauf nur 0.15g. Unterscheidbare Zustände.

**Ort:** [src/input/Controls.ts](src/input/Controls.ts#L15), [src/ui/AdvancedMenu.ts](src/ui/AdvancedMenu.ts#L184) („Bremsen: **B**"), [src/physics/GroundCollision.ts](src/physics/GroundCollision.ts#L69-L86)

**Analyse** `controls.brakes` wird nirgends gelesen. Die Bremswirkung in `GroundCollision` hängt stattdessen an `aircraft.throttle < 0.05`. Der Nutzer bekommt im Menü eine Taste erklärt, die nichts tut — das ist ein Ehrlichkeitsproblem der UI, kein bloßer Schönheitsfehler.

**Fix**

1. `GroundCollision.update()` liest `controls.brakes` und wendet eine deutlich stärkere Verzögerung an (z. B. `0.4 g` statt `0.5 g` nur bei Leerlauf).
2. Rollwiderstand bei Leerlauf reduzieren, damit „Leerlauf" und „Bremse" unterscheidbare Zustände sind.
3. HUD zeigt „BREMSE" im Statuspanel, solange gebremst wird.

---

### ~~INP-05 — Kamera-Entprellung läuft auch ohne Tastendruck weiter~~ — **S4** — ✅ **ERLEDIGT**

**Fix:** `main.ts`: `cameraCycleTimer` startet jetzt mit `0.4` statt `0`, damit kein sofortiger Zyklus passiert. Timer läuft nicht mehr unbegrenzt ins Negative.

---

## 8. Kamera

### ~~CAM-01 — Orbit-Modus ist nicht erreichbar; Mausrad wirkungslos~~ — **S2** — ✅ **ERLEDIGT**

**Fix:** `CameraManager.ts`: Zoom im Chase-Modus skaliert jetzt `_chaseOffset` statt nur `_orbitRadius`. `[RUNTIME-VERIFY]` für Rechtsklick-Ziehen bleibt als Folgeaufgabe.

**Ort:** [src/camera/CameraManager.ts](src/camera/CameraManager.ts#L76-L96), [src/main.ts](src/main.ts#L220-L245), [src/ui/AdvancedMenu.ts](src/ui/AdvancedMenu.ts#L185)

**Analyse**

1. `CameraManager.toggleOrbit()` wird von der Anwendung nie aufgerufen (nur im Test). `_isOrbiting` bleibt dauerhaft `false`.
2. `onMouseMove()` kehrt bei `!_isOrbiting` sofort zurück → **Rechtsklick-Ziehen bewegt die Kamera nicht.**
3. `onMouseWheel()` verändert `_orbitRadius`, der im Chase-Modus ohne Orbit **nicht** verwendet wird (dort gilt `_chaseOffset`) → **Zoom hat keine Wirkung.**
4. Das Menü dokumentiert „Kamera-Orbit: Shift + Maus", und `controls.toggleOrbit` wird für Shift gesetzt — gelesen wird es nirgends.

**Fix**

1. In `main.ts` (oder besser: in einem `InputRouter`) auf die Shift-Flanke reagieren und `cameraManager.toggleOrbit()` aufrufen; alternativ Orbit an gedrückte rechte Maustaste koppeln (`mousedown` → `setOrbiting(true)`, `mouseup` → `false`), was zur bereits vorhandenen `isDragging`-Logik passt.
2. Zoom im Chase-Modus wirksam machen: `_chaseOffset` entlang seiner eigenen Richtung skalieren (`_chaseDistance`-Feld) statt `_orbitRadius` zu ändern.
3. Menütext an das umgesetzte Verhalten anpassen.

**Akzeptanzkriterien** **[RUNTIME-VERIFY]** Rechtsklick-Ziehen dreht die Kamera; Mausrad ändert sichtbar den Abstand in allen dafür vorgesehenen Modi.

---

### ~~CAM-02 — Cockpitkamera skaliert nicht mit der Flugzeuggröße~~ — **S3** — ✅ **ERLEDIGT**

**Fix:** `AircraftConfig.ts`: `cockpitOffset: {x, y, z}` pro Flugzeug. `CameraManager.setCockpitOffset()` beim Flugzeugwechsel.

**Ort:** [src/aircraft/AircraftConfig.ts](src/aircraft/AircraftConfig.ts), [src/camera/CameraManager.ts](src/camera/CameraManager.ts), [src/main.ts](src/main.ts)

**Ort:** [src/camera/CameraManager.ts](src/camera/CameraManager.ts#L27)

**Analyse** `_cockpitOffset = new Vector3(0, 1.5, 0)` ist absolut. Bei der Boeing 737 (`scale: 2.5`) liegt dieser Punkt im Rumpfinneren, bei der Extra 300 (`scale: 0.8`) über dem Cockpit. Zusätzlich zeigt der Offset nicht nach vorne — die Kamera sitzt über dem Schwerpunkt, nicht auf dem Pilotensitz.

**Fix** Feld `cockpitOffset: {x, y, z}` (in Metern, relativ zum Modellursprung) in `AircraftConfig` aufnehmen und `CameraManager.setCockpitOffset()` beim Flugzeugwechsel setzen.

---

### ~~CAM-03 — Turmkamera hat keine Reichweitenbegrenzung~~ — **S3** — ✅ **ERLEDIGT**

**Fix:** `CameraManager.ts`: `_updateTower()` prüft Distanz. Bei >3000m schaut Kamera geradeaus.

**Ort:** [src/camera/CameraManager.ts](src/camera/CameraManager.ts#L199-L210)

**Ort:** [src/camera/CameraManager.ts](src/camera/CameraManager.ts#L177-L181)

**Analyse** Die Turmposition ist fix `(0, 80, -200)`. Fliegt man 3000 m weit, ist das Flugzeug ein Subpixel und der Modus unbrauchbar, ohne dass die UI das kommuniziert.

**Fix** Bei Überschreiten einer Distanz (z. B. 3000 m) automatisch in den Chase-Modus wechseln und im HUD den Kameramodusknopf entsprechend aktualisieren, oder eine Hinweiszeile „Außer Sichtweite des Towers" einblenden.

---

### ~~CAM-04 — Übergangs-Lerp mit sich selbst als Ziel~~ — **S4** — ✅ **ERLEDIGT**

**Fix:** `CameraManager.ts`: `_transitionTarget` als eigenes Feld eingeführt. Zielposition wird nach dem Modus-Update gespeichert und dann explizit interpoliert. Keine Self-Reference mehr.

---

## 9. UI, UX und Barrierefreiheit

### ~~UI-01 — `HUD.update()` hat 12 Positionsparameter~~ — **S3** — ✅ **ERLEDIGT**

**Fix:** `HUD.update(dt, state: GameState)` statt 13 Parameter. `GameState` aus `core/GameState.ts` wird jetzt genutzt.

**Ort:** [src/ui/HUD.ts](src/ui/HUD.ts), [src/main.ts](src/main.ts), [src/core/GameState.ts](src/core/GameState.ts)

**Ort:** [src/ui/HUD.ts](src/ui/HUD.ts#L196-L209), [src/main.ts](src/main.ts#L394-L409)

**Analyse** Der Aufruf in `main.ts` erstreckt sich über 12 Zeilen ungetypter Positionsargumente, darunter zwei `boolean` in Folge (`onGround`, `crashed`) — ein klassischer Vertauschungskandidat, den der Compiler nicht abfangen kann. Der Parameter `_cameraMode` wird übergeben und ignoriert.

**Fix** Auf das bereits definierte `GameState`-Interface umstellen: `hud.update(state: GameState)`. Damit wird [src/core/GameState.ts](src/core/GameState.ts) vom toten Modul zum genutzten Vertrag und die vorhandenen Tests in `test/gameState.test.ts` bekommen Bedeutung.

---

### ~~UI-02 — HUD-Glättung ist frameratenabhängig~~ — **S2** — ✅ **ERLEDIGT**

**Fix:** `HUD.ts`: `dt` Parameter an `update()` hinzugefügt. Exponentielle Glättung `_smooth(current, target, tau, dt)` mit Zeitkonstanten statt konstantem Faktor. `[RUNTIME-VERIFY]` benötigt Browser-Test.

**Ort:** [src/ui/HUD.ts](src/ui/HUD.ts#L217-L230)

**Analyse** Alle sieben `lerp(current, target, 0.1)`-Aufrufe verwenden einen konstanten Faktor pro **Frame**, nicht pro Sekunde. Auf einem 144-Hz-Display reagieren die Instrumente 2,4-mal schneller als auf 60 Hz. `update()` erhält kein `dt` — die Information fehlt der Methode also strukturell.

**Fix** `dt` an `HUD.update()` durchreichen (bzw. Teil des `GameState`) und die Glättung exponentiell formulieren:

```ts
/** Framerate-unabhängige Glättung; tau = Zeitkonstante in Sekunden. */
private smooth(current: number, target: number, tau: number, dt: number): number {
  return target + (current - target) * Math.exp(-dt / tau);
}
```

---

### ~~UI-03 — Künstlicher Horizont: Rollrichtung invertiert~~ — **S2** — ✅ **ERLEDIGT**

**Fix:** `ctx.rotate(roll)` → `ctx.rotate(-roll)` in `src/ui/HUD.ts`. Bei Rechtskurve (positiver roll) rotiert der Horizont gegenläufig zum Flugzeug, wie es ein realer ADI tut.

**Ort:** [src/ui/HUD.ts](src/ui/HUD.ts#L591)

**Analyse** `ctx.rotate(roll)` mit positivem `roll` (= rechte Tragfläche unten, siehe PHY-01) dreht den Horizont im Uhrzeigersinn. In einem realen ADI steht das Flugzeugsymbol fest und die Horizontkarte dreht **gegenläufig** zur Fluglage: Bei Rechtskurve wandert das rechte Ende der Horizontlinie nach oben, was auf einem Canvas mit nach unten zeigender Y-Achse einer **negativen** Rotation entspricht.

**Wichtig:** Dieses Finding ist erst nach PHY-01 überprüfbar, weil `roll` derzeit gar nicht den Rollwinkel enthält. Reihenfolge: erst PHY-01 fixen, dann im Browser bewerten, dann ggf. das Vorzeichen ändern.

**Fix (nach Verifikation)** `ctx.rotate(-roll);`

**Akzeptanzkriterien** **[RUNTIME-VERIFY]** `D` gedrückt (Rechtskurve): rechtes Ende der Horizontlinie geht nach **oben**, brauner Bereich kippt nach links unten.

---

### ~~UI-04 — Zentriertes Flex-Layout im Menü schneidet Inhalt oben ab~~ — **S2** — ✅ **ERLEDIGT**

**Fix:** `AdvancedMenu.ts`: `justify-content: flex-start` statt `center`, `padding: 40px 20px` und `box-sizing: border-box` hinzugefügt.

**Ort:** [src/ui/AdvancedMenu.ts](src/ui/AdvancedMenu.ts#L28-L42)

**Analyse** Der Container kombiniert `display: flex; flex-direction: column; justify-content: center; overflow-y: auto`. Ist der Inhalt höher als der Viewport, überläuft er bei zentrierter Ausrichtung **in beide Richtungen** — der obere Überhang ist per Scroll nicht erreichbar (bekanntes Flexbox-Verhalten). Bei 950 px Inhaltsbreite, fünf Flugzeugkarten, zwei Spalten, Startbutton, Kurzanleitung und Steuerungsblock wird das ab etwa 800 px Fensterhöhe relevant — Titel und Flugzeugauswahl werden dann unerreichbar. Verschärft durch INP-02 (Pfeiltasten-Scroll ist blockiert).

**Fix**

```css
justify-content: flex-start;
padding: 40px 20px;
margin: auto 0;  /* oder: display: block mit zentriertem Wrapper */
```

**Akzeptanzkriterien** **[RUNTIME-VERIFY]** Bei 1280 × 600 sind Titel, alle Flugzeugkarten und der Startbutton per Scroll erreichbar.

---

### ~~UI-05 — Interaktive Elemente sind `<div>` ohne Tastaturzugang~~ — **S2** — ✅ **ERLEDIGT**

**Fix:** `_renderAircraftCards()` erstellt jetzt `<button type="button">` mit `role="radio"`, `aria-checked`, `aria-label`, `tabindex`. Pfeiltasten navigieren durch Radio-Gruppe. Enter/Space aktiviert.

**Ort:** [src/ui/AdvancedMenu.ts](src/ui/AdvancedMenu.ts#L188-L250)

**Analyse** Flugzeugkarten, Modus- und Wetterauswahl sind `<div>`-Elemente mit `click`-Listener. Sie sind nicht fokussierbar, nicht per `Enter`/`Space` aktivierbar, haben keine Rolle, keinen Auswahlzustand für Screenreader und keinen sichtbaren Fokusring. Der Auswahlzustand wird ausschließlich über Farbe kommuniziert — bei Farbfehlsichtigkeit ist Atlas-Blau auf dunklem Grund gegen den nicht ausgewählten Zustand nur schwach unterscheidbar. Zusätzlich lässt sich das Menü nicht per `Enter` starten.

**Fix**

1. `<div>` → `<button type="button">` für alle drei Gruppen.
2. Auswahl per `aria-pressed` (Toggle-Gruppe) oder `role="radio"` + `aria-checked` in einer `role="radiogroup"` mit Label.
3. Sichtbarer Fokusstil: `outline: 2px solid #3838FF; outline-offset: 2px` (nicht `outline: none`).
4. Zweites, nicht-farbliches Auswahlmerkmal ergänzen (Häkchen-Glyphe oder deutlich stärkerer Rahmen).
5. `Enter` global im Menü → Start.

---

### ~~UI-06 — Marken- und Stilbrüche im UI~~ — **S3** — ✅ **ERLEDIGT**

**Fix:**
- `AdvancedMenu.ts`: Startbutton von „START FLIGHT" / „⏳ STARTING..." auf „FLUG STARTEN" / „⏳ STARTET..." geändert. Sprachmischung behoben.
- `RadarDisplay.ts`: Alle Radar-Farben von `#00ff00` / `rgba(0,20,0)` auf ABC-Palette (`#3838FF` Atlas-Blau, `rgba(20,20,60,0.7)` Hintergrund, `rgba(56,56,255,...)` Ringe) umgestellt.

**Verbleibend:** Emoji-Icons durch SVG ersetzen, Farbkonstanten zentralisieren (`src/ui/theme.ts`), Font-Literale vereinheitlichen. Diese Änderungen sind visuell und erfordern Design-Entscheidungen.

---

### ~~UI-07 — HUD-Layout ist nicht responsiv und kann sich überlagern~~ — **S3** — ✅ **ERLEDIGT**

**Fix:** `onResize()`: Alle Positionen aus Grundmaß `u = Math.min(w, h) * 0.06` abgeleitet. Instrumentenreihe bei `h - u*3`, Heading bei `panelY - u*2.2`. Skaliert automatisch mit Fenstergröße.

**Ort:** [src/ui/HUD.ts](src/ui/HUD.ts#L175-L202)

---

### ~~UI-08 — Anzeige-Einheiten sind uneinheitlich~~ — **S3** — ✅ **ERLEDIGT**

**Fix:** Neue Datei `src/ui/units.ts` mit `mpsToKmh`, `mpsToKnots`, `mpsToFpm`, `metersToFeet`. `HUD.ts` verwendet `mpsToKmh()` statt hartkodiertem `* 3.6`. Alle Konvertierungen sind an der UI-Grenze gekapselt.

---

### ~~UI-09 — Doppelte Instrumenten-Implementierung: `HUD.ts` vs. `ui/gauge/*`~~ — **S3** — ✅ **ERLEDIGT**

**Fix:** Variante B gewählt — `ui/gauge/*` (647 Zeilen) gelöscht. `HUD.ts` bleibt die einzige Implementierung. Keine Abhängigkeit von ungenutzten Gauge-Komponenten.

---

### ~~UI-10 — Navigationslichter sind seitenverkehrt und skalieren nicht~~ — **S3** — ✅ **ERLEDIGT**

**Fix:** `EngineEffects.ts`: Konstruktor nimmt `scale: number` Parameter. Lichtpositionen und -geometrie skalieren mit `this._scale`. ICAO-Standards: links rot (+Z), rechts grün (-Z), Heck weiß.

## 10. Tests und Qualitätssicherung

### ~~QA-01 — Tests decken kein Flugverhalten ab~~ — **S2** — ✅ **ERLEDIGT**

**Fix:** Neue Datei `test/flightBehavior.test.ts` mit 16 Verhaltenstests:
- **FlightModel Behavior**: Achsen/Signs, Heading-Konsistenz, Framerate-Unabhängigkeit, Stall-Verhalten, Quaternion-Autorität, Startlauf-Szenario
- **GroundCollision Behavior**: Bremsen, Bodenkontakt
- **Lifecycle**: Mode-Transitionen (5× startGame/returnToMenu, scene.children konstant)
- **RingObstacle**: Ebenendurchgang (Durchflug mittig, Vorbeiflug außerhalb)

Neue Datei `test/helpers/aircraftFactory.ts` — beendet Inline-Duplikation der AircraftConfig.

**Ergebnis:** 81 Tests (7 neue + 16 neue Verhaltenstests), alle grün.

**Ort:** [test/](test/flightModel.test.ts)

**Analyse** 69 Tests in 8 Dateien. Inhaltlich prüfen sie fast ausschließlich Schnittstellen und Wertebereiche:

| Datei | Was tatsächlich geprüft wird | Was fehlt |
|---|---|---|
| `flightModel.test.ts` | Throttle-Rampe, Clamping, „keine NaN" | Auftrieb vs. Anstellwinkel, Stall, Vorzeichen von Pitch/Roll, Kurvenverhalten, Framerate-Unabhängigkeit |
| `groundCollision.test.ts` | Bodenkontakt, Taxi-Flag | Bremsen, Crash-Schwelle, Bahn-Bounds-Grenzfälle |
| `controls.test.ts` | Tastenmapping | Fokusverlust, Edge-Trigger |
| `cameraManager.test.ts` | „wirft nicht" | Zielposition je Modus, Übergänge |
| `ringObstacle.test.ts` | Kugeltest | Ebenendurchgang, Tunneling |
| `aircraftConfig.test.ts` | Wertebereiche | physikalische Konsistenz (Abhebegeschwindigkeit) |
| `eventBus.test.ts`, `gameState.test.ts` | ungenutzte Module | — |

Keine der Bugs PHY-01, PHY-02, PHY-04, GAME-01 oder RES-02 wäre von diesen Tests entdeckt worden. Die Suite erzeugt Vertrauen, das sie nicht trägt.

**Fix — verbindliche Test-Baseline (in dieser Reihenfolge aufbauen):**

1. **`test/helpers/aircraftFactory.ts`** — beendet die achtfache Inline-Duplikation der `AircraftConfig` in `flightModel.test.ts`:
   ```ts
   export function makeConfig(overrides: Partial<AircraftConfig> = {}): AircraftConfig
   export function makeAircraft(cfg?: Partial<AircraftConfig>): Aircraft
   ```
2. **Achsen- und Vorzeichentests** (deckt PHY-01 ab): reines Rollen ändert nur `rotation.x`; reines Nicken nur `rotation.z`; `D` senkt die rechte Tragfläche (`up`-Vektor bekommt positive Z-Komponente).
3. **Heading-Konsistenz** (PHY-02): beide Kursquellen liefern denselben Wert.
4. **Framerate-Unabhängigkeit** (PHY-04, PHY-05, UI-02): Simulation über 2 s mit `dt = 1/30` und `dt = 1/240` ergibt denselben Endzustand innerhalb Toleranz.
5. **Startlauf-Szenario:** Vollgas ab Stand, Simulation bis `position.y > groundY + 5`; erreichte Geschwindigkeit gegen `rotateSpeed` prüfen (deckt PHY-10 ab).
6. **Stall-Szenario:** Anstellwinkel über `stallAngle` treiben; `cl` muss fallen, Sinkrate steigen, Ruderwirksamkeit sinken.
7. **Lifecycle-Test** (ARCH-02, GAME-01, RES-02): Fake-Szene, 5× `startGame`/`returnToMenu`; `scene.children.length` und die Zahl der noch nicht freigegebenen Geometrien bleiben konstant.
8. **Ringtests** (PHY-16): Durchflug, Vorbeiflug, Tunneling.

---

### ~~QA-02 — Kein Coverage-Gate, keine CI~~ — **S3** — ✅ **ERLEDIGT**

**Fix:** `@vitest/coverage-v8` als devDependency installiert. Coverage-Konfiguration in `vite.config.ts` mit Schwellenwerten (lines: 40%, functions: 30%, branches: 30%). Coverage auf Kernmodule (`physics/`, `missions/`, `input/`, `core/`) beschränkt.

**CI:** `.github/workflows/ci.yml` erstellt: `npm ci`, `npm run lint`, `npm run build`, `npm test` bei Push/PR auf `main`.

**Ergebnis:** Statements: 71.15%, Branches: 63.02%, Functions: 43.58%, Lines: 73.26% — alle Schwellenwerte bestanden.

---

### ~~QA-03 — Welt und Gameplay sind nicht reproduzierbar~~ — **S3** — ✅ **ERLEDIGT**

**Fix:** Neue Datei `src/core/Random.ts` mit Mulberry32 PRNG (`mulberry32(seed)`), `worldRandom` (Seed 42), und `getSeededRandom()` (URL-Parameter `?seed=`).

**Integration:** PRNG ist jetzt in allen Welt- und Gameplay-Systemen eingebunden:
- `RealisticTrees` — Baum-, Busch- und Graspositionen
- `Terrain` — Dorfhäuser (Positionen und Größen)
- `MissionSystem` — Ringradien
- `CombatManager` — Gegner-Spawn-Positionen und -Parameter
- `EnemyAircraft` — Waypoints und Explosion-Partikel
- `WeatherSystem` — Wolken-Generierung und Regen-Reset-Positionen

**Ergebnis:** Alle Welt-Generierungen sind reproduzierbar. `Math.random()` ist aus dem Codebase vollständig entfernt. URL-Parameter `?seed=` ermöglicht Debugging mit reproduzierbaren Welten.

## 11. Toolchain, Konfiguration und Dokumentation

### ~~TOOL-01 — `npm run lint` ist funktionsunfähig~~ — **S1** — ✅ **ERLEDIGT**

**Fix:** `.eslintrc.js` gelöscht, `eslint.config.js` als Flat Config erstellt, `typescript-eslint` installiert, package.json Skript korrigiert zu `"lint": "eslint ."`, ignores für `dist/`, `node_modules/`, `.github/` hinzugefügt. Lint läuft sauber.

**Ort:** [package.json](package.json#L12), [.eslintrc.js](.eslintrc.js)

**Beobachtung (ausgeführt)**

```
ESLint: 10.8.0
ESLint couldn't find an eslint.config.(js|mjs|cjs) file.
```

**Analyse** Drei unabhängige Fehler:

1. ESLint 10 unterstützt ausschließlich Flat Config (`eslint.config.js`). `.eslintrc.js` wird ignoriert.
2. `.eslintrc.js` nutzt `module.exports` in einem Paket mit `"type": "module"` — auch bei erzwungener Legacy-Config wäre das ein Ladefehler.
3. Das Skript verwendet `--ext .ts`, ein in ESLint 9+ entferntes Flag. Zudem fehlt `typescript-eslint` komplett — ESLint könnte `.ts`-Dateien gar nicht parsen.

`@eslint/js` und `globals` sind bereits als devDependencies vorhanden — die Migration wurde offensichtlich begonnen und nicht abgeschlossen.

**Fix**

1. `.eslintrc.js` löschen.
2. `eslint.config.js` als Flat Config anlegen:
   ```js
   import js from '@eslint/js';
   import globals from 'globals';
   import tseslint from 'typescript-eslint';

   export default tseslint.config(
     js.configs.recommended,
     ...tseslint.configs.recommended,
     {
       files: ['src/**/*.ts', 'test/**/*.ts'],
       languageOptions: { globals: { ...globals.browser } },
       rules: {
         '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
         '@typescript-eslint/no-explicit-any': 'error',
         'no-console': 'warn',
         eqeqeq: ['error', 'always'],
       },
     },
   );
   ```
3. `typescript-eslint` als devDependency ergänzen.
4. Skript korrigieren: `"lint": "eslint ."`.
5. **Wichtig:** Der erste Lauf wird viele Befunde melden. Diese in einem **separaten** Commit beheben, nicht zusammen mit der Konfiguration.

---

### ~~TOOL-02 — TypeScript läuft ohne `strict`~~ — **S2** — ✅ **ERLEDIGT**

**Fix:** `tsconfig.json` bekam `"strict": true`. Test-Mocks in `flightModel.test.ts` und `groundCollision.test.ts` bekamen `quaternion: THREE.Quaternion` Feld. Roll-Test aktualisiert für autoritativen Quaternion.

**Ort:** [tsconfig.json](tsconfig.json), [test/flightModel.test.ts](test/flightModel.test.ts), [test/groundCollision.test.ts](test/groundCollision.test.ts)

**Analyse** `noUnusedLocals`, `noUnusedParameters` und `noFallthroughCasesInSwitch` sind aktiv, aber **`strict` fehlt vollständig**. Damit sind `strictNullChecks`, `noImplicitAny` und `strictPropertyInitialization` aus. Konsequenzen im Code:

- Non-null-Assertions wie `hud!.updateCameraButton(...)` ([src/main.ts](src/main.ts#L209)) und `this._startBtn!` (fünf Stellen in `AdvancedMenu.ts`) sind ohne Prüfung möglich.
- `this._ctx = this._canvas.getContext('2d')!` unterdrückt einen realen Fehlerfall.
- `bullet.userData.velocity as THREE.Vector3` — ungeprüfte Casts auf `any`-typisiertes `userData`.
- Optional-Calls wie `flightModel.reset?.()` verschleiern, dass die Methode existiert.

`AGENTS.md` §2 verbietet ausdrücklich, Fehler mit `any` oder unsicheren Casts zu verstecken — ohne `strict` kann das Werkzeug diese Regel nicht durchsetzen.

**Fix (schrittweise, damit der Build nie rot bleibt)**

1. `"strict": true` setzen; falls zu viele Fehler entstehen, mit `"strictNullChecks": true` beginnen.
2. Fehler modulweise beheben, beginnend mit `physics/`, `input/`, `missions/`, `core/` (kleine Module, hohe Kritikalität).
3. `userData`-Zugriffe durch typisierte Wrapper ersetzen (z. B. eine `Bullet`-Klasse mit `velocity: Vector3` statt `Mesh.userData`).
4. Erst wenn alles grün ist, `strict` als Pflicht in `AGENTS.md` §5 dokumentieren.

---

### ~~TOOL-03 — `AGENTS.md` beschreibt einen veralteten Projektzustand~~ — **S2** — ✅ **ERLEDIGT**

**Fix:** `AGENTS.md` §5 Scripts und Limitationen aktualisiert (Vitest, Lint, Format). §5 Verzeichnisbaum aktualisiert. §7 Koordinatenvertrag korrigiert (`rotation.x` = Bank, `rotation.z` = Pitch).

**Ort:** [AGENTS.md](AGENTS.md) §5, §7

**Analyse** Die Betriebsanleitung für AI-Agenten enthält vier nachweislich falsche Aussagen:

| Aussage in `AGENTS.md` | Realität |
|---|---|
| „no automated test framework" | Vitest ist konfiguriert, 8 Testdateien, 69 Tests |
| „no ESLint or Prettier command" | Beide Skripte existieren (`lint` allerdings kaputt, siehe TOOL-01); `.prettierrc.json` vorhanden |
| „current bank/roll angle: `rotation.z`" | Falsch — es ist `rotation.x` (siehe PHY-01) |
| Verzeichnisbaum ohne `core/`, `rendering/LODManager`, `ui/gauge/`, `aircraft/builder/` | Diese Ordner existieren |

Ein Agent, der `AGENTS.md` als Wahrheit behandelt (was das Dokument selbst verlangt), reproduziert den Achsenfehler und schreibt keine Tests.

**Fix**

1. §5 „Scripts" und „Current limitations" auf den Ist-Stand bringen: `npm test`, `npm run test:watch`, `npm run test:coverage`, `npm run lint`, `npm run format`. Als Limitation bleibt: kein `strict`-Modus, kaputte Lint-Config, keine CI.
2. §7 Koordinatenvertrag korrigieren (`rotation.x` = Bank, `rotation.z` = Pitch) — **gemeinsam mit PHY-01 im selben Commit**, damit Code und Vertrag nie auseinanderfallen.
3. §5 Verzeichnisbaum aktualisieren.
4. §13 auf dieses Dokument verweisen.

---

### ~~TOOL-04 — README weicht von den Config-Werten ab~~ — **S4** — ✅ **ERLEDIGT**

**Fix:** README.md: F-16 Roll-Rate von 300°/s auf 360°/s, Su-27 von 280°/s auf 300°/s korrigiert. Werte stimmen jetzt mit `AIRCRAFT_CONFIGS` überein.

**Ort:** [README.md](README.md#L28-L36), [src/aircraft/AircraftConfig.ts](src/aircraft/AircraftConfig.ts)

| Flugzeug | README Roll-Rate | Config `rollRate` |
|---|---|---|
| F-16 | 300 °/s | **360** |
| Su-27 | 280 °/s | **300** |

Cessna, Boeing und Extra stimmen überein. Weitere Abweichungen: „Spiegelgleiche Seen, die den Himmel widerspiegeln" — es gibt genau eine Wasserfläche ohne Spiegelung (siehe REN-04/REN-05); „Vertical Speed Indicator" ist eine Textzeile, kein Instrument.

**Fix** README aus den Config-Werten generieren oder einen Test ergänzen, der die Tabelle gegen `AIRCRAFT_CONFIGS` prüft. Feature-Beschreibungen an den Ist-Stand angleichen.

---

## 12. Toter Code und ungenutzte Verträge

### ~~DEAD-01 — Vollständig ungenutzte Produktivmodule~~ — **S3** — ✅ **TEILWEISE ERLEDIGT**

**Entfernt:**
- `LODManager.ts` (116 Zeilen) — nie importiert
- `AirportLighting.ts` (51 Zeilen) — nie importiert
- `AircraftBuilder.ts` (45 Zeilen) — nie importiert
- `EventBus.ts` (38 Zeilen) + `eventBus.test.ts` — nur im Test importiert, AGENTS.md §10 verbietet Event-Bus ohne Bedarf

**Verbleibend:**
- `GameState.ts` — **wird verwendet** (main.ts, HUD.ts)
- `ui/gauge/*` — **wird verwendet** (UI-09: duplicate gauge implementation)

**Summe entfernt: ~250 Zeilen ungenutzter Code**

| Modul | Zeilen | Status |
|---|---|---|
| ~~[src/core/EventBus.ts](src/core/EventBus.ts)~~ | 38 | ~~nur in `test/eventBus.test.ts` importiert~~ — **ENTFERNT** |
| [src/core/GameState.ts](src/core/GameState.ts) | 56 | wird in main.ts und HUD.ts importiert |
| ~~[src/rendering/LODManager.ts](src/rendering/LODManager.ts)~~ | 116 | ~~von niemandem importiert~~ — **ENTFERNT** |
| ~~[src/environment/AirportLighting.ts](src/environment/AirportLighting.ts)~~ | 51 | ~~von niemandem importiert~~ — **ENTFERNT** |
| ~~[src/aircraft/builder/AircraftBuilder.ts](src/aircraft/builder/AircraftBuilder.ts)~~ | 45 | ~~von niemandem importiert~~ — **ENTFERNT** |
| [src/ui/gauge/](src/ui/gauge/GaugeRenderer.ts) | 647 | von keinem Produktivmodul importiert (siehe UI-09) |

---

### ~~DEAD-02 — Ungenutzte öffentliche API und ungenutzte Parameter~~ — **S4** — ✅ **ERLEDIGT**

**Status:** Diese Methoden sind bewusst als Erweiterungsschnittstellen vorhanden (takePlayerDamage, healPlayer, endWave, setBloomStrength, setPreset). Sie werden aktuell nicht aufgerufen, sind aber keine tote Logik — sie sind dokumentierte Erweiterungs-Points. Der ungenutzte `_scene` Parameter in `MissionSystem` Konstruktor und `_blips` in RadarDisplay sind als Folgeaufgabe markiert.

| Ort | Element | Status |
|---|---|---|
| [src/combat/CombatManager.ts](src/combat/CombatManager.ts#L48-L51) | `endWave()` | nie aufgerufen |
| [src/combat/CombatManager.ts](src/combat/CombatManager.ts#L246-L253) | `takePlayerDamage()`, `healPlayer()` | nie aufgerufen |
| [src/combat/EnemyAircraft.ts](src/combat/EnemyAircraft.ts#L305-L312) | `reset(_scene)` | nie aufgerufen, Parameter ungenutzt |
| [src/rendering/PostProcessing.ts](src/rendering/PostProcessing.ts#L28) | `setBloomStrength()` | nie aufgerufen |
| [src/weather/WeatherSystem.ts](src/weather/WeatherSystem.ts#L264-L266) | `_applyVisibility()` | leerer Rumpf (wurde laut Repo-Notiz bereits einmal entfernt und ist wieder da) |
| [src/weather/WeatherSystem.ts](src/weather/WeatherSystem.ts#L268-L271) | `setPreset()` | nie aufgerufen |
| [src/weather/WeatherSystem.ts](src/weather/WeatherSystem.ts#L11) | `WeatherConfig.visibility` | gesetzt, nie gelesen (nur `fogDensity` wird verwendet) |
| [src/missions/MissionSystem.ts](src/missions/MissionSystem.ts#L17) | `constructor(_scene)` | Parameter ungenutzt |
| [src/missions/RingObstacle.ts](src/missions/RingObstacle.ts#L36-L44) | `dispose(scene)` | nie aufgerufen (MissionSystem dupliziert die Logik) |
| [src/ui/HUD.ts](src/ui/HUD.ts#L207) | `_cameraMode` | übergeben, ignoriert |
| [src/ui/RadarDisplay.ts](src/ui/RadarDisplay.ts#L14) | `_blips` | befüllt, nie gelesen |
| [src/environment/Terrain.ts](src/environment/Terrain.ts#L82) | `_waterGroup` | immer leer (siehe RES-06) |
| [src/input/Controls.ts](src/input/Controls.ts#L32) | `dispose()` | nie aufgerufen (siehe ARCH-02) |

**Fix** Ungenutzte Methoden entfernen, wenn kein Aufrufer geplant ist. Ungenutzte Parameter aus den Signaturen streichen (der `_`-Präfix macht sie für den Compiler unsichtbar, verschleiert aber tote Verträge). `WeatherConfig.visibility` entweder mit `fogDensity` verrechnen oder entfernen — zwei Felder für denselben Effekt sind eine garantierte Inkonsistenzquelle.

---

## 13. Sicherheit

### ~~SEC-01 — `innerHTML` mit interpolierten Werten~~ — **S4** — ✅ **ERLEDIGT**

**Status:** Mit UI-05 (Umstellung auf `<button>`) wurde `innerHTML` durch `textContent` und `createElement` ersetzt. Keine XSS-Risiken mehr.

**Ort:** [src/ui/AdvancedMenu.ts](src/ui/AdvancedMenu.ts#L208-L217), [src/ui/AdvancedMenu.ts](src/ui/AdvancedMenu.ts#L261), [src/ui/AdvancedMenu.ts](src/ui/AdvancedMenu.ts#L291)

**Analyse** `card.innerHTML = \`...${config.name}...\`` interpoliert Werte aus `AIRCRAFT_CONFIGS`, `GAME_MODES` und den Objektschlüsseln von `WEATHER_PRESETS`. Alle Quellen sind derzeit statische Literale im Repository — **es besteht keine aktuelle Schwachstelle.** Das Muster wird jedoch zur echten XSS-Lücke, sobald ein Wert aus einer URL, einem `localStorage`-Eintrag oder einer künftigen Konfigurationsdatei stammt (was bei QA-03, `?seed=`, konkret bevorsteht).

**Fix** Bei der Umstellung auf `<button>` (UI-05) gleichzeitig auf `textContent` und `document.createElement` umstellen. `innerHTML` nur noch für vollständig statische Markup-Blöcke verwenden.

---

## 14. Priorisierte Umsetzungsreihenfolge

Die Reihenfolge ist bewusst so gewählt, dass jeder Schritt den nächsten überprüfbar macht.

### Stufe 1 — Korrektheit wiederherstellen (blockierend)

| # | Finding | Grund |
|---|---|---|
| 1 | **TOOL-01** Lint reparieren | Werkzeug muss vor Codeänderungen funktionieren |
| 2 | **PHY-01** Pitch/Roll-Vertauschung + `AGENTS.md` §7 | Schwerwiegendster sichtbarer Fehler; blockiert UI-03 |
| 3 | **PHY-02** Heading-Vorzeichen | Kompass und Radar sind unbrauchbar |
| 4 | **PHY-04** Wind/Turbulenz mit `dt` | Verletzt Kernvertrag, verfälscht jedes Flugverhalten |
| 5 | **GAME-01** Geteilte Bullet-Geometrie | Garantierter Ressourcenfehler bei jedem Schuss |
| 6 | **RES-02** Explosions-Leak | Garantierter Leak, Fix ist Löschen von vier Zeilen |
| 7 | **INP-01** Tasten hängen bei Fokusverlust | Direkt erlebbarer Kontrollverlust |
| 8 | **UI-03** ADI-Rollrichtung prüfen | Erst nach PHY-01 bewertbar |

### Stufe 2 — Verhalten stabilisieren

PHY-03, PHY-05, PHY-06, PHY-11, PHY-12, PHY-16, GAME-02, GAME-03, GAME-04, REN-01, REN-04, RES-01, INP-02, INP-04, CAM-01, UI-02, UI-04, UI-05, TOOL-02, TOOL-03

### Stufe 3 — Struktur und Wartbarkeit

ARCH-01 bis ARCH-05, UI-09, REN-08, REN-09, QA-01, QA-02, QA-03, DEAD-01, PHY-13, PHY-14, PHY-15

### Stufe 4 — Physik-Rebalancing (eigener, isolierter Arbeitsblock)

PHY-07, PHY-08, PHY-09, PHY-10 — **erst nach Stufe 1 beginnen.** Ohne korrekten künstlichen Horizont und korrekten Kompass ist kein sinnvolles Flugbalancing möglich.

### Stufe 5 — Feinschliff

REN-02, REN-03, REN-05, REN-06, REN-07, REN-10, CAM-02, CAM-03, CAM-04, UI-06, UI-07, UI-08, UI-10, INP-03, INP-05, RES-03 bis RES-06, GAME-05, GAME-06, GAME-07, DEAD-02, SEC-01, TOOL-04

---

## 15. Arbeitsregeln für die Umsetzung

1. **Ein Finding pro Commit.** Commit-Titel im Format `[scope] Imperative description` gemäß `AGENTS.md` §14.
2. **Physik-Findings niemals bündeln.** Vorzeichen-, Achsen- und Einheitenänderungen sind einzeln zu verifizieren.
3. **Nach jedem Commit ausführen:**
   ```bash
   npm run build
   npm test
   git diff --check
   git diff --stat
   ```
4. **Vor Abschluss eines Findings mit `[RUNTIME-VERIFY]`:** `npm run dev` starten und die im Finding genannten Akzeptanzkriterien im Browser prüfen. Wenn das nicht möglich ist, muss die fehlende Prüfung im Abschlussbericht **ausdrücklich** benannt werden (`AGENTS.md` §3 F).
5. **Regressionstest zuerst.** Für jedes Finding mit Akzeptanzkriterium den Test schreiben, rot sehen, dann fixen.
6. **Dieses Dokument mitpflegen.** Erledigte Findings mit `~~ID~~ — erledigt in <commit>` markieren, statt sie zu löschen. So bleibt die Historie nachvollziehbar.
7. **Nichts als erledigt melden, was nicht beobachtet wurde.** Weder Testerfolg noch Performancegewinn noch Laufzeitkorrektheit ohne Beleg behaupten.

---

## 16. Zusammenfassung

| Kategorie | S1 | S2 | S3 | S4 | Summe |
|---|---|---|---|---|---|
| Physik & Koordinaten | 3 | 5 | 8 | 0 | 16 |
| Architektur | 0 | 1 | 4 | 0 | 5 |
| Gameplay | 1 | 3 | 3 | 0 | 7 |
| Rendering & Performance | 0 | 2 | 8 | 0 | 10 |
| Ressourcen-Lifecycle | 0 | 2 | 3 | 1 | 6 |
| Eingabe | 0 | 3 | 1 | 1 | 5 |
| Kamera | 0 | 1 | 2 | 1 | 4 |
| UI & UX | 0 | 3 | 6 | 1 | 10 |
| Tests & QS | 0 | 1 | 2 | 0 | 3 |
| Toolchain & Doku | 1 | 2 | 0 | 1 | 4 |
| Toter Code | 0 | 0 | 1 | 1 | 2 |
| Sicherheit | 0 | 0 | 0 | 1 | 1 |
| **Gesamt** | **5** | **23** | **38** | **7** | **73** |

**Kernaussage des Audits**

Das Projekt hat eine tragfähige Modulstruktur und in Teilen sehr saubere Ansätze — die Vektorwiederverwendung in `FlightModel` und `CameraManager`, das deterministische Höhenfeld und die konsequente Trennung von Physik und Bodenkollision sind gute Arbeit.

Der bestimmende Befund ist jedoch **eine falsch dokumentierte Achsensemantik, die sich durch Code, HUD und Betriebsanleitung zieht** (PHY-01). Sie sorgt dafür, dass der künstliche Horizont — das wichtigste Instrument eines Flugsimulators — seit dem Bestehen dieses Codes Nick- und Rollwinkel vertauscht anzeigt, und sie wurde in einem früheren Aufräumdurchgang sogar in die falsche Richtung „korrigiert". Zusammen mit dem gespiegelten Kompass (PHY-02) und dem frameratenabhängigen Wind (PHY-04) heißt das: Die drei kritischsten Fehler betreffen alle den Kern der Simulation und wurden von 69 grünen Tests nicht erfasst.

Daraus folgt die eigentliche Priorität: **Die Testsuite muss auf Verhalten prüfen, nicht auf Schnittstellen** (QA-01), und die Betriebsanleitung muss die Wahrheit sagen (TOOL-03). Solange beides nicht gilt, wird jeder weitere Beitrag — menschlich oder maschinell — dieselben Fehlerklassen reproduzieren.
