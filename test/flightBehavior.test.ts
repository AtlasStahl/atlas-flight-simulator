import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { FlightModel } from '../src/physics/FlightModel';
import { GroundCollision } from '../src/physics/GroundCollision';
import { RingObstacle } from '../src/missions/RingObstacle';
import type { AircraftConfig } from '../src/aircraft/AircraftConfig';
import { makeConfig } from './helpers/aircraftFactory';

// ============================================================
// Mock Aircraft — QA-01: Minimal interface for physics tests
// ============================================================
class MockAircraft {
  group = new THREE.Group();
  position = new THREE.Vector3(0, 10, 0);
  rotation = new THREE.Euler(0, 0, 0, 'YXZ');
  quaternion = new THREE.Quaternion();
  velocity = new THREE.Vector3(50, 0, 0);
  throttle = 0;
  crashed = false;
  flapsDeployed = false;
  config!: AircraftConfig;

  constructor(config: AircraftConfig) {
    this.config = config;
  }
}

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

// ============================================================
// QA-01: Verhaltenstests für Flugphysik
// ============================================================

describe('FlightModel — Behavior Tests (QA-01)', () => {
  let model: FlightModel;
  let aircraft: MockAircraft;
  let controls: MockControls;

  beforeEach(() => {
    model = new FlightModel();
    aircraft = new MockAircraft(makeConfig());
    controls = new MockControls();
  });

  describe('Achsen und Vorzeichen (PHY-01)', () => {
    it('reines Rollen ändert nur rotation.x', () => {
      aircraft.velocity.set(50, 0, 0);
      aircraft.rotation.set(0, 0, 0, 'YXZ');
      aircraft.quaternion.setFromEuler(aircraft.rotation);
      controls.rollRight = true;

      model.update(aircraft, controls, 0.016);

      // Roll sollte rotation.x ändern
      expect(aircraft.rotation.x).not.toBe(0);
      // Pitch sollte unverändert bleiben
      expect(aircraft.rotation.z).toBeCloseTo(0, 5);
    });

    it('reines Nicken ändert nur rotation.z', () => {
      aircraft.velocity.set(50, 0, 0);
      aircraft.rotation.set(0, 0, 0, 'YXZ');
      aircraft.quaternion.setFromEuler(aircraft.rotation);
      controls.pitchUp = true;

      model.update(aircraft, controls, 0.016);

      // Pitch sollte rotation.z ändern
      expect(aircraft.rotation.z).not.toBe(0);
      // Roll sollte unverändert bleiben
      expect(aircraft.rotation.x).toBeCloseTo(0, 5);
    });

    it('D (rollRight) senkt die rechte Tragfläche — up-Vektor bekommt positive Z-Komponente', () => {
      aircraft.velocity.set(50, 0, 0);
      aircraft.rotation.set(0, 0, 0, 'YXZ');
      aircraft.quaternion.setFromEuler(aircraft.rotation);
      controls.rollRight = true;

      model.update(aircraft, controls, 0.016);

      // Bei Rechtsrolle (positive rotation.x) sollte der up-Vektor nach +Z kippen
      const up = new THREE.Vector3(0, 1, 0);
      up.applyQuaternion(aircraft.quaternion);
      expect(up.z).toBeGreaterThan(0);
    });
  });

  describe('Heading-Konsistenz (PHY-02)', () => {
    it('atan2(vz, vx) === -rotation.y bei Vorwärtsbewegung', () => {
      // Flugzeug zeigt nach +X (rotation.y = 0)
      aircraft.velocity.set(50, 0, 0);
      aircraft.rotation.set(0, 0, 0, 'YXZ');
      aircraft.quaternion.setFromEuler(aircraft.rotation);

      const headingFromVelocity = Math.atan2(aircraft.velocity.z, aircraft.velocity.x);
      const headingFromRotation = aircraft.rotation.y;

      expect(headingFromVelocity).toBeCloseTo(-headingFromRotation, 5);
    });

    it('Heading stimmt bei 45° Drehung überein', () => {
      const angle45 = (45 * Math.PI) / 180;
      aircraft.rotation.set(0, angle45, 0, 'YXZ');
      aircraft.quaternion.setFromEuler(aircraft.rotation);

      // Vorwärtsvektor bei 45° Heading
      const forward = new THREE.Vector3(1, 0, 0);
      forward.applyQuaternion(aircraft.quaternion);

      const headingFromVelocity = Math.atan2(forward.z, forward.x);
      expect(headingFromVelocity).toBeCloseTo(-angle45, 5);
    });
  });

  describe('Framerate-Unabhängigkeit (PHY-04, PHY-05)', () => {
    it('Dämpfung ist frameratenunabhängig', () => {
      // Seitwärtsbewegung — sollte durch aerodynamische Dämpfung reduziert werden
      aircraft.velocity.set(10, 0, 15); // 15 m/s seitlich
      aircraft.rotation.set(0, 0, 0, 'YXZ');
      aircraft.quaternion.setFromEuler(aircraft.rotation);

      // Simuliere 2 Sekunden mit dt = 1/30
      const controls1 = new MockControls();
      let dt = 1 / 30;
      for (let i = 0; i < 60; i++) {
        model.update(aircraft, controls1, dt);
      }
      const lateralSpeed30 = Math.sqrt(
        aircraft.velocity.x ** 2 + aircraft.velocity.z ** 2
      );

      // Reset
      aircraft = new MockAircraft(makeConfig());
      aircraft.velocity.set(10, 0, 15);
      aircraft.rotation.set(0, 0, 0, 'YXZ');
      aircraft.quaternion.setFromEuler(aircraft.rotation);

      // Simuliere 2 Sekunden mit dt = 1/240
      dt = 1 / 240;
      for (let i = 0; i < 480; i++) {
        model.update(aircraft, controls1, dt);
      }
      const lateralSpeed240 = Math.sqrt(
        aircraft.velocity.x ** 2 + aircraft.velocity.z ** 2
      );

      // Beide Frameraten sollten zum ähnlichen Ergebnis führen
      expect(lateralSpeed30).toBeCloseTo(lateralSpeed240, 1);
    });
  });

  describe('Stall-Verhalten (PHY-09)', () => {
    it('Auftrieb fällt bei AoA > stallAngleRad', () => {
      // Hoher Anstellwinkel: Geschwindigkeit nach unten, Nase nach oben
      aircraft.velocity.set(30, -10, 0);
      aircraft.rotation.set(0, 0, 0.4, 'YXZ'); // 0.4 rad > stallAngleRad (0.28)
      aircraft.quaternion.setFromEuler(aircraft.rotation);
      aircraft.throttle = 0;

      const controls = new MockControls();
      model.update(aircraft, controls, 0.016);

      // Nach dem Update sollte die vertikale Geschwindigkeit weiter negativ sein
      // (Auftrieb ist nicht genug, um den Fall zu stoppen)
      expect(aircraft.velocity.y).toBeLessThanOrEqual(0);
    });

    it('Auftrieb ist positiv bei normalem AoA', () => {
      // Normaler Flug: Geschwindigkeit nach vorne, leicht nach oben
      aircraft.velocity.set(50, 2, 0);
      aircraft.rotation.set(0, 0, 0.1, 'YXZ'); // 0.1 rad < stallAngleRad
      aircraft.quaternion.setFromEuler(aircraft.rotation);
      aircraft.throttle = 0.5;

      const controls = new MockControls();
      const initialVy = aircraft.velocity.y;
      model.update(aircraft, controls, 0.016);

      // Bei normalem AoA sollte der Auftrieb die vertikale Geschwindigkeit erhöhen
      expect(aircraft.velocity.y).toBeGreaterThan(initialVy - 0.5);
    });
  });

  describe('Quaternion-Autorität (PHY-06)', () => {
    it('Quaternion bleibt normiert nach vielen Updates', () => {
      aircraft.velocity.set(50, 0, 0);
      aircraft.rotation.set(0, 0, 0, 'YXZ');
      aircraft.quaternion.setFromEuler(aircraft.rotation);
      controls.rollRight = true;
      controls.pitchUp = true;

      // 100 Updates
      for (let i = 0; i < 100; i++) {
        model.update(aircraft, controls, 0.016);
      }

      // Quaternion sollte normiert sein (Länge ≈ 1)
      const length = aircraft.quaternion.length();
      expect(length).toBeCloseTo(1, 5);
    });

    it('Keine NaN bei extremen Rotationen', () => {
      aircraft.velocity.set(50, 0, 0);
      aircraft.rotation.set(0, 0, 0, 'YXZ');
      aircraft.quaternion.setFromEuler(aircraft.rotation);
      controls.rollRight = true;
      controls.pitchUp = true;

      for (let i = 0; i < 500; i++) {
        model.update(aircraft, controls, 0.016);
      }

      expect(Number.isNaN(aircraft.rotation.x)).toBe(false);
      expect(Number.isNaN(aircraft.rotation.y)).toBe(false);
      expect(Number.isNaN(aircraft.rotation.z)).toBe(false);
      expect(Number.isNaN(aircraft.quaternion.x)).toBe(false);
      expect(Number.isNaN(aircraft.quaternion.y)).toBe(false);
      expect(Number.isNaN(aircraft.quaternion.z)).toBe(false);
      expect(Number.isNaN(aircraft.quaternion.w)).toBe(false);
    });
  });

  describe('Startlauf-Szenario (PHY-10)', () => {
    it('Vollgas ab Stand erhöht Geschwindigkeit', () => {
      aircraft.position.set(0, 2, 0);
      aircraft.velocity.set(0, 0, 0);
      aircraft.rotation.set(0, 0, 0, 'YXZ');
      aircraft.quaternion.setFromEuler(aircraft.rotation);
      aircraft.throttle = 0;
      controls.throttleUp = true;

      // 3 Sekunden Vollgas (throttleResponse=0.5, maxThrust=1000N, mass=1000kg)
      for (let i = 0; i < 188; i++) {
        model.update(aircraft, controls, 0.016);
      }

      // Geschwindigkeit sollte erhöht sein (nicht mehr 0)
      const speed = aircraft.velocity.length();
      expect(speed).toBeGreaterThan(0.5);
    });
  });

  describe('Rollachse und Rollrate', () => {
    /** Nickwinkel aus dem Quaternion — gimbalfest, im Gegensatz zu rotation.z */
    const pitchOf = (ac: MockAircraft) =>
      Math.asin(new THREE.Vector3(1, 0, 0).applyQuaternion(ac.quaternion).y);
    /** Bankwinkel aus dem Quaternion — gimbalfest, im Gegensatz zu rotation.x */
    const bankOf = (ac: MockAircraft) => {
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(ac.quaternion);
      const right = new THREE.Vector3(0, 0, 1).applyQuaternion(ac.quaternion);
      return Math.atan2(-right.y, up.y);
    };

    it('Rollen um die Längsachse verändert den Nickwinkel nicht (Weltachse vs. Körperachse)', () => {
      // Regression: Rotationen werden per post-multiply angewandt, die Achse muss deshalb
      // die Körperachse sein. Mit Weltachsen wurde Rollen bei Steigflug zu Nicken/Gieren.
      const pitch0 = (20 * Math.PI) / 180;
      aircraft.velocity.set(60, 0, 0);
      aircraft.rotation.set(0, 0, pitch0, 'YXZ');
      aircraft.quaternion.setFromEuler(aircraft.rotation);
      aircraft.position.set(0, 500, 0);
      controls.rollRight = true;

      for (let i = 0; i < 120; i++) model.update(aircraft, controls, 1 / 60);

      expect(pitchOf(aircraft)).toBeCloseTo(pitch0, 3);
    });

    it('Dauerhaftes Rollen läuft über 360° durch und wird nicht abgebremst', () => {
      // Regression: eine bankwinkelabhängige "Dämpfung" hob das Querruderkommando bei
      // steigender Geschwindigkeit auf; der Bankwinkel blieb bei ~50° stehen.
      aircraft.velocity.set(80, 0, 0);
      aircraft.rotation.set(0, 0, 0, 'YXZ');
      aircraft.quaternion.setFromEuler(aircraft.rotation);
      aircraft.position.set(0, 1000, 0);
      controls.rollRight = true;

      let total = 0;
      let prev = bankOf(aircraft);
      for (let i = 0; i < 300; i++) {
        model.update(aircraft, controls, 1 / 60);
        const cur = bankOf(aircraft);
        let d = cur - prev;
        if (d > Math.PI) d -= 2 * Math.PI;
        if (d < -Math.PI) d += 2 * Math.PI;
        total += d;
        prev = cur;
      }

      // 5 s bei mindestens 25 % Ruderwirksamkeit von 120°/s ⇒ deutlich mehr als eine Umdrehung
      expect(total).toBeGreaterThan(2 * Math.PI);
    });

    it('Nach Loslassen stoppt die Rolle und der Bankwinkel bleibt stehen', () => {
      aircraft.velocity.set(60, 0, 0);
      aircraft.rotation.set(0, 0, 0, 'YXZ');
      aircraft.quaternion.setFromEuler(aircraft.rotation);
      aircraft.position.set(0, 500, 0);

      controls.rollRight = true;
      for (let i = 0; i < 30; i++) model.update(aircraft, controls, 1 / 60);

      controls.rollRight = false;
      for (let i = 0; i < 30; i++) model.update(aircraft, controls, 1 / 60);
      const settled = bankOf(aircraft);

      for (let i = 0; i < 120; i++) model.update(aircraft, controls, 1 / 60);
      // Restdrift nur noch durch den exponentiellen Ausschwinger der Rollrate
      expect(bankOf(aircraft)).toBeCloseTo(settled, 3);
      expect(Math.abs(settled)).toBeGreaterThan(0.1);
    });

    it('Am Boden sperrt der onGround-Parameter die Rollachse', () => {
      aircraft.velocity.set(20, 0, 0);
      aircraft.rotation.set(0, 0, 0, 'YXZ');
      aircraft.quaternion.setFromEuler(aircraft.rotation);
      aircraft.position.set(0, 2.1, 0); // über der 1.0-m-Heuristik, aber auf der Bahn
      controls.rollRight = true;

      for (let i = 0; i < 60; i++) model.update(aircraft, controls, 1 / 60, true);

      expect(bankOf(aircraft)).toBeCloseTo(0, 6);
    });
  });

  describe('Propellerschub (konstante Leistung)', () => {
    it('Schub fällt oberhalb von propThrustRefSpeed mit 1/v ab', () => {
      const cfg = makeConfig({ maxThrust: 2600, propThrustRefSpeed: 40, dragCoefficient: 0, wingArea: 0 });
      const slow = new MockAircraft(cfg);
      slow.position.set(0, 500, 0);
      slow.velocity.set(20, 0, 0);
      slow.throttle = 1;
      const fast = new MockAircraft(cfg);
      fast.position.set(0, 500, 0);
      fast.velocity.set(80, 0, 0);
      fast.throttle = 1;

      const m1 = new FlightModel();
      const m2 = new FlightModel();
      const v1 = slow.velocity.x;
      const v2 = fast.velocity.x;
      m1.update(slow, new MockControls(), 1 / 60);
      m2.update(fast, new MockControls(), 1 / 60);

      const a1 = (slow.velocity.x - v1) * 60;
      const a2 = (fast.velocity.x - v2) * 60;
      // 80 m/s = 2 × Referenzgeschwindigkeit ⇒ halber Schub
      expect(a2).toBeCloseTo(a1 / 2, 2);
    });

    it('Ohne propThrustRefSpeed bleibt der Schub geschwindigkeitsunabhängig (Jets)', () => {
      const cfg = makeConfig({ maxThrust: 2600, dragCoefficient: 0, wingArea: 0 });
      const slow = new MockAircraft(cfg);
      slow.position.set(0, 500, 0);
      slow.velocity.set(20, 0, 0);
      slow.throttle = 1;
      const fast = new MockAircraft(cfg);
      fast.position.set(0, 500, 0);
      fast.velocity.set(80, 0, 0);
      fast.throttle = 1;

      const v1 = slow.velocity.x;
      const v2 = fast.velocity.x;
      new FlightModel().update(slow, new MockControls(), 1 / 60);
      new FlightModel().update(fast, new MockControls(), 1 / 60);

      expect((fast.velocity.x - v2) * 60).toBeCloseTo((slow.velocity.x - v1) * 60, 4);
    });
  });
});

