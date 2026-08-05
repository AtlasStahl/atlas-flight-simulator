import * as THREE from 'three';
import type { AircraftConfig } from './aircraft/AircraftConfig';
import { Aircraft } from './aircraft/Aircraft';
import { FlightModel } from './physics/FlightModel';
import { GroundCollision } from './physics/GroundCollision';
import { Terrain } from './environment/Terrain';
import { Runway } from './environment/Runway';
import { CameraManager } from './camera/CameraManager';
import { Controls } from './input/Controls';
import { HUD } from './ui/HUD';
import { AdvancedMenu } from './ui/AdvancedMenu';
import type { GameState } from './core/GameState';
import { MissionSystem } from './missions/MissionSystem';
import { PostProcessingManager } from './rendering/PostProcessing';
import { Atmosphere } from './rendering/Atmosphere';
import { EngineEffects } from './aircraft/EngineEffects';
import { WeatherSystem, WEATHER_PRESETS } from './weather/WeatherSystem';
import { CombatManager } from './combat/CombatManager';
import { RadarDisplay } from './ui/RadarDisplay';
import { GameMode } from './game/GameMode';
import { DynamicWater } from './environment/DynamicWater';

// --- Utility ---
function disposeGroup(group: THREE.Group): void {
  group.traverse(child => {
    if (child instanceof THREE.Mesh) {
      child.geometry?.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach(m => m.dispose());
      } else {
        child.material?.dispose();
      }
    }
  });
}

// --- Three.js Setup ---
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 20000);
const renderer = new THREE.WebGLRenderer({ antialias: false }); // SMAAPass in post-processing handles anti-aliasing (REN-02)
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
document.body.appendChild(renderer.domElement);

// --- Lighting ---
const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x3a7d3a, 0.6);
scene.add(hemiLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
sunLight.position.set(500, 800, 300);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.near = 10;
sunLight.shadow.camera.far = 2000;
sunLight.shadow.camera.left = -500;
sunLight.shadow.camera.right = 500;
sunLight.shadow.camera.top = 500;
sunLight.shadow.camera.bottom = -500;
scene.add(sunLight);

// --- Environment ---
const terrain = new Terrain(scene);
const runway = new Runway(scene);
const missionSystem = new MissionSystem(scene);

// --- Dynamic Water (REN-05: Position und Größe aus dem See-Becken des Terrains) ---
const lake = terrain.lake;
const dynamicWater = new DynamicWater(
  scene,
  new THREE.Vector3(lake.x, lake.waterLevel, lake.z),
  lake.radius
);

// --- Atmosphere & Post-Processing ---
const atmosphere = new Atmosphere(scene, sunLight.position);
const postProcessing = new PostProcessingManager(scene, camera, renderer);

// --- Weather ---
let weatherSystem: WeatherSystem | null = null;

// --- Combat ---
const combatManager = new CombatManager(scene);

// --- Game State ---
let aircraft: Aircraft | null = null;
const flightModel = new FlightModel();
const groundCollision = new GroundCollision(terrain.getHeight.bind(terrain));
const cameraManager = new CameraManager(camera);
const controls = new Controls();
let hud: HUD | null = null;
let radar: RadarDisplay | null = null;
let engineEffects: EngineEffects | null = null;
let menu: AdvancedMenu | null = null;

// Selected options
let selectedGameMode: GameMode = GameMode.FREE_FLIGHT;

// Runway bounds for collision detection
const runwayBounds = runway.bounds;

// --- Start Position (on runway center, facing positive X) ---
const startPos = new THREE.Vector3(-600, 1.5, 0); // On runway surface (y=1.5)
const startRot = new THREE.Euler(0, 0, 0, 'YXZ');

// ARCH-04: Gemeinsame Teardown-Funktion für Flugzeug und EngineEffects
function teardownFlight() {
  // EngineEffects zuerst vom aircraft.group lösen (ARCH-03: kein doppeltes dispose)
  if (engineEffects) {
    engineEffects.dispose();
    engineEffects = null;
  }
  if (aircraft) {
    scene.remove(aircraft.group);
    disposeGroup(aircraft.group);
    aircraft = null;
  }
}

// ARCH-02: Vollständiger Teardown beim Verlassen der Seite
function disposeAll() {
  teardownFlight();
  controls.dispose();
  postProcessing.dispose();
  dynamicWater.dispose(scene);
  atmosphere.dispose(scene);
}

function returnToMenu() {
  // Hide HUD
  if (hud) {
    hud.hide();
  }
  if (radar) {
    radar.hide();
  }

  // Stop combat and clean up
  combatManager.reset();

  // Clean up weather system
  if (weatherSystem) {
    weatherSystem.cleanup();
    weatherSystem = null;
  }

  // ARCH-04: Gemeinsame Teardown-Funktion
  teardownFlight();

  // Reset flight model state
  flightModel.reset();

  // Dispose mission rings
  missionSystem.clearRings(scene);

  // Show menu
  if (menu) {
    menu.show();
  }

  // Disable controls in menu to prevent stuck keys (INP-02 fix)
  controls.setEnabled(false);
}

function startGame(config: AircraftConfig, weather: string, gameMode: GameMode) {
  // Store selected options
  selectedGameMode = gameMode;

  // ARCH-04: Gemeinsame Teardown-Funktion
  teardownFlight();

  // Create new aircraft
  aircraft = new Aircraft(config);
  // Compute correct ground level: runway is at y=1.5, aircraft sits on runway surface
  // Add small offset above runway to prevent z-fighting and ensure visibility
  const runwayY = 1.5;
  const startHeight = runwayY + 0.5 * config.scale + 0.2;
  aircraft.position.set(startPos.x, startHeight, startPos.z);
  aircraft.rotation.copy(startRot);
  scene.add(aircraft.group);

  // Engine effects (nav lights attached to aircraft)
  engineEffects = new EngineEffects(aircraft.group);

  // CAM-02: Cockpit-Offset aus AircraftConfig setzen
  cameraManager.setCockpitOffset(config.cockpitOffset);

  // Reset systems
  groundCollision.reset();
  // Only create rings for ring mission mode
  if (gameMode === GameMode.RING_MISSION) {
    missionSystem.reset(scene);
  } else {
    missionSystem.clearRings(scene);
  }
  combatManager.reset();

  // Setup weather
  if (weatherSystem) {
    weatherSystem.cleanup();
  }
  weatherSystem = new WeatherSystem(scene, WEATHER_PRESETS[weather] || WEATHER_PRESETS.clear);

  // Update atmosphere fog based on weather
  const weatherConfig = WEATHER_PRESETS[weather] || WEATHER_PRESETS.clear;
  atmosphere.setFogDensity(weatherConfig.fogDensity);

  // Setup game mode
  if (gameMode === GameMode.COMBAT) {
    combatManager.startWave();
  }

  // Create HUD with menu callback
  if (!hud) {
    hud = new HUD(returnToMenu, gameMode);
  } else {
    hud.setGameMode(gameMode);
  }
  hud.setAircraftType(config.type);
  hud.show();

  // Connect camera button to camera cycling
  hud.setCameraCallback(() => {
    const newMode = cameraManager.cycleMode();
    hud!.updateCameraButton(newMode);
  });
  hud.updateCameraButton(cameraManager.mode);

  // Create radar for combat mode
  if (gameMode === GameMode.COMBAT) {
    if (!radar) {
      radar = new RadarDisplay();
    }
    radar.show();
  } else {
    if (radar) {
      radar.hide();
    }
  }

  // Hide menu
  if (menu) {
    menu.hide();
  }

  // Enable controls after starting game (INP-02 fix)
  controls.setEnabled(true);
}

// --- Show Advanced Menu ---
menu = new AdvancedMenu(startGame);

// --- Handle Reset (ESC) ---
window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && aircraft) {
    returnToMenu();
  }
});

