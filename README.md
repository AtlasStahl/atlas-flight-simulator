# ✈️ Atlas Flight Simulator

> *Wo Träume von Schwerkraftfreiheit beginnen.*

![Flight Simulator](https://img.shields.io/badge/Three.js-3D-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue)
![Vite](https://img.shields.io/badge/Vite-8.0-646CFF)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 🌟 Über dieses Projekt

Willkommen bei **Atlas Flight Simulator** – einem Flugsimulator, der mit Leidenschaft für die Luftfahrt und moderne Web-Technologien gebaut wurde.

Dieses Projekt ist mehr als nur Code. Es ist eine Huldigung an die Magie des Fliegens – von der ersten Bewegung auf der Startbahn bis zum ersten Blick auf die Welt aus der Vogelperspektive.

### 💡 Die Vision

Wir glauben, dass Fliegen zu den schönsten Erfahrungen gehört, die ein Mensch machen kann. Mit diesem Simulator möchten wir diese Erfahrung jedem zugänglich machen – direkt im Browser, ohne Installation, ohne Grenzen.

---

## 🎮 Was erwartet dich?

### ✈️ Fünf einzigartige Flugzeuge

| Flugzeug | Charakter | Max Speed | Abheben | Roll-Rate |
|----------|-----------|-----------|---------|-----------|
| 🛩️ **Cessna 172** | Der sanfte Lehrer | 371 km/h | 158 km/h | 120°/s |
| ✈️ **Boeing 737** | Das Schwergewicht | 850 km/h | 281 km/h | 60°/s |
| 🛫 **Extra 300** | Der Akrobat | 792 km/h | 100 km/h | 420°/s |
| ⚡ **F-16 Fighting Falcon** | Der Jäger | 1260 km/h | 288 km/h | 360°/s |
| 🔥 **Su-27 Flanker** | Der Russe | 1368 km/h | 306 km/h | 300°/s |

Jedes Flugzeug hat seine eigene Persönlichkeit – die Cessna ist sanft und verzeihend, die Boeing ist kraftvoll und majestätisch, und die Extra ist ein Kunststück der Akrobatik.

### 🏔️ Lebendige Welt

- **Majestätische Berge** mit schneebedeckten Gipfeln
- **Spiegelgleiche Seen**, die den Himmel widerspiegeln
- **Dichte Wälder** aus Hunderten von Bäumen
- **Dynamische Wolken**, die langsam über den Himmel ziehen
- **Start- und Landebahn** mit realistischen Markierungen
- **Flughafenfahrzeuge** mit Vorfeldbeleuchtung

### 🎯 Missionen

- **Freiflug**: Erkunde die Welt ohne Einschränkungen
- **Ring-Flug**: 8 grüne Ringe warten darauf, durchflogen zu werden (100 Punkte pro Ring)
- **Kampfmission**: Besiege feindliche Flugzeuge in Wellen

### 📊 Cockpit-Instrumente

- **Airspeed Indicator**: Deine Geschwindigkeit in Echtzeit (km/h)
- **Altimeter**: Höhe über dem Meeresspiegel
- **Attitude Indicator**: Künstlicher Horizont mit Pitch & Roll
- **Heading Indicator**: Kompassrose für die Richtung
- **Vertical Speed Indicator**: Steig- oder Sinkrate
- **Throttle Gauge**: Gasstellung in Prozent
- **Stall-Warnung**: Pulsierende Warnung bei Überziehgeschwindigkeit

---

## 🚀 Schnellstart

### Installation

```bash
# Klonen
git clone https://github.com/AtlasStahl/atlas-flight-simulator.git
cd atlas-flight-simulator

# Dependencies installieren
npm install

# Entwicklungsserver starten
npm run dev

# Production-Build
npm run build
```

### Steuerung

| Taste | Aktion |
|-------|--------|
| `S` / `W` | Pitch (Nase hoch/runter) |
| `A` / `D` | Roll (Links/rechts neigen) |
| `←` / `→` | Yaw (Gieren) |
| `↑` / `↓` | Gas hoch/runter |
| `G` | Klappen (erhöht Auftrieb beim Start) |
| `B` | Bremsen |
| `C` | Kamera-Modus wechseln |
| `Shift` + Maus | Kamera-Orbit |
| `Space` / `V` | Schießen (Kampfmodus) |
| `Esc` | Menü / Reset |

### Startsequenz

1. **Gas hochziehen** (`↑`) bis ~160 km/h (Cessna)
2. **Nase hochziehen** (`S` gedrückt halten) bei Abhebegeschwindigkeit
3. **Abheben** – die Welt liegt vor dir!
4. **Klappen** (`G`) für besseren Auftrieb beim Start

> 💡 **Tipp:** Die Cessna 172 ist das beste Flugzeug für Anfänger – sanft, verzeihend und perfekt zum Üben.

---

## 🛠️ Technologie-Stack

- **Three.js**: 3D-Rendering im Browser
- **TypeScript**: Type-sichere Entwicklung
- **Vite**: Schneller Build & Hot Module Replacement
- **Canvas API**: Cockpit-Instrumente

---

## 📁 Projektstruktur

```
src/
├── aircraft/       # Flugzeug-Modelle, Konfiguration & Effekte
├── camera/         # Kamera-Modi (Chase, Cockpit, Kino, Turm)
├── combat/         # Kampfsystem & feindliche Flugzeuge
├── core/           # EventBus & GameState
├── environment/    # Terrain, Bäume, Wasser, Startbahn, Flughafen
├── game/           # Spielmodi-Definitionen
├── input/          # Tastatur-Steuerung
├── missions/       # Ring-Missionen & Punkte
├── physics/        # Flugphysik & Bodenkollision
├── rendering/      # Atmosphäre, Post-Processing, LOD
├── ui/             # HUD, Radar, AdvancedMenu, Instrumente
├── weather/        # Wettersystem & Effekte
└── main.ts         # Game Loop & Komposition
```

---

## 🤝 Mitwirken

Wir freuen uns über jeden Beitrag! Ob Bugfixes, neue Features, oder Verbesserungen – jeder Pull Request ist willkommen.

1. Fork das Repository
2. Erstelle einen Feature-Branch (`git checkout -b feature/amazing-feature`)
3. Commit deine Changes (`git commit -m 'Add amazing feature'`)
4. Push zum Branch (`git push origin feature/amazing-feature`)
5. Öffne einen Pull Request

---

## 📜 Lizenz

Dieses Projekt ist unter der MIT-Lizenz lizenziert – siehe [LICENSE](LICENSE) für Details.

---

## 🙏 Danksagungen

- **Three.js** für das amazing 3D-Rendering
- **Vite** für den schnellen Build-Prozess
- **TypeScript** für type-sichere Entwicklung
- **AtlasStahl** für das Hosting und die Unterstützung

---

**⭐ Wenn dir der Simulator gefällt, gib uns einen Star auf GitHub!**

**🛫 Viel Spaß beim Fliegen!**

---

*Made with ❤️ by AtlasStahl*
