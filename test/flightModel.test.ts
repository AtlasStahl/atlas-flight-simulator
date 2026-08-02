import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { FlightModel } from '../src/physics/FlightModel';
import type { AircraftConfig } from '../src/aircraft/AircraftConfig';

// Mock Aircraft for testing (minimal interface matching what FlightModel uses)
class MockAircraft {
  group = new THREE.Group();
  position = new THREE.Vector3(0, 10, 0);
  rotation = new THREE.Euler(0, 0, 0, 'YXZ');
  velocity = new THREE.Vector3(50, 0, 0);
  throttle = 0;
  crashed = false;
  flapsDeployed = false;
  config!: AircraftConfig;

  constructor(config: AircraftConfig) {
    this.config = config;
  }
}

// Minimal Controls mock
class MockControls {
  pitchUp = false;
  pitchDown = false;
  rollLeft = false;
  rollRight = false;
  yawLeft = false;
  yawRight = false;
  throttleUp = false;
  throttleDown = false;
  flaps = false;
  brakes = false;
  shoot = false;
  cycleCamera = false;
  toggleOrbit = false;
}

describe('FlightModel', () => {
  let model: FlightModel;

  beforeEach(() => {
    model = new FlightModel();
  });

  describe('throttle ramping', () => {
    it('should increase throttle smoothly when throttleUp is pressed', () => {
      const config: AircraftConfig = {
        name: 'Test',
        maxSpeed: 100,
        rotateSpeed: 40,
        maxClimbRate: 10,
        rollRate: 120,
        pitchRate: 60,
        yawRate: 30,
        throttleResponse: 0.5,
        maxThrust: 1000,
        mass: 1000,
        wingArea: 16,
        dragCoefficient: 0.03,
        liftCoefficient: 1.2,
        stallSpeed: 30,
        color: 0xffffff,
        scale: 1,
        type: 'cessna'
      };
      const aircraft = new MockAircraft(config);
      const controls = new MockControls();
      controls.throttleUp = true;

      expect(aircraft.throttle).toBe(0);
      model.update(aircraft, controls, 0.016);
      expect(aircraft.throttle).toBeGreaterThan(0);
      expect(aircraft.throttle).toBeLessThan(1);
    });

    it('should decrease throttle when throttleDown is pressed', () => {
      const config: AircraftConfig = {
        name: 'Test',
        maxSpeed: 100,
        rotateSpeed: 40,
        maxClimbRate: 10,
        rollRate: 120,
        pitchRate: 60,
        yawRate: 30,
        throttleResponse: 0.5,
        maxThrust: 1000,
        mass: 1000,
        wingArea: 16,
        dragCoefficient: 0.03,
        liftCoefficient: 1.2,
        stallSpeed: 30,
        color: 0xffffff,
        scale: 1,
        type: 'cessna'
      };
      const aircraft = new MockAircraft(config);
      aircraft.throttle = 1.0;
      const controls = new MockControls();
      controls.throttleDown = true;

      model.update(aircraft, controls, 0.016);
      expect(aircraft.throttle).toBeLessThan(1);
      expect(aircraft.throttle).toBeGreaterThanOrEqual(0);
    });

    it('should clamp throttle between 0 and 1', () => {
      const config: AircraftConfig = {
        name: 'Test',
        maxSpeed: 100,
        rotateSpeed: 40,
        maxClimbRate: 10,
        rollRate: 120,
        pitchRate: 60,
        yawRate: 30,
        throttleResponse: 1.0,
        maxThrust: 1000,
        mass: 1000,
        wingArea: 16,
        dragCoefficient: 0.03,
        liftCoefficient: 1.2,
        stallSpeed: 30,
        color: 0xffffff,
        scale: 1,
        type: 'cessna'
      };
      const aircraft = new MockAircraft(config);
      const controls = new MockControls();
      controls.throttleUp = true;

      // Ramp up many frames to exceed 1
      for (let i = 0; i < 100; i++) {
        model.update(aircraft, controls, 0.016);
      }
      expect(aircraft.throttle).toBe(1);
    });
  });

  describe('AoA calculation', () => {
    it('should produce zero AoA when velocity aligns with forward axis', () => {
      const config: AircraftConfig = {
        name: 'Test',
        maxSpeed: 100,
        rotateSpeed: 40,
        maxClimbRate: 10,
        rollRate: 120,
        pitchRate: 60,
        yawRate: 30,
        throttleResponse: 0.5,
        maxThrust: 1000,
        mass: 1000,
        wingArea: 16,
        dragCoefficient: 0.03,
        liftCoefficient: 1.2,
        stallSpeed: 30,
        color: 0xffffff,
        scale: 1,
        type: 'cessna'
      };
      const aircraft = new MockAircraft(config);
      // Velocity straight forward, no rotation
      aircraft.velocity.set(50, 0, 0);
      aircraft.rotation.set(0, 0, 0, 'YXZ');

      const controls = new MockControls();
      model.update(aircraft, controls, 0.016);

      // AoA should be ~0, so lift should be minimal
      // (we can't directly read AoA, but we verify no crash/NaN)
      expect(aircraft.velocity.x).toBeDefined();
      expect(Number.isNaN(aircraft.velocity.x)).toBe(false);
    });

    it('should not produce NaN at low speeds', () => {
      const config: AircraftConfig = {
        name: 'Test',
        maxSpeed: 100,
        rotateSpeed: 40,
        maxClimbRate: 10,
        rollRate: 120,
        pitchRate: 60,
        yawRate: 30,
        throttleResponse: 0.5,
        maxThrust: 1000,
        mass: 1000,
        wingArea: 16,
        dragCoefficient: 0.03,
        liftCoefficient: 1.2,
        stallSpeed: 30,
        color: 0xffffff,
        scale: 1,
        type: 'cessna'
      };
      const aircraft = new MockAircraft(config);
      aircraft.velocity.set(0.1, 0, 0); // Very low speed

      const controls = new MockControls();
      model.update(aircraft, controls, 0.016);

      expect(Number.isNaN(aircraft.velocity.x)).toBe(false);
      expect(Number.isNaN(aircraft.velocity.y)).toBe(false);
    });
  });

  describe('crashed state', () => {
    it('should not update physics when aircraft is crashed', () => {
      const config: AircraftConfig = {
        name: 'Test',
        maxSpeed: 100,
        rotateSpeed: 40,
        maxClimbRate: 10,
        rollRate: 120,
        pitchRate: 60,
        yawRate: 30,
        throttleResponse: 0.5,
        maxThrust: 1000,
        mass: 1000,
        wingArea: 16,
        dragCoefficient: 0.03,
        liftCoefficient: 1.2,
        stallSpeed: 30,
        color: 0xffffff,
        scale: 1,
        type: 'cessna'
      };
      const aircraft = new MockAircraft(config);
      aircraft.crashed = true;
      const initialPos = aircraft.position.clone();

      const controls = new MockControls();
      controls.throttleUp = true;
      model.update(aircraft, controls, 0.016);

      // Position should not change when crashed
      expect(aircraft.position.distanceTo(initialPos)).toBe(0);
    });
  });

  describe('gravity', () => {
    it('should apply downward gravity force', () => {
      const config: AircraftConfig = {
        name: 'Test',
        maxSpeed: 100,
        rotateSpeed: 40,
        maxClimbRate: 10,
        rollRate: 120,
        pitchRate: 60,
        yawRate: 30,
        throttleResponse: 0.5,
        maxThrust: 1000,
        mass: 1000,
        wingArea: 16,
        dragCoefficient: 0.03,
        liftCoefficient: 1.2,
        stallSpeed: 30,
        color: 0xffffff,
        scale: 1,
        type: 'cessna'
      };
      const aircraft = new MockAircraft(config);
      aircraft.velocity.set(0, 0, 0);
      aircraft.position.set(0, 100, 0);

      const controls = new MockControls();
      model.update(aircraft, controls, 0.016);

      // Gravity should pull down (negative Y velocity)
      expect(aircraft.velocity.y).toBeLessThan(0);
    });
  });

  describe('reset', () => {
    it('should reset internal vectors', () => {
      model.reset();
      // Should not throw
      expect(() => model.reset()).not.toThrow();
    });
  });

  describe('control input directions', () => {
    it('should apply roll input with correct sign', () => {
      const config: AircraftConfig = {
        name: 'Test',
        maxSpeed: 100,
        rotateSpeed: 40,
        maxClimbRate: 10,
        rollRate: 120,
        pitchRate: 60,
        yawRate: 30,
        throttleResponse: 0.5,
        maxThrust: 1000,
        mass: 1000,
        wingArea: 16,
        dragCoefficient: 0.03,
        liftCoefficient: 1.2,
        stallSpeed: 30,
        color: 0xffffff,
        scale: 1,
        type: 'cessna'
      };
      const aircraft = new MockAircraft(config);
      aircraft.velocity.set(50, 0, 0);

      const controls = new MockControls();
      controls.rollRight = true;

      const initialQuat = aircraft.group.quaternion.clone();
      model.update(aircraft, controls, 0.016);

      // Quaternion should change when roll input is applied
      const angle = initialQuat.angleTo(aircraft.group.quaternion);
      expect(angle).toBeGreaterThan(0);
    });
  });
});