# AGENTS.md

## Project Overview

**Atlas Flight Simulator** is a browser-based 3D flight simulator built with Three.js, TypeScript, and Vite. It features realistic flight physics, multiple aircraft, an interactive terrain environment, and a mission system with ring obstacles.

- **Language**: TypeScript (ES2023)
- **3D Engine**: Three.js
- **Build Tool**: Vite
- **Target**: Web browser (no server required)

---

## Setup Commands

```bash
# Install dependencies
npm install

# Start development server with HMR
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

- The dev server runs on `http://localhost:5173` by default (Vite default).
- No backend or database is required — this is a client-side-only application.

---

## Architecture

```
src/
├── main.ts              # Entry point, scene setup, game loop
├── aircraft/
│   ├── Aircraft.ts      # 3D aircraft model builder (procedural geometry)
│   └── AircraftConfig.ts # Aircraft type definitions & flight parameters
├── camera/
│   └── ChaseCamera.ts   # Follow camera behind the aircraft
├── environment/
│   ├── Terrain.ts       # Procedural terrain (mountains, lakes, forests, clouds)
│   └── Runway.ts        # Runway with markings and bounds
├── input/
│   └── Controls.ts      # Keyboard input handler
├── missions/
│   ├── MissionSystem.ts # Mission orchestration & scoring
│   └── RingObstacle.ts  # Collectible ring obstacles
├── physics/
│   ├── FlightModel.ts   # Aerodynamic flight simulation
│   └── GroundCollision.ts # Terrain/runway collision detection
└── ui/
    ├── HUD.ts           # Cockpit instruments (Canvas API)
    └── AircraftSelector.ts # Pre-flight aircraft selection UI
```

### Key Design Patterns

| Pattern | Description |
|---------|-------------|
| **Scene Graph** | Three.js `Scene` → `Object3D` hierarchy for all 3D objects |
| **Game Loop** | `requestAnimationFrame` in `main.ts` drives update + render |
| **Component System** | Each subsystem (physics, camera, input) is a separate class |
| **Config-Driven Aircraft** | `AircraftConfig` defines all aircraft variants (Cessna, Boeing, Extra) |
| **Stateless Updates** | Physics and camera update from current state each frame |

---

## Code Style

- **TypeScript strict mode** — enabled in `tsconfig.json`
- **ES2023 target** — modern JS features are available
- **Bundler module resolution** — Vite handles imports
- **No semicolons** — follows standard TypeScript conventions
- **Class-based architecture** — one class per file, exported default or named
- **Three.js types** — imported from `@types/three`

### Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Classes | PascalCase | `FlightModel`, `ChaseCamera` |
| Variables | camelCase | `startPos`, `aircraft` |
| Constants | UPPER_SNAKE_CASE | `MAX_THROTTLE` |
| Files | PascalCase.ts | `Aircraft.ts` |

---

## Development Guidelines

### Adding a New Feature

1. Identify which subsystem the feature belongs to.
2. Create new files in the appropriate folder under `src/`.
3. Import and integrate the new module in `main.ts` (or the relevant parent module).
4. Ensure all Three.js objects are properly added to the scene and cleaned up when removed.

### Working with Three.js Objects

- Always add objects to the `scene` or a parent `Object3D` group.
- When removing objects, call `scene.remove()` and dispose of geometries/materials to avoid memory leaks.
- Use `THREE.Euler` with explicit order (`'YXZ'`) for aircraft rotation.

### Physics and Flight Model

- The `FlightModel` class handles aerodynamic calculations.
- Velocity, rotation, and forces are updated per frame in the game loop.
- Ground collision is checked separately via `GroundCollision`.
- Aircraft configs define stall speed, max speed, takeoff speed, and roll rates.

### UI and HUD

- The HUD uses HTML Canvas for drawing cockpit instruments.
- Update HUD values each frame by reading from the `FlightModel` state.
- The `AircraftSelector` is a DOM-based overlay shown before flight starts.

---

