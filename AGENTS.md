# AGENTS.md

Operating contract for AI coding agents working on **Atlas Flight Simulator**.
Treat every rule below as project policy, not optional advice.

## 1. Objective

Maintain a stable, understandable browser flight simulator built with TypeScript, Three.js, and Vite.

Priority order:

1. Correct behavior
2. Runtime stability
3. Maintainability
4. Predictable performance
5. Visual polish
6. Feature breadth

Prefer the smallest coherent change that fully solves the task.

## 2. Hard Rules

- Inspect before editing: read the target code, imports, callers, related types, and configuration.
- Verify repository facts: never invent files, symbols, scripts, APIs, package versions, or test commands.
- Keep scope narrow: do not mix features, refactors, dependency upgrades, formatting, and cleanup without necessity.
- Preserve behavior outside the task: especially controls, physics signs, units, camera behavior, UI state, and mode lifecycle.
- Do not hide errors with `any`, `@ts-ignore`, disabled checks, empty catches, unsafe casts, or fake fallbacks.
- Do not add or upgrade dependencies unless the task genuinely requires it.
- Never hand-edit `package-lock.json` or generated files in `dist/`.
- Do not leave placeholders, stubs, temporary logs, or unexplained TODOs.
- Inspect `git status` before edits and protect unrelated user changes.
- Do not commit, push, create branches, or rewrite history unless explicitly requested.
- Never claim completion, test success, performance improvement, or runtime correctness without observed evidence.

## 3. Required Agent Workflow

### A. Understand

Before changing code:

- extract the requested behavior and acceptance criteria
- identify affected subsystems and regression risks
- separate confirmed facts from assumptions
- resolve ambiguity from the repository before guessing

For multi-file or behavior-changing tasks, maintain a short task list containing:

- files to inspect
- files expected to change
- invariants to preserve
- validation to run

### B. Inspect

At minimum:

1. Read the relevant implementation as a contiguous section.
2. Search all call sites, imports, related types, and state owners.
3. Read `package.json`, `tsconfig.json`, `FINDINGS.md`, and any nearer `AGENTS.md` when relevant.
4. Check installed types or official documentation before using an uncertain Three.js or browser API.
5. For bugs, trace the data flow to the first incorrect value; do not patch only the visible symptom.

### C. Plan

Choose one concrete approach and state internally:

- root cause or design goal
- smallest safe change
- affected files
- preserved invariants
- validation method

Do not merge several speculative approaches into one implementation.

### D. Implement

- Make small, reviewable edits.
- Preserve public interfaces unless changing them is necessary.
- Separate behavior changes from structural refactors where possible.
- Re-open or diff every changed file; never assume an edit succeeded.
- Run an early build after structural changes instead of accumulating unchecked edits.
- Integrate cross-subsystem changes one boundary at a time.

### E. Validate

For every source change, run:

```bash
npm run build
git diff --check
git status --short
git diff --stat
git diff
```

`npm run build` is mandatory because it runs TypeScript compilation and the Vite production build.

For runtime, visual, input, physics, or lifecycle changes, also run:

```bash
npm run dev
```

Then perform the relevant browser checks in Section 10. Build success alone does not prove runtime correctness.

### F. Report

The final response must state:

- what changed
- which files changed
- which checks were actually run
- which checks could not be run
- genuine remaining risks

## 4. Anti-Drift Rules for Local Models

- Inspect every tool result before selecting the next action.
- Do not stop immediately after writing code; pass the completion gate in Section 12.
- Re-read the user task after large edits and map every requested behavior to an implemented change.
- Debug with one active hypothesis and one focused change at a time.
- On command failure, fix the first actionable root cause; avoid shotgun changes.
- If a file or symbol is missing, search for its current replacement instead of recreating obsolete code.
- If an API is uncertain, verify it before coding.
- Prefer explicit state, units, ownership, and contracts over inferred behavior.
- If a tool call is empty or malformed, inspect repository state and retry with a smaller explicit operation.
- Never infer success from silence or from a plausible-looking diff.
- Keep progress notes concise; use tools rather than replacing verification with speculation.

## 5. Repository Facts

### Stack

- TypeScript targeting ES2023
- Three.js
- Vite
- Browser-only application
- No backend or database

### Scripts

```bash
npm install       # Install/update dependencies only when needed
npm run dev       # Start Vite development server
npm run build     # TypeScript compile + Vite production build
npm run preview   # Preview production bundle
```

Current limitations:

