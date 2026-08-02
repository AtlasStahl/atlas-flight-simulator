import * as THREE from 'three';
import { Aircraft } from '../aircraft/Aircraft';
import { Controls } from '../input/Controls';

const GRAVITY = 9.81;
const AIR_DENSITY = 1.225;

/**
 * Flight physics model with proper local-space rotation and forces.
 *
 * Coordinate system (Three.js right-handed, Y-up):
 *  - Aircraft forward = local +X
 *  - Aircraft up = local +Y
 *  - Aircraft right = cross(forward, up) = local +Z (right wing)
 *
 * Rotation convention (Euler 'YXZ'):
 *  - rotation.y = heading (yaw)
 *  - rotation.x = pitch (nose up/down)
 *  - rotation.z = roll/bank (wing tilt)
 *
 * Controls:
 *  - S = pitchUp → positive pitch rate → nose rotates up (around +Z axis)
 *  - W = pitchDown → negative pitch rate → nose rotates down
 *  - A = rollLeft → negative roll rate → left wing goes down (around +X axis)
 *  - D = rollRight → positive roll rate → right wing goes down
 *  - ←/→ = yaw left/right (around +Y axis)
 */
export class FlightModel {
  // Force vectors
  private _lift = new THREE.Vector3();
  private _drag = new THREE.Vector3();
  private _thrust = new THREE.Vector3();
  private _weight = new THREE.Vector3();
  private _acceleration = new THREE.Vector3();

  // Local axes (updated every frame from aircraft.rotation)
  private _forward = new THREE.Vector3(1, 0, 0);
  private _up = new THREE.Vector3(0, 1, 0);
  private _right = new THREE.Vector3(0, 0, 1);

  // Temp vectors for calculations
  private _velocityDir = new THREE.Vector3();
  private _liftDir = new THREE.Vector3();
  private _tempVec = new THREE.Vector3();
  private _tempVec2 = new THREE.Vector3();
  private _lateralVel = new THREE.Vector3();

  // Temp quaternions (reused to avoid allocations)
  private _qRoll = new THREE.Quaternion();
  private _qPitch = new THREE.Quaternion();
  private _qYaw = new THREE.Quaternion();
  private _qCombined = new THREE.Quaternion();

