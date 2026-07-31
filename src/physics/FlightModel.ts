import * as THREE from 'three';
import { Aircraft } from '../aircraft/Aircraft';
import { Controls } from '../input/Controls';

const GRAVITY = 9.81; // m/s²
const AIR_DENSITY = 1.225; // kg/m³ at sea level

/**
 * Improved flight physics model with AoA-based lift, stall behavior,
 * and rotation around the aerodynamic center of mass.
 *
 * Forces: Lift, Drag (parasite + induced), Thrust, Weight
 * Rotation: Applied around local axes (center of mass = model origin)
 */
export class FlightModel {
  private _lift = new THREE.Vector3();
  private _drag = new THREE.Vector3();
  private _thrust = new THREE.Vector3();
  private _weight = new THREE.Vector3();
  private _forward = new THREE.Vector3(1, 0, 0);
  private _up = new THREE.Vector3(0, 1, 0);
  // Right vector: cross(forward, up) = -Z (aircraft's right wing direction)
  private _right = new THREE.Vector3(0, 0, -1);
  private _velocityDir = new THREE.Vector3();
  private _liftDir = new THREE.Vector3();
  private _aoaUp = new THREE.Vector3();

  update(aircraft: Aircraft, controls: Controls, dt: number) {
    if (aircraft.crashed) return;

    // --- Update local axes from aircraft rotation ---
    this._forward.set(1, 0, 0).applyEuler(aircraft.rotation);
    this._up.set(0, 1, 0).applyEuler(aircraft.rotation);
    this._right.set(0, 0, 1).applyEuler(aircraft.rotation);

    const speed = aircraft.velocity.length();

    // --- Throttle with inertia (smooth ramp up/down) ---
    const throttleRateUp = 0.25 * dt * aircraft.config.throttleResponse;
    const throttleRateDown = 0.12 * dt * aircraft.config.throttleResponse;
    if (controls.throttleUp) aircraft.throttle = Math.min(1, aircraft.throttle + throttleRateUp);
    if (controls.throttleDown) aircraft.throttle = Math.max(0, aircraft.throttle - throttleRateDown);

    // --- Thrust: points along aircraft forward axis ---
    this._thrust.copy(this._forward).multiplyScalar(aircraft.config.maxThrust * aircraft.throttle);

    // --- Weight: always points down ---
    this._weight.set(0, -aircraft.config.mass * GRAVITY, 0);

    // ============================================================
    //  Angle of Attack (AoA) – angle between velocity and aircraft
    //  reference plane (forward × right = local "down" of wing)
    // ============================================================
    let aoa = 0; // radians
    let liftPerpToWing = 1.0; // how much lift is perpendicular to velocity

    if (speed > 0.5) {
      this._velocityDir.copy(aircraft.velocity).normalize();

      // Project velocity onto the aircraft's pitch-plane (forward + up)
      const velForward = this._velocityDir.dot(this._forward);
      const velUp = this._velocityDir.dot(this._up);

      // AoA = arcsin of the vertical component relative to the aircraft
      // Positive AoA = nose above flight path (climbing attitude)
      aoa = Math.atan2(velUp, velForward);

      // Clamp AoA to reasonable range
      aoa = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, aoa));
    }

    // ============================================================
    //  Lift – AoA-dependent, perpendicular to flight path in the
    //  aircraft's pitch plane, with stall behavior
    // ============================================================
    const flapsBonus = aircraft.flapsDeployed ? 1.35 : 1.0;
    const clMax = aircraft.config.liftCoefficient * flapsBonus;

    // Stall angle: typical ~15° (0.26 rad) for most aircraft
    const stallAngle = aircraft.config.stallSpeed < 40 ? 0.30 : 0.26; // Extra stalls later

    // Lift coefficient as function of AoA (linear region, then stall)
    let cl = clMax * Math.sin(2 * aoa); // sin(2*aoa) gives smooth peak
    if (Math.abs(aoa) > stallAngle) {
      // Post-stall: lift drops off dramatically
      const excessAngle = Math.abs(aoa) - stallAngle;
      cl *= Math.max(0.3, 1.0 - excessAngle * 2.5);
    }

    // Dynamic pressure
    const q = 0.5 * AIR_DENSITY * speed * speed;
    const liftForce = q * cl * aircraft.config.wingArea;

    // Lift direction: perpendicular to velocity in the pitch plane
    if (speed > 0.5) {
      // Lift is perpendicular to velocity, in the plane defined by
      // aircraft forward and up. General direction is "up" relative
      // to the aircraft's wing plane.
      this._liftDir.copy(this._up)
        .sub(this._forward.clone().multiplyScalar(this._up.dot(this._forward)))
        .normalize();
      // Ensure lift points in the "up" direction relative to velocity
      if (this._liftDir.dot(this._velocityDir.clone().multiplyScalar(-1)) > 0) {
        // flip if needed
      }
      // Simpler: lift is roughly in aircraft's "up" direction
      // but corrected to be perpendicular to velocity
      this._liftDir.copy(this._up);
      // Remove component along velocity
      const upAlongVel = this._liftDir.dot(this._velocityDir);
      this._liftDir.sub(this._velocityDir.clone().multiplyScalar(upAlongVel));
      if (this._liftDir.lengthSq() < 0.0001) {
        // Velocity is parallel to up – use right cross velocity
        this._liftDir.crossVectors(this._right, this._velocityDir);
      }
      this._liftDir.normalize();
      this._lift.copy(this._liftDir).multiplyScalar(liftForce);
    } else {
      this._lift.set(0, 0, 0);
    }

    // ============================================================
    //  Drag – parasite (speed²) + induced (1/speed², from lift)
    // ============================================================
    const cdParasite = aircraft.config.dragCoefficient;
    // Induced drag: proportional to Cl² / (π · AR · e)
    const aspectRatio = aircraft.config.wingArea > 0
      ? Math.sqrt(aircraft.config.wingArea) * 3 // approximate
      : 1;
    const oe = 0.8; // Oswald efficiency
    const cdInduced = (cl * cl) / (Math.PI * aspectRatio * oe);
    const cdTotal = cdParasite + cdInduced;

    // Stall drag penalty
    const stallDragMultiplier = Math.abs(aoa) > stallAngle
      ? 1.0 + (Math.abs(aoa) - stallAngle) * 8
      : 1.0;

    const dragForce = q * cdTotal * aircraft.config.wingArea * stallDragMultiplier;

    if (speed > 0.1) {
      this._drag.copy(this._velocityDir).multiplyScalar(-dragForce);
    } else {
      this._drag.set(0, 0, 0);
    }

    // ============================================================
    //  Net force and acceleration
    // ============================================================
    const netForce = new THREE.Vector3();
    netForce.add(this._thrust);
    netForce.add(this._drag);
    netForce.add(this._lift);
    netForce.add(this._weight);

    const acceleration = netForce.multiplyScalar(1 / aircraft.config.mass);
    aircraft.velocity.add(acceleration.multiplyScalar(dt));

    // ============================================================
    //  Aerodynamic alignment – velocity naturally aligns with
    //  the aircraft's forward axis (sideslip damping)
    // ============================================================
    if (speed > 2) {
      const forwardSpeed = aircraft.velocity.dot(this._forward);
      const lateralVelocity = new THREE.Vector3()
        .copy(aircraft.velocity)
        .sub(this._forward.clone().multiplyScalar(forwardSpeed));

      // Damping factor: speed-dependent (faster = more stable)
      const alignmentStrength = Math.min(0.95, 0.7 + speed * 0.003);
      lateralVelocity.multiplyScalar(1 - alignmentStrength * dt * 5);

      aircraft.velocity.copy(this._forward.clone().multiplyScalar(forwardSpeed)).add(lateralVelocity);
    }

    // ============================================================
    //  Rotation input – control surfaces generate angular rates
    //  around the aircraft's CENTER OF MASS (model origin)
    //
    //  Control authority depends on:
    //  - Dynamic pressure (more speed = more authority)
    //  - AoA (stall = less control)
    //  - Aircraft type (acrobatic vs airliner)
    // ============================================================
    // Control authority: based on dynamic pressure (speed²) for realistic feel
    // At stall speed, control authority should be ~50%, at cruise ~100%
    const stallSpeed = aircraft.config.stallSpeed;
    const cruiseSpeed = aircraft.config.maxSpeed * 0.6;
    let controlFactor = (speed - stallSpeed * 0.5) / (cruiseSpeed - stallSpeed * 0.5);
    controlFactor = Math.max(0.2, Math.min(1.0, controlFactor));

    // Reduce control in deep stall
    if (Math.abs(aoa) > stallAngle) {
      const excessAngle = Math.abs(aoa) - stallAngle;
      controlFactor *= Math.max(0.3, 1.0 - excessAngle * 1.5);
    }

    // Input mapping
    const rollInput = (controls.rollRight ? 1 : 0) - (controls.rollLeft ? 1 : 0);
    const pitchInput = (controls.pitchUp ? 1 : 0) - (controls.pitchDown ? 1 : 0);
    const yawInput = (controls.yawRight ? 1 : 0) - (controls.yawLeft ? 1 : 0);

    // Angular rates (rad/s) - apply full rate at cruise, scaled by controlFactor
    const rollRate = rollInput * (aircraft.config.rollRate * Math.PI / 180) * controlFactor;
    const pitchRate = pitchInput * (aircraft.config.pitchRate * Math.PI / 180) * controlFactor;
    const yawRate = yawInput * (aircraft.config.yawRate * Math.PI / 180) * controlFactor;

    // Apply rotations in LOCAL space using quaternions
    // Roll around FORWARD axis (nose-to-tail)
    // Pitch around RIGHT axis (wing-to-wing, negated for correct direction)
    // Yaw around UP axis (bottom-to-top)
    const rollQuat = new THREE.Quaternion().setFromAxisAngle(this._forward, rollRate * dt);
    const pitchQuat = new THREE.Quaternion().setFromAxisAngle(this._right, -pitchRate * dt);  // Negated for correct pitch direction
    const yawQuat = new THREE.Quaternion().setFromAxisAngle(this._up, yawRate * dt);

    // Combine and apply in local space (post-multiply)
    const combined = new THREE.Quaternion().multiply(rollQuat).multiply(pitchQuat).multiply(yawQuat);
    aircraft.group.quaternion.multiply(combined);

    // Sync Euler rotation from quaternion
    aircraft.rotation.setFromQuaternion(aircraft.group.quaternion, 'YXZ');

    // ============================================================
    //  Integrate position
    // ============================================================
    aircraft.position.add(aircraft.velocity.clone().multiplyScalar(dt));

    // Safety floor – prevent going too far underground
    if (aircraft.position.y < -10) {
      aircraft.position.y = -10;
      aircraft.velocity.y = Math.max(0, aircraft.velocity.y);
    }

    // --- Flaps ---
    aircraft.flapsDeployed = controls.flaps;
  }
}