import { Aircraft } from '../aircraft/Aircraft';
import { Controls } from '../input/Controls';

/** Ground collision, taxi mode, and crash detection */
export class GroundCollision {
  private _taxiMode = false;
  private _crashTimer = 0;
  private _getTerrainHeight: (x: number, z: number) => number;

  constructor(getTerrainHeight?: (x: number, z: number) => number) {
    // Default to flat ground if no height function provided
    this._getTerrainHeight = getTerrainHeight ?? (() => 0);
  }

  get taxiMode(): boolean { return this._taxiMode; }

  update(aircraft: Aircraft, controls: Controls, dt: number, runwayBounds: { x1: number; x2: number; z1: number; z2: number }) {
    if (aircraft.crashed) return;

    const terrainH = this._getTerrainHeight(aircraft.position.x, aircraft.position.z);
    const groundY = terrainH + 0.5 * aircraft.config.scale;

    // --- Crash: high sink rate ---
    if (aircraft.position.y <= groundY && aircraft.velocity.y < -8) {
      this.triggerCrash(aircraft, terrainH);
      return;
    }

    // --- On ground ---
    if (aircraft.position.y <= groundY) {
      aircraft.position.y = groundY;

      // Check if on runway for better friction
      const onRunway = aircraft.position.x >= runwayBounds.x1 &&
                       aircraft.position.x <= runwayBounds.x2 &&
                       aircraft.position.z >= runwayBounds.z1 &&
                       aircraft.position.z <= runwayBounds.z2;

      // Ground drag (much less friction for realistic taxi/takeoff roll)
      const speed = aircraft.velocity.length();
      if (speed > 0.01) {
        // Per-frame friction that's realistic: runway has low rolling resistance
        const perFrameDrag = onRunway ? 0.999 : 0.995;
        aircraft.velocity.multiplyScalar(perFrameDrag);
      }

      // Zero vertical velocity
      aircraft.velocity.y = Math.max(0, aircraft.velocity.y);

      // --- Taxi controls ---
      if (speed > 1) {
        const turnRate = 1.5 * dt;
        if (controls.rollLeft) aircraft.rotation.z += turnRate;
        if (controls.rollRight) aircraft.rotation.z -= turnRate;
        // Keep level on ground
        aircraft.rotation.x *= 0.95;
        aircraft.rotation.y *= 0.95;
      }

      // --- Takeoff ---
      if (speed >= aircraft.config.rotateSpeed && controls.pitchDown) {
        this._taxiMode = false;
        aircraft.velocity.y = 3; // Initial upward velocity
        aircraft.position.y = groundY + 1;
        return;
      }

      this._taxiMode = true;
    } else {
      this._taxiMode = false;
    }
  }

  private triggerCrash(aircraft: Aircraft, terrainH: number) {
    aircraft.crashed = true;
    this._crashTimer = 3;

    // Flip the aircraft forward
    aircraft.velocity.set(0, 0, 0);
    aircraft.position.y = terrainH + 0.3 * aircraft.config.scale;
  }

  updateCrashAnimation(aircraft: Aircraft, dt: number) {
    if (!aircraft.crashed) return;

    this._crashTimer -= dt;
    if (this._crashTimer > 0) {
      // Slowly rotate forward
      aircraft.rotation.x += dt * 0.5;
      aircraft.rotation.x = Math.min(aircraft.rotation.x, Math.PI / 3);
    }
  }

  reset() {
    this._taxiMode = false;
    this._crashTimer = 0;
  }
}