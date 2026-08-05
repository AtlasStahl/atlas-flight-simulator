/** Aircraft configuration profiles */

export interface AircraftConfig {
  name: string;
  /** Maximum speed in m/s */
  maxSpeed: number;
  /** Rotate/takeoff speed in m/s — Anzeigewert für das Menü; NICHT physikwirksam. Tatsächliche Abhebegeschwindigkeit ergibt sich aus mass, wingArea, liftCoefficient und AoA. */
  rotateSpeed: number;
  /** Maximum climb rate in m/s — Anzeigewert für das Menü; NICHT physikwirksam. Tatsächliche Steigrate ergibt sich aus Auftrieb und Widerstand. */
  maxClimbRate: number;
  /** Roll rate in degrees per second */
  rollRate: number;
  /** Pitch rate in degrees per second */
  pitchRate: number;
  /** Yaw rate in degrees per second */
  yawRate: number;
  /** Throttle response factor (0-1) */
  throttleResponse: number;
  /** Maximum thrust in Newtons (static thrust for propeller aircraft) */
  maxThrust: number;
  /**
   * Airspeed in m/s up to which a propeller delivers full `maxThrust`. Above it the
   * constant-power model applies: thrust = maxThrust * (propThrustRefSpeed / airspeed).
   * Leave undefined for jets, which produce roughly speed-independent thrust.
   */
  propThrustRefSpeed?: number;
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
  /** Aspect ratio (b²/S) — independent geometry property, not derived from wingArea */
  aspectRatio: number;
  /** Stall angle in radians — airfoil property, not derived from stallSpeed */
  stallAngleRad: number;
  /** Color for the aircraft model */
  color: number;
  /** Scale factor for the 3D model */
  scale: number;
  /** Aircraft type identifier */
  type: 'cessna' | 'boeing' | 'extra' | 'f16' | 'su27';
  /** Cockpit camera offset (CAM-02: scales with aircraft size) */
  cockpitOffset: { x: number; y: number; z: number };
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
    maxThrust: 2600,       // statischer Propellerschub (~180 hp, Wirkungsgrad ~0.8)
    propThrustRefSpeed: 41, // entspricht ~107 kW Vortriebsleistung
    mass: 1100,
    wingArea: 16.2,
    dragCoefficient: 0.03,
    liftCoefficient: 1.2,
    stallSpeed: 30,        // ~108 km/h
    aspectRatio: 7.3,      // real Cessna 172 aspect ratio
    stallAngleRad: 0.28,   // ~16° typical for GA airfoils
    color: 0xffffff,
    scale: 1.0,
    type: 'cessna',
    cockpitOffset: { x: 0.5, y: 0.8, z: 0 } // CAM-02: Cessna Cockpit
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
    maxThrust: 185000,
    mass: 53000,
    wingArea: 125,
    dragCoefficient: 0.025,
    liftCoefficient: 1.4,
    stallSpeed: 55,       // ~198 km/h
    aspectRatio: 9.4,      // real Boeing 737 aspect ratio
    stallAngleRad: 0.24,   // ~14° commercial airliner
    color: 0xcccccc,
    scale: 2.5,
    type: 'boeing',
    cockpitOffset: { x: 1.5, y: 1.8, z: 0 } // CAM-02: Boeing Cockpit (größeres Flugzeug)
  },
  extra: {
    name: 'Extra 300',
    maxSpeed: 114,        // ~410 km/h (Vne der realen Extra 300)
    rotateSpeed: 28,      // ~100 km/h (aerobatic, very short takeoff)
    maxClimbRate: 16,     // ~3200 ft/min
    rollRate: 420,
    pitchRate: 180,
    yawRate: 100,
    throttleResponse: 0.9,
    maxThrust: 6500,      // statischer Propellerschub (~300 hp) — T/W ~0.95
    propThrustRefSpeed: 27.5, // entspricht ~179 kW Vortriebsleistung
    mass: 700,
    wingArea: 10.2,
    dragCoefficient: 0.02,
    liftCoefficient: 1.6,
    stallSpeed: 18,       // ~65 km/h (aerobatic stall speed, with power-on)
    aspectRatio: 6.5,      // Extra 300 high-performance aerobatic
    stallAngleRad: 0.35,   // ~20° aerobatic airfoil
    color: 0xff0000,
    scale: 0.8,
    type: 'extra',
    cockpitOffset: { x: 0.4, y: 0.6, z: 0 } // CAM-02: Extra 300 Cockpit (Kunstflug)
  },
  f16: {
    name: 'F-16 Fighting Falcon',
    maxSpeed: 350,        // ~1260 km/h
    rotateSpeed: 80,      // ~288 km/h
    maxClimbRate: 25,     // ~5000 ft/min
    rollRate: 360,
    pitchRate: 120,
    yawRate: 60,
    throttleResponse: 0.85,
    maxThrust: 160000,
    mass: 13000,
    wingArea: 27.87,
    dragCoefficient: 0.018,
    liftCoefficient: 1.6,
    stallSpeed: 40,       // ~144 km/h
    aspectRatio: 3.5,      // F-16 delta wing, low aspect ratio
    stallAngleRad: 0.22,   // ~12° fighter airfoil
    color: 0x556b2f,      // Military green
    scale: 1.2,
    type: 'f16',
    cockpitOffset: { x: 0.8, y: 1.0, z: 0 } // CAM-02: F-16 Cockpit (Bubble-Canopy)
  },
  su27: {
    name: 'Su-27 Flanker',
    maxSpeed: 380,        // ~1368 km/h
    rotateSpeed: 85,      // ~306 km/h
    maxClimbRate: 28,     // ~5500 ft/min
    rollRate: 300,
    pitchRate: 100,
    yawRate: 50,
    throttleResponse: 0.8,
    maxThrust: 260000,
    mass: 23000,
    wingArea: 43.5,
    dragCoefficient: 0.02,
    liftCoefficient: 1.5,
    stallSpeed: 45,       // ~162 km/h
    aspectRatio: 3.8,      // Su-27 delta wing, low aspect ratio
    stallAngleRad: 0.22,   // ~12° fighter airfoil
    color: 0x4a4a4a,      // Dark gray
    scale: 1.4,
    type: 'su27',
    cockpitOffset: { x: 1.0, y: 1.2, z: 0 } // CAM-02: Su-27 Cockpit (Flanker)
  }
};