import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { GroundCollision } from '../src/physics/GroundCollision';
import type { AircraftConfig } from '../src/aircraft/AircraftConfig';

// Mock Aircraft
class MockAircraft {
  group = new THREE.Group();
  position = new THREE.Vector3(0, 0.5, 0);
  rotation = new THREE.Euler(0, 0, 0, 'YXZ');
  quaternion = new THREE.Quaternion(); // PHY-06: authoritative quaternion
  velocity = new THREE.Vector3(0, 0, 0);
  throttle = 0;
  crashed = false;
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

const RUNWAY_BOUNDS = { x1: -1000, x2: 1000, z1: -300, z2: 300 };

const CESSNA_CONFIG: AircraftConfig = {
  name: 'Cessna 172',
  maxSpeed: 103,
  rotateSpeed: 44,
  maxClimbRate: 2.5,
  rollRate: 120,
  pitchRate: 60,
  yawRate: 30,
  throttleResponse: 0.4,
  maxThrust: 1300,
  mass: 1100,
  wingArea: 16.2,
  dragCoefficient: 0.03,
  liftCoefficient: 1.2,
  stallSpeed: 30,
  color: 0xffffff,
  scale: 1.0,
  type: 'cessna'
};

describe('GroundCollision', () => {
  let collision: GroundCollision;
  let aircraft: MockAircraft;
  let controls: MockControls;

  beforeEach(() => {
    collision = new GroundCollision(() => 0); // Flat ground
    aircraft = new MockAircraft(CESSNA_CONFIG);
    controls = new MockControls();
  });

  describe('grace period', () => {
    it('should not trigger crash during grace period', () => {
      aircraft.position.set(0, 0.5, 0);
      aircraft.velocity.set(0, -20, 0); // High sink rate

      collision.update(aircraft, controls, 0.016, RUNWAY_BOUNDS);

      expect(aircraft.crashed).toBe(false);
    });

    it('should count down grace period', () => {
      aircraft.position.set(0, 0.5, 0);
      aircraft.velocity.set(0, -20, 0);

      // Drain grace period (3 seconds) - keep resetting velocity each frame
      // since ground collision sets it to 0 when on ground
      for (let i = 0; i < 200; i++) {
        collision.update(aircraft, controls, 0.016, RUNWAY_BOUNDS);
        // Reset sink rate each frame (ground collision zeros it)
        aircraft.velocity.y = -20;
        aircraft.position.y = 0.5;
      }

      // After grace period, crash should trigger
      expect(aircraft.crashed).toBe(true);
    });
  });

  describe('ground detection', () => {
    it('should enable taxi mode near ground', () => {
      aircraft.position.set(0, 0.5, 0);
      aircraft.velocity.set(0, 0, 0);

      // Drain grace period first
      for (let i = 0; i < 200; i++) {
        collision.update(aircraft, controls, 0.016, RUNWAY_BOUNDS);
      }

      expect(collision.taxiMode).toBe(true);
    });

    it('should disable taxi mode when well above ground', () => {
      aircraft.position.set(0, 100, 0);
      aircraft.velocity.set(0, 0, 0);

      collision.update(aircraft, controls, 0.016, RUNWAY_BOUNDS);

      expect(collision.taxiMode).toBe(false); // Aircraft is well above ground, not in taxi mode
    });
  });

  describe('ground friction', () => {
    it('should apply strong braking on runway with no throttle', () => {
      // Drain grace period
      for (let i = 0; i < 200; i++) {
        collision.update(aircraft, controls, 0.016, RUNWAY_BOUNDS);
      }

      aircraft.velocity.set(30, 0, 0);
      aircraft.throttle = 0;

      collision.update(aircraft, controls, 0.016, RUNWAY_BOUNDS);

      // Velocity should decrease
      expect(aircraft.velocity.length()).toBeLessThan(30);
    });

    it('should apply light drag on runway with throttle', () => {
      // Drain grace period
      for (let i = 0; i < 200; i++) {
        collision.update(aircraft, controls, 0.016, RUNWAY_BOUNDS);
      }

      aircraft.velocity.set(30, 0, 0);
      aircraft.throttle = 0.5;

      const initialSpeed = aircraft.velocity.length();
      collision.update(aircraft, controls, 0.016, RUNWAY_BOUNDS);

      // Velocity should decrease slightly
      expect(aircraft.velocity.length()).toBeLessThan(initialSpeed);
      expect(aircraft.velocity.length()).toBeGreaterThan(initialSpeed * 0.99);
    });
  });

  describe('takeoff', () => {
    it('should allow natural lift-off when aircraft has upward velocity', () => {
      // Drain grace period
      for (let i = 0; i < 200; i++) {
        collision.update(aircraft, controls, 0.016, RUNWAY_BOUNDS);
      }

      // Simulate aircraft at speed with lift (positive upward velocity)
      aircraft.velocity.set(50, 3, 0); // Moving forward + climbing
      aircraft.position.set(0, 2.0, 0); // Just above ground
      controls.pitchUp = true;

      collision.update(aircraft, controls, 0.016, RUNWAY_BOUNDS);

      // Position should be above ground (not constrained down)
      expect(aircraft.position.y).toBeGreaterThan(1.0);
      // Upward velocity should NOT be blocked (lift is working)
      expect(aircraft.velocity.y).toBeGreaterThanOrEqual(0);
    });

    it('should not takeoff below rotate speed', () => {
      // Drain grace period
      for (let i = 0; i < 200; i++) {
        collision.update(aircraft, controls, 0.016, RUNWAY_BOUNDS);
      }

      aircraft.velocity.set(20, 0, 0); // Below rotate speed
      controls.pitchUp = true;

      collision.update(aircraft, controls, 0.016, RUNWAY_BOUNDS);

      expect(collision.taxiMode).toBe(true);
    });
  });

  describe('crash detection', () => {
    it('should trigger crash on high sink rate after grace period', () => {
      // Drain grace period
      for (let i = 0; i < 200; i++) {
        collision.update(aircraft, controls, 0.016, RUNWAY_BOUNDS);
      }

      aircraft.crashed = false;
      aircraft.position.set(0, 0.5, 0);
      aircraft.velocity.set(0, -15, 0); // High sink rate

      collision.update(aircraft, controls, 0.016, RUNWAY_BOUNDS);

      expect(aircraft.crashed).toBe(true);
    });

    it('should not crash on gentle landing', () => {
      // Drain grace period
      for (let i = 0; i < 200; i++) {
        collision.update(aircraft, controls, 0.016, RUNWAY_BOUNDS);
      }

      aircraft.crashed = false;
      aircraft.position.set(0, 0.5, 0);
      aircraft.velocity.set(0, -3, 0); // Gentle sink

      collision.update(aircraft, controls, 0.016, RUNWAY_BOUNDS);

      expect(aircraft.crashed).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset taxi mode and grace period', () => {
      collision.reset();

      expect(collision.taxiMode).toBe(true); // reset() puts aircraft on the ground
    });
  });

  describe('terrain height function', () => {
    it('should use custom terrain height', () => {
      const terrainHeight = (_x: number, _z: number) => 50; // 50m plateau
      const collisionPlateau = new GroundCollision(terrainHeight);

      const aircraftPlateau = new MockAircraft(CESSNA_CONFIG);
      aircraftPlateau.position.set(2000, 50.5, 2000); // Outside runway bounds

      // Drain grace period
      for (let i = 0; i < 200; i++) {
        collisionPlateau.update(aircraftPlateau, controls, 0.016, RUNWAY_BOUNDS);
      }

      expect(collisionPlateau.taxiMode).toBe(true);
    });
  });
});