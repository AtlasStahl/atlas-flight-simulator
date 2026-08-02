# Flight Simulator - Findings Report

**Datum:** 2026-08-02  
**Version:** v0.6.0 (Umfassende Code-Analyse)  
**Total LOC:** ~7.200 (28 Dateien)

---

## 🔴 Kritische Physik- und Steuerungsprobleme

### 1. FlightModel: Veraltete Vektoren durch shared temp-Objekte

**Datei:** `src/physics/FlightModel.ts`  
**Schwere:** 🔴 Kritisch

```typescript
// Zeile 25-30: Shared temp vectors werden mehrfach pro Frame wiederverwendet
private _tempVec1 = new THREE.Vector3();
private _tempVec2 = new THREE.Vector3();
private _tempVec3 = new THREE.Vector3();
```

**Problem:** `_tempVec1` wird in der Lift-Berechnung, dann in der Velocity-Zerlegung und dann in der Position-Integration wiederverwendet. Da Three.js-Vektoren per Reference kopiert werden, kann dies zu korrupten Werten führen.

**Beispiel:** Zeile 161:
```typescript
aircraft.position.add(this._tempVec1.copy(aircraft.velocity).multiplyScalar(dt));
```
Dies überschreibt den Vektor, der noch in der Velocity-Zerlegung verwendet wird.

**Fix:** Separate temp-Vektoren für jede Berechnung oder `.clone()` bei kritischen Operationen.

---

### 2. FlightModel: Bank-to-Turn mit rotation.z ist fehlerhaft

**Datei:** `src/physics/FlightModel.ts:148`  
**Schwere:** 🔴 Kritisch

```typescript
const bankAngle = aircraft.rotation.z;
```

**Problem:** Bei Euler-Reihenfolge `'YXZ'` ist `rotation.z` NICHT der reine Rollwinkel. Nach Yaw und Pitch-Transformation ist die Euler-Darstellung gekoppelt. Ein reiner Rollwinkel kann nicht durch `rotation.z` extrahiert werden.

**Symptom:** Flugzeug dreht sich unvorhersehbar, besonders bei hohen Pitch-Winkeln (Gimbal Lock).

**Fix:** Bank-Winkel aus Quaternion berechnen:
```typescript
const forward = new THREE.Vector3(1, 0, 0).applyQuaternion(aircraft.group.quaternion);
const worldUp = new THREE.Vector3(0, 1, 0);
const bankAngle = Math.asin(forward.clone().cross(worldUp).z);
```

---

### 3. FlightModel: Pitch/Roll-Invertierung ist inkonsistent

**Datei:** `src/physics/FlightModel.ts:183-185`  
**Schwere:** 🔴 Kritisch

```typescript
const rollInput = (controls.rollLeft ? 1 : 0) - (controls.rollRight ? 1 : 0);
const pitchInput = (controls.pitchDown ? 1 : 0) - (controls.pitchUp ? 1 : 0);
```

**Problem:** Die Invertierung der Pitch-Eingabe ist korrekt, aber die Roll-Eingabe ist NICHT invertiert. In `Controls.ts` ist `rollLeft = KeyA`, was zu "A = linkes Ruder runter" führen sollte, aber die Vorzeichenrichtung hängt von der Euler-Reihenfolge ab.

**Symptom:** A/D-Tasten steuern die Rollrichtung falsch oder inkonsistent.

**Fix:** Die Roll-Eingabe muss mit der Euler-Reihenfolge `'YXZ'` konsistent sein. Testen mit:
```typescript
const rollRate = -rollInput * (aircraft.config.rollRate * Math.PI / 180) * controlFactor;
```

---

### 4. FlightModel: AoA-Berechnung bei niedriger Geschwindigkeit

**Datei:** `src/physics/FlightModel.ts:60-65`  
**Schwere:** 🟡 Mittel

```typescript
if (speed > 0.5) {
  this._velocityDir.copy(aircraft.velocity).normalize();
  // ...
}
```