- no automated test framework
- no ESLint or Prettier command
- no full TypeScript strict mode (`strict: true` is not configured)

Do not claim that tests, linting, or strict mode exist when they do not.

### Current Structure

```text
src/
├── main.ts                  # Composition root and game loop
├── aircraft/                # Aircraft model, config, effects
├── camera/                  # CameraManager and camera modes
├── combat/                  # Combat lifecycle and enemies
├── environment/             # Terrain, runway, airport, water, vegetation
├── game/                    # Game-mode definitions
├── input/                   # Keyboard state and control mapping
├── missions/                # Ring mission and scoring
├── physics/                 # FlightModel and GroundCollision
├── rendering/               # Atmosphere and post-processing
├── ui/                      # Menu, HUD, radar, reusable gauges
└── weather/                 # Weather visuals and flight effects
```

This map can become outdated. Verify paths before editing.

## 6. Architecture and Ownership

### Composition Root

`main.ts` may create, connect, update, and reset subsystems. Do not place substantial new physics, UI drawing, environment generation, combat logic, or rendering algorithms directly in it.

### Physics

- `FlightModel` owns aerodynamic forces, rotation, velocity, and position integration.
- `GroundCollision` owns terrain/runway contact behavior.
- Physics code must not manipulate DOM, menus, or unrelated scene objects.
- Do not duplicate collision or flight rules in UI, camera, or game-loop code.

### Aircraft

- Keep aircraft parameters and units in `AircraftConfig.ts`.
- Keep procedural geometry and aircraft state in aircraft modules.
- Do not scatter aircraft-specific constants across physics, HUD, menu, and combat code.

### UI

- UI displays state; it is not the authority for simulation state.
- Do not create DOM elements or canvases in per-frame updates.
- Keep display smoothing separate from authoritative values.

### Environment and Rendering

- Environment systems expose narrow queries such as terrain height or runway bounds.
- Rendering helpers may read state but must not own gameplay rules.
- Large repeated populations should use shared resources or instancing where practical.

### Missions, Combat, Weather, and Camera

Each subsystem owns its lifecycle. Start/reset/cleanup must not leave duplicate objects, stale references, timers, listeners, or update work.

Avoid circular imports. Prefer explicit constructor parameters, typed state objects, and narrow interfaces.

## 7. Physics and Coordinate Contracts

Treat these as compatibility contracts:

- world up: `+Y`
- gravity: `-Y`
- aircraft forward: local `+X`
- Euler order: `'YXZ'`
- current bank/roll angle: `rotation.z`
- position: meters
- velocity and configured speeds: meters per second
- mass: kilograms
- forces/thrust: Newtons
- wing area: square meters
- configured angular rates: degrees per second, converted before rotation
- delta time: seconds; motion must never be frame-count-based
- display units such as knots, km/h, feet, and ft/min: convert at UI boundaries

Before changing any sign, axis, rotation order, or unit:

1. trace every producer and consumer
2. state the expected positive direction
3. verify controls, camera, HUD, collision, and effects
4. test the complete maneuver, not only one numeric value

Never “fix” unusual physics math without validating the whole coordinate convention.

## 8. Three.js and Performance Rules

### Hot Paths

- Reuse vectors, quaternions, Euler objects, arrays, geometries, and materials in update loops.
- Avoid closures, scene mutations, and large allocations per frame.
- Keep updates delta-time-based and guard against non-finite values or destabilizing frame gaps.
- Cache repeated calculations only with a bounded invalidation or size strategy.

### Resource Lifecycle

Every dynamic resource must have one clear owner.

When permanently removing owned content:

- remove it from its parent
- dispose owned geometries
- dispose owned materials
- dispose owned textures and render targets
- remove listeners and timers
- clear retaining references

Do not dispose shared resources while another object uses them.

### Rendering

- Reuse geometry and materials where practical.
- Prefer `THREE.InstancedMesh` for large repeated populations.
- Limit shadow casting to objects where it adds visible value.
- Avoid extreme near/far ratios, unnecessary transparency, and coplanar surfaces.
- Preserve the renderer pixel-ratio cap unless measurements justify a change.
- Use `renderer.info` for draw-call, geometry, texture, and program investigations.

A code change is not a proven optimization without measurement or observable evidence.

## 9. TypeScript and Style

Preserve the established style:

- 2-space indentation
- single quotes
- semicolons
- PascalCase classes/types
- camelCase variables/functions
- UPPER_SNAKE_CASE constants
- `PascalCase.ts` for class-oriented modules
- `import type` for type-only imports where appropriate

