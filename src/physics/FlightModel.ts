import * as THREE from 'three';
import { Aircraft } from '../aircraft/Aircraft';
import { Controls } from '../input/Controls';

const GRAVITY = 9.81; // m/s²

/** Simplified flight physics model: Lift, Drag, Thrust, Weight */
export class FlightModel {
  private _lift = new THREE.Vector3();
  private _drag = new THREE.Vector3();
  private _thrust = new THREE.Vector3();
  private _weight = new THREE.Vector3(0, -GRAVITY, 0);
  private _forward = new THREE.Vector3(1, 0, 0);
  private _up = new THREE.Vector3(0, 1, 0);
  private _right = new THREE.Vector3(0, 0, 1);

  update(aircraft: Aircraft, controls: Controls, dt: number) {
    if (aircraft.crashed) return;

    // Update local axes from aircraft rotation
    this._forward.set(1, 0, 0).applyEuler(aircraft.rotation);
    this._up.set(0, 1, 0).applyEuler(aircraft.rotation);
    this._right.set(0, 0, 1).applyEuler(aircraft.rotation);

    const speed = aircraft.velocity.length();
    const speedMs = speed;

    // --- Throttle ---
    const throttleDelta = 0.15 * dt * aircraft.config.throttleResponse;
    if (controls.throttleUp) aircraft.throttle = Math.min(1, aircraft.throttle + throttleDelta);
    if (controls.throttleDown) aircraft.throttle = Math.max(0, aircraft.throttle - throttleDelta);

    // --- Thrust ---
    this._thrust.copy(this._forward).multiplyScalar(aircraft.config.maxThrust * aircraft.throttle);

    // --- Weight ---
    this._weight.set(0, -aircraft.config.mass * GRAVITY, 0);

    // --- Drag ---
    const dragForce = 0.5 * 1.225 * speedMs * speedMs * aircraft.config.dragCoefficient * aircraft.config.wingArea;
    if (speedMs > 0.1) {
      this._drag.copy(aircraft.velocity).normalize().multiplyScalar(-dragForce);
    } else {
      this._drag.set(0, 0, 0);
    }

    // --- Lift ---
    const flapsLiftBonus = aircraft.flapsDeployed ? 1.3 : 1.0;
    const liftCoeff = aircraft.config.liftCoefficient * flapsLiftBonus;
    const liftForce = 0.5 * 1.225 * speedMs * speedMs * liftCoeff * aircraft.config.wingArea;
    this._lift.copy(this._up).multiplyScalar(liftForce);

    // --- Net Force ---
    const netForce = new THREE.Vector3();
    netForce.add(this._thrust);
    netForce.add(this._drag);
    netForce.add(this._lift);
    netForce.add(this._weight);

    // --- Acceleration (F = ma) ---
    const acceleration = netForce.multiplyScalar(1 / aircraft.config.mass);

    // --- Integrate velocity ---
    aircraft.velocity.add(acceleration.multiplyScalar(dt));

    // --- Directional steering: blend velocity toward aircraft's forward direction ---
    // This makes the plane actually fly where it's pointing, like real aerodynamic forces
    if (speedMs > 2) {
      const forwardSpeed = aircraft.velocity.dot(this._forward);
      const lateralVelocity = new THREE.Vector3().copy(aircraft.velocity).sub(this._forward.clone().multiplyScalar(forwardSpeed));
      // Strongly dampen lateral velocity - plane naturally aligns with its heading
      lateralVelocity.multiplyScalar(0.9);
      aircraft.velocity.copy(this._forward.clone().multiplyScalar(forwardSpeed)).add(lateralVelocity);
    }

    // --- Rotation input (aircraft controls) using local axes ---
    if (speedMs > 1) {
      const controlFactor = Math.min(1, speedMs / aircraft.config.rotateSpeed);
      const rollDeg = (controls.rollLeft ? 1 : 0) - (controls.rollRight ? 1 : 0);
      const pitchDeg = (controls.pitchDown ? 1 : 0) - (controls.pitchUp ? 1 : 0);
      const yawDeg = (controls.yawLeft ? 1 : 0) - (controls.yawRight ? 1 : 0);

      const rollRad = rollDeg * (aircraft.config.rollRate * Math.PI / 180) * controlFactor * dt;
      const pitchRad = pitchDeg * (aircraft.config.pitchRate * Math.PI / 180) * controlFactor * dt;
      const yawRad = yawDeg * (aircraft.config.yawRate * Math.PI / 180) * controlFactor * dt;

      // Apply rotations around LOCAL axes using group rotation methods
      // This avoids Euler/Quaternion conversion issues and gimbal lock
      if (rollRad !== 0) {
        aircraft.group.rotateX(rollRad);
      }
      if (pitchRad !== 0) {
        aircraft.group.rotateZ(pitchRad);
      }
      if (yawRad !== 0) {
        aircraft.group.rotateY(yawRad);
      }

      // Sync rotation back to aircraft state
      aircraft.rotation.copy(aircraft.group.rotation);
    }

    // --- Integrate position ---
    aircraft.position.add(aircraft.velocity.clone().multiplyScalar(dt));

    // Prevent going underground (camera goes black when below terrain)
    if (aircraft.position.y < -5) {
      aircraft.position.y = -5;
      aircraft.velocity.y = Math.max(0, aircraft.velocity.y);
    }

    // --- Flaps ---
    aircraft.flapsDeployed = controls.flaps;
  }
}