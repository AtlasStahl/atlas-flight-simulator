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

  // Object pooling - dedicated temp vectors per calculation to avoid shared reference bugs
  private _tempVecLiftDir = new THREE.Vector3();
  private _tempVecForwardSpeed = new THREE.Vector3();
  private _tempVecPosition = new THREE.Vector3();
  private _tempQuatRoll = new THREE.Quaternion();
  private _tempQuatPitch = new THREE.Quaternion();
  private _tempQuatYaw = new THREE.Quaternion();
  private _tempQuatCombined = new THREE.Quaternion();
  private _tempQuatTurn = new THREE.Quaternion();
  private _turnAxis = new THREE.Vector3(0, 1, 0);
  private _lateralVelocity = new THREE.Vector3();
  private _acceleration = new THREE.Vector3();

  update(aircraft: Aircraft, controls: Controls, dt: number) {
    if (aircraft.crashed) return;

    // --- Update local axes from aircraft rotation ---
    this._forward.set(1, 0, 0).applyEuler(aircraft.rotation);
    this._up.set(0, 1, 0).applyEuler(aircraft.rotation);
    this._right.set(0, 0, 1).applyEuler(aircraft.rotation);

    const speed = aircraft.velocity.length();

    // --- Throttle with inertia (smooth ramp up/down) ---
    const throttleRateUp = 1.0 * dt * aircraft.config.throttleResponse;
    const throttleRateDown = 0.5 * dt * aircraft.config.throttleResponse;
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

    if (speed > 0.3) {
      this._velocityDir.copy(aircraft.velocity).normalize();

      // Project velocity onto the aircraft's pitch-plane (forward + up)
      const velForward = this._velocityDir.dot(this._forward);
      const velUp = this._velocityDir.dot(this._up);

      // AoA = angle between relative wind (-velocity) and aircraft forward axis
      // Positive AoA = relative wind from below = nose above flight path = lift
      // When nose is up, velocity is BELOW the aircraft axis → velUp is negative
      // We negate velUp so that pulling up gives positive AoA → positive lift
      aoa = Math.atan2(-velUp, velForward);

      // Clamp AoA to reasonable range
      aoa = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, aoa));

      // Smooth transition at low speed to avoid lift spikes
      const speedBlend = Math.min(1, (speed - 0.3) / 3.0);
      aoa *= speedBlend;
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
      // Lift is roughly in aircraft's "up" direction
      // but corrected to be perpendicular to velocity
      this._liftDir.copy(this._up);
      // Remove component along velocity
      const upAlongVel = this._liftDir.dot(this._velocityDir);
      this._liftDir.sub(this._tempVecLiftDir.copy(this._velocityDir).multiplyScalar(upAlongVel));
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
    this._acceleration.set(0, 0, 0);
    this._acceleration.add(this._thrust);
    this._acceleration.add(this._drag);
    this._acceleration.add(this._lift);
    this._acceleration.add(this._weight);
    this._acceleration.multiplyScalar(1 / aircraft.config.mass);
    aircraft.velocity.add(this._acceleration.multiplyScalar(dt));

    // ============================================================
    //  Bank-to-Turn Physics – when aircraft is rolled (banked),
    //  lift creates a horizontal component that turns the aircraft.
    //  This is the PRIMARY way aircraft change direction.
    //
    //  Bank angle is extracted from the aircraft's quaternion by
    //  projecting the local up vector onto the world horizontal plane.
    //  This avoids the gimbal lock issues with Euler rotation.z.
    // ============================================================
    if (speed > 5) {
      // Extract bank angle from quaternion (correct method, no gimbal lock)
      // Transform local up to world space, then find the angle between
      // world up and the aircraft's tilted up vector projected on horizontal
      const worldUp = new THREE.Vector3(0, 1, 0);
      const aircraftUp = this._up.clone();
      // Project aircraft up onto horizontal plane
      const aircraftUpHorizontal = aircraftUp.clone().sub(worldUp.multiplyScalar(aircraftUp.y));
      // Bank angle: angle between forward and the horizontal component of up
      // When banked right, up tilts right, so forward x horizontal gives bank
      const forwardHorizontal = this._forward.clone().sub(worldUp.multiplyScalar(this._forward.y));
      if (forwardHorizontal.lengthSq() > 0.001 && aircraftUpHorizontal.lengthSq() > 0.001) {
        const bankAngle = Math.atan2(
          aircraftUpHorizontal.normalize().dot(forwardHorizontal.normalize().cross(worldUp)),
          aircraftUpHorizontal.normalize().dot(forwardHorizontal.normalize())
        );
        // Standard rate turn: ~3°/s at 25° bank
        const turnRate = Math.sin(bankAngle) * (GRAVITY / speed) * 1.5;

        // Rotate velocity vector around world Y axis (turn)
        this._tempQuatTurn.setFromAxisAngle(this._turnAxis, turnRate * dt);
        aircraft.velocity.applyQuaternion(this._tempQuatTurn);
      }

      // Aerodynamic alignment - weak so bank-to-turn dominates
      const forwardSpeed = aircraft.velocity.dot(this._forward);
      this._lateralVelocity.copy(aircraft.velocity)
        .sub(this._tempVecForwardSpeed.copy(this._forward).multiplyScalar(forwardSpeed));

      // Weak alignment - let bank-to-turn dominate
      const alignmentStrength = Math.min(0.3, 0.1 + speed * 0.002);
      this._lateralVelocity.multiplyScalar(1 - alignmentStrength * dt * 3);

      aircraft.velocity.copy(this._tempVecForwardSpeed.copy(this._forward).multiplyScalar(forwardSpeed)).add(this._lateralVelocity);
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
    // Roll: A=left wing down (negative roll), D=right wing down (positive roll)
    const rollInput = (controls.rollLeft ? -1 : 0) + (controls.rollRight ? 1 : 0);
    // Pitch: S=pitch up (nose up), W=pitch down (nose down)
    const pitchInput = (controls.pitchUp ? -1 : 0) + (controls.pitchDown ? 1 : 0);
    // Yaw: ArrowLeft=yaw left, ArrowRight=yaw right
    const yawInput = (controls.yawLeft ? -1 : 0) + (controls.yawRight ? 1 : 0);

    // Angular rates (rad/s) - apply full rate at cruise, scaled by controlFactor
    const rollRate = rollInput * (aircraft.config.rollRate * Math.PI / 180) * controlFactor;
    const pitchRate = pitchInput * (aircraft.config.pitchRate * Math.PI / 180) * controlFactor;
    const yawRate = yawInput * (aircraft.config.yawRate * Math.PI / 180) * controlFactor;

    // Apply rotations in LOCAL space using quaternions
    // Roll around FORWARD axis (nose-to-tail)
    // Pitch around RIGHT axis (wing-to-wing)
    // Yaw around UP axis (bottom-to-top)
    this._tempQuatRoll.setFromAxisAngle(this._forward, rollRate * dt);
    this._tempQuatPitch.setFromAxisAngle(this._right, pitchRate * dt);
    this._tempQuatYaw.setFromAxisAngle(this._up, yawRate * dt);

    // Combine and apply in local space (post-multiply)
    this._tempQuatCombined.copy(this._tempQuatRoll).multiply(this._tempQuatPitch).multiply(this._tempQuatYaw);
    aircraft.group.quaternion.multiply(this._tempQuatCombined);

    // Sync Euler rotation from quaternion
    aircraft.rotation.setFromQuaternion(aircraft.group.quaternion, 'YXZ');

    // ============================================================
    //  Integrate position
    // ============================================================
    aircraft.position.add(this._tempVecPosition.copy(aircraft.velocity).multiplyScalar(dt));

    // Safety floor – prevent going too far underground
    if (aircraft.position.y < -10) {
      aircraft.position.y = -10;
      aircraft.velocity.y = Math.max(0, aircraft.velocity.y);
    }

    // --- Flaps ---
    aircraft.flapsDeployed = controls.flaps;
  }

  /** Reset flight model state for game restart */
  reset() {
    this._lift.set(0, 0, 0);
    this._drag.set(0, 0, 0);
    this._thrust.set(0, 0, 0);
    this._weight.set(0, 0, 0);
    this._acceleration.set(0, 0, 0);
    this._velocityDir.set(0, 0, 0);
    this._liftDir.set(0, 0, 0);
    this._lateralVelocity.set(0, 0, 0);
  }
}