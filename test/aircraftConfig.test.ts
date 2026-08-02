import { describe, it, expect } from 'vitest';
import { AIRCRAFT_CONFIGS } from '../src/aircraft/AircraftConfig';

describe('AircraftConfig', () => {
  it('should have all aircraft types', () => {
    const types = ['cessna', 'boeing', 'extra', 'f16', 'su27'];
    types.forEach(type => {
      expect(AIRCRAFT_CONFIGS[type]).toBeDefined();
      expect(AIRCRAFT_CONFIGS[type].type).toBe(type);
    });
  });

  it('should have realistic speed values', () => {
    // Cessna should be slowest
    expect(AIRCRAFT_CONFIGS.cessna.maxSpeed).toBeLessThan(150);
    // Fighters should be fastest
    expect(AIRCRAFT_CONFIGS.f16.maxSpeed).toBeGreaterThan(300);
    expect(AIRCRAFT_CONFIGS.su27.maxSpeed).toBeGreaterThan(300);
  });

  it('should have stall speed less than max speed', () => {
    Object.values(AIRCRAFT_CONFIGS).forEach(config => {
      expect(config.stallSpeed).toBeLessThan(config.maxSpeed);
      expect(config.rotateSpeed).toBeLessThan(config.maxSpeed);
    });
  });

  it('should have positive physical values', () => {
    Object.values(AIRCRAFT_CONFIGS).forEach(config => {
      expect(config.mass).toBeGreaterThan(0);
      expect(config.wingArea).toBeGreaterThan(0);
      expect(config.maxThrust).toBeGreaterThan(0);
      expect(config.dragCoefficient).toBeGreaterThan(0);
      expect(config.liftCoefficient).toBeGreaterThan(0);
    });
  });
});