Quality requirements:

- Prefer specific types; avoid `any`, broad casts, and non-null assertions as shortcuts.
- Validate nullable state at boundaries.
- Add explicit return types to exported APIs and complex functions.
- Explain signs, axes, units, ownership, and non-obvious formulas in comments.
- Do not comment obvious syntax.
- Handle closed unions/enums exhaustively where practical.
- Keep configuration separate from behavior.
- Reuse existing utilities instead of creating near-duplicates.
- Update every import and call site when moving or renaming symbols.

## 10. Change-Specific Validation

Always run the universal build and diff checks. Add the relevant runtime checks below.

| Change area | Required smoke checks |
|---|---|
| Physics/config | runway idle, throttle, takeoff near rotate speed, pitch/roll direction, bank turn, stall/recovery, ground reset |
| Input | held vs edge-triggered actions, no repeated toggles, no stuck keys after reset/focus loss |
| Camera | cycle every mode, no jump or non-finite state after reset |
| HUD/menu | independent aircraft/weather/mode selections, finite values, resize, start/return/start |
| Weather | every preset starts and cleans up; effects do not persist into another mode |
| Mission | rings only in mission mode, score once, reset removes resources |
| Combat | enemy lifecycle, shooting, waves, radar, reset cleanup |
| Terrain/environment | no floating/clipped assets in tested areas; bounded object/cache growth |
| Cleanup | repeat mode transitions and confirm object/resource counts do not grow without bound |
| Dependency/config | clean install when feasible, production build, preview starts |

If browser or graphics execution is unavailable, state exactly which runtime checks remain unverified.

### Special Implementation Rules

**Physics:** Change one family of coefficients or one behavior at a time. Verify config units and control mapping first.

**Input:** Use `KeyboardEvent.code`. Separate held actions from edge-triggered actions and debounce toggles.

**Terrain placement:** Use terrain height, slope, object footprint, and exclusion zones; a center-point height alone may be insufficient.

**Lifecycle:** Repeated start → menu → start must be safe. Cleanup/reset should be idempotent where practical.

**Refactors:** Split by stable responsibility, not line count. Do not introduce an event bus, state framework, or broad architecture merely to reduce parameters.

**Dependencies:** Confirm necessity, version compatibility, bundle impact, and use the package manager. Never run broad forced upgrades such as `npm audit fix --force` during unrelated work.

## 11. Debugging Protocol

1. Reproduce the smallest reliable scenario.
2. Record observed and expected behavior.
3. Trace inputs/state to the first incorrect value.
4. Add only targeted, subsystem-prefixed temporary diagnostics.
5. Test one hypothesis with one focused change.
6. Remove diagnostics.
7. Re-run adjacent regression checks.

Useful diagnostics:

- `scene.traverse(...)`
- `renderer.info`
- `THREE.Box3Helper`
- `THREE.GridHelper`
- temporary wireframe mode
- finite position, velocity, rotation, and scale logging

Never leave noisy per-frame logging in final code.

## 12. Completion Gate

Before reporting completion, confirm:

- every acceptance criterion is implemented
- every changed file was re-opened or diffed
- all new symbols and APIs were verified
- coordinate, unit, control, and lifecycle contracts are preserved
- no unrelated files changed
- `npm run build` passed
- `git diff --check` passed
- the complete diff was inspected
- relevant browser checks ran, or missing checks are explicitly disclosed
- temporary diagnostics and dead code are removed
- no unverified claim appears in the final response

If a required item is false, the task is not complete.

## 13. Known Technical Debt

`FINDINGS.md` currently records large modules, coupling, missing tests, and missing lint/format tooling.

- Do not add unrelated behavior to already large modules when a focused module fits.
- Do not treat proposed fixes in `FINDINGS.md` as authorization to refactor.
- Keep technical-debt cleanup separate unless it is required for the requested feature.
- Add testing or linting only as a dedicated, explicitly requested change with a minimal baseline.

## 14. Change Summary Format

Use focused titles:

```text
[scope] Imperative description
```

Examples:

```text
[physics] Stabilize low-speed stall recovery
[ui] Prevent repeated camera-mode toggles
[environment] Dispose weather resources on reset
```

Final summary:

```text
Implemented
- ...

Validated
- npm run build
- git diff --check
- relevant browser checks

Remaining
- only genuine limitations or follow-up work
```
