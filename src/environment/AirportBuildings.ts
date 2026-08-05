import * as THREE from 'three';

// ============================================================
//  PBR Materials – shared across all buildings
// ============================================================

const concreteMat = new THREE.MeshStandardMaterial({
  color: 0xcccccc,
  roughness: 0.8,
  metalness: 0.0,
});

const darkConcreteMat = new THREE.MeshStandardMaterial({
  color: 0x999999,
  roughness: 0.85,
  metalness: 0.0,
});

const glassMat = new THREE.MeshStandardMaterial({
  color: 0x88ccff,
  transparent: true,
  opacity: 0.6,
  roughness: 0.1,
  metalness: 0.8,
});

const glassFrameMat = new THREE.MeshStandardMaterial({
  color: 0x333333,
  roughness: 0.4,
  metalness: 0.6,
});

const metalMat = new THREE.MeshStandardMaterial({
  color: 0xaaaaaa,
  roughness: 0.3,
  metalness: 0.7,
});

const darkMetalMat = new THREE.MeshStandardMaterial({
  color: 0x666666,
  roughness: 0.4,
  metalness: 0.7,
});

const roofMat = new THREE.MeshStandardMaterial({
  color: 0x555555,
  roughness: 0.7,
  metalness: 0.1,
});

const hangarDoorMat = new THREE.MeshStandardMaterial({
  color: 0x888888,
  roughness: 0.5,
  metalness: 0.5,
});

const fuelTankMat = new THREE.MeshStandardMaterial({
  color: 0xcccccc,
  roughness: 0.4,
  metalness: 0.5,
});

const asphaltMat = new THREE.MeshStandardMaterial({
  color: 0x444444,
  roughness: 0.85,
  metalness: 0.0,
});

const taxiwayMarkingMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.6,
  metalness: 0.0,
});

const cargoMat = new THREE.MeshStandardMaterial({
  color: 0xbbbbbb,
  roughness: 0.75,
  metalness: 0.1,
});

const yellowMat = new THREE.MeshStandardMaterial({
  color: 0xffcc00,
  roughness: 0.5,
  metalness: 0.2,
});

const redMat = new THREE.MeshStandardMaterial({
  color: 0xcc3333,
  roughness: 0.5,
  metalness: 0.2,
});

// ============================================================
//  Helper – enable shadows on a mesh
// ============================================================
function shadow(obj: THREE.Object3D) {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return obj;
}

// ============================================================
//  AirportBuildings class
// ============================================================
export class AirportBuildings {
  /** Track all building groups for disposal */
  private _groups: THREE.Group[] = [];
  /** RES-04: Taxiway-Meshes in einer eigenen Gruppe */
  private _taxiwayGroup: THREE.Group | null = null;

  createBuildings(scene: THREE.Scene) {
    this.createTerminal(scene);
    this.createControlTower(scene);
    this.createHangars(scene);
    this.createFuelTanks(scene);
    this.createCargoArea(scene);
    this.createTaxiways(scene);
  }

