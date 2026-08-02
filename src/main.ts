import * as THREE from 'three';
import { type AircraftConfig, AIRCRAFT_CONFIGS } from './aircraft/AircraftConfig';
import { Aircraft } from './aircraft/Aircraft';
import { FlightModel } from './physics/FlightModel';
import { GroundCollision } from './physics/GroundCollision';
import { Terrain } from './environment/Terrain';
import { Runway } from './environment/Runway';
import { CameraManager, CameraMode } from './camera/CameraManager';
import { Controls } from './input/Controls';
import { HUD } from './ui/HUD';
import { AdvancedMenu } from './ui/AdvancedMenu';
import { MissionSystem } from './missions/MissionSystem';
import { PostProcessingManager } from './rendering/PostProcessing';
import { Atmosphere } from './rendering/Atmosphere';
import { AirportLighting } from './environment/AirportLighting';
import { EngineEffects } from './aircraft/EngineEffects';
import { WeatherSystem, WEATHER_PRESETS } from './weather/WeatherSystem';
import { CombatManager } from './combat/CombatManager';
import { RadarDisplay } from './ui/RadarDisplay';
import { GameMode, GAME_MODES } from './game/GameMode';
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
const renderer = new THREE.WebGLRenderer({ antialias: true });
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

// --- Dynamic Water (far from runway, near distant lakes) ---
const dynamicWater = new DynamicWater(scene, new THREE.Vector3(1500, 2, 1200), 300);

// --- Atmosphere & Post-Processing ---
const atmosphere = new Atmosphere(scene, sunLight.position);
const postProcessing = new PostProcessingManager(scene, camera, renderer);
const airportLighting = new AirportLighting(scene, runway.bounds);

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
let selectedAircraft: string = 'cessna';
let selectedWeather: string = 'clear';
let selectedGameMode: GameMode = GameMode.FREE_FLIGHT;

// Runway bounds for collision detection
const runwayBounds = runway.bounds;

// --- Start Position (on runway center, facing positive X) ---
const startPos = new THREE.Vector3(-600, 1.5, 0); // On runway surface (y=1.5)
const startRot = new THREE.Euler(0, 0, 0, 'YXZ');

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
  
  // Remove aircraft with proper disposal
  if (aircraft) {
    scene.remove(aircraft.group);
    disposeGroup(aircraft.group);
    aircraft = null;
  }
  if (engineEffects) {
    scene.remove(engineEffects.group);
    disposeGroup(engineEffects.group);
    engineEffects = null;
  }
  
  // Reset flight model state
  flightModel.reset?.();
  
  // Show menu
  if (menu) {
    menu.show();
  }
}

function startGame(config: AircraftConfig, weather: string, gameMode: GameMode) {
  // Store selected options
  selectedAircraft = config.type;
  selectedWeather = weather;
  selectedGameMode = gameMode;
  
  // Remove old aircraft with proper disposal
  if (aircraft) {
    scene.remove(aircraft.group);
    disposeGroup(aircraft.group);
  }
  if (engineEffects) {
    scene.remove(engineEffects.group);
    disposeGroup(engineEffects.group);
  }

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
    hud.updateCameraButton(newMode);
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
}

// --- Show Advanced Menu ---
menu = new AdvancedMenu(startGame);

// --- Handle Reset (ESC) ---
window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && aircraft) {
    returnToMenu();
  }
});

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
let cameraCycleTimer = 0;

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

    // Update flight physics
    flightModel.update(aircraft, controls, dt);

// Update weather effects (very subtle influence, not overwhelming)
    if (weatherSystem) {
      const windEffect = weatherSystem.getWindEffect(aircraft.velocity);
      const turbulence = weatherSystem.getTurbulence(now / 1000);
      // Scale down effects significantly so they don't overpower controls
      aircraft.velocity.add(windEffect.multiplyScalar(0.02));
      aircraft.velocity.add(turbulence.multiplyScalar(0.05));
    }

    // Update ground collision
    groundCollision.update(aircraft, controls, dt, runwayBounds);

    // Update crash animation
    groundCollision.updateCrashAnimation(aircraft, dt);

    // Update propeller
    aircraft.updatePropeller(dt);

    // Sync 3D model with physics state
    aircraft.group.position.copy(aircraft.position);
    aircraft.group.rotation.copy(aircraft.rotation);

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
      // Use aircraft rotation for heading when speed is low (prevents wild spinning)
      const heading = speed > 5
        ? Math.atan2(aircraft.velocity.z, aircraft.velocity.x)
        : -aircraft.rotation.y;
      const verticalSpeed = aircraft.velocity.y;
      const pitch = aircraft.rotation.y;
      const roll = aircraft.rotation.x;

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

      hud.update(
        speed,
        altitude,
        heading,
        aircraft.throttle,
        verticalSpeed,
        pitch,
        roll,
        groundCollision.taxiMode,
        aircraft.crashed,
        missionData,
        cameraManager.mode,
        combatData
      );
    }
    
    // Update radar
    if (radar && selectedGameMode === GameMode.COMBAT) {
      radar.update(aircraft.position, Math.atan2(aircraft.velocity.z, aircraft.velocity.x));
    }
  }

  // Update terrain/clouds
  terrain.update(dt);
  
  // Update dynamic water
  dynamicWater.update(dt);

  // Update atmosphere sky position to follow camera
  atmosphere.updateSkyPosition(camera.position);

  // Render with post-processing pipeline
  postProcessing.render();
}

animate();
