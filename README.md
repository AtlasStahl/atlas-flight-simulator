# ✈️ Atlas Flight Simulator

> *Wo Träume von Schwerkraftfreiheit beginnen.*

![Flight Simulator](https://img.shields.io/badge/Three.js-3D-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Vite](https://img.shields.io/badge/Vite-5.0-646CFF)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 🌟 Über dieses Projekt

Willkommen bei **Atlas Flight Simulator** – einem Flugsimulator, der mit Leidenschaft für die Luftfahrt und moderne Web-Technologien gebaut wurde. 

Dieses Projekt ist mehr als nur Code. Es ist eine Huldigung an die Magie des Fliegens – von der ersten Bewegung auf der Startbahn bis zum ersten Blick auf die Welt aus der Vogelperspektive.

### 💡 Die Vision

Wir glauben, dass Fliegen zu den schönsten Erfahrungen gehört, die ein Mensch machen kann. Mit diesem Simulator möchten wir diese Erfahrung jedem zugänglich machen – direkt im Browser, ohne Installation, ohne Grenzen.

---

## 🎮 Was erwartet dich?

### ✈️ Drei einzigartige Flugzeuge

| Flugzeug | Charakter | Max Speed | Takeoff | Roll-Rate |
|----------|-----------|-----------|---------|-----------|
| 🛩️ **Cessna 172** | Der sanfte Lehrer | 371 km/h | 158 km/h | 120°/s |
| ✈️ **Boeing 737** | Das Schwergewicht | 850 km/h | 281 km/h | 60°/s |
| 🛫 **Extra 300** | Der Akrobat | 648 km/h | 140 km/h | 400°/s |

Jedes Flugzeug hat seine eigene Persönlichkeit – die Cessna ist sanft und verzeihend, die Boeing ist kraftvoll und majestätisch, und die Extra ist ein Kunststück der Akrobatik.

### 🏔️ Lebendige Welt

- **Majestätische Berge** mit schneebedeckten Gipfeln
- **Spiegelgleiche Seen**, die den Himmel wider spiegeln
- **Dichte Wälder** aus Hunderten von Bäumen
- **Dynamische Wolken**, die langsam über den Himmel ziehen
- **Start- und Landebahn** mit realistischen Markierungen

### 🎯 Missionen

- **Ring-Flug**: 8 grüne Ringe warten darauf, durchflogen zu werden
- **Score-System**: 100 Punkte pro Ring
- **Zeit-Tracking**: Wie schnell kannst du alle Ringe schaffen?

### 📊 Cockpit-Instrumente

- **Airspeed Indicator**: Deine Geschwindigkeit in Echtzeit
- **Altimeter**: Höhe über dem Meeresspiegel
- **Attitude Indicator**: Künstlicher Horizont mit Pitch & Roll
- **Heading Indicator**: Kompassrose für die Richtung
- **Vertical Speed Indicator**: Steig- oder Sinkrate
- **Throttle Gauge**: Gasstellung in Prozent

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
| `W` / `S` | Pitch (Nase hoch/runter) |
| `A` / `D` | Roll (Links/rechts neigen) |
| `Q` / `E` | Yaw (Gieren) |
| `↑` / `↓` | Gas hoch/runter |
| `G` | Klappen |
| `B` | Bremsen |
| `Esc` | Reset |

### Startsequenz

1. **Gas hochziehen** (`↑`) bis ~160 km/h
2. **Nase hochziehen** (`W`) bei Takeoff-Geschwindigkeit
3. **Abheben** – die Welt liegt vor dir!

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
├── aircraft/       # Flugzeug-Modelle & Konfiguration
├── camera/         # Chase-Kamera
├── environment/    # Terrain, Wolken, Startbahn
├── input/          # Tastatur-Steuerung
├── missions/       # Mission-System & Ringe
├── physics/        # Flugphysik & Kollision
├── ui/             # HUD & Instrumente
└── main.ts         # Game Loop
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