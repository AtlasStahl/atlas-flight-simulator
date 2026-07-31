/** Aircraft configuration profiles */

export interface AircraftConfig {
  name: string;
  /** Maximum speed in m/s */
  maxSpeed: number;
  /** Rotate/takeoff speed in m/s */
  rotateSpeed: number;
  /** Maximum climb rate in m/s */
  maxClimbRate: number;
  /** Roll rate in degrees per second */
  rollRate: number;
  /** Pitch rate in degrees per second */
  pitchRate: number;
  /** Yaw rate in degrees per second */
  yawRate: number;
  /** Throttle response factor (0-1) */
  throttleResponse: number;
  /** Maximum thrust in Newtons */
  maxThrust: number;
  /** Mass in kg */
  mass: number;
  /** Wing area in m² */
  wingArea: number;
  /** Drag coefficient */
  dragCoefficient: number;
  /** Lift coefficient at optimal AoA */
  liftCoefficient: number;
  /** Stall speed in m/s */
  stallSpeed: number;
  /** Color for the aircraft model */
  color: number;
  /** Scale factor for the 3D model */
  scale: number;
  /** Aircraft type identifier */
  type: 'cessna' | 'boeing' | 'extra';
}

export const AIRCRAFT_CONFIGS: Record<string, AircraftConfig> = {
  cessna: {
    name: 'Cessna 172',
    maxSpeed: 103,        // ~370 km/h
    rotateSpeed: 44,       // ~160 km/h
    maxClimbRate: 2.5,     // ~500 ft/min
    rollRate: 120,
    pitchRate: 60,
    yawRate: 30,
    throttleResponse: 0.4,
    maxThrust: 7000,
    mass: 1100,
    wingArea: 16.2,
    dragCoefficient: 0.03,
    liftCoefficient: 1.2,
    stallSpeed: 30,        // ~108 km/h
    color: 0xffffff,
    scale: 1.0,
    type: 'cessna'
  },
  boeing: {
    name: 'Boeing 737',
    maxSpeed: 236,        // ~850 km/h
    rotateSpeed: 78,      // ~280 km/h
    maxClimbRate: 12.5,   // ~2500 ft/min
    rollRate: 60,
    pitchRate: 40,
    yawRate: 20,
    throttleResponse: 0.6,
    maxThrust: 280000,
    mass: 53000,
    wingArea: 125,
    dragCoefficient: 0.025,
    liftCoefficient: 1.4,
    stallSpeed: 55,       // ~198 km/h
    color: 0xcccccc,
    scale: 2.5,
    type: 'boeing'
  },
  extra: {
    name: 'Extra 300',
    maxSpeed: 180,        // ~650 km/h
    rotateSpeed: 39,      // ~140 km/h
    maxClimbRate: 15,     // ~3000 ft/min
    rollRate: 400,
    pitchRate: 200,
    yawRate: 80,
    throttleResponse: 0.9,
    maxThrust: 12000,
    mass: 700,
    wingArea: 10.2,
    dragCoefficient: 0.02,
    liftCoefficient: 1.5,
    stallSpeed: 25,       // ~90 km/h
    color: 0xff0000,
    scale: 0.8,
    type: 'extra'
  }
};