## Common Tasks

### Add a New Aircraft Type

1. Add a new config entry in `AircraftConfig.ts` with all flight parameters.
2. Customize the procedural geometry in `Aircraft.ts` if the visual style differs.
3. Register the aircraft in `AircraftSelector.ts`.

### Add a New Environment Element

1. Create a new class in `src/environment/`.
2. Instantiate and add it to the scene in `main.ts`.
3. If it affects collision, update `GroundCollision.ts`.

### Modify the Mission System

1. Edit `MissionSystem.ts` for mission logic and scoring.
2. Create new obstacle types in `src/missions/` following `RingObstacle.ts` as a template.

---

## Build and Output

- `npm run build` produces a production bundle in `dist/`.
- The output is a single-page application (`index.html` + bundled JS/CSS).
- No server-side rendering — everything runs client-side.

---

## Debugging

### Three.js Debugging
- Use `scene.traverse()` to inspect object hierarchy
- Enable wireframe mode: `material.wireframe = true` to see geometry
- Use `THREE.Box3Helper` or `THREE.GridHelper` for spatial debugging
- Check `renderer.info` for memory/draw call statistics
- Use `console.log(obj.position, obj.rotation, obj.scale)` for transform debugging

### Common Issues
- **Object not visible**: Check if it's added to scene, camera frustum, and material visibility
- **Z-fighting**: Adjust near/far plane ratios or use polygon offset
- **Performance drops**: Check draw calls with `renderer.info.render.calls`, reduce geometry complexity
- **Memory leaks**: Always dispose geometries, materials, and textures when removing objects

### Console Logging
- Use `console.log()` sparingly in production builds
- Prefix logs with subsystem: `[FlightModel]`, `[HUD]`, `[MissionSystem]`
- Remove debug logs before committing

---

## Performance Guidelines

### Three.js Optimization
- Reuse geometries and materials where possible
- Use `InstancedMesh` for repeated objects (trees, rings)
- Limit shadow-casting objects to essential ones only
- Use `renderer.setPixelRatio()` capped at 2 (already implemented)
- Avoid creating new objects in the game loop (allocates garbage)

### Game Loop
- Keep frame updates under 16ms for 60fps
- Batch Three.js operations (avoid multiple scene modifications per frame)
- Use `requestAnimationFrame` (already implemented in main.ts)
- Cache frequently accessed properties outside loops

### Memory Management
```typescript
// When removing objects:
scene.remove(object);
object.geometry?.dispose();
if (Array.isArray(object.material)) {
  object.material.forEach(m => m.dispose());
} else {
  object.material?.dispose();
}
```

---

## Conventions

### Three.js-Specific
- Always use explicit Euler order `'YXZ'` for aircraft rotation
- Use `THREE.Vector3` for positions, `THREE.Euler` for rotations
- Scene objects should be added to parent groups, not directly to scene
- Use `Object3D` groups for logical grouping (aircraft parts, environment sections)

### Physics
- Time-based calculations should use delta time (not frame-based)
- Velocity is in m/s, positions in meters (Three.js units)
- Gravity constant: ~9.81 m/s²
- Aircraft configs define realistic speed ranges (km/h in config, converted to m/s in physics)

### UI/HUD
- Canvas-based HUD should match screen resolution
- Update HUD values from FlightModel state each frame
- DOM overlays (AircraftSelector) should be hidden/shown, not recreated

### Input Handling
- Keyboard state is tracked in Controls class
- Input is polled each frame, not event-driven
- Use key codes, not key values for consistency

---

## PR Guidelines

- **Title format**: `[scope] Description` — e.g., `[physics] Add wind resistance model`
- Keep changes focused on a single subsystem when possible.
- Ensure the dev server starts without TypeScript errors (`npm run dev`).
- Test in browser — verify 3D rendering, controls, and HUD updates work correctly.
- **Before merging**: Check for memory leaks (dispose objects), performance regressions (draw calls), and visual artifacts (z-fighting, clipping).