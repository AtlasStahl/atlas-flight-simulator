import { type AircraftConfig } from './AircraftConfig';
import * as THREE from 'three';

/** Aircraft state and 3D model */
export class Aircraft {
  config: AircraftConfig;
  position = new THREE.Vector3(0, 0, 0);
  velocity = new THREE.Vector3(0, 0, 0);
  rotation = new THREE.Euler(0, 0, 0, 'YXZ');
  throttle = 0;
  flapsDeployed = false;
  crashed = false;

  private _group = new THREE.Group();
  private _propeller: THREE.Group | null = null;
  private _propAngle = 0;

  constructor(config: AircraftConfig) {
    this.config = config;
    this.buildModel();
  }

  get group(): THREE.Group {
    return this._group;
  }

  private buildModel() {
    // Clear existing model so this method is idempotent
    while (this._group.children.length > 0) {
      this._group.remove(this._group.children[0]);
    }
    this._propeller = null;

    const s = this.config.scale;

    switch (this.config.type) {
      case 'cessna':
        this.buildCessna172(s);
        break;
      case 'boeing':
        this.buildBoeing737(s);
        break;
      case 'extra':
        this.buildExtra300(s);
        break;
    }
  }

  // ------------------------------------------------------------------
  // Cessna 172 – high-wing, single-engine piston
  // ------------------------------------------------------------------
  private buildCessna172(s: number) {
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.3, roughness: 0.4 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, transparent: true, opacity: 0.45, metalness: 0.1, roughness: 0.1 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.85, roughness: 0.2 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.95 });
    const propMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.6, roughness: 0.3 });

    // --- Fuselage (tapered: wider at cockpit, narrower at tail) ---
    const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * s, 0.33 * s, 4 * s, 16), bodyMat);
    fuselage.rotation.z = Math.PI / 2;
    fuselage.position.x = 0.15 * s;
    this._group.add(fuselage);

    // Nose cone – rounded
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.33 * s, 1.2 * s, 16), bodyMat);
    nose.rotation.z = -Math.PI / 2;
    nose.position.x = 2.2 * s;
    this._group.add(nose);

    // Tail taper
    const tailTaper = new THREE.Mesh(new THREE.ConeGeometry(0.22 * s, 0.7 * s, 12), bodyMat);
    tailTaper.rotation.z = Math.PI / 2;
    tailTaper.position.x = -1.85 * s;
    this._group.add(tailTaper);

    // --- Wings (high-mounted with dihedral) ---
    const wingY = 0.38 * s;
    const halfSpan = 5.5 * s;
    const wingChord = 0.85 * s;
    const wingThick = 0.07 * s;

    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(wingChord, wingThick, halfSpan), bodyMat);
      wing.position.set(0.35 * s, wingY, side * halfSpan / 2);
      wing.rotation.x = side > 0 ? -0.12 : 0.12; // dihedral
      this._group.add(wing);

      // Wingtip round-off
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.045 * s, 8, 8), bodyMat);
      tip.position.set(0.35 * s, wingY, side * halfSpan);
      this._group.add(tip);

      // Fuel tank (small cylinder on wingtip)
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.07 * s, 0.07 * s, 0.25 * s, 8), bodyMat);
      tank.rotation.z = Math.PI / 2;
      tank.position.set(0.35 * s, wingY, side * (halfSpan - 0.12 * s));
      this._group.add(tank);
    }

    // --- Tail surfaces ---
    // Horizontal stabilizer
    const tailH = new THREE.Mesh(new THREE.BoxGeometry(0.45 * s, 0.055 * s, 2.4 * s), bodyMat);
    tailH.position.set(-1.75 * s, 0.12 * s, 0);
    this._group.add(tailH);

    // Vertical stabilizer (tail fin)
    const tailV = new THREE.Mesh(new THREE.BoxGeometry(0.28 * s, 1.1 * s, 0.07 * s), bodyMat);
    tailV.position.set(-1.75 * s, 0.7 * s, 0);
    this._group.add(tailV);

    // Rudder detail (dark strip on tail fin)
    const rudder = new THREE.Mesh(
      new THREE.BoxGeometry(0.12 * s, 0.6 * s, 0.02 * s),
      new THREE.MeshStandardMaterial({ color: 0x333366 })
    );
    rudder.position.set(-1.95 * s, 0.65 * s, 0);
    this._group.add(rudder);

    // --- Cockpit canopy (transparent glass) ---
    const canopy = new THREE.Mesh(
      new THREE.SphereGeometry(0.28 * s, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      glassMat
    );
    canopy.rotation.x = -Math.PI / 2;
    canopy.position.set(0.6 * s, 0.32 * s, 0);
    this._group.add(canopy);

    // Side windows
    for (const side of [-1, 1]) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.8 * s, 0.22 * s, 0.04 * s), glassMat);
      win.position.set(0.5 * s, 0.22 * s, side * 0.3 * s);
      this._group.add(win);
    }

    // --- Landing gear (tricycle) ---
    // Nose gear
    const noseStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.025 * s, 0.025 * s, 0.35 * s, 8), metalMat);
    noseStrut.position.set(1.5 * s, -0.38 * s, 0);
    this._group.add(noseStrut);
    const noseWheel = new THREE.Mesh(new THREE.TorusGeometry(0.07 * s, 0.025 * s, 8, 12), tireMat);
    noseWheel.rotation.y = Math.PI / 2;
    noseWheel.position.set(1.5 * s, -0.56 * s, 0);
    this._group.add(noseWheel);

    // Main gears (under wings)
    for (const z of [-2.5 * s, 2.5 * s]) {
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.03 * s, 0.03 * s, 0.45 * s, 8), metalMat);
      strut.position.set(-0.3 * s, -0.42 * s, z);
      this._group.add(strut);
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.09 * s, 0.03 * s, 8, 12), tireMat);
      wheel.rotation.y = Math.PI / 2;
      wheel.position.set(-0.3 * s, -0.65 * s, z);
      this._group.add(wheel);
    }

    // --- Propeller (2-blade) ---
    this._propeller = new THREE.Group();
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.055 * s, 0.055 * s, 0.14 * s, 12), metalMat);
    hub.rotation.z = Math.PI / 2;
    this._propeller.add(hub);

    for (let i = 0; i < 2; i++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05 * s, 1.5 * s, 0.035 * s), propMat);
      blade.rotation.x = (i * Math.PI) / 2;
      this._propeller.add(blade);
    }

    this._propeller.position.x = 2.85 * s;
    this._group.add(this._propeller);
  }

  // ------------------------------------------------------------------
  // Boeing 737 – low-wing, twin-jet airliner
  // ------------------------------------------------------------------
  private buildBoeing737(s: number) {
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.4, roughness: 0.35 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.6, roughness: 0.3 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x6699bb, transparent: true, opacity: 0.4, metalness: 0.1, roughness: 0.1 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.95 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x777777, metalness: 0.85, roughness: 0.2 });
    const windowMat = new THREE.MeshStandardMaterial({ color: 0x223344, metalness: 0.2, roughness: 0.5 });

    // --- Fuselage (long cylinder with rounded nose & tapered tail) ---
    const fuselageLen = 12 * s;
    const fuselageRad = 0.55 * s;
    const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(fuselageRad, fuselageRad, fuselageLen, 20), bodyMat);
    fuselage.rotation.z = Math.PI / 2;
    fuselage.position.x = 0;
    this._group.add(fuselage);

    // Nose cone – rounded
    const nose = new THREE.Mesh(new THREE.ConeGeometry(fuselageRad, 2.5 * s, 20), bodyMat);
    nose.rotation.z = -Math.PI / 2;
    nose.position.x = fuselageLen / 2 + 1.25 * s;
    this._group.add(nose);

    // Tail taper
    const tailTaper = new THREE.Mesh(new THREE.ConeGeometry(fuselageRad, 1.5 * s, 16), bodyMat);
    tailTaper.rotation.z = Math.PI / 2;
    tailTaper.position.x = -fuselageLen / 2 - 0.75 * s;
    this._group.add(tailTaper);

    // --- Cockpit windshield (curved, transparent) ---
    const windshield = new THREE.Mesh(
      new THREE.SphereGeometry(0.5 * s, 16, 10, 0, Math.PI, 0, Math.PI / 3),
      glassMat
    );
    windshield.rotation.z = -Math.PI / 2;
    windshield.position.set(fuselageLen / 2 + 0.3 * s, 0.15 * s, 0);
    this._group.add(windshield);

    // --- Windows (row along fuselage) ---
    const windowCount = 20;
    const windowSpacing = fuselageLen / (windowCount + 2);
    for (let i = 0; i < windowCount; i++) {
      for (const side of [-1, 1]) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(0.12 * s, 0.08 * s, 0.02 * s), windowMat);
        win.position.set(
          -fuselageLen / 2 + windowSpacing * (i + 1.5),
          0.3 * s,
          side * (fuselageRad + 0.005 * s)
        );
        this._group.add(win);
      }
    }

    // --- Wings (swept-back with winglets) ---
    const wingY = -0.15 * s;
    const halfSpan = 7 * s;
    const wingChord = 1.2 * s;
    const wingThick = 0.12 * s;
    const sweepAngle = 0.35; // radians (~20 degrees)

    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(wingChord, wingThick, halfSpan), bodyMat);
      wing.position.set(1.5 * s, wingY, side * halfSpan / 2);
      wing.rotation.y = side > 0 ? -sweepAngle : sweepAngle;
      this._group.add(wing);

      // Winglet (vertical fin at wingtip)
      const winglet = new THREE.Mesh(new THREE.BoxGeometry(0.08 * s, 0.6 * s, 0.08 * s), bodyMat);
      winglet.position.set(1.5 * s, wingY + 0.3 * s, side * (halfSpan - 0.1 * s));
      this._group.add(winglet);
    }

    // --- Jet engines (2, under wings) ---
    for (const zSide of [-1, 1]) {
      // Engine nacelle
      const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.35 * s, 0.3 * s, 2.2 * s, 16), darkMat);
      engine.rotation.z = Math.PI / 2;
      engine.position.set(1.5 * s, -0.55 * s, zSide * 3.5 * s);
      this._group.add(engine);

      // Intake ring
      const intake = new THREE.Mesh(new THREE.TorusGeometry(0.34 * s, 0.04 * s, 8, 16), metalMat);
      intake.rotation.y = Math.PI / 2;
      intake.position.set(2.6 * s, -0.55 * s, zSide * 3.5 * s);
      this._group.add(intake);

      // Exhaust ring
      const exhaust = new THREE.Mesh(new THREE.TorusGeometry(0.22 * s, 0.03 * s, 8, 16), metalMat);
      exhaust.rotation.y = Math.PI / 2;
      exhaust.position.set(0.4 * s, -0.55 * s, zSide * 3.5 * s);
      this._group.add(exhaust);
    }

    // --- Tail surfaces ---
    // Horizontal stabilizer (conventional, not T-tail)
    const tailH = new THREE.Mesh(new THREE.BoxGeometry(0.5 * s, 0.08 * s, 4.5 * s), bodyMat);
    tailH.position.set(-5.5 * s, 0.25 * s, 0);
    this._group.add(tailH);

    // Vertical stabilizer
    const tailV = new THREE.Mesh(new THREE.BoxGeometry(0.35 * s, 2 * s, 0.1 * s), bodyMat);
    tailV.position.set(-5.5 * s, 1.2 * s, 0);
    this._group.add(tailV);

    // --- APU exhaust (small cone at tail) ---
    const apu = new THREE.Mesh(new THREE.ConeGeometry(0.12 * s, 0.3 * s, 8), darkMat);
    apu.rotation.z = Math.PI / 2;
    apu.position.set(-fuselageLen / 2 - 1.5 * s, -0.15 * s, 0);
    this._group.add(apu);

    // --- Landing gear ---
    // Nose gear
    const noseStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.04 * s, 0.04 * s, 0.5 * s, 8), metalMat);
    noseStrut.position.set(5 * s, -0.65 * s, 0);
    this._group.add(noseStrut);
    for (const dz of [-0.12 * s, 0.12 * s]) {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.12 * s, 0.04 * s, 8, 14), tireMat);
      wheel.rotation.y = Math.PI / 2;
      wheel.position.set(5 * s, -0.9 * s, dz);
      this._group.add(wheel);
    }

    // Main gear assemblies (2 wheels each)
    for (const zSide of [-1, 1]) {
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * s, 0.05 * s, 0.6 * s, 8), metalMat);
      strut.position.set(-1 * s, -0.7 * s, zSide * 2 * s);
      this._group.add(strut);
      for (const dx of [-0.15 * s, 0.15 * s]) {
        const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.14 * s, 0.045 * s, 8, 14), tireMat);
        wheel.rotation.y = Math.PI / 2;
        wheel.position.set(-1 * s + dx, -0.95 * s, zSide * 2 * s);
        this._group.add(wheel);
      }
    }

    // Boeing has no propeller (jet aircraft)
    this._propeller = null;
  }

  // ------------------------------------------------------------------
  // Extra 300 – aerobatic, single-seat, 3-blade prop
  // ------------------------------------------------------------------
  private buildExtra300(s: number) {
    const redMat = new THREE.MeshStandardMaterial({ color: 0xee1111, metalness: 0.35, roughness: 0.35 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, metalness: 0.3, roughness: 0.4 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, transparent: true, opacity: 0.45, metalness: 0.1, roughness: 0.1 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.85, roughness: 0.2 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.95 });
    const propMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.6, roughness: 0.3 });

    // --- Fuselage (very slim aerodynamic tube) ---
    const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * s, 0.18 * s, 3.5 * s, 14), redMat);
    fuselage.rotation.z = Math.PI / 2;
    fuselage.position.x = 0.1 * s;
    this._group.add(fuselage);

    // Nose cone
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.18 * s, 1 * s, 14), redMat);
    nose.rotation.z = -Math.PI / 2;
    nose.position.x = 1.85 * s;
    this._group.add(nose);

    // Tail taper
    const tailTaper = new THREE.Mesh(new THREE.ConeGeometry(0.12 * s, 0.6 * s, 10), redMat);
    tailTaper.rotation.z = Math.PI / 2;
    tailTaper.position.x = -1.55 * s;
    this._group.add(tailTaper);

    // White belly stripe
    const belly = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13 * s, 0.19 * s, 3 * s, 14, 1, false, 0, Math.PI),
      whiteMat
    );
    belly.rotation.z = Math.PI / 2;
    belly.rotation.y = Math.PI / 2;
    belly.position.set(0.1 * s, -0.05 * s, 0);
    this._group.add(belly);

    // --- Wings (small, straight, aerobatic) ---
    const halfSpan = 2.25 * s;
    const wingChord = 0.45 * s;
    const wingThick = 0.04 * s;

    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(wingChord, wingThick, halfSpan), whiteMat);
      wing.position.set(0.2 * s, 0, side * halfSpan / 2);
      this._group.add(wing);

      // Wingtip
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.03 * s, 8, 8), whiteMat);
      tip.position.set(0.2 * s, 0, side * halfSpan);
      this._group.add(tip);
    }

    // --- Tail surfaces ---
    const tailH = new THREE.Mesh(new THREE.BoxGeometry(0.35 * s, 0.04 * s, 1.6 * s), redMat);
    tailH.position.set(-1.5 * s, 0.08 * s, 0);
    this._group.add(tailH);

    const tailV = new THREE.Mesh(new THREE.BoxGeometry(0.22 * s, 0.7 * s, 0.05 * s), redMat);
    tailV.position.set(-1.5 * s, 0.45 * s, 0);
    this._group.add(tailV);

    // --- Cockpit (small bubble canopy) ---
    const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.16 * s, 14, 10), glassMat);
    canopy.position.set(0.5 * s, 0.16 * s, 0);
    this._group.add(canopy);

    // --- Landing gear (simple tricycle) ---
    const noseStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.02 * s, 0.02 * s, 0.25 * s, 8), metalMat);
    noseStrut.position.set(1.2 * s, -0.28 * s, 0);
    this._group.add(noseStrut);
    const noseWheel = new THREE.Mesh(new THREE.TorusGeometry(0.05 * s, 0.018 * s, 8, 10), tireMat);
    noseWheel.rotation.y = Math.PI / 2;
    noseWheel.position.set(1.2 * s, -0.4 * s, 0);
    this._group.add(noseWheel);

    for (const z of [-1.2 * s, 1.2 * s]) {
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.02 * s, 0.02 * s, 0.3 * s, 8), metalMat);
      strut.position.set(-0.2 * s, -0.3 * s, z);
      this._group.add(strut);
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.06 * s, 0.02 * s, 8, 10), tireMat);
      wheel.rotation.y = Math.PI / 2;
      wheel.position.set(-0.2 * s, -0.45 * s, z);
      this._group.add(wheel);
    }

    // --- Propeller (3-blade, aerobatic) ---
    this._propeller = new THREE.Group();
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.04 * s, 0.04 * s, 0.1 * s, 10), metalMat);
    hub.rotation.z = Math.PI / 2;
    this._propeller.add(hub);

    for (let i = 0; i < 3; i++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.04 * s, 1.1 * s, 0.025 * s), propMat);
      blade.rotation.x = (i * Math.PI * 2) / 3;
      this._propeller.add(blade);
    }

    this._propeller.position.x = 2.4 * s;
    this._group.add(this._propeller);
  }

  updatePropeller(dt: number) {
    if (this._propeller && this.throttle > 0) {
      this._propAngle += this.throttle * 20 * dt;
      this._propeller.rotation.x = this._propAngle;
    }
  }

  reset(config: AircraftConfig) {
    this.config = config;
    this.velocity.set(0, 0, 0);
    this.throttle = 0;
    this.flapsDeployed = false;
    this.crashed = false;
    this.rotation.set(0, 0, 0);
  }
}