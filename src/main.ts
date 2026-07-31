import * as THREE from 'three';
import { type AircraftConfig } from './aircraft/AircraftConfig';
import { Aircraft } from './aircraft/Aircraft';
import { FlightModel } from './physics/FlightModel';
import { GroundCollision } from './physics/GroundCollision';
import { Terrain } from './environment/Terrain';
import { Runway } from './environment/Runway';
import { ChaseCamera } from './camera/ChaseCamera';
import { Controls } from './input/Controls';
import { HUD } from './ui/HUD';
import { AircraftSelector } from './ui/AircraftSelector';
import { MissionSystem } from './missions/MissionSystem';

// --- Three.js Setup ---
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 20000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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

// --- Game State ---
let aircraft: Aircraft | null = null;
const flightModel = new FlightModel();
const groundCollision = new GroundCollision(terrain.getHeight.bind(terrain));
const chaseCamera = new ChaseCamera(camera);
const controls = new Controls();
let hud: HUD | null = null;
let selector: AircraftSelector | null = null;

// Runway bounds for collision detection
const runwayBounds = runway.bounds;

// --- Start Position (on runway, facing positive X) ---
const startPos = new THREE.Vector3(-600, 0, 0);
const startRot = new THREE.Euler(0, 0, 0, 'YXZ');

function returnToMenu() {
  // Hide HUD
  if (hud) {
    hud.hide();
  }
  // Show selector
  if (selector) {
    selector.show();
  }
}

function startGame(config: AircraftConfig) {
  // Remove old aircraft if exists
  if (aircraft) {
    scene.remove(aircraft.group);
  }

  // Create new aircraft
  aircraft = new Aircraft(config);
  aircraft.position.copy(startPos);
  aircraft.rotation.copy(startRot);
  scene.add(aircraft.group);

  // Reset systems
  groundCollision.reset();
  missionSystem.reset(scene);

  // Create HUD with menu callback
  if (!hud) {
    hud = new HUD(returnToMenu);
  }
  hud.show();

  // Hide selector
  if (selector) {
    selector.hide();
  }
}

// --- Show Aircraft Selector ---
selector = new AircraftSelector(startGame);

// --- Handle Reset (ESC) ---
window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && aircraft) {
    // Reset to runway
    aircraft.position.copy(startPos);
    aircraft.rotation.copy(startRot);
    aircraft.reset(aircraft.config);
    groundCollision.reset();
    missionSystem.reset(scene);
  }
});

// --- Handle Window Resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Game Loop ---
let lastTime = performance.now();

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

    // Update flight physics
    flightModel.update(aircraft, controls, dt);

    // Update ground collision
    groundCollision.update(aircraft, controls, dt, runwayBounds);

    // Update crash animation
    groundCollision.updateCrashAnimation(aircraft, dt);

    // Update propeller
    aircraft.updatePropeller(dt);

    // If crashed, keep camera at a reasonable viewing distance
    if (aircraft.crashed) {
      chaseCamera.update(aircraft.position, aircraft.rotation, dt);
    }

    // Sync 3D model with physics state
    aircraft.group.position.copy(aircraft.position);
    aircraft.group.rotation.copy(aircraft.rotation);

    // Move sun light to follow aircraft (for shadow rendering)
    sunLight.position.set(
      aircraft.position.x + 500,
      800,
      aircraft.position.z + 300
    );
    sunLight.target.position.copy(aircraft.position);
    sunLight.target.updateMatrixWorld();

    // Update chase camera
    chaseCamera.update(aircraft.position, aircraft.rotation, dt);

    // Update mission system
    const missionStatus = missionSystem.update(aircraft.position);

    // Update HUD
    if (hud) {
      const speed = aircraft.velocity.length();
      const altitude = aircraft.position.y;
      const heading = Math.atan2(aircraft.velocity.z, aircraft.velocity.x);
      const verticalSpeed = aircraft.velocity.y;
      const pitch = aircraft.rotation.y;
      const roll = aircraft.rotation.x;

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
        missionStatus
      );
    }
  }

  // Update terrain/clouds
  terrain.update(dt);

  // Render
  renderer.render(scene, camera);
}

animate();
