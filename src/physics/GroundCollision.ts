import { Aircraft } from '../aircraft/Aircraft';
import { Controls } from '../input/Controls';

/** Ground collision, taxi mode, and crash detection */
export class GroundCollision {
  private _taxiMode = false;
  private _crashTimer = 0;
  private _getTerrainHeight: (x: number, z: number) => number;
  private _gracePeriod = 3; // 3 seconds of grace after start - no crash detection
  private _groundThreshold = 3.0; // Hysteresis threshold for ground detection (meters)

  constructor(getTerrainHeight?: (x: number, z: number) => number) {
    // Default to flat ground if no height function provided
    this._getTerrainHeight = getTerrainHeight ?? (() => 0);
  }

  get taxiMode(): boolean { return this._taxiMode; }

  update(aircraft: Aircraft, controls: Controls, dt: number, runwayBounds: { x1: number; x2: number; z1: number; z2: number }) {
    if (aircraft.crashed) return;

    // Countdown grace period - no crash detection during startup
    if (this._gracePeriod > 0) {
      this._gracePeriod -= dt;
    }

    const terrainH = this._getTerrainHeight(aircraft.position.x, aircraft.position.z);
    const groundY = terrainH + 0.5 * aircraft.config.scale;

    // --- Crash: high sink rate (only after grace period) ---
    if (this._gracePeriod <= 0 && aircraft.position.y <= groundY && aircraft.velocity.y < -8) {
      this.triggerCrash(aircraft, terrainH);
      return;
    }

    // --- On ground (with hysteresis to prevent flickering) ---
    const isNearGround = aircraft.position.y <= groundY + this._groundThreshold;
    
    if (isNearGround && (aircraft.position.y <= groundY || this._taxiMode)) {
      aircraft.position.y = groundY + 0.1; // Small offset to prevent z-fighting
      this._taxiMode = true;

      // Check if on runway for better friction
      const onRunway = aircraft.position.x >= runwayBounds.x1 &&
                       aircraft.position.x <= runwayBounds.x2 &&
                       aircraft.position.z >= runwayBounds.z1 &&
                       aircraft.position.z <= runwayBounds.z2;

      // Ground drag - strong friction when no throttle, lighter drag when throttling
      const speed = aircraft.velocity.length();
      if (speed > 0.01) {
        // Apply braking friction when no throttle is applied
        if (aircraft.throttle < 0.05) {
          // Strong braking to stop the aircraft
          const brakeFactor = onRunway ? 0.96 : 0.92; // Much stronger friction
          aircraft.velocity.multiplyScalar(brakeFactor);
        } else {
          // Light drag when throttle is applied (rolling resistance)
          const perFrameDrag = onRunway ? 0.998 : 0.993;
          aircraft.velocity.multiplyScalar(perFrameDrag);
        }
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

      // --- Takeoff: pitch up (nose up) at rotate speed ---
      if (speed >= aircraft.config.rotateSpeed * 0.8 && controls.pitchUp) {
        this._taxiMode = false;
        aircraft.velocity.y = 3; // Initial upward velocity
        aircraft.position.y = groundY + 2;
        return;
      }

      this._taxiMode = true;
    } else if (aircraft.position.y > groundY + this._groundThreshold) {
      // Only clear taxi mode when well above ground (hysteresis)
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
    this._gracePeriod = 3;
  }
}