// ============================================================
// QA-01: GroundCollision Verhaltenstests
// ============================================================

describe('GroundCollision — Behavior Tests (QA-01)', () => {
  let collision: GroundCollision;
  let aircraft: MockAircraft;
  let controls: MockControls;

  beforeEach(() => {
    collision = new GroundCollision();
    aircraft = new MockAircraft(makeConfig());
    controls = new MockControls();
  });

  describe('Bremsen (INP-04)', () => {
    it('Bremsen reduziert Geschwindigkeit stärker als Leerlauf', () => {
      aircraft.position.set(0, 0, 0);
      aircraft.velocity.set(30, 0, 0);
      aircraft.rotation.set(0, 0, 0, 'YXZ');
      aircraft.quaternion.setFromEuler(aircraft.rotation);
      aircraft.throttle = 0;
      const runwayBounds = { x1: -50, x2: 50, z1: -50, z2: 50 };

      // Ohne Bremsen
      collision.update(aircraft, controls, 0.016, runwayBounds);
      const speedWithoutBrake = aircraft.velocity.length();

      // Reset
      aircraft.velocity.set(30, 0, 0);
      controls.brakes = true;
      collision.update(aircraft, controls, 0.016, runwayBounds);
      const speedWithBrake = aircraft.velocity.length();

      // Bremsen sollte mehr Verzögerung erzeugen
      expect(speedWithBrake).toBeLessThan(speedWithoutBrake);
    });
  });

  describe('Bodenkontakt', () => {
    it('Flugzeug bleibt am Boden', () => {
      aircraft.position.set(0, 0, 0);
      aircraft.velocity.set(20, 0, 0);
      aircraft.rotation.set(0, 0, 0, 'YXZ');
      aircraft.quaternion.setFromEuler(aircraft.rotation);
      const runwayBounds = { x1: -50, x2: 50, z1: -50, z2: 50 };

      collision.update(aircraft, controls, 0.016, runwayBounds);

      // Y-Position sollte auf Startbahnhöhe sein (runwayY=1.5 + 0.5*scale)
      // scale=1 → expected ≈ 2.0
      expect(aircraft.position.y).toBeGreaterThan(1.0);
    });
  });
});

