import type { AircraftConfig } from '../../src/aircraft/AircraftConfig';

/** Standard-AircraftConfig für Tests — Cessna-ähnliche Werte */
const DEFAULT_CONFIG: AircraftConfig = {
  name: 'Test Aircraft',
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
  aspectRatio: 7.3,
  stallAngleRad: 0.28,
  color: 0xffffff,
  scale: 1,
  type: 'cessna',
  cockpitOffset: { x: 0.5, y: 0.8, z: 0 },
};

/** Erzeugt eine AircraftConfig mit Optional-Overrides — QA-01 */
export function makeConfig(overrides: Partial<AircraftConfig> = {}): AircraftConfig {
  return { ...DEFAULT_CONFIG, ...overrides };
}