// ARCH-02: disposeAll beim Verlassen der Seite
window.addEventListener('pagehide', disposeAll);

// --- Handle Camera controls ---
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

renderer.domElement.addEventListener('mousedown', (e) => {
  if (e.button === 2) { // Right mouse
    isDragging = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  }
});

renderer.domElement.addEventListener('mousemove', (e) => {
  if (isDragging) {
    const dx = e.clientX - lastMouseX;
    const dy = e.clientY - lastMouseY;
    cameraManager.onMouseMove(dx, dy);
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  }
});

renderer.domElement.addEventListener('mouseup', () => {
  isDragging = false;
});

renderer.domElement.addEventListener('wheel', (e) => {
  cameraManager.onMouseWheel(e.deltaY);
});

renderer.domElement.addEventListener('contextmenu', (e) => {
  e.preventDefault();
});

// --- Handle Window Resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  postProcessing.resize(window.innerWidth, window.innerHeight);
});

// --- Game Loop ---
let lastTime = performance.now();
let cameraCycleTimer = 0.4; // INP-05: Start positiv, damit kein sofortiger Zyklus passiert

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  let dt = (now - lastTime) / 1000;
  lastTime = now;

  // Clamp delta time to avoid physics explosions
  dt = Math.min(dt, 0.05);

  if (aircraft) {
    // Update controls
    controls.update();

    // Cycle camera on C key (with debounce)
    if (controls.cycleCamera) {
      if (cameraCycleTimer <= 0) {
        cameraCycleTimer = 0.4;
        cameraManager.cycleMode();
      }
    }
    cameraCycleTimer -= dt;

    // Update flight physics (ground state owned by GroundCollision, one frame behind)
    flightModel.update(aircraft, controls, dt, groundCollision.taxiMode);

// Apply weather effects as accelerations (m/s²) integrated over dt for frame-rate independence
    if (weatherSystem) {
      // Use out-parameter pattern to avoid mutating weatherSystem's internal cached vectors
      const windEffect = new THREE.Vector3();
      const turbulence = new THREE.Vector3();
      weatherSystem.getWindEffect(windEffect);
      weatherSystem.getTurbulence(turbulence);
      // Wind/Turbulence are accelerations; integration over dt ensures frame-rate independence
      aircraft.velocity.addScaledVector(windEffect, 0.02 * dt * 60);
      aircraft.velocity.addScaledVector(turbulence, 0.05 * dt * 60);
    }

    // Update ground collision
    groundCollision.update(aircraft, controls, dt, runwayBounds);

    // Update crash animation (PHY-12: returns true when crash animation is complete)
    const crashComplete = groundCollision.updateCrashAnimation(aircraft, dt);
    if (crashComplete && aircraft.crashed) {
      // Crash animation done — show restart hint in HUD
      aircraft.crashed = false; // Allow HUD to show restart overlay
    }

    // Update propeller
    aircraft.updatePropeller(dt);

    // Sync 3D model with physics state (PHY-06: sync from authoritative quaternion)
    aircraft.group.position.copy(aircraft.position);
    aircraft.group.quaternion.copy(aircraft.quaternion);

    // Update engine effects
    if (engineEffects) {
      engineEffects.update(now / 1000, aircraft.throttle);
    }

    // Move sun light to follow aircraft (for shadow rendering)
    sunLight.position.set(
      aircraft.position.x + 500,
      800,
      aircraft.position.z + 300
    );
    sunLight.target.position.copy(aircraft.position);
    sunLight.target.updateMatrixWorld();

    // Update camera
    cameraManager.update(aircraft.position, aircraft.rotation, dt);

    // Update combat
    if (selectedGameMode === GameMode.COMBAT) {
      const combatResult = combatManager.update(dt, aircraft.position, aircraft.rotation, now / 1000, { shoot: controls.shoot });

      if (combatResult.playerHit) {
        // Flash screen red or play sound
      }
    }

    // Update mission system (only for ring mission mode)
    const missionStatus = selectedGameMode === GameMode.RING_MISSION ? missionSystem.update(aircraft.position) : undefined;

    // Update weather
    if (weatherSystem) {
      weatherSystem.update(dt, aircraft.position);
    }

    // Update HUD
    if (hud) {
      const speed = aircraft.velocity.length();
      const altitude = aircraft.position.y;
      // Single heading source: rotation.y (verified against forward vector)
      // At speed > 5 m/s, derive from velocity (negated atan2 because atan2(vz,vx) === -rotation.y)
      const heading = speed > 5
        ? -Math.atan2(aircraft.velocity.z, aircraft.velocity.x)
        : aircraft.rotation.y;
      const verticalSpeed = aircraft.velocity.y;
      // Gimbal-safe attitude from the quaternion — Euler YXZ folds rotation.x at ±90° bank
      const pitch = aircraft.getPitchAngle();
      const roll = aircraft.getBankAngle();

      // Only pass missionStatus in ring_mission mode
      const missionData = selectedGameMode === GameMode.RING_MISSION ? missionStatus : undefined;
      // Only pass combatStatus in combat mode
      const combatData = selectedGameMode === GameMode.COMBAT ? {
        wave: combatManager.wave,
        score: combatManager.score,
        playerHealth: combatManager.playerHealth,
        maxPlayerHealth: combatManager.maxPlayerHealth,
        enemiesAlive: combatManager.enemiesAlive,
        totalEnemies: combatManager.totalEnemiesInWave
      } : undefined;

      // UI-01: GameState-Objekt statt 13 Positionsparametern
      const gameState: GameState = {
        aircraftType: aircraft.config.type,
        speed,
        altitude,
        heading,
        throttle: aircraft.throttle,
        verticalSpeed,
        pitch,
        roll,
        onGround: groundCollision.taxiMode,
        crashed: aircraft.crashed,
        gameMode: selectedGameMode,
        cameraMode: cameraManager.mode,
        missionStatus: missionData,
        combatStatus: combatData
      };
      hud.update(dt, gameState);
    }

    // Update radar with alive enemy positions (GAME-04 fix)
    if (radar && selectedGameMode === GameMode.COMBAT) {
      const radarHeading = aircraft.velocity.length() > 5
        ? -Math.atan2(aircraft.velocity.z, aircraft.velocity.x)
        : aircraft.rotation.y;
      radar.clearTargets();
      for (const enemy of combatManager.aliveEnemies) {
        radar.addTarget(enemy.position, 'enemy');
      }
      radar.update(aircraft.position, radarHeading);
    }
  }

  // Update terrain/clouds
  terrain.update(dt);

  // Update dynamic water with camera position for correct Fresnel reflection
  dynamicWater.update(dt, camera.position);

  // Update atmosphere sky position to follow camera
  atmosphere.updateSkyPosition(camera.position);

  // Render with post-processing pipeline
  postProcessing.render();
}

animate();