  /** Dispose all building resources and remove from scene */
  dispose(scene: THREE.Scene): void {
    for (const group of this._groups) {
      scene.remove(group);
      group.traverse(child => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material?.dispose();
          }
        }
      });
    }
    this._groups = [];
    // RES-04: Taxiway-Gruppe entfernen (geteilte Materialien nicht disposen)
    if (this._taxiwayGroup) {
      scene.remove(this._taxiwayGroup);
      this._taxiwayGroup = null;
    }
  }

  // ==========================================================
  //  Terminal
  // ==========================================================
  private createTerminal(scene: THREE.Scene) {
    const group = new THREE.Group();

    // --- Main body ---
    const body = new THREE.Mesh(new THREE.BoxGeometry(80, 10, 30), concreteMat);
    body.position.y = 5;
    group.add(shadow(body));

    // --- Flat roof (slightly larger than body) ---
    const roof = new THREE.Mesh(new THREE.BoxGeometry(84, 0.6, 34), roofMat);
    roof.position.y = 10.3;
    group.add(shadow(roof));

    // --- Glass facade (front wall) ---
    const facade = new THREE.Mesh(new THREE.BoxGeometry(76, 7, 0.3), glassMat);
    facade.position.set(0, 5.5, 15.15);
    group.add(facade);

    // --- Window frames on facade ---
    this.createWindowGrid(group, 76, 7, 15.2, 0, 5.5, 'z');

    // --- Side glass panels ---
    for (const side of [-1, 1] as const) {
      const sideGlass = new THREE.Mesh(new THREE.BoxGeometry(0.3, 6, 26), glassMat);
      sideGlass.position.set(side * 40.15, 5, 0);
      group.add(sideGlass);
    }

    // --- Entrance canopy ---
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(16, 0.4, 6), darkMetalMat);
    canopy.position.set(0, 7.5, 18);
    group.add(shadow(canopy));

    // Canopy support columns
    for (const x of [-7, 7]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 3, 8), metalMat);
      col.position.set(x, 6, 20.5);
      group.add(shadow(col));
    }

    // --- Entrance doors ---
    const doorLeft = new THREE.Mesh(new THREE.BoxGeometry(2.5, 4, 0.2), darkMetalMat);
    doorLeft.position.set(-1.5, 2, 15.2);
    group.add(doorLeft);
    const doorRight = new THREE.Mesh(new THREE.BoxGeometry(2.5, 4, 0.2), darkMetalMat);
    doorRight.position.set(1.5, 2, 15.2);
    group.add(doorRight);

    // --- Roof HVAC units ---
    for (const x of [-20, 0, 20]) {
      const hvac = new THREE.Mesh(new THREE.BoxGeometry(4, 1.5, 3), metalMat);
      hvac.position.set(x, 11.55, -5);
      group.add(shadow(hvac));
    }

    // --- Roof vents ---
    for (const x of [-30, 30]) {
      const vent = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 1.2, 8), darkMetalMat);
      vent.position.set(x, 11.4, 5);
      group.add(shadow(vent));
    }

    // --- Structural columns on back wall ---
    for (let x = -35; x <= 35; x += 10) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.5, 10, 0.5), darkConcreteMat);
      col.position.set(x, 5, -15.25);
      group.add(col);
    }

    group.position.set(800, 0, 0);
    scene.add(group);
    this._groups.push(group);
  }

  /** Create a grid of window frames around transparent panes */
  private createWindowGrid(
    parent: THREE.Group,
    width: number,
    height: number,
    z: number,
    xOff: number,
    yOff: number,
    axis: 'x' | 'z',
  ) {
    const cols = 12;
    const rows = 2;
    const paneW = (width - 2) / cols;
    const paneH = (height - 1) / rows;
    const frameThick = 0.12;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cx = xOff - width / 2 + paneW * c + paneW / 2;
        const cy = yOff - height / 2 + paneH * r + paneH / 2;

        // Horizontal frame bars
        const hBar = new THREE.Mesh(
          new THREE.BoxGeometry(paneW, frameThick, frameThick),
          glassFrameMat,
        );
        if (axis === 'z') {
          hBar.position.set(cx, cy - paneH / 2, z);
        } else {
          hBar.position.set(z, cy - paneH / 2, cx);
        }
        parent.add(hBar);

        // Vertical frame bars
        const vBar = new THREE.Mesh(
          new THREE.BoxGeometry(frameThick, paneH, frameThick),
          glassFrameMat,
        );
        if (axis === 'z') {
          vBar.position.set(cx - paneW / 2, cy, z);
        } else {
          vBar.position.set(z, cy, cx - paneW / 2);
        }
        parent.add(vBar);
      }
    }
  }

  // ==========================================================
  //  Control Tower
  // ==========================================================
  private createControlTower(scene: THREE.Scene) {
    const group = new THREE.Group();

    // --- Base (wider concrete foundation) ---
    const base = new THREE.Mesh(new THREE.CylinderGeometry(6, 7, 3, 12), concreteMat);
    base.position.y = 1.5;
    group.add(shadow(base));

    // --- Tower shaft ---
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 5, 25, 12), concreteMat);
    shaft.position.y = 15.5;
    group.add(shadow(shaft));

    // --- Structural reinforcement bands ---
    for (let y = 5; y < 28; y += 8) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.2, 6, 12), darkMetalMat);
      band.position.y = y;
      band.rotation.x = Math.PI / 2;
      group.add(band);
    }

    // --- Glass observation deck (cylindrical, 360°) ---
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 5.5, 5, 16), glassMat);
    deck.position.y = 30.5;
    group.add(deck);

    // --- Observation deck frame (top + bottom rings) ---
    for (const y of [28.2, 32.8]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(5.5, 0.25, 8, 16), metalMat);
      ring.position.y = y;
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
    }

    // --- Vertical frame bars on observation deck ---
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.15, 4.5, 0.15), glassFrameMat);
      bar.position.set(
        Math.cos(angle) * 5.5,
        30.5,
        Math.sin(angle) * 5.5,
      );
      bar.rotation.y = -angle;
      group.add(bar);
    }

    // --- Roof over observation deck ---
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(6, 5.8, 0.5, 16), darkMetalMat);
    roof.position.y = 33.25;
    group.add(shadow(roof));

    // --- Antenna mast ---
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 6, 6), metalMat);
    mast.position.y = 36.5;
    group.add(shadow(mast));

    // --- Antenna sphere ---
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), redMat);
    sphere.position.y = 39.5;
    group.add(sphere);

    // --- Radar dish ---
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.1, 12), metalMat);
    dish.position.y = 37;
    dish.rotation.z = 0.3;
    group.add(dish);

    // --- Elevator shaft (visible on one side) ---
    const elevator = new THREE.Mesh(new THREE.BoxGeometry(1.5, 25, 0.3), metalMat);
    elevator.position.set(4, 15.5, 0);
    group.add(elevator);

    // --- Staircase access (spiral hint – small platform at base) ---
    const stairPlatform = new THREE.Mesh(new THREE.BoxGeometry(3, 0.3, 3), concreteMat);
    stairPlatform.position.set(7, 0.15, 0);
    group.add(shadow(stairPlatform));

    group.position.set(850, 0, 50);
    scene.add(group);
    this._groups.push(group);
  }

  // ==========================================================
  //  Hangars (2×)
  // ==========================================================
  private createHangars(scene: THREE.Scene) {
    // Beide Hangars innerhalb der flachen Zone (|x| < AIRPORT_HALF_X), sonst stehen sie am Hang
    const positions = [
      { x: 890, z: 130 },
      { x: 960, z: 130 },
    ];

    positions.forEach((pos) => {
      const group = new THREE.Group();

      // --- Floor slab ---
      const floor = new THREE.Mesh(new THREE.BoxGeometry(50, 0.4, 40), darkConcreteMat);
      floor.position.y = 0.2;
      group.add(shadow(floor));

      // --- Back wall ---
      const backWall = new THREE.Mesh(new THREE.BoxGeometry(50, 14, 1), concreteMat);
      backWall.position.set(0, 7, -19.5);
      group.add(shadow(backWall));

      // --- Side walls ---
      for (const side of [-1, 1] as const) {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(1, 14, 40), concreteMat);
        wall.position.set(side * 24.5, 7, 0);
        group.add(shadow(wall));
      }

      // --- Front wall (partial – with wide door opening) ---
      const frontLeft = new THREE.Mesh(new THREE.BoxGeometry(10, 14, 1), concreteMat);
      frontLeft.position.set(-20, 7, 19.5);
      group.add(frontLeft);
      const frontRight = new THREE.Mesh(new THREE.BoxGeometry(10, 14, 1), concreteMat);
      frontRight.position.set(20, 7, 19.5);
      group.add(frontRight);
      const frontTop = new THREE.Mesh(new THREE.BoxGeometry(30, 4, 1), concreteMat);
      frontTop.position.set(0, 12, 19.5);
      group.add(frontTop);

      // --- Wide hangar door (metal sliding door) ---
      const door = new THREE.Mesh(new THREE.BoxGeometry(28, 10, 0.5), hangarDoorMat);
      door.position.set(0, 5, 19.7);
      group.add(shadow(door));

      // Door tracks
      const track = new THREE.Mesh(new THREE.BoxGeometry(30, 0.3, 0.3), darkMetalMat);
      track.position.set(0, 10.15, 19.7);
      group.add(track);

      // --- Semi-circular arched roof ---
      const roofGeo = new THREE.CylinderGeometry(25, 25, 40, 16, 1, false, 0, Math.PI);
      const roofMesh = new THREE.Mesh(roofGeo, roofMat);
      roofMesh.rotation.z = Math.PI / 2;
      roofMesh.position.set(0, 14, 0);
      group.add(shadow(roofMesh));

      // --- Roof support beams ---
      for (let z = -15; z <= 15; z += 10) {
        const beam = new THREE.Mesh(new THREE.BoxGeometry(50, 0.5, 0.5), darkMetalMat);
        beam.position.set(0, 13.8, z);
        group.add(beam);
      }

      // --- Interior support columns ---
      for (const x of [-15, 0, 15]) {
        const col = new THREE.Mesh(new THREE.BoxGeometry(0.6, 13, 0.6), darkMetalMat);
        col.position.set(x, 6.5, -10);
        group.add(col);
      }

      // --- Windows on side walls ---
      for (const side of [-1, 1] as const) {
        for (let z = -10; z <= 10; z += 10) {
          const win = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2, 3), glassMat);
          win.position.set(side * 25.1, 9, z);
          group.add(win);
        }
      }

      // --- Yellow hazard stripes on door frame ---
      const stripeLeft = new THREE.Mesh(new THREE.BoxGeometry(0.5, 10, 0.3), yellowMat);
      stripeLeft.position.set(-14.25, 5, 19.8);
      group.add(stripeLeft);
      const stripeRight = new THREE.Mesh(new THREE.BoxGeometry(0.5, 10, 0.3), yellowMat);
      stripeRight.position.set(14.25, 5, 19.8);
      group.add(stripeRight);

      group.position.set(pos.x, 0, pos.z);
      // Tore zeigen zum Vorfeld (-Z), nicht ins Gelände
      group.rotation.y = Math.PI;
      scene.add(group);
      this._groups.push(group);
    });
  }

  // ==========================================================
  //  Fuel Tanks (3×)
  // ==========================================================
  private createFuelTanks(scene: THREE.Scene) {
    const positions = [
      { x: 700, z: -100 },
      { x: 720, z: -100 },
      { x: 740, z: -100 },
    ];

    positions.forEach((pos) => {
      const group = new THREE.Group();

      // --- Main cylindrical tank body ---
      const body = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 12, 16), fuelTankMat);
      body.position.y = 6;
      group.add(shadow(body));

      // --- Domed top ---
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        fuelTankMat,
      );
      dome.position.y = 12;
      group.add(shadow(dome));

      // --- Base ring ---
      const baseRing = new THREE.Mesh(new THREE.TorusGeometry(5.3, 0.3, 8, 16), darkMetalMat);
      baseRing.rotation.x = Math.PI / 2;
      baseRing.position.y = 0.3;
      group.add(baseRing);

      // --- Ladder on side ---
      const ladder = new THREE.Mesh(new THREE.BoxGeometry(0.6, 10, 0.3), darkMetalMat);
      ladder.position.set(5.2, 5, 0);
      group.add(ladder);

      // --- Access platform near top ---
      const platform = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.2, 8), darkMetalMat);
      platform.position.set(5.2, 10, 0);
      group.add(platform);

      // --- Red warning stripe ---
      const stripe = new THREE.Mesh(new THREE.TorusGeometry(5.05, 0.2, 6, 16), redMat);
      stripe.rotation.x = Math.PI / 2;
      stripe.position.y = 9;
      group.add(stripe);

      // --- Small vent on dome ---
      const vent = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 1, 6), metalMat);
      vent.position.y = 17;
      group.add(vent);

      group.position.set(pos.x, 0, pos.z);
      scene.add(group);
      this._groups.push(group);
    });
  }

  // ==========================================================
  //  Cargo Area
  // ==========================================================
  private createCargoArea(scene: THREE.Scene) {
    const group = new THREE.Group();

    // --- Main warehouse body ---
    const body = new THREE.Mesh(new THREE.BoxGeometry(40, 8, 25), cargoMat);
    body.position.y = 4;
    group.add(shadow(body));

    // --- Flat roof ---
    const roof = new THREE.Mesh(new THREE.BoxGeometry(42, 0.5, 27), roofMat);
    roof.position.y = 8.25;
    group.add(shadow(roof));

    // --- Loading docks (back side) ---
    for (let x = -15; x <= 15; x += 10) {
      // Dock platform
      const dock = new THREE.Mesh(new THREE.BoxGeometry(6, 1.5, 3), darkConcreteMat);
      dock.position.set(x, 1.5, -13.5);
      group.add(shadow(dock));

      // Dock door opening (dark rectangle)
      const door = new THREE.Mesh(new THREE.BoxGeometry(5, 4, 0.3), darkMetalMat);
      door.position.set(x, 4, -12.8);
      group.add(door);

      // Dock leveler (yellow strip)
      const leveler = new THREE.Mesh(new THREE.BoxGeometry(5, 0.15, 0.5), yellowMat);
      leveler.position.set(x, 2.25, -14);
      group.add(leveler);
    }

    // --- Windows on front ---
    for (let x = -15; x <= 15; x += 7.5) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(3, 2, 0.2), glassMat);
      win.position.set(x, 6, 12.6);
      group.add(win);
    }

    // --- Roof HVAC ---
    const hvac = new THREE.Mesh(new THREE.BoxGeometry(5, 1.5, 3), metalMat);
    hvac.position.set(0, 9.25, -5);
    group.add(shadow(hvac));

    // --- Forklift parking area (marked zone) ---
    const forkliftZone = new THREE.Mesh(new THREE.BoxGeometry(15, 0.05, 8), yellowMat);
    forkliftZone.position.set(0, 0.03, 18);
    group.add(forkliftZone);

    // --- Cargo containers (stacked boxes) ---
    const containerColors = [0x2255aa, 0xaa3333, 0x338833];
    for (let i = 0; i < 3; i++) {
      const stackH = i < 2 ? 2 : 1;
      const container = new THREE.Mesh(
        new THREE.BoxGeometry(3, stackH, 6),
        new THREE.MeshStandardMaterial({
          color: containerColors[i],
          roughness: 0.6,
          metalness: 0.3,
        }),
      );
      container.position.set(25 + i * 4, stackH / 2, 15);
      group.add(shadow(container));
    }

    group.position.set(950, 0, -30);
    scene.add(group);
    this._groups.push(group);
  }

  // ==========================================================
  //  Taxiways (connect buildings to runway)
  // ==========================================================
  private createTaxiways(scene: THREE.Scene) {
    // RES-04: Alle Taxiway-Meshes in einer Gruppe
    const taxiwayGroup = new THREE.Group();
    this._taxiwayGroup = taxiwayGroup;

    // Rollwege verbinden Bahn, Vorfeld und Hangars
    const taxiways = [
      // Bahn zum Vorfeld
      { x: 750, z: 0, length: 100, width: 12, rot: 0 },
      // Terminal zum Kontrollturm
      { x: 825, z: 25, length: 50, width: 8, rot: Math.PI / 2 },
      // Vorfeld zu den Hangars
      { x: 925, z: 110, length: 90, width: 10, rot: Math.PI / 2 },
      // Vorfeldkante entlang der Hangars
      { x: 890, z: 90, length: 180, width: 10, rot: 0 },
      // Anbindung Frachtbereich
      { x: 875, z: -15, length: 150, width: 8, rot: -Math.PI / 6 },
      // Zufahrt Tanklager
      { x: 750, z: -50, length: 100, width: 6, rot: Math.PI / 2 },
    ];

    taxiways.forEach((tw) => {
      const surface = new THREE.Mesh(
        new THREE.PlaneGeometry(tw.length, tw.width),
        asphaltMat,
      );
      surface.rotation.x = -Math.PI / 2;
      surface.rotation.z = tw.rot;
      surface.position.set(tw.x, 0.02, tw.z);
      taxiwayGroup.add(surface);
    });

    // --- Taxiway center line markings (thin white planes) ---
    const markings = [
      { x: 750, z: 0, length: 100, rot: 0 },
      { x: 825, z: 25, length: 50, rot: Math.PI / 2 },
      { x: 925, z: 110, length: 90, rot: Math.PI / 2 },
      { x: 890, z: 90, length: 180, rot: 0 },
      { x: 875, z: -15, length: 150, rot: -Math.PI / 6 },
      { x: 750, z: -50, length: 100, rot: Math.PI / 2 },
    ];

    markings.forEach((mk) => {
      // Dashed center line
      const dashCount = Math.floor(mk.length / 6);
      for (let i = 0; i < dashCount; i++) {
        const offset = -mk.length / 2 + i * 6 + 1.5;
        const dash = new THREE.Mesh(
          new THREE.PlaneGeometry(3, 0.3),
          taxiwayMarkingMat,
        );
        dash.rotation.x = -Math.PI / 2;
        dash.rotation.z = mk.rot;

        if (mk.rot === 0) {
          dash.position.set(mk.x + offset, 0.03, mk.z);
        } else if (mk.rot === Math.PI / 2) {
          dash.position.set(mk.x, 0.03, mk.z + offset);
        } else {
          const cos = Math.cos(mk.rot);
          const sin = Math.sin(mk.rot);
          dash.position.set(
            mk.x + offset * cos,
            0.03,
            mk.z + offset * sin,
          );
        }
        taxiwayGroup.add(dash);
      }
    });

    // --- Edge line markings ---
    markings.forEach((mk) => {
      for (const side of [-1, 1] as const) {
        const edgeLine = new THREE.Mesh(
          new THREE.PlaneGeometry(mk.length, 0.2),
          taxiwayMarkingMat,
        );
        edgeLine.rotation.x = -Math.PI / 2;
        edgeLine.rotation.z = mk.rot;

        if (mk.rot === 0) {
          edgeLine.position.set(mk.x, 0.03, mk.z + side * 5);
        } else if (mk.rot === Math.PI / 2) {
          edgeLine.position.set(mk.x + side * 5, 0.03, mk.z);
        } else {
          const perpCos = Math.cos(mk.rot + Math.PI / 2);
          const perpSin = Math.sin(mk.rot + Math.PI / 2);
          edgeLine.position.set(
            mk.x + side * 5 * perpCos,
            0.03,
            mk.z + side * 5 * perpSin,
          );
        }
        taxiwayGroup.add(edgeLine);
      }
    });

    // --- Hold-short markings (yellow perpendicular bars at runway intersection) ---
    for (let z = -5; z <= 5; z += 2.5) {
      const bar = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 12), yellowMat);
      bar.rotation.x = -Math.PI / 2;
      bar.position.set(700, 0.03, z);
      taxiwayGroup.add(bar);
    }

    scene.add(taxiwayGroup);
  }
}