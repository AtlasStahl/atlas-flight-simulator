# Flight Simulator - Findings Report

**Datum:** 2026-08-02  
**Version:** v0.5.1 (nach Findings-Überarbeitung)  
**Total LOC:** ~6.800 (25 Dateien)

---

## ✅ Behoben

### 1. Dead Code - 5 verwaiste Dateien ✅

| Datei | Zeilen | Grund |
|-------|--------|-------|
| `src/ui/AircraftSelector.ts` | 173 | Von `AdvancedMenu.ts` ersetzt |
| `src/camera/ChaseCamera.ts` | 39 | Von `CameraManager.ts` ersetzt |
| `src/aircraft/FighterConfig.ts` | 212 | Konfig in `AircraftConfig.ts` integriert |
| `src/assets/GLBAssetLoader.ts` | 65 | Wird nirgends importiert |
| `src/ui/HUD.ts.bak` | 827 | Backup-Datei |

**Fix:** `git rm` für alle 5 Dateien

---

### 2. Duplizierter dispose-Code (4× identisch) ✅

In `main.ts` existierte derselbe traverse-dispose-Block 4×.

**Fix:** Eine Funktion `disposeGroup(group: THREE.Group)` extrahiert in `main.ts`

---

### 3. Unbegrenzter Terrain-Height-Cache ✅

`src/environment/Terrain.ts:87` — `_heightCache` ist eine `Map<string, number>` ohne Limit.

**Fix:** LRU-Cache mit max 10.000 Einträgen

---

### 4. MissionSystem dispose-Lücke ✅

`src/missions/MissionSystem.ts` entfernte Ringe aus der Szene, disposed aber keine Geometrien.

**Fix:** dispose() für mesh.geometry und mesh.material hinzugefügt

---

### 5. Console.logs in main.ts ✅

**Fix:** Alle 3 console.log-Anweisungen entfernt

---

### 6. Package.json nicht produktionsreif ✅

**Fix:** `"name": "@atlas/flight-simulator"`, `"version": "0.5.0"`

---

### 7. HUD Gauge-Infrastruktur ✅

**Fix:** Neue `src/ui/gauge/` Struktur angelegt:
- `HUDTheme.ts` - Aircraft-spezifische Themes und Scales
- `GaugeRenderer.ts` - Gemeinsame Canvas-Zeichenfunktionen
- `AirspeedGauge.ts` - Beispiel-Gauge-Klasse

---

## 🟡 Mittel (noch offen)

### 8. God-Module (zu große Dateien)

| Datei | Zeilen | Problem |
|-------|--------|---------|
| `Aircraft.ts` | 1.539 | 5 Flugzeuge prozedural modelliert |
| `HUD.ts` | 1.001 | Drawing, State, Themes, Layout |
| `AirportVehicles.ts` | 925 | Statische Fahrzeuge (~28KB) |
| `AirportBuildings.ts` | 655 | Statische Gebäude (~21KB) |

**Priorität:**  
- `HUD.ts` → Split in Gauge-Klassen (AirspeedGauge, AltimeterGauge, etc.)  
- `Aircraft.ts` → AircraftBuilder-Pattern  
- `AirportVehicles.ts` + `AirportBuildings.ts` → InstancedMesh + Frustum Culling

---

### 9. Keine Linting-Tools

Kein ESLint, Prettier oder ähnliches konfiguriert.

**Aufwand:** 30 min  
**Fix:** `npm i -D eslint prettier` + Config-Dateien

---

## 🟢 Niedrig (noch offen)

### 10. Keine InstancedMesh für Vegetation

Bäume, Gras und Büsche werden als individuelle Meshes erstellt. Bei ~1.000+ Bäumen sind das ~1.000+ Draw Calls.

**Aufwand:** 2-3 Std  
**Fix:** `THREE.InstancedMesh` für Bäume und Gras

---

### 11. Kein LOD-System

Kein Level-of-Detail für Objekte in der Ferne.

**Aufwand:** 1-2 Std  
**Fix:** `THREE.LOD` für Bäume, Fahrzeuge, Gebäude

---

### 12. Starke Kopplung

- `HUD.update()` hat 13 Parameter
- `FlightModel.update()` mutiert `Aircraft` direkt
- `GroundCollision` kennt `RunwayBounds`

**Aufwand:** 4-6 Std  
**Fix:** Event Bus + GameState-Container

---

### 13. Keine Tests

Kein Test-Framework, keine Test-Dateien.

**Aufwand:** 4+ Std  
**Fix:** Vitest (passt zu Vite) + Unit Tests für Physics

---

## 📊 Zusammenfassung

| Priorität | Anzahl | Aufwand (min) | Status |
|-----------|--------|---------------|--------|
| ✅ Behoben | 7 | ~120 | **Fertig** |
| 🟡 Mittel | 2 | ~75 | Offen |
| 🟢 Niedrig | 4 | ~600+ | Offen |

**Quick Wins (2 Stunden):** ✅ Alle 6 Quick Wins umgesetzt

---

## ✅ Bereits behoben (v0.5.0)

- ✅ AoA (Angle of Attack) korrigiert
- ✅ Bank-to-Turn Physik (rotation.z statt rotation.x)
- ✅ Pitch/Roll-Richtung korrigiert
- ✅ Realistische Thrust-Werte (T/W-Verhältnis)
- ✅ Extra 300 Controls gedämpft
- ✅ Airport Blend Zone repariert
- ✅ Bäume nur auf flachem Terrain