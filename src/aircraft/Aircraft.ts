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
      case 'f16':
      case 'su27':
        this.buildFighterJet(s, this.config.type);
        break;
    }
  }

  // ------------------------------------------------------------------
  // Cessna 172 – high-wing, single-engine piston (detailed)
  // ------------------------------------------------------------------
  private buildCessna172(s: number) {
    // Materials
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, metalness: 0.25, roughness: 0.45 });
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0x1a5296, metalness: 0.2, roughness: 0.5 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, transparent: true, opacity: 0.4, metalness: 0.05, roughness: 0.05 });
    const darkGlassMat = new THREE.MeshStandardMaterial({ color: 0x334455, transparent: true, opacity: 0.55, metalness: 0.1, roughness: 0.1 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.9, roughness: 0.15 });
    const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.85, roughness: 0.25 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.95, metalness: 0.0 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.2 });
    const propMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.7, roughness: 0.2 });
    const spinnerMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.5, roughness: 0.3 });
    const aileronMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.3, roughness: 0.5 });
    const flapMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.3, roughness: 0.5 });
    const rudderMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.3, roughness: 0.5 });
    const instrumentMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.4, roughness: 0.3 });
    const navRed = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.5 });
    const navGreen = new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00ff00, emissiveIntensity: 0.5 });
    const navWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.5 });
    const antennaMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9, roughness: 0.1 });

    // =================================================================
    // FUSELAGE – multi-segment realistic shape
    // =================================================================

    // Main fuselage body (cockpit section – widest part)
    const fuselageMain = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3 * s, 0.28 * s, 2.2 * s, 16),
      bodyMat
    );
    fuselageMain.rotation.z = Math.PI / 2;
    fuselageMain.position.x = 0.4 * s;
    this._group.add(fuselageMain);

    // Forward fuselage (transition from nose to cockpit)
    const fuselageFwd = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28 * s, 0.32 * s, 1.0 * s, 16),
      bodyMat
    );
    fuselageFwd.rotation.z = Math.PI / 2;
    fuselageFwd.position.x = 1.5 * s;
    this._group.add(fuselageFwd);

    // Rear fuselage (transition from cockpit to tail)
    const fuselageRear = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28 * s, 0.18 * s, 1.5 * s, 14),
      bodyMat
    );
    fuselageRear.rotation.z = Math.PI / 2;
    fuselageRear.position.x = -0.75 * s;
    this._group.add(fuselageRear);

    // Tail boom (very narrow)
    const tailBoom = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18 * s, 0.08 * s, 1.0 * s, 12),
      bodyMat
    );
    tailBoom.rotation.z = Math.PI / 2;
    tailBoom.position.x = -1.75 * s;
    this._group.add(tailBoom);

    // Nose cone – rounded (sphere-based for smooth shape)
    const noseSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.32 * s, 16, 12),
      bodyMat
    );
    noseSphere.scale.x = 1.5;
    noseSphere.position.x = 2.0 * s;
    this._group.add(noseSphere);

    // Nose tip (pointed cone for aerodynamic shape)
    const noseTip = new THREE.Mesh(
      new THREE.ConeGeometry(0.15 * s, 0.5 * s, 12),
      bodyMat
    );
    noseTip.rotation.z = -Math.PI / 2;
    noseTip.position.x = 2.5 * s;
    this._group.add(noseTip);

    // Blue stripe along fuselage side (decorative)
    for (const side of [-1, 1]) {
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(3.5 * s, 0.04 * s, 0.01 * s),
        stripeMat
      );
      stripe.position.set(0.2 * s, 0.05 * s, side * 0.3 * s);
      this._group.add(stripe);
    }

    // =================================================================
    // WINGS – high-mounted with dihedral, ailerons, flaps
    // =================================================================

    const wingY = 0.4 * s;
    const halfSpan = 5.5 * s;
    const wingChord = 0.85 * s;
    const wingThick = 0.07 * s;
    const dihedralAngle = 0.08; // subtle dihedral

    for (const side of [-1, 1]) {
      // Main wing panel (with slight dihedral)
      const wing = new THREE.Mesh(
        new THREE.BoxGeometry(wingChord, wingThick, halfSpan),
        bodyMat
      );
      wing.position.set(0.3 * s, wingY, side * halfSpan / 2);
      wing.rotation.x = side * dihedralAngle;
      this._group.add(wing);

      // Wing leading edge (tapered, aerodynamic profile)
      const leadingEdge = new THREE.Mesh(
        new THREE.BoxGeometry(0.05 * s, wingThick * 0.6, halfSpan),
        bodyMat
      );
      leadingEdge.position.set(0.3 * s + wingChord / 2 + 0.02 * s, wingY, side * halfSpan / 2);
      leadingEdge.rotation.x = side * dihedralAngle;
      this._group.add(leadingEdge);

      // Wing trailing edge (tapered)
      const trailingEdge = new THREE.Mesh(
        new THREE.BoxGeometry(0.05 * s, wingThick * 0.4, halfSpan),
        bodyMat
      );
      trailingEdge.position.set(0.3 * s - wingChord / 2 - 0.02 * s, wingY, side * halfSpan / 2);
      trailingEdge.rotation.x = side * dihedralAngle;
      this._group.add(trailingEdge);

      // Wingtip (rounded)
      const tip = new THREE.Mesh(
        new THREE.SphereGeometry(0.04 * s, 8, 8),
        bodyMat
      );
      tip.scale.z = 2;
      tip.position.set(0.3 * s, wingY, side * halfSpan);
      this._group.add(tip);

      // Aileron (dark surface at wingtip – control surface)
      const aileron = new THREE.Mesh(
        new THREE.BoxGeometry(0.2 * s, wingThick * 0.3, 1.2 * s),
        aileronMat
      );
      aileron.position.set(0.3 * s - wingChord / 2 - 0.01 * s, wingY, side * (halfSpan - 0.6 * s));
      aileron.rotation.x = side * dihedralAngle;
      this._group.add(aileron);

      // Flap (dark surface near fuselage – control surface)
      const flap = new THREE.Mesh(
        new THREE.BoxGeometry(0.2 * s, wingThick * 0.3, 1.0 * s),
        flapMat
      );
      flap.position.set(0.3 * s - wingChord / 2 - 0.01 * s, wingY, side * (halfSpan / 2 - 0.3 * s));
      flap.rotation.x = side * dihedralAngle;
      this._group.add(flap);

      // Wing strut (bracing from fuselage to wing)
      const strut = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015 * s, 0.015 * s, 1.8 * s, 6),
        metalMat
      );
      strut.position.set(0.1 * s, wingY / 2, side * 1.5 * s);
      strut.rotation.x = -0.5;
      strut.rotation.z = side * 0.3;
      this._group.add(strut);

      // Fuel tank (small cylinder on wingtip)
      const tank = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06 * s, 0.06 * s, 0.2 * s, 8),
        bodyMat
      );
      tank.rotation.z = Math.PI / 2;
      tank.position.set(0.3 * s, wingY, side * (halfSpan - 0.1 * s));
      this._group.add(tank);
    }

    // =================================================================
    // TAIL SURFACES – horizontal and vertical stabilizers
    // =================================================================

    // Horizontal stabilizer (with realistic profile)
    const tailHMain = new THREE.Mesh(
      new THREE.BoxGeometry(0.4 * s, 0.05 * s, 2.2 * s),
      bodyMat
    );
    tailHMain.position.set(-1.8 * s, 0.1 * s, 0);
    this._group.add(tailHMain);

    // Horizontal stabilizer leading edge
    const tailHLeading = new THREE.Mesh(
      new THREE.BoxGeometry(0.04 * s, 0.04 * s, 2.2 * s),
      bodyMat
    );
    tailHLeading.position.set(-1.8 * s + 0.2 * s, 0.1 * s, 0);
    this._group.add(tailHLeading);

    // Elevator (dark trailing edge of horizontal stabilizer)
    const elevator = new THREE.Mesh(
      new THREE.BoxGeometry(0.12 * s, 0.04 * s, 2.2 * s),
      aileronMat
    );
    elevator.position.set(-1.8 * s - 0.26 * s, 0.1 * s, 0);
    this._group.add(elevator);

    // Vertical stabilizer (tapered fin)
    const tailVMain = new THREE.Mesh(
      new THREE.BoxGeometry(0.25 * s, 0.9 * s, 0.06 * s),
      bodyMat
    );
    tailVMain.position.set(-1.8 * s, 0.55 * s, 0);
    this._group.add(tailVMain);

    // Vertical stabilizer top taper
    const tailVTaper = new THREE.Mesh(
      new THREE.ConeGeometry(0.13 * s, 0.35 * s, 8),
      bodyMat
    );
    tailVTaper.position.set(-1.8 * s, 1.05 * s, 0);
    this._group.add(tailVTaper);

    // Rudder (dark trailing edge of vertical stabilizer)
    const rudder = new THREE.Mesh(
      new THREE.BoxGeometry(0.08 * s, 0.55 * s, 0.02 * s),
      rudderMat
    );
    rudder.position.set(-1.92 * s, 0.55 * s, 0);
    this._group.add(rudder);

    // Antenna on vertical stabilizer
    const antenna = new THREE.Mesh(
      new THREE.CylinderGeometry(0.005 * s, 0.008 * s, 0.3 * s, 6),
      antennaMat
    );
    antenna.position.set(-1.8 * s, 1.25 * s, 0);
    this._group.add(antenna);

    // Antenna tip (white ball)
    const antennaTip = new THREE.Mesh(
      new THREE.SphereGeometry(0.015 * s, 6, 6),
      navWhite
    );
    antennaTip.position.set(-1.8 * s, 1.4 * s, 0);
    this._group.add(antennaTip);

    // =================================================================
    // COCKPIT – transparent canopy with windows and instrument panel
    // =================================================================

    // Main canopy (curved glass dome)
    const canopyMain = new THREE.Mesh(
      new THREE.SphereGeometry(0.26 * s, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6),
      glassMat
    );
    canopyMain.rotation.x = -Math.PI / 2;
    canopyMain.position.set(0.5 * s, 0.32 * s, 0);
    this._group.add(canopyMain);

    // Windshield (front glass)
    const windshield = new THREE.Mesh(
      new THREE.BoxGeometry(0.02 * s, 0.25 * s, 0.5 * s),
      darkGlassMat
    );
    windshield.position.set(0.85 * s, 0.25 * s, 0);
    windshield.rotation.z = -0.15;
    this._group.add(windshield);

    // Side windows
    for (const side of [-1, 1]) {
      const sideWin = new THREE.Mesh(
        new THREE.BoxGeometry(0.7 * s, 0.2 * s, 0.02 * s),
        glassMat
      );
      sideWin.position.set(0.5 * s, 0.2 * s, side * 0.3 * s);
      this._group.add(sideWin);

      // Door frame (thin metal outline)
      const doorFrame = new THREE.Mesh(
        new THREE.BoxGeometry(0.72 * s, 0.22 * s, 0.005 * s),
        metalMat
      );
      doorFrame.position.set(0.5 * s, 0.2 * s, side * 0.31 * s);
      this._group.add(doorFrame);
    }

    // Instrument panel (dark surface inside cockpit)
    const instrumentPanel = new THREE.Mesh(
      new THREE.BoxGeometry(0.05 * s, 0.18 * s, 0.55 * s),
      instrumentMat
    );
    instrumentPanel.position.set(0.75 * s, 0.15 * s, 0);
    this._group.add(instrumentPanel);

    // =================================================================
    // LANDING GEAR – tricycle with oleo struts and wheels
    // =================================================================

    // Nose gear
    // Oleo strut (thicker at top, thinner at bottom)
    const noseOleo = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02 * s, 0.03 * s, 0.3 * s, 8),
      darkMetalMat
    );
    noseOleo.position.set(1.4 * s, -0.35 * s, 0);
    this._group.add(noseOleo);

    // Nose gear fork
    const noseFork = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015 * s, 0.015 * s, 0.08 * s, 6),
      metalMat
    );
    noseFork.rotation.z = Math.PI / 2;
    noseFork.position.set(1.4 * s, -0.52 * s, 0);
    this._group.add(noseFork);

    // Nose wheel tire
    const noseTire = new THREE.Mesh(
      new THREE.TorusGeometry(0.065 * s, 0.022 * s, 8, 12),
      tireMat
    );
    noseTire.rotation.y = Math.PI / 2;
    noseTire.position.set(1.4 * s, -0.58 * s, 0);
    this._group.add(noseTire);

    // Nose wheel rim
    const noseRim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04 * s, 0.04 * s, 0.03 * s, 10),
      rimMat
    );
    noseRim.rotation.z = Math.PI / 2;
    noseRim.position.set(1.4 * s, -0.58 * s, 0);
    this._group.add(noseRim);

    // Main gears (under wings)
    for (const z of [-2.5 * s, 2.5 * s]) {
      // Oleo strut
      const mainOleo = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025 * s, 0.035 * s, 0.4 * s, 8),
        darkMetalMat
      );
      mainOleo.position.set(-0.2 * s, -0.4 * s, z);
      this._group.add(mainOleo);

      // Wheel fork
      const mainFork = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012 * s, 0.012 * s, 0.06 * s, 6),
        metalMat
      );
      mainFork.rotation.z = Math.PI / 2;
      mainFork.position.set(-0.2 * s, -0.62 * s, z);
      this._group.add(mainFork);

      // Main wheel tire
      const mainTire = new THREE.Mesh(
        new THREE.TorusGeometry(0.085 * s, 0.028 * s, 8, 14),
        tireMat
      );
      mainTire.rotation.y = Math.PI / 2;
      mainTire.position.set(-0.2 * s, -0.68 * s, z);
      this._group.add(mainTire);

      // Main wheel rim
      const mainRim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055 * s, 0.055 * s, 0.035 * s, 10),
        rimMat
      );
      mainRim.rotation.z = Math.PI / 2;
      mainRim.position.set(-0.2 * s, -0.68 * s, z);
      this._group.add(mainRim);
    }

    // =================================================================
    // PROPELLER – 2-blade with spinner
    // =================================================================

    this._propeller = new THREE.Group();

    // Propeller hub
    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045 * s, 0.045 * s, 0.12 * s, 12),
      metalMat
    );
    hub.rotation.z = Math.PI / 2;
    this._propeller.add(hub);

    // Propeller blades (2-blade, tapered)
    for (let i = 0; i < 2; i++) {
      // Blade (tapered from hub to tip)
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.04 * s, 1.4 * s, 0.03 * s),
        propMat
      );
      blade.rotation.x = (i * Math.PI) / 2;
      blade.position.y = i === 0 ? 0.7 * s : -0.7 * s;
      this._propeller.add(blade);

      // Blade tip (rounded)
      const bladeTip = new THREE.Mesh(
        new THREE.SphereGeometry(0.02 * s, 6, 6),
        propMat
      );
      bladeTip.position.set(0, i === 0 ? 1.4 * s : -1.4 * s, 0);
      this._propeller.add(bladeTip);
    }

    // Spinner (conical nose cone covering hub)
    const spinner = new THREE.Mesh(
      new THREE.ConeGeometry(0.1 * s, 0.3 * s, 12),
      spinnerMat
    );
    spinner.rotation.z = -Math.PI / 2;
    spinner.position.x = 0.2 * s;
    this._propeller.add(spinner);

    this._propeller.position.x = 2.75 * s;
    this._group.add(this._propeller);

    // =================================================================
    // NAVIGATION LIGHTS – colored lights on wingtips and tail
    // =================================================================

    // Left wingtip (red)
    const navLeft = new THREE.Mesh(
      new THREE.SphereGeometry(0.025 * s, 6, 6),
      navRed
    );
    navLeft.position.set(0.3 * s, wingY, -halfSpan);
    this._group.add(navLeft);

    // Right wingtip (green)
    const navRight = new THREE.Mesh(
      new THREE.SphereGeometry(0.025 * s, 6, 6),
      navGreen
    );
    navRight.position.set(0.3 * s, wingY, halfSpan);
    this._group.add(navRight);

    // Tail nav light (white)
    const navTail = new THREE.Mesh(
      new THREE.SphereGeometry(0.02 * s, 6, 6),
      navWhite
    );
    navTail.position.set(-2.2 * s, 0.05 * s, 0);
    this._group.add(navTail);
  }

  // ------------------------------------------------------------------
  // Boeing 737 – low-wing, twin-jet airliner (detailed)
  // ------------------------------------------------------------------
  private buildBoeing737(s: number) {
    // Materials
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, metalness: 0.35, roughness: 0.4 });
    const bellyMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.3, roughness: 0.5 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.7, roughness: 0.25 });
    const engineMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.8, roughness: 0.2 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x446688, transparent: true, opacity: 0.35, metalness: 0.05, roughness: 0.05 });
    const cockpitGlassMat = new THREE.MeshStandardMaterial({ color: 0x557799, transparent: true, opacity: 0.4, metalness: 0.1, roughness: 0.08 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.95, metalness: 0.0 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xbbbbbb, metalness: 0.8, roughness: 0.2 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9, roughness: 0.15 });
    const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.85, roughness: 0.25 });
    const windowMat = new THREE.MeshStandardMaterial({ color: 0x223344, metalness: 0.15, roughness: 0.4, transparent: true, opacity: 0.6 });
    const airlineStripeMat = new THREE.MeshStandardMaterial({ color: 0x003366, metalness: 0.2, roughness: 0.5 });
    const airlineAccentMat = new THREE.MeshStandardMaterial({ color: 0xcc6600, metalness: 0.2, roughness: 0.5 });
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.5, roughness: 0.3 });
    const aileronMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.4, roughness: 0.4 });
    const flapMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.4, roughness: 0.4 });
    const rudderMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.4, roughness: 0.4 });
    const elevatorMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.4, roughness: 0.4 });
    const navRed = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.5 });
    const navGreen = new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00ff00, emissiveIntensity: 0.5 });
    const navWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.5 });
    const landingLightMat = new THREE.MeshStandardMaterial({ color: 0xffffcc, emissive: 0xffffcc, emissiveIntensity: 0.3 });

    // =================================================================
    // FUSELAGE – multi-segment realistic shape
    // =================================================================

    const fuselageLen = 12 * s;
    const fuselageRad = 0.55 * s;

    // Main fuselage body
    const fuselageMain = new THREE.Mesh(
      new THREE.CylinderGeometry(fuselageRad, fuselageRad, fuselageLen - 2 * s, 20),
      bodyMat
    );
    fuselageMain.rotation.z = Math.PI / 2;
    fuselageMain.position.x = 0.5 * s;
    this._group.add(fuselageMain);

    // Forward fuselage (slightly larger near nose)
    const fuselageFwd = new THREE.Mesh(
      new THREE.CylinderGeometry(fuselageRad * 1.02, fuselageRad, 2 * s, 20),
      bodyMat
    );
    fuselageFwd.rotation.z = Math.PI / 2;
    fuselageFwd.position.x = fuselageLen / 2 - 1 * s;
    this._group.add(fuselageFwd);

    // Rear fuselage (tapering to tail)
    const fuselageRear = new THREE.Mesh(
      new THREE.CylinderGeometry(fuselageRad, fuselageRad * 0.6, 2 * s, 18),
      bodyMat
    );
    fuselageRear.rotation.z = Math.PI / 2;
    fuselageRear.position.x = -fuselageLen / 2 + 1 * s;
    this._group.add(fuselageRear);

    // Nose cone – rounded (sphere-based for smooth shape)
    const noseSphere = new THREE.Mesh(
      new THREE.SphereGeometry(fuselageRad * 1.05, 20, 14),
      bodyMat
    );
    noseSphere.scale.x = 1.8;
    noseSphere.position.x = fuselageLen / 2 + 0.5 * s;
    this._group.add(noseSphere);

    // Nose tip (pointed)
    const noseTip = new THREE.Mesh(
      new THREE.ConeGeometry(fuselageRad * 0.5, 0.8 * s, 16),
      bodyMat
    );
    noseTip.rotation.z = -Math.PI / 2;
    noseTip.position.x = fuselageLen / 2 + 1.5 * s;
    this._group.add(noseTip);

    // Belly (darker underside)
    const belly = new THREE.Mesh(
      new THREE.CylinderGeometry(fuselageRad * 1.01, fuselageRad * 1.01, fuselageLen - 2 * s, 20, 1, false, 0, Math.PI),
      bellyMat
    );
    belly.rotation.z = Math.PI / 2;
    belly.rotation.y = Math.PI / 2;
    belly.position.set(0.5 * s, -fuselageRad * 0.3, 0);
    this._group.add(belly);

    // =================================================================
    // AIRLINE MARKINGS – stripe and accent
    // =================================================================

    // Blue stripe along fuselage side
    for (const side of [-1, 1]) {
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(fuselageLen - 2 * s, 0.06 * s, 0.01 * s),
        airlineStripeMat
      );
      stripe.position.set(0.5 * s, 0.15 * s, side * (fuselageRad + 0.005 * s));
      this._group.add(stripe);

      // Orange accent stripe below
      const accent = new THREE.Mesh(
        new THREE.BoxGeometry(fuselageLen - 4 * s, 0.03 * s, 0.01 * s),
        airlineAccentMat
      );
      accent.position.set(0.5 * s, 0.08 * s, side * (fuselageRad + 0.005 * s));
      this._group.add(accent);
    }

    // =================================================================
    // COCKPIT WINDOWS – pilot windows
    // =================================================================

    // Cockpit windshield (curved, transparent)
    const windshield = new THREE.Mesh(
      new THREE.SphereGeometry(0.48 * s, 16, 10, 0, Math.PI, 0, Math.PI / 3),
      cockpitGlassMat
    );
    windshield.rotation.z = -Math.PI / 2;
    windshield.position.set(fuselageLen / 2 + 0.2 * s, 0.1 * s, 0);
    this._group.add(windshield);

    // Cockpit side windows (small dark rectangles)
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const win = new THREE.Mesh(
          new THREE.BoxGeometry(0.15 * s, 0.12 * s, 0.02 * s),
          windowMat
        );
        win.position.set(
          fuselageLen / 2 - 0.3 * s - i * 0.2 * s,
          0.35 * s,
          side * (fuselageRad + 0.005 * s)
        );
        this._group.add(win);
      }
    }

    // =================================================================
    // PASSENGER WINDOWS – row along fuselage
    // =================================================================

    const windowCount = 24;
    const windowSpacing = (fuselageLen - 4 * s) / (windowCount + 1);
    for (let i = 0; i < windowCount; i++) {
      for (const side of [-1, 1]) {
        const win = new THREE.Mesh(
          new THREE.BoxGeometry(0.1 * s, 0.07 * s, 0.015 * s),
          windowMat
        );
        win.position.set(
          fuselageLen / 2 - 2.5 * s - windowSpacing * (i + 0.5),
          0.28 * s,
          side * (fuselageRad + 0.005 * s)
        );
        this._group.add(win);
      }
    }

    // =================================================================
    // DOORS – airline door outlines
    // =================================================================

    // Front door
    for (const side of [-1, 1]) {
      const door = new THREE.Mesh(
        new THREE.BoxGeometry(0.02 * s, 0.5 * s, 0.01 * s),
        doorMat
      );
      door.position.set(fuselageLen / 2 - 2 * s, 0.1 * s, side * (fuselageRad + 0.005 * s));
      this._group.add(door);
    }

    // Rear door
    for (const side of [-1, 1]) {
      const door = new THREE.Mesh(
        new THREE.BoxGeometry(0.02 * s, 0.5 * s, 0.01 * s),
        doorMat
      );
      door.position.set(-fuselageLen / 2 + 2 * s, 0.1 * s, side * (fuselageRad + 0.005 * s));
      this._group.add(door);
    }

    // =================================================================
    // WINGS – swept-back with winglets, ailerons, flaps
    // =================================================================

    const wingY = -0.15 * s;
    const halfSpan = 7 * s;
    const wingChord = 1.2 * s;
    const wingThick = 0.12 * s;
    const sweepAngle = 0.35; // radians (~20 degrees)

    for (const side of [-1, 1]) {
      // Main wing panel (swept-back)
      const wing = new THREE.Mesh(
        new THREE.BoxGeometry(wingChord, wingThick, halfSpan),
        bodyMat
      );
      wing.position.set(1.5 * s, wingY, side * halfSpan / 2);
      wing.rotation.y = side > 0 ? -sweepAngle : sweepAngle;
      this._group.add(wing);

      // Wing leading edge (tapered, aerodynamic)
      const wingLeading = new THREE.Mesh(
        new THREE.BoxGeometry(0.06 * s, wingThick * 0.5, halfSpan),
        bodyMat
      );
      wingLeading.position.set(1.5 * s + wingChord / 2 + 0.03 * s, wingY, side * halfSpan / 2);
      wingLeading.rotation.y = side > 0 ? -sweepAngle : sweepAngle;
      this._group.add(wingLeading);

      // Wing trailing edge
      const wingTrailing = new THREE.Mesh(
        new THREE.BoxGeometry(0.06 * s, wingThick * 0.3, halfSpan),
        bodyMat
      );
      wingTrailing.position.set(1.5 * s - wingChord / 2 - 0.03 * s, wingY, side * halfSpan / 2);
      wingTrailing.rotation.y = side > 0 ? -sweepAngle : sweepAngle;
      this._group.add(wingTrailing);

      // Aileron (dark control surface at wingtip)
      const aileron = new THREE.Mesh(
        new THREE.BoxGeometry(0.15 * s, wingThick * 0.25, 1.5 * s),
        aileronMat
      );
      aileron.position.set(1.5 * s - wingChord / 2 - 0.02 * s, wingY, side * (halfSpan - 0.75 * s));
      aileron.rotation.y = side > 0 ? -sweepAngle : sweepAngle;
      this._group.add(aileron);

      // Flap (dark control surface near fuselage)
      const flap = new THREE.Mesh(
        new THREE.BoxGeometry(0.15 * s, wingThick * 0.25, 2.0 * s),
        flapMat
      );
      flap.position.set(1.5 * s - wingChord / 2 - 0.02 * s, wingY, side * (halfSpan / 2 - 0.5 * s));
      flap.rotation.y = side > 0 ? -sweepAngle : sweepAngle;
      this._group.add(flap);

      // Winglet (upward-curved, blended)
      const wingletBase = new THREE.Mesh(
        new THREE.BoxGeometry(0.06 * s, 0.3 * s, 0.06 * s),
        bodyMat
      );
      wingletBase.position.set(1.5 * s, wingY + 0.15 * s, side * halfSpan);
      wingletBase.rotation.y = side > 0 ? -sweepAngle : sweepAngle;
      this._group.add(wingletBase);

      // Winglet top (curved upward)
      const wingletTop = new THREE.Mesh(
        new THREE.BoxGeometry(0.05 * s, 0.35 * s, 0.05 * s),
        bodyMat
      );
      wingletTop.position.set(1.5 * s - 0.1 * s, wingY + 0.45 * s, side * halfSpan);
      wingletTop.rotation.x = side * 0.3;
      wingletTop.rotation.y = side > 0 ? -sweepAngle : sweepAngle;
      this._group.add(wingletTop);

      // Wingtip navigation light
      const navLight = new THREE.Mesh(
        new THREE.SphereGeometry(0.03 * s, 6, 6),
        side === -1 ? navRed : navGreen
      );
      navLight.position.set(1.5 * s, wingY, side * halfSpan);
      this._group.add(navLight);

      // Landing light (under wing)
      const landingLight = new THREE.Mesh(
        new THREE.SphereGeometry(0.04 * s, 6, 6),
        landingLightMat
      );
      landingLight.position.set(1.5 * s - 0.5 * s, wingY - 0.08 * s, side * 1.5 * s);
      this._group.add(landingLight);
    }

    // =================================================================
    // JET ENGINES – detailed nacelles with intake and exhaust
    // =================================================================

    for (const zSide of [-1, 1]) {
      // Engine pylon (mounts engine to wing)
      const pylon = new THREE.Mesh(
        new THREE.BoxGeometry(0.3 * s, 0.15 * s, 0.08 * s),
        darkMetalMat
      );
      pylon.position.set(1.5 * s, wingY - 0.08 * s, zSide * 3.5 * s);
      this._group.add(pylon);

      // Engine nacelle (main body)
      const nacelle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32 * s, 0.28 * s, 2.0 * s, 16),
        engineMat
      );
      nacelle.rotation.z = Math.PI / 2;
      nacelle.position.set(1.5 * s, -0.55 * s, zSide * 3.5 * s);
      this._group.add(nacelle);

      // Engine intake (front ring)
      const intakeRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.31 * s, 0.035 * s, 8, 16),
        metalMat
      );
      intakeRing.rotation.y = Math.PI / 2;
      intakeRing.position.set(2.5 * s, -0.55 * s, zSide * 3.5 * s);
      this._group.add(intakeRing);

      // Engine intake (inner dark area)
      const intakeInner = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28 * s, 0.28 * s, 0.05 * s, 16),
        darkMat
      );
      intakeInner.rotation.z = Math.PI / 2;
      intakeInner.position.set(2.52 * s, -0.55 * s, zSide * 3.5 * s);
      this._group.add(intakeInner);

      // Engine exhaust (rear ring)
      const exhaustRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.2 * s, 0.025 * s, 8, 16),
        metalMat
      );
      exhaustRing.rotation.y = Math.PI / 2;
      exhaustRing.position.set(0.5 * s, -0.55 * s, zSide * 3.5 * s);
      this._group.add(exhaustRing);

      // Engine exhaust (inner dark area)
      const exhaustInner = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18 * s, 0.18 * s, 0.05 * s, 16),
        darkMat
      );
      exhaustInner.rotation.z = Math.PI / 2;
      exhaustInner.position.set(0.48 * s, -0.55 * s, zSide * 3.5 * s);
      this._group.add(exhaustInner);

      // Engine cowling line (detail stripe)
      const cowlingLine = new THREE.Mesh(
        new THREE.BoxGeometry(1.8 * s, 0.01 * s, 0.005 * s),
        darkMat
      );
      cowlingLine.position.set(1.5 * s, -0.23 * s, zSide * 3.5 * s);
      this._group.add(cowlingLine);
    }

    // =================================================================
    // TAIL SURFACES – conventional tail with rudder and elevators
    // =================================================================

    // Horizontal stabilizer (with realistic profile)
    const tailHMain = new THREE.Mesh(
      new THREE.BoxGeometry(0.45 * s, 0.07 * s, 4.2 * s),
      bodyMat
    );
    tailHMain.position.set(-5.5 * s, 0.2 * s, 0);
    this._group.add(tailHMain);

    // Horizontal stabilizer leading edge
    const tailHLeading = new THREE.Mesh(
      new THREE.BoxGeometry(0.05 * s, 0.05 * s, 4.2 * s),
      bodyMat
    );
    tailHLeading.position.set(-5.5 * s + 0.25 * s, 0.2 * s, 0);
    this._group.add(tailHLeading);

    // Elevators (dark trailing edge)
    const elevatorL = new THREE.Mesh(
      new THREE.BoxGeometry(0.12 * s, 0.06 * s, 2.0 * s),
      elevatorMat
    );
    elevatorL.position.set(-5.5 * s - 0.28 * s, 0.2 * s, -1.0 * s);
    this._group.add(elevatorL);

    const elevatorR = new THREE.Mesh(
      new THREE.BoxGeometry(0.12 * s, 0.06 * s, 2.0 * s),
      elevatorMat
    );
    elevatorR.position.set(-5.5 * s - 0.28 * s, 0.2 * s, 1.0 * s);
    this._group.add(elevatorR);

    // Vertical stabilizer (tapered fin)
    const tailVMain = new THREE.Mesh(
      new THREE.BoxGeometry(0.3 * s, 1.6 * s, 0.08 * s),
      bodyMat
    );
    tailVMain.position.set(-5.5 * s, 1.0 * s, 0);
    this._group.add(tailVMain);

    // Vertical stabilizer top taper
    const tailVTaper = new THREE.Mesh(
      new THREE.ConeGeometry(0.16 * s, 0.5 * s, 8),
      bodyMat
    );
    tailVTaper.position.set(-5.5 * s, 1.95 * s, 0);
    this._group.add(tailVTaper);

    // Rudder (dark trailing edge of vertical stabilizer)
    const rudder = new THREE.Mesh(
      new THREE.BoxGeometry(0.08 * s, 1.0 * s, 0.025 * s),
      rudderMat
    );
    rudder.position.set(-5.65 * s, 0.9 * s, 0);
    this._group.add(rudder);

    // =================================================================
    // APU EXHAUST – small cone at tail
    // =================================================================

    const apu = new THREE.Mesh(
      new THREE.ConeGeometry(0.1 * s, 0.25 * s, 8),
      darkMat
    );
    apu.rotation.z = Math.PI / 2;
    apu.position.set(-fuselageLen / 2 - 1.2 * s, -0.1 * s, 0);
    this._group.add(apu);

    // =================================================================
    // LANDING GEAR – nose and main gear with dual wheels
    // =================================================================

    // Nose gear (dual wheel)
    const noseStrut = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035 * s, 0.04 * s, 0.45 * s, 8),
      darkMetalMat
    );
    noseStrut.position.set(5.5 * s, -0.6 * s, 0);
    this._group.add(noseStrut);

    // Nose gear axle
    const noseAxle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02 * s, 0.02 * s, 0.3 * s, 6),
      metalMat
    );
    noseAxle.rotation.z = Math.PI / 2;
    noseAxle.position.set(5.5 * s, -0.82 * s, 0);
    this._group.add(noseAxle);

    for (const dz of [-0.12 * s, 0.12 * s]) {
      // Nose wheel tire
      const noseTire = new THREE.Mesh(
        new THREE.TorusGeometry(0.11 * s, 0.035 * s, 8, 14),
        tireMat
      );
      noseTire.rotation.y = Math.PI / 2;
      noseTire.position.set(5.5 * s, -0.88 * s, dz);
      this._group.add(noseTire);

      // Nose wheel rim
      const noseRim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07 * s, 0.07 * s, 0.03 * s, 10),
        rimMat
      );
      noseRim.rotation.z = Math.PI / 2;
      noseRim.position.set(5.5 * s, -0.88 * s, dz);
      this._group.add(noseRim);
    }

    // Main gear assemblies (dual wheel each side)
    for (const zSide of [-1, 1]) {
      // Main gear strut
      const mainStrut = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04 * s, 0.045 * s, 0.55 * s, 8),
        darkMetalMat
      );
      mainStrut.position.set(-1 * s, -0.65 * s, zSide * 2 * s);
      this._group.add(mainStrut);

      // Main gear axle
      const mainAxle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025 * s, 0.025 * s, 0.35 * s, 6),
        metalMat
      );
      mainAxle.rotation.z = Math.PI / 2;
      mainAxle.position.set(-1 * s, -0.92 * s, zSide * 2 * s);
      this._group.add(mainAxle);

      for (const dx of [-0.15 * s, 0.15 * s]) {
        // Main wheel tire
        const mainTire = new THREE.Mesh(
          new THREE.TorusGeometry(0.13 * s, 0.04 * s, 8, 14),
          tireMat
        );
        mainTire.rotation.y = Math.PI / 2;
        mainTire.position.set(-1 * s + dx, -0.98 * s, zSide * 2 * s);
        this._group.add(mainTire);

        // Main wheel rim
        const mainRim = new THREE.Mesh(
          new THREE.CylinderGeometry(0.085 * s, 0.085 * s, 0.035 * s, 10),
          rimMat
        );
        mainRim.rotation.z = Math.PI / 2;
        mainRim.position.set(-1 * s + dx, -0.98 * s, zSide * 2 * s);
        this._group.add(mainRim);
      }
    }

    // =================================================================
    // NAVIGATION LIGHTS
    // =================================================================

    // Tail nav light (white)
    const navTail = new THREE.Mesh(
      new THREE.SphereGeometry(0.025 * s, 6, 6),
      navWhite
    );
    navTail.position.set(-fuselageLen / 2 - 0.5 * s, fuselageRad + 0.1 * s, 0);
    this._group.add(navTail);

    // Boeing has no propeller (jet aircraft)
    this._propeller = null;
  }

  // ------------------------------------------------------------------
  // Extra 300 – aerobatic, single-seat, 3-blade prop (detailed)
  // ------------------------------------------------------------------
  private buildExtra300(s: number) {
    // Materials
    const redMat = new THREE.MeshStandardMaterial({ color: 0xdd1111, metalness: 0.4, roughness: 0.3 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, metalness: 0.3, roughness: 0.4 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, transparent: true, opacity: 0.4, metalness: 0.05, roughness: 0.05 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.9, roughness: 0.15 });
    const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.85, roughness: 0.25 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.95, metalness: 0.0 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.2 });
    const propMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.7, roughness: 0.2 });
    const spinnerMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.5, roughness: 0.3 });
    const exhaustMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.2 });
    const aileronMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.3, roughness: 0.5 });
    const rudderMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.3, roughness: 0.5 });
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xdd1111, metalness: 0.2, roughness: 0.5 });
    const numberMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.2, roughness: 0.5 });
    const navRed = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.5 });
    const navGreen = new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00ff00, emissiveIntensity: 0.5 });
    const navWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.5 });

    // =================================================================
    // FUSELAGE – very slim aerodynamic tube
    // =================================================================

    // Main fuselage body
    const fuselageMain = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15 * s, 0.17 * s, 2.5 * s, 14),
      redMat
    );
    fuselageMain.rotation.z = Math.PI / 2;
    fuselageMain.position.x = 0.3 * s;
    this._group.add(fuselageMain);

    // Forward fuselage (transition from nose to cockpit)
    const fuselageFwd = new THREE.Mesh(
      new THREE.CylinderGeometry(0.17 * s, 0.19 * s, 0.8 * s, 14),
      redMat
    );
    fuselageFwd.rotation.z = Math.PI / 2;
    fuselageFwd.position.x = 1.35 * s;
    this._group.add(fuselageFwd);

    // Rear fuselage (transition from cockpit to tail)
    const fuselageRear = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15 * s, 0.08 * s, 1.2 * s, 12),
      redMat
    );
    fuselageRear.rotation.z = Math.PI / 2;
    fuselageRear.position.x = -0.85 * s;
    this._group.add(fuselageRear);

    // Tail boom (very narrow)
    const tailBoom = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08 * s, 0.04 * s, 0.6 * s, 10),
      redMat
    );
    tailBoom.rotation.z = Math.PI / 2;
    tailBoom.position.x = -1.55 * s;
    this._group.add(tailBoom);

    // Nose cone – rounded (sphere-based for smooth shape)
    const noseSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.19 * s, 14, 10),
      redMat
    );
    noseSphere.scale.x = 1.6;
    noseSphere.position.x = 1.8 * s;
    this._group.add(noseSphere);

    // Nose tip (pointed)
    const noseTip = new THREE.Mesh(
      new THREE.ConeGeometry(0.1 * s, 0.4 * s, 12),
      redMat
    );
    noseTip.rotation.z = -Math.PI / 2;
    noseTip.position.x = 2.15 * s;
    this._group.add(noseTip);

    // White belly stripe (lower fuselage)
    const belly = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16 * s, 0.18 * s, 2.2 * s, 14, 1, false, 0, Math.PI * 0.6),
      whiteMat
    );
    belly.rotation.z = Math.PI / 2;
    belly.rotation.y = Math.PI / 2;
    belly.position.set(0.3 * s, -0.05 * s, 0);
    this._group.add(belly);

    // =================================================================
    // RACING STRIPES AND MARKINGS
    // =================================================================

    // Red stripe on white belly (racing stripe)
    for (const side of [-1, 1]) {
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(2.5 * s, 0.02 * s, 0.01 * s),
        stripeMat
      );
      stripe.position.set(0.3 * s, -0.02 * s, side * 0.15 * s);
      this._group.add(stripe);
    }

    // Racing number on side (dark rectangle)
    for (const side of [-1, 1]) {
      const number = new THREE.Mesh(
        new THREE.BoxGeometry(0.3 * s, 0.15 * s, 0.01 * s),
        numberMat
      );
      number.position.set(0.5 * s, 0.05 * s, side * 0.16 * s);
      this._group.add(number);
    }

    // =================================================================
    // WINGS – small, straight, aerobatic with thin profile
    // =================================================================

    const halfSpan = 2.25 * s;
    const wingChord = 0.45 * s;
    const wingThick = 0.035 * s;

    for (const side of [-1, 1]) {
      // Main wing panel (very thin profile)
      const wing = new THREE.Mesh(
        new THREE.BoxGeometry(wingChord, wingThick, halfSpan),
        whiteMat
      );
      wing.position.set(0.15 * s, 0, side * halfSpan / 2);
      this._group.add(wing);

      // Wing leading edge (tapered)
      const wingLeading = new THREE.Mesh(
        new THREE.BoxGeometry(0.03 * s, wingThick * 0.5, halfSpan),
        whiteMat
      );
      wingLeading.position.set(0.15 * s + wingChord / 2 + 0.015 * s, 0, side * halfSpan / 2);
      this._group.add(wingLeading);

      // Wing trailing edge
      const wingTrailing = new THREE.Mesh(
        new THREE.BoxGeometry(0.03 * s, wingThick * 0.3, halfSpan),
        whiteMat
      );
      wingTrailing.position.set(0.15 * s - wingChord / 2 - 0.015 * s, 0, side * halfSpan / 2);
      this._group.add(wingTrailing);

      // Red stripe on wing (racing marking)
      const wingStripe = new THREE.Mesh(
        new THREE.BoxGeometry(wingChord * 0.8, 0.005 * s, 0.02 * s),
        stripeMat
      );
      wingStripe.position.set(0.15 * s, wingThick / 2 + 0.002 * s, side * halfSpan / 2);
      this._group.add(wingStripe);

      // Wingtip (rounded)
      const tip = new THREE.Mesh(
        new THREE.SphereGeometry(0.025 * s, 8, 8),
        whiteMat
      );
      tip.scale.z = 2;
      tip.position.set(0.15 * s, 0, side * halfSpan);
      this._group.add(tip);

      // Aileron (dark control surface at wingtip)
      const aileron = new THREE.Mesh(
        new THREE.BoxGeometry(0.08 * s, wingThick * 0.2, 0.8 * s),
        aileronMat
      );
      aileron.position.set(0.15 * s - wingChord / 2 - 0.01 * s, 0, side * (halfSpan - 0.4 * s));
      this._group.add(aileron);

      // Wingtip navigation light
      const navLight = new THREE.Mesh(
        new THREE.SphereGeometry(0.02 * s, 6, 6),
        side === -1 ? navRed : navGreen
      );
      navLight.position.set(0.15 * s, 0, side * halfSpan);
      this._group.add(navLight);
    }

    // =================================================================
    // TAIL SURFACES – small, precise aerobatic tail
    // =================================================================

    // Horizontal stabilizer (with realistic profile)
    const tailHMain = new THREE.Mesh(
      new THREE.BoxGeometry(0.3 * s, 0.035 * s, 1.5 * s),
      redMat
    );
    tailHMain.position.set(-1.45 * s, 0.06 * s, 0);
    this._group.add(tailHMain);

    // Horizontal stabilizer leading edge
    const tailHLeading = new THREE.Mesh(
      new THREE.BoxGeometry(0.025 * s, 0.025 * s, 1.5 * s),
      redMat
    );
    tailHLeading.position.set(-1.45 * s + 0.16 * s, 0.06 * s, 0);
    this._group.add(tailHLeading);

    // Elevators (dark trailing edge)
    const elevatorL = new THREE.Mesh(
      new THREE.BoxGeometry(0.06 * s, 0.03 * s, 0.7 * s),
      aileronMat
    );
    elevatorL.position.set(-1.45 * s - 0.17 * s, 0.06 * s, -0.35 * s);
    this._group.add(elevatorL);

    const elevatorR = new THREE.Mesh(
      new THREE.BoxGeometry(0.06 * s, 0.03 * s, 0.7 * s),
      aileronMat
    );
    elevatorR.position.set(-1.45 * s - 0.17 * s, 0.06 * s, 0.35 * s);
    this._group.add(elevatorR);

    // Vertical stabilizer (tapered fin)
    const tailVMain = new THREE.Mesh(
      new THREE.BoxGeometry(0.18 * s, 0.55 * s, 0.04 * s),
      redMat
    );
    tailVMain.position.set(-1.45 * s, 0.35 * s, 0);
    this._group.add(tailVMain);

    // Vertical stabilizer top taper
    const tailVTaper = new THREE.Mesh(
      new THREE.ConeGeometry(0.09 * s, 0.2 * s, 8),
      redMat
    );
    tailVTaper.position.set(-1.45 * s, 0.65 * s, 0);
    this._group.add(tailVTaper);

    // Rudder (dark trailing edge)
    const rudder = new THREE.Mesh(
      new THREE.BoxGeometry(0.05 * s, 0.35 * s, 0.015 * s),
      rudderMat
    );
    rudder.position.set(-1.53 * s, 0.35 * s, 0);
    this._group.add(rudder);

    // =================================================================
    // COCKPIT – bubble canopy with reflection
    // =================================================================

    // Main bubble canopy (transparent, reflective)
    const canopy = new THREE.Mesh(
      new THREE.SphereGeometry(0.14 * s, 14, 10),
      glassMat
    );
    canopy.position.set(0.45 * s, 0.14 * s, 0);
    this._group.add(canopy);

    // Canopy frame (thin metal ring)
    const canopyFrame = new THREE.Mesh(
      new THREE.TorusGeometry(0.14 * s, 0.005 * s, 6, 14),
      metalMat
    );
    canopyFrame.position.set(0.45 * s, 0.14 * s, 0);
    this._group.add(canopyFrame);

    // =================================================================
    // EXHAUST – tail pipe
    // =================================================================

    // Exhaust pipe (thin metal tube at tail)
    const exhaustPipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02 * s, 0.025 * s, 0.15 * s, 8),
      exhaustMat
    );
    exhaustPipe.rotation.z = Math.PI / 2;
    exhaustPipe.position.set(-1.85 * s, -0.02 * s, 0);
    this._group.add(exhaustPipe);

    // Exhaust tip (flame holder)
    const exhaustTip = new THREE.Mesh(
      new THREE.ConeGeometry(0.02 * s, 0.05 * s, 8),
      exhaustMat
    );
    exhaustTip.rotation.z = -Math.PI / 2;
    exhaustTip.position.set(-1.93 * s, -0.02 * s, 0);
    this._group.add(exhaustTip);

    // =================================================================
    // LANDING GEAR – simple tricycle, thin and light
    // =================================================================

    // Nose gear
    // Strut
    const noseStrut = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015 * s, 0.018 * s, 0.22 * s, 6),
      darkMetalMat
    );
    noseStrut.position.set(1.1 * s, -0.25 * s, 0);
    this._group.add(noseStrut);

    // Nose wheel tire
    const noseTire = new THREE.Mesh(
      new THREE.TorusGeometry(0.045 * s, 0.015 * s, 8, 10),
      tireMat
    );
    noseTire.rotation.y = Math.PI / 2;
    noseTire.position.set(1.1 * s, -0.36 * s, 0);
    this._group.add(noseTire);

    // Nose wheel rim
    const noseRim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03 * s, 0.03 * s, 0.015 * s, 8),
      rimMat
    );
    noseRim.rotation.z = Math.PI / 2;
    noseRim.position.set(1.1 * s, -0.36 * s, 0);
    this._group.add(noseRim);

    // Main gears
    for (const z of [-1.2 * s, 1.2 * s]) {
      // Strut
      const mainStrut = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015 * s, 0.018 * s, 0.28 * s, 6),
        darkMetalMat
      );
      mainStrut.position.set(-0.15 * s, -0.28 * s, z);
      this._group.add(mainStrut);

      // Main wheel tire
      const mainTire = new THREE.Mesh(
        new THREE.TorusGeometry(0.055 * s, 0.018 * s, 8, 10),
        tireMat
      );
      mainTire.rotation.y = Math.PI / 2;
      mainTire.position.set(-0.15 * s, -0.42 * s, z);
      this._group.add(mainTire);

      // Main wheel rim
      const mainRim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035 * s, 0.035 * s, 0.018 * s, 8),
        rimMat
      );
      mainRim.rotation.z = Math.PI / 2;
      mainRim.position.set(-0.15 * s, -0.42 * s, z);
      this._group.add(mainRim);
    }

    // =================================================================
    // PROPELLER – 3-blade aerobatic with spinner
    // =================================================================

    this._propeller = new THREE.Group();

    // Propeller hub
    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035 * s, 0.035 * s, 0.08 * s, 10),
      metalMat
    );
    hub.rotation.z = Math.PI / 2;
    this._propeller.add(hub);

    // Propeller blades (3-blade, tapered)
    for (let i = 0; i < 3; i++) {
      // Blade (tapered from hub to tip)
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.035 * s, 1.0 * s, 0.02 * s),
        propMat
      );
      blade.rotation.x = (i * Math.PI * 2) / 3;
      this._propeller.add(blade);

      // Blade tip (rounded)
      const bladeTip = new THREE.Mesh(
        new THREE.SphereGeometry(0.015 * s, 6, 6),
        propMat
      );
      const angle = (i * Math.PI * 2) / 3;
      bladeTip.position.set(0, Math.sin(angle) * 1.0 * s, Math.cos(angle) * 1.0 * s);
      this._propeller.add(bladeTip);
    }

    // Spinner (conical nose cone)
    const spinner = new THREE.Mesh(
      new THREE.ConeGeometry(0.08 * s, 0.25 * s, 10),
      spinnerMat
    );
    spinner.rotation.z = -Math.PI / 2;
    spinner.position.x = 0.15 * s;
    this._propeller.add(spinner);

    this._propeller.position.x = 2.35 * s;
    this._group.add(this._propeller);

    // =================================================================
    // NAVIGATION LIGHTS
    // =================================================================

    // Tail nav light (white)
    const navTail = new THREE.Mesh(
      new THREE.SphereGeometry(0.015 * s, 6, 6),
      navWhite
    );
    navTail.position.set(-1.8 * s, -0.02 * s, 0);
    this._group.add(navTail);
  }

  // =================================================================
  // Fighter Jet (F-16 / Su-27) – delta wing, single/dual engine
  // =================================================================
  private buildFighterJet(s: number, type: 'f16' | 'su27') {
    const isF16 = type === 'f16';
    const bodyMat = new THREE.MeshStandardMaterial({
      color: isF16 ? 0x556b2f : 0x4a4a4a, // Military green or dark gray
      metalness: 0.7,
      roughness: 0.3
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.4,
      metalness: 0.05,
      roughness: 0.05
    });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9, roughness: 0.15 });
    const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.85, roughness: 0.25 });
    const exhaustMat = new THREE.MeshStandardMaterial({
      color: 0xff6600,
      emissive: 0xff4400,
      emissiveIntensity: 0.5
    });
    const navRed = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.5 });
    const navGreen = new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00ff00, emissiveIntensity: 0.5 });

    // Fuselage - sleek pointed design
    const fuselageGeo = new THREE.ConeGeometry(0.4 * s, 6 * s, 12);
    const fuselage = new THREE.Mesh(fuselageGeo, bodyMat);
    fuselage.rotation.z = -Math.PI / 2;
    fuselage.position.x = 0.5 * s;
    this._group.add(fuselage);

    // Nose cone (pointed)
    const noseGeo = new THREE.ConeGeometry(0.15 * s, 1.5 * s, 8);
    const nose = new THREE.Mesh(noseGeo, bodyMat);
    nose.rotation.z = -Math.PI / 2;
    nose.position.x = 3.5 * s;
    this._group.add(nose);

    // Cockpit canopy
    const cockpitGeo = new THREE.SphereGeometry(0.25 * s, 8, 6);
    const cockpit = new THREE.Mesh(cockpitGeo, glassMat);
    cockpit.position.set(1.2 * s, 0.25 * s, 0);
    cockpit.scale.set(1.2, 0.8, 1);
    this._group.add(cockpit);

    // Delta wings (large triangular wings)
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(-2.5 * s, 4 * s);
    wingShape.lineTo(-2 * s, 0);
    wingShape.lineTo(-2.5 * s, -4 * s);
    wingShape.lineTo(0, 0);

    const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.08 * s, bevelEnabled: true, bevelThickness: 0.02 * s, bevelSize: 0.02 * s, bevelSegments: 2 });
    const wings = new THREE.Mesh(wingGeo, bodyMat);
    wings.position.x = -0.5 * s;
    this._group.add(wings);

    // Vertical stabilizer(s)
    if (isF16) {
      // Single vertical stabilizer (F-16)
      const stabShape = new THREE.Shape();
      stabShape.moveTo(0, 0);
      stabShape.lineTo(-1.5 * s, 0);
      stabShape.lineTo(-1.5 * s, 1.5 * s);
      stabShape.lineTo(0, 1.5 * s);
      const stabGeo = new THREE.ExtrudeGeometry(stabShape, { depth: 0.06 * s, bevelEnabled: true, bevelThickness: 0.02 * s, bevelSize: 0.02 * s, bevelSegments: 2 });
      const stabilizer = new THREE.Mesh(stabGeo, bodyMat);
      stabilizer.position.set(-1.5 * s, 0.1 * s, -0.03 * s);
      this._group.add(stabilizer);
    } else {
      // Twin vertical stabilizers (Su-27)
      const stabShape = new THREE.Shape();
      stabShape.moveTo(0, 0);
      stabShape.lineTo(-1.2 * s, 0);
      stabShape.lineTo(-1.2 * s, 1.2 * s);
      stabShape.lineTo(0, 1.2 * s);
      const stabGeo = new THREE.ExtrudeGeometry(stabShape, { depth: 0.06 * s, bevelEnabled: true, bevelThickness: 0.02 * s, bevelSize: 0.02 * s, bevelSegments: 2 });

      const leftStab = new THREE.Mesh(stabGeo, bodyMat);
      leftStab.position.set(-1.2 * s, 0.1 * s, 1.0 * s);
      leftStab.rotation.x = -0.2;
      this._group.add(leftStab);

      const rightStab = new THREE.Mesh(stabGeo, bodyMat);
      rightStab.position.set(-1.2 * s, 0.1 * s, -1.0 * s);
      rightStab.rotation.x = 0.2;
      this._group.add(rightStab);
    }

    // Engine exhaust
    const exhaustGeo = new THREE.CylinderGeometry(0.15 * s, 0.2 * s, 0.5 * s, 8);
    const exhaust = new THREE.Mesh(exhaustGeo, exhaustMat);
    exhaust.rotation.z = Math.PI / 2;
    exhaust.position.set(-2 * s, 0, 0);
    this._group.add(exhaust);

    // Navigation lights
    const navLeft = new THREE.Mesh(new THREE.SphereGeometry(0.03 * s, 6, 6), navGreen);
    navLeft.position.set(-2 * s, -0.5 * s, 3.5 * s);
    this._group.add(navLeft);

    const navRight = new THREE.Mesh(new THREE.SphereGeometry(0.03 * s, 6, 6), navRed);
    navRight.position.set(-2 * s, -0.5 * s, -3.5 * s);
    this._group.add(navRight);
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