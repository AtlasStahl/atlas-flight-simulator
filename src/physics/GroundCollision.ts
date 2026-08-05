import * as THREE from 'three';
import { Aircraft } from '../aircraft/Aircraft';
import { Controls } from '../input/Controls';

const GRAVITY = 9.81;

/**
 * Ground collision, taxi mode, and crash detection.
 *
 * CRITICAL DESIGN: This system only constrains the aircraft when it's
 * AT or BELOW ground level. It does NOT fight the FlightModel's rotation
 * or forces. The aircraft lifts off naturally when lift > weight.
 */
export class GroundCollision {
  private _taxiMode = false;
  private _crashTimer = 0;
  private _getTerrainHeight: (x: number, z: number) => number;
  private _gracePeriod = 3;
  private _groundThreshold = 3.0;
  private _runwayY = 1.5;

  // Cached objects for hot path
  private _yawAxis = new THREE.Vector3(0, 1, 0);
  private _taxiQuat = new THREE.Quaternion();
  /** Body right axis — post-multiplication interprets the axis in the body frame. */
  private _rightAxis = new THREE.Vector3(0, 0, 1);
  private _crashQuat = new THREE.Quaternion();

  constructor(getTerrainHeight?: (x: number, z: number) => number) {
    this._getTerrainHeight = getTerrainHeight ?? (() => 0);
  }

  get taxiMode(): boolean { return this._taxiMode; }

  update(aircraft: Aircraft, controls: Controls, dt: number, runwayBounds: { x1: number; x2: number; z1: number; z2: number }) {
    if (aircraft.crashed) return;

    if (this._gracePeriod > 0) {
      this._gracePeriod -= dt;
    }

    const terrainH = this._getTerrainHeight(aircraft.position.x, aircraft.position.z);
    const onRunway = aircraft.position.x >= runwayBounds.x1 &&
                     aircraft.position.x <= runwayBounds.x2 &&
                     aircraft.position.z >= runwayBounds.z1 &&
                     aircraft.position.z <= runwayBounds.z2;
    const groundY = (onRunway ? this._runwayY : terrainH) + 0.5 * aircraft.config.scale;

    // Crash: high sink rate (only after grace period)
    if (this._gracePeriod <= 0 && aircraft.position.y <= groundY && aircraft.velocity.y < -10) {
      this.triggerCrash(aircraft, terrainH);
      return;
    }

    const speed = aircraft.velocity.length();

    // Are we on or below the ground?
    if (aircraft.position.y <= groundY + this._groundThreshold) {
      // Below ground → push up
      if (aircraft.position.y <= groundY) {
        aircraft.position.y = groundY + 0.1;
      }

      // While truly on the ground (at or below ground level):
      if (aircraft.position.y <= groundY + 0.5) {
        // Only block downward velocity — never block upward (lift)
        if (aircraft.velocity.y < 0) {
          aircraft.velocity.y = 0;
        }

        // Ground drag - rolling resistance only (doesn't prevent acceleration)
        if (speed > 0.05) {
          if (controls.brakes) {
            // Strong brake deceleration when B is pressed
            const brakeDecel = 0.8 * GRAVITY * dt;
            if (speed > brakeDecel) {
              aircraft.velocity.multiplyScalar((speed - brakeDecel) / speed);
            } else {
              aircraft.velocity.set(0, 0, 0);
            }
          } else if (aircraft.throttle < 0.05) {
            // Light rolling resistance at idle
            const idleDecel = 0.15 * GRAVITY * dt;
            if (speed > idleDecel) {
              aircraft.velocity.multiplyScalar((speed - idleDecel) / speed);
            } else {
              aircraft.velocity.set(0, 0, 0);
            }
          } else {
            // Very light drag when throttling: 0.015g (0.15 m/s²)
            const resistanceDecel = 0.015 * GRAVITY * dt;
            if (speed > resistanceDecel) {
              aircraft.velocity.multiplyScalar((speed - resistanceDecel) / speed);
            }
          }
        }

        // Taxi steering: A/D yaw the aircraft on the ground
        // Writes to authoritative quaternion (PHY-06), not group.quaternion directly
        if (speed > 1) {
          const turnRate = 1.5 * dt;
          if (controls.rollLeft) {
            this._taxiQuat.setFromAxisAngle(this._yawAxis, turnRate);
            aircraft.quaternion.multiply(this._taxiQuat);
            aircraft.rotation.setFromQuaternion(aircraft.quaternion, 'YXZ');
          }
          if (controls.rollRight) {
            this._taxiQuat.setFromAxisAngle(this._yawAxis, -turnRate);
            aircraft.quaternion.multiply(this._taxiQuat);
            aircraft.rotation.setFromQuaternion(aircraft.quaternion, 'YXZ');
          }
        }

        this._taxiMode = true;
      } else {
        // In the hysteresis zone (just above ground) — aircraft is about to fly
        this._taxiMode = false;
      }
    } else {
      // Well above ground — normal flight
      this._taxiMode = false;
    }
  }

  private triggerCrash(aircraft: Aircraft, terrainH: number) {
    aircraft.crashed = true;
    this._crashTimer = 3;
    aircraft.velocity.set(0, 0, 0);
    aircraft.position.y = terrainH + 0.3 * aircraft.config.scale;
  }

  updateCrashAnimation(aircraft: Aircraft, dt: number): boolean {
    if (!aircraft.crashed) return false;
    this._crashTimer -= dt;
    if (this._crashTimer > 0) {
      this._crashQuat.setFromAxisAngle(this._rightAxis, dt * 0.5);
      aircraft.quaternion.multiply(this._crashQuat);
      aircraft.rotation.setFromQuaternion(aircraft.quaternion, 'YXZ');
      return false; // Still animating
    }
    return true; // Crash animation complete
  }

  reset() {
    this._taxiMode = true;
    this._crashTimer = 0;
    this._gracePeriod = 3;
  }

  /** Crash is complete; aircraft can be reset for a new flight (PHY-12) */
  get crashComplete(): boolean { return this._crashTimer <= 0; }
}