**Problem:** Bei Geschwindigkeiten unter 0.5 m/s wird AoA auf 0 gesetzt, aber der Übergang ist diskontinuierlich. Bei 0.501 m/s kann AoA plötzlich hoch sein, was zu einem Lift-Sprung führt.

**Symptom:** Flugzeug "springt" beim Starten oder bei sehr langsamer Geschwindigkeit.

**Fix:** Smooth transition:
```typescript
if (speed > 0.5) {
  const blendFactor = Math.min(1, (speed - 0.5) / 2.0);
  // AoA mit blendFactor multiplizieren
}
```

---

### 5. GroundCollision: Takeoff-Bedingung zu restriktiv

**Datei:** `src/physics/GroundCollision.ts:68-72`  
**Schwere:** 🔴 Kritisch

```typescript
if (speed >= aircraft.config.rotateSpeed * 0.8 && controls.pitchUp) {
  this._taxiMode = false;
  aircraft.velocity.y = 3; // Initial upward velocity
  aircraft.position.y = groundY + 2;
  return;
}
```

**Problem:** 
1. `speed >= rotateSpeed * 0.8` bedeutet, dass die Cessna bei 35 m/s (126 km/h) abheben kann, aber die tatsächliche Lift-Berechnung benötigt mehr Geschwindigkeit.
2. `aircraft.velocity.y = 3` setzt eine feste Aufwärtsbewegung, die nicht von der aerodynamischen Lift-Berechnung abhängt.
3. `aircraft.position.y = groundY + 2` teleportiert das Flugzeug 2 Meter in die Luft.

**Symptom:** Flugzeug "springt" in die Luft statt sanft abzuheben.

**Fix:** Sanfter Takeoff:
```typescript
if (speed >= aircraft.config.rotateSpeed * 0.8 && controls.pitchUp) {
  this._taxiMode = false;
  aircraft.velocity.y = Math.max(aircraft.velocity.y, 1.0);
  // Kein Position-Teleport
}
```

---

### 6. GroundCollision: Taxi-Steuerung überschreibt Rotation

**Datei:** `src/physics/GroundCollision.ts:58-63`  
**Schwere:** 🟡 Mittel

```typescript
if (speed > 1) {
  const turnRate = 1.5 * dt;
  if (controls.rollLeft) aircraft.rotation.z += turnRate;
  if (controls.rollRight) aircraft.rotation.z -= turnRate;
  // Keep level on ground
  aircraft.rotation.x *= 0.95;
  aircraft.rotation.y *= 0.95;
}
```

**Problem:** Direkte Manipulation von `aircraft.rotation.z` während `FlightModel` die Rotation über Quaternionen aktualisiert. Dies führt zu Konflikten zwischen den beiden Systemen.

**Symptom:** Flugzeug wackelt auf dem Boden oder dreht sich unvorhersehbar.

**Fix:** Taxi-Rotation über das gleiche Quaternion-System wie `FlightModel` steuern.

---

### 7. Controls: Pitch-Steuerung ist umgekehrt

**Datei:** `src/input/Controls.ts:48-49`  
**Schwere:** 🔴 Kritisch

```typescript
this.pitchUp = this.keys.has('KeyS');
this.pitchDown = this.keys.has('KeyW');
```

**Problem:** S = Pitch Up (Nase hoch) ist korrekt für Flugsimulatoren, aber die Dokumentation und die HUD-Anzeige zeigen "W/S" ohne klare Zuordnung. Die meisten Spieler erwarten W = Nase hoch.

**Symptom:** Neue Spieler sind verwirrt, weil W/S die falsche Richtung steuert.

**Fix:** HUD-Steuerungsanzeige aktualisieren oder Standard-W = Nase hoch verwenden.

---

### 8. AircraftConfig: Unrealistische Thrust-to-Weight-Verhältnisse

**Datei:** `src/aircraft/AircraftConfig.ts`  
**Schwere:** 🟡 Mittel