  update(aircraft: Aircraft, controls: Controls, dt: number) {
    if (aircraft.crashed) return;

    // --- Update local axes from aircraft rotation ---
    this._forward.set(1, 0, 0).applyEuler(aircraft.rotation);
    this._up.set(0, 1, 0).applyEuler(aircraft.rotation);
    this._right.set(0, 0, 1).applyEuler(aircraft.rotation);

    const speed = aircraft.velocity.length();
    const cfg = aircraft.config;

    // --- Throttle ---
    const throttleRate = dt * cfg.throttleResponse;
    if (controls.throttleUp) aircraft.throttle = Math.min(1, aircraft.throttle + throttleRate);
    if (controls.throttleDown) aircraft.throttle = Math.max(0, aircraft.throttle - throttleRate * 0.5);

    // --- Forces ---
    // Thrust: along forward axis
    this._thrust.copy(this._forward).multiplyScalar(cfg.maxThrust * aircraft.throttle);
    // Weight: always down
    this._weight.set(0, -cfg.mass * GRAVITY, 0);

    // --- Angle of Attack ---
    let aoa = 0;
    if (speed > 0.5) {
      this._velocityDir.copy(aircraft.velocity).normalize();
      const velForward = this._velocityDir.dot(this._forward);
      const velUp = this._velocityDir.dot(this._up);
      // AoA = angle between velocity and aircraft pitch plane
      // Positive AoA = nose above flight path → positive lift
      aoa = Math.atan2(-velUp, velForward);
      aoa = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, aoa));
    }

    // --- Lift ---
    const flapsBonus = aircraft.flapsDeployed ? 1.35 : 1.0;
    const clMax = cfg.liftCoefficient * flapsBonus;
    const stallAngle = cfg.stallSpeed < 40 ? 0.30 : 0.26;

    // Lift coefficient: linear near 0 AoA, smooth peak at stall, then drop
    let cl = clMax * Math.sin(2 * aoa);
    if (Math.abs(aoa) > stallAngle) {
      const excess = Math.abs(aoa) - stallAngle;
      cl *= Math.max(0.3, 1.0 - excess * 2.5);
    }

    const q = 0.5 * AIR_DENSITY * speed * speed;
    const liftForce = q * cl * cfg.wingArea;

    // Lift direction: perpendicular to velocity in the pitch plane
    if (speed > 0.5) {
      this._liftDir.copy(this._up);
      const upAlongVel = this._liftDir.dot(this._velocityDir);
      this._liftDir.sub(this._tempVec.copy(this._velocityDir).multiplyScalar(upAlongVel));
      if (this._liftDir.lengthSq() < 0.0001) {
        this._liftDir.crossVectors(this._right, this._velocityDir);
      }
      this._liftDir.normalize();
      this._lift.copy(this._liftDir).multiplyScalar(liftForce);
    } else {
      this._lift.set(0, 0, 0);
    }

    // --- Drag ---
    const cd = cfg.dragCoefficient;
    const aspectRatio = cfg.wingArea > 0 ? Math.sqrt(cfg.wingArea) * 3 : 1;
    const cdInduced = (cl * cl) / (Math.PI * aspectRatio * 0.8);
    const cdTotal = cd + cdInduced;

    const stallDrag = Math.abs(aoa) > stallAngle ? 1.0 + (Math.abs(aoa) - stallAngle) * 8 : 1.0;
    const dragForce = q * cdTotal * cfg.wingArea * stallDrag;

    if (speed > 0.1) {
      this._drag.copy(this._velocityDir).multiplyScalar(-dragForce);
    } else {
      this._drag.set(0, 0, 0);
    }

    // --- Net force → acceleration → velocity ---
    this._acceleration.set(0, 0, 0);
    this._acceleration.add(this._thrust);
    this._acceleration.add(this._drag);
    this._acceleration.add(this._lift);
    this._acceleration.add(this._weight);
    this._acceleration.multiplyScalar(1 / cfg.mass);
    aircraft.velocity.add(this._acceleration.multiplyScalar(dt));

    // --- Rotation input (control surfaces) ---
    // Control authority scales with speed (dynamic pressure)
    const cruiseSpeed = cfg.maxSpeed * 0.6;
    let controlFactor = (speed - cfg.stallSpeed * 0.3) / (cruiseSpeed - cfg.stallSpeed * 0.3);
    controlFactor = Math.max(0.25, Math.min(1.0, controlFactor));

    if (Math.abs(aoa) > stallAngle) {
      const excess = Math.abs(aoa) - stallAngle;
      controlFactor *= Math.max(0.3, 1.0 - excess * 1.5);
    }

    // Input mapping (S=up, W=down, A=left down, D=right down)
    const pitchInput = (controls.pitchUp ? 1 : 0) + (controls.pitchDown ? -1 : 0);
    const rollInput = (controls.rollLeft ? -1 : 0) + (controls.rollRight ? 1 : 0);
    const yawInput = (controls.yawLeft ? -1 : 0) + (controls.yawRight ? 1 : 0);

    // Angular rates (rad/s)
    const deg2rad = Math.PI / 180;
    const pitchRate = pitchInput * cfg.pitchRate * deg2rad * controlFactor;
    const rollRate = rollInput * cfg.rollRate * deg2rad * controlFactor;
    const yawRate = yawInput * cfg.yawRate * deg2rad * controlFactor;

    // Apply rotations in LOCAL space (post-multiply = local frame)
    this._qRoll.setFromAxisAngle(this._forward, rollRate * dt);
    this._qPitch.setFromAxisAngle(this._right, pitchRate * dt);
    this._qYaw.setFromAxisAngle(this._up, yawRate * dt);

    // Order: yaw → pitch → roll (rightmost applied first with post-multiply)
    this._qCombined.copy(this._qRoll).multiply(this._qPitch).multiply(this._qYaw);
    aircraft.group.quaternion.multiply(this._qCombined);
    aircraft.rotation.setFromQuaternion(aircraft.group.quaternion, 'YXZ');

    // --- Aerodynamic alignment: velocity follows the nose ---
    // When the aircraft is banked, lift has a horizontal component that
    // pulls the velocity vector around. This is the "bank-to-turn" effect.
    if (speed > 5) {
      const forwardSpeed = aircraft.velocity.dot(this._forward);

      // Lateral velocity = velocity - forward component
      this._lateralVel.copy(aircraft.velocity);
      this._lateralVel.sub(this._tempVec2.copy(this._forward).multiplyScalar(forwardSpeed));

      // Damp lateral velocity — this creates the turning effect
      // Stronger at higher speed (more aerodynamic force)
      const dampFactor = Math.max(0, 1 - Math.min(2.0, 0.3 + speed * 0.005) * dt);
      this._lateralVel.multiplyScalar(dampFactor);

      // Reconstruct velocity: forward + lateral
      aircraft.velocity.copy(this._tempVec2.copy(this._forward).multiplyScalar(forwardSpeed));
      aircraft.velocity.add(this._lateralVel);
    }

    // --- Integrate position ---
    aircraft.position.add(this._tempVec.copy(aircraft.velocity).multiplyScalar(dt));

    // Safety floor
    if (aircraft.position.y < -10) {
      aircraft.position.y = -10;
      aircraft.velocity.y = Math.max(0, aircraft.velocity.y);
    }

    // Flaps
    aircraft.flapsDeployed = controls.flaps;
  }

  reset() {
    this._lift.set(0, 0, 0);
    this._drag.set(0, 0, 0);
    this._thrust.set(0, 0, 0);
    this._weight.set(0, 0, 0);
    this._acceleration.set(0, 0, 0);
    this._velocityDir.set(0, 0, 0);
    this._liftDir.set(0, 0, 0);
  }
}