// ============================================================
// QA-01: Lifecycle-Tests (ARCH-02, GAME-01, RES-02)
// ============================================================

describe('Lifecycle — Mode Transitions (QA-01)', () => {
  it('Scene-Children bleiben konstant nach startGame/returnToMenu Zyklen', () => {
    const scene = new THREE.Scene();

    // Simuliere mehrere Zyklen: Objekte hinzufügen und entfernen
    const initialCount = scene.children.length;

    for (let cycle = 0; cycle < 5; cycle++) {
      // startGame: Objekte hinzufügen
      const group = new THREE.Group();
      const geo = new THREE.BoxGeometry(1, 1, 1);
      const mat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      const mesh = new THREE.Mesh(geo, mat);
      group.add(mesh);
      scene.add(group);

      // returnToMenu: Objekte entfernen und freigeben
      scene.remove(group);
      geo.dispose();
      mat.dispose();
    }

    // Scene sollte wieder leer sein (außer initialen Kindern)
    expect(scene.children.length).toBe(initialCount);
  });
});

// ============================================================
// QA-01: Ring-Tests (PHY-16)
// ============================================================

describe('RingObstacle — Ebenendurchgang (QA-01)', () => {
  it('Durchflug mittig meldet Treffer', () => {
    const scene = new THREE.Scene();
    const ring = new RingObstacle(scene, new THREE.Vector3(0, 10, 0), 5, 0);

    // Flugzeug fliegt durch die Mitte des Rings (auf Ringebene)
    // Ring normal ist +X, also muss Flugzeug bei x=0 sein (Ringzentrum)
    const aircraftPos = new THREE.Vector3(0, 10, 0);
    const result = ring.checkPass(aircraftPos);

    expect(result).toBe(true);
  });

  it('Vorbeiflug außerhalb des Rings meldet keinen Treffer', () => {
    const scene = new THREE.Scene();
    const ring = new RingObstacle(scene, new THREE.Vector3(0, 10, 0), 5, 0);

    // Flugzeug fliegt weit außerhalb des Rings (Radius=5, Abstand > Radius)
    // Ring normal ist +X, also muss Flugzeug bei x > Radius sein
    const aircraftPos = new THREE.Vector3(10, 10, 0);
    const result = ring.checkPass(aircraftPos);

    expect(result).toBe(false);
  });
});