| Flugzeug | Thrust (N) | Masse (kg) | T/W | Realistisch |
|----------|-----------|-----------|-----|-------------|
| Cessna 172 | 1,300 | 1,100 | 0.12 | ✅ (0.1-0.15) |
| Boeing 737 | 242,000 | 53,000 | 0.46 | ⚠️ (0.3-0.35) |
| Extra 300 | 2,500 | 700 | 0.31 | ✅ (0.25-0.35) |
| F-16 | 128,000 | 13,000 | 0.99 | ⚠️ (1.1-1.3 mit Afterburner) |
| Su-27 | 222,000 | 23,000 | 0.91 | ⚠️ (1.0-1.2 mit Afterburner) |

**Problem:** Boeing 737 hat zu viel Schub (46% T/W statt 35%). F-16 und Su-27 haben zu wenig Schub (sollten >1.0 sein).

**Symptom:** Boeing ist zu schnell, Kampfflugzeuge sind zu langsam.

**Fix:** 
- Boeing: `maxThrust: 185000`
- F-16: `maxThrust: 160000`
- Su-27: `maxThrust: 260000`

---

## 🟡 Architektur- und Designprobleme

### 9. HUD: 13 Parameter in update()-Methode

**Datei:** `src/ui/HUD.ts`  
**Schwere:** 🟡 Mittel

```typescript
hud.update(
  speed, altitude, heading, throttle, verticalSpeed,
  pitch, roll, onGround, crashed, missionData,
  cameraMode, combatData
);
```

**Problem:** 13 Parameter machen die Methode schwer zu warten und fehleranfällig.

**Fix:** GameState-Objekt verwenden:
```typescript
hud.update(gameState);
```

---

### 10. main.ts: Module-Level-Variablen statt GameState

**Datei:** `src/main.ts`  
**Schwere:** 🟡 Mittel

```typescript
let aircraft: Aircraft | null = null;
const flightModel = new FlightModel();
const groundCollision = new GroundCollision(...);
const cameraManager = new CameraManager(camera);
const controls = new Controls();
let hud: HUD | null = null;
let radar: RadarDisplay | null = null;
let engineEffects: EngineEffects | null = null;
let menu: AdvancedMenu | null = null;
let selectedAircraft: string = 'cessna';
let selectedWeather: string = 'clear';
let selectedGameMode: GameMode = GameMode.FREE_FLIGHT;
```

**Problem:** 14+ Module-Level-Variablen machen den Code schwer zu testen und zu warten.

**Fix:** `GameState`-Objekt verwenden (bereits in `src/core/GameState.ts` angelegt).

---

### 11. FlightModel: Keine reset()-Methode

**Datei:** `src/physics/FlightModel.ts`  
**Schwere:** 🟡 Mittel

```typescript
// In main.ts:148
flightModel.reset?.();
```

**Problem:** `FlightModel` hat keine `reset()`-Methode. Der optionale Call `reset?.()` tut nichts.

**Symptom:** Bei Neustart des Spiels behält die Physik den alten Zustand.

**Fix:** `reset()`-Methode in `FlightModel` implementieren.

---

### 12. EnemyAircraft: Keine dispose()-Methode

**Datei:** `src/combat/EnemyAircraft.ts`  
**Schwere:** 🟡 Mittel

**Problem:** `EnemyAircraft` erstellt Geometrien und Materialien, aber `cleanup()` disposed sie nicht korrekt.

**Fix:** `cleanup()`-Methode mit korrektem dispose hinzufügen.

---

## 🟢 Performance-Probleme

### 13. RealisticTrees: Slope-Detection ist ineffizient

**Datei:** `src/environment/RealisticTrees.ts`  
**Schwere:** 🟢 Niedrig

```typescript
const hLeft = this._getHeight(x - 5, z);
const hRight = this._getHeight(x + 5, z);
const hFront = this._getHeight(x, z - 5);
const hBack = this._getHeight(x, z + 5);
```

**Problem:** 4 zusätzliche `getHeight()`-Aufrufe pro Baum (mit Cache-Lookup). Bei 1.000 Bäumen = 4.000 zusätzliche Cache-Einträge.

**Fix:** Slope-Detection nur alle 10 Bäume durchführen und interpolieren.

---

### 14. CombatManager: Neue Geometrien pro Schuss

**Datei:** `src/combat/CombatManager.ts:183`  
**Schwere:** 🟢 Niedrig

```typescript
const bulletGeo = new THREE.SphereGeometry(0.3, 4, 4);
const bulletMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
```

**Problem:** Jeder Schuss erstellt neue Geometrie und Material. Bei schnellem Feuer = viel Garbage Collection.

**Fix:** Object Pooling für Projektile verwenden.

---

### 15. PostProcessing: PCFSoftShadowMap ist deprecated

**Datei:** `src/main.ts:31`  
**Schwere:** 🟢 Niedrig

```typescript
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
```

**Problem:** Three.js warnt, dass `PCFSoftShadowMap` deprecated ist.

**Fix:** `THREE.PCFShadowMap` verwenden.

---

## 🔵 UI/UX-Probleme

### 16. HUD: Steuerungsanzeige ist irreführend

**Datei:** `src/ui/HUD.ts`  
**Schwere:** 🟡 Mittel

**Problem:** Die HUD-Anzeige zeigt "Pitch: W/S" ohne zu klarmachen, dass S = Nase hoch ist.

**Fix:** Anzeige aktualisieren: "Pitch: S=hoch, W=niedrig"

---

### 17. AdvancedMenu: Keine visuelle Rückmeldung beim Start

**Datei:** `src/ui/AdvancedMenu.ts`  
**Schwere:** 🟢 Niedrig

**Problem:** Beim Klick auf "START FLIGHT" gibt es keine Ladeanimation oder Feedback.

**Fix:** Kurze Ladeanimation oder Button-Disable hinzufügen.

---

### 18. RingObstacle: Keine Kollisionsprüfung mit Flugzeug-Größe

**Datei:** `src/missions/RingObstacle.ts`  
**Schwere:** 🟢 Niedrig

```typescript
if (dist < this._radius * 1.5) {
  this._passed = true;
}
```

**Problem:** Die Kollisionsprüfung verwendet nur den Abstand zum Ringzentrum, nicht die Flugzeuggröße.

**Fix:** Flugzeug-Radius in die Kollisionsberechnung einbeziehen.

---

## 📊 Zusammenfassung

| Kategorie | Anzahl | Schwere |
|-----------|--------|---------|
| 🔴 Kritisch (Physik/Steuerung) | 7 | Sofort beheben |
| 🟡 Mittel (Architektur) | 5 | Nächstes Sprint |
| 🟢 Niedrig (Performance/UI) | 6 | Backlog |
| **Gesamt** | **18** | |

---

## 🔴 Sofort zu beheben (Priorität 1)

1. **FlightModel: rotation.z für Bank-Winkel** → Quaternion-basierte Berechnung
2. **GroundCollision: Takeoff-Teleport** → Sanfter Übergang
3. **Controls: Pitch-Steuerung** → Dokumentation oder Standard ändern
4. **FlightModel: Shared temp-Vektoren** → Separate Vektoren oder .clone()
5. **AircraftConfig: T/W-Verhältnisse** → Realistische Werte
6. **GroundCollision: Taxi-Rotation** → Quaternion-basiert
7. **FlightModel: reset()-Methode** → Implementieren

---

## ✅ Bereits behoben (v0.6.0)

- ✅ Dead Code entfernt (5 Dateien, ~1.300 Zeilen)
- ✅ disposeGroup() Helper extrahiert
- ✅ Terrain Cache mit LRU-Limit (10.000 Einträge)
- ✅ MissionSystem dispose-Lücke geschlossen
- ✅ Console.logs entfernt
- ✅ Package.json professionell konfiguriert
- ✅ HUD Gauge-Klassen (6 neue Dateien)
- ✅ Aircraft Builder-Pattern angelegt
- ✅ ESLint + Prettier konfiguriert
- ✅ LOD-System implementiert
- ✅ Event Bus + GameState System
- ✅ Vitest Tests eingerichtet (3 Test-Dateien, 10 Tests)
- ✅ InstancedMesh für Vegetation (bereits vorhanden)