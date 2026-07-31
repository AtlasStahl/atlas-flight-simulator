import * as THREE from 'three';

// ============================================================
//  Airport Vehicles and Props
// ============================================================
/** Detailed airport service vehicles, ground equipment, and infrastructure props */
export class AirportVehicles {
  // --- Material cache ---
  private readonly bodyWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0.2 });
  private readonly bodyYellow = new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.5, metalness: 0.2 });
  private readonly bodyOrange = new THREE.MeshStandardMaterial({ color: 0xff6600, roughness: 0.5, metalness: 0.2 });
  private readonly bodyGray = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.4, metalness: 0.6 });
  private readonly bodyDark = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.6 });
  private readonly tireMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9, metalness: 0.0 });
  private readonly glassMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, transparent: true, opacity: 0.5, roughness: 0.1, metalness: 0.8 });
  private readonly headlightMat = new THREE.MeshStandardMaterial({ color: 0xffffcc, emissive: 0xffffaa, emissiveIntensity: 0.3, roughness: 0.2 });
  private readonly taillightMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.2, roughness: 0.3 });
  private readonly metalMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.3, metalness: 0.7 });
  private readonly darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.4, metalness: 0.6 });
  private readonly stripeYellow = new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.6 });
  private readonly stripeBlack = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 });
  private readonly concreteMat = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.8 });
  private readonly signWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
  private readonly signBlackMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });
  private readonly poleMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.4, metalness: 0.5 });
  private readonly lightFixtureMat = new THREE.MeshStandardMaterial({ color: 0xffffee, emissive: 0xffffcc, emissiveIntensity: 0.5, roughness: 0.2 });
  private readonly bridgeMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.5, metalness: 0.4 });
  private readonly bridgeDarkMat = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.5, metalness: 0.5 });
  private readonly cargoMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.6 });
  private readonly luggageMat = new THREE.MeshStandardMaterial({ color: 0x336699, roughness: 0.7 });

  constructor() {
    // No-op – all creation happens via createVehicles()
  }

  /** Create all vehicles and props, adding them to the scene */
  createVehicles(scene: THREE.Scene) {
    this.createPushbackTractors(scene);
    this.createFuelTruck(scene);
    this.createCargoLoader(scene);
    this.createServiceVans(scene);
    this.createPassengerBus(scene);
    this.createJetBridges(scene);
    this.createGroundSigns(scene);
    this.createLightPoles(scene);
    this.createBarriers(scene);
    this.createLuggageCarts(scene);
  }

  // ============================================================
  //  Helper – Vehicle Cab
  // ============================================================
  /**
   * Create a detailed vehicle cab with body, windshield, side windows,
   * headlights, and taillights.
   */
  private createVehicleCab(
    width: number, height: number, depth: number, color: THREE.Material
  ): THREE.Group {
    const group = new THREE.Group();

    // Main body box
    const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), color);
    body.position.y = height / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Windshield (front glass)
    const windshieldW = width * 0.85;
    const windshieldH = height * 0.55;
    const windshield = new THREE.Mesh(
      new THREE.PlaneGeometry(windshieldW, windshieldH),
      this.glassMat
    );
    windshield.position.set(0, height * 0.75, depth / 2 + 0.01);
    group.add(windshield);

    // Side windows (left and right)
    const sideWinW = depth * 0.6;
    const sideWinH = height * 0.45;
    for (const side of [-1, 1]) {
      const sideWin = new THREE.Mesh(
        new THREE.PlaneGeometry(sideWinW, sideWinH),
        this.glassMat
      );
      sideWin.position.set(side * (width / 2 + 0.01), height * 0.75, depth * 0.1);
      sideWin.rotation.y = side * Math.PI / 2;
      group.add(sideWin);
    }

    // Headlights (front, small spheres)
    for (const side of [-1, 1]) {
      const hl = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 8, 8),
        this.headlightMat
      );
      hl.position.set(side * (width / 2 - 0.2), height * 0.35, depth / 2 + 0.05);
      group.add(hl);
    }

    // Taillights (rear, small boxes)
    for (const side of [-1, 1]) {
      const tl = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.15, 0.05),
        this.taillightMat
      );
      tl.position.set(side * (width / 2 - 0.2), height * 0.35, -depth / 2 - 0.01);
      group.add(tl);
    }

    return group;
  }

  // ============================================================
  //  Helper – Wheel
  // ============================================================
  /**
   * Create a wheel (cylinder) with black rubber material.
   * Rotated to lie flat (axis along Y).
   */
  private createWheel(radius: number, width: number): THREE.Mesh {
    const geo = new THREE.CylinderGeometry(radius, radius, width, 16);
    const mesh = new THREE.Mesh(geo, this.tireMat);
    mesh.rotation.z = Math.PI / 2;
    mesh.castShadow = true;
    return mesh;
  }

  /**
   * Place 4 wheels under a vehicle at the given height offset.
   */
  private addWheels(
    group: THREE.Group,
    wheelRadius: number,
    wheelWidth: number,
    trackWidth: number,
    wheelbase: number,
    yOffset: number
  ) {
    const positions = [
      { x: -trackWidth / 2, z: -wheelbase / 2 },
      { x: trackWidth / 2, z: -wheelbase / 2 },
      { x: -trackWidth / 2, z: wheelbase / 2 },
      { x: trackWidth / 2, z: wheelbase / 2 },
    ];
    for (const p of positions) {
      const wheel = this.createWheel(wheelRadius, wheelWidth);
      wheel.position.set(p.x, yOffset, p.z);
      group.add(wheel);
    }
  }

  /**
   * Place 6 wheels (triple-axle) under a large vehicle.
   */
  private addSixWheels(
    group: THREE.Group,
    wheelRadius: number,
    wheelWidth: number,
    trackWidth: number,
    axleSpacing: number,
    yOffset: number
  ) {
    const zPositions = [-axleSpacing, 0, axleSpacing];
    for (const z of zPositions) {
      for (const side of [-1, 1]) {
        const wheel = this.createWheel(wheelRadius, wheelWidth);
        wheel.position.set(side * trackWidth / 2, yOffset, z);
        group.add(wheel);
      }
    }
  }

  // ============================================================
  //  Pushback Tractors (2x)
  // ============================================================
  private createPushbackTractors(scene: THREE.Scene) {
    const positions = [
      { x: 80, z: 30, rotY: 0.3 },
      { x: 100, z: 50, rotY: -0.2 },
    ];

    for (const pos of positions) {
      const group = new THREE.Group();

      // Chassis (thin box)
      const chassis = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 0.3, 3.5),
        this.bodyDark
      );
      chassis.position.y = 0.8;
      chassis.castShadow = true;
      group.add(chassis);

      // Cab
      const cab = this.createVehicleCab(2, 1.6, 1.8, this.bodyYellow);
      cab.position.set(0, 0.8, -0.3);
      group.add(cab);

      // Tow bar (thin cylinder extending forward)
      const towBar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 2.5, 8),
        this.metalMat
      );
      towBar.rotation.x = Math.PI / 4;
      towBar.position.set(0, 1.2, 2.2);
      towBar.castShadow = true;
      group.add(towBar);

      // Tow hook (small sphere at end)
      const hook = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 8, 8),
        this.darkMetalMat
      );
      hook.position.set(0, 1.9, 3);
      group.add(hook);

      // Wheels (4)
      this.addWheels(group, 0.35, 0.25, 2, 2.2, 0.35);

      // Roof light bar
      const lightBar = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.1, 0.3),
        this.bodyOrange
      );
      lightBar.position.set(0, 2.15, -0.3);
      group.add(lightBar);

      group.position.set(pos.x, 0, pos.z);
      group.rotation.y = pos.rotY;
      scene.add(group);
    }
  }

  // ============================================================
  //  Fuel Truck (1x)
  // ============================================================
  private createFuelTruck(scene: THREE.Scene) {
    const group = new THREE.Group();

    // Chassis
    const chassis = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 0.4, 7),
      this.bodyDark
    );
    chassis.position.y = 1;
    chassis.castShadow = true;
    group.add(chassis);

    // Cab (front)
    const cab = this.createVehicleCab(2.4, 2, 2, this.bodyWhite);
    cab.position.set(0, 1, -2.5);
    group.add(cab);

    // Cylindrical tank (horizontal)
    const tank = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.2, 5, 16),
      this.bodyWhite
    );
    tank.rotation.z = Math.PI / 2;
    tank.position.set(0, 2.8, 0.5);
    tank.castShadow = true;
    group.add(tank);

    // Tank stripe (red hazard band)
    const stripe = new THREE.Mesh(
      new THREE.CylinderGeometry(1.22, 1.22, 0.8, 16),
      new THREE.MeshStandardMaterial({ color: 0xcc0000, roughness: 0.5 })
    );
    stripe.rotation.z = Math.PI / 2;
    stripe.position.set(0, 2.8, 0.5);
    group.add(stripe);

    // Hose reel (torus on side)
    const reel = new THREE.Mesh(
      new THREE.TorusGeometry(0.5, 0.08, 8, 16),
      this.darkMetalMat
    );
    reel.position.set(1.4, 2.5, 1.5);
    reel.castShadow = true;
    group.add(reel);

    // Hose reel hub
    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 0.3, 8),
      this.metalMat
    );
    hub.rotation.x = Math.PI / 2;
    hub.position.set(1.4, 2.5, 1.5);
    group.add(hub);

    // Support legs under tank
    for (const z of [-1, 1]) {
      const leg = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 1.2, 0.15),
        this.metalMat
      );
      leg.position.set(0, 1.6, 0.5 + z * 1.5);
      leg.castShadow = true;
      group.add(leg);
    }

    // Wheels (6 – triple axle)
    this.addSixWheels(group, 0.45, 0.3, 2.2, 1.2, 0.45);

    group.position.set(-380, 0, 130);
    group.rotation.y = Math.PI / 2;
    scene.add(group);
  }

  // ============================================================
  //  Cargo Loader (1x)
  // ============================================================
  private createCargoLoader(scene: THREE.Scene) {
    const group = new THREE.Group();

    // Chassis
    const chassis = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 0.4, 5),
      this.bodyDark
    );
    chassis.position.y = 0.9;
    chassis.castShadow = true;
    group.add(chassis);

    // Cab (front)
    const cab = this.createVehicleCab(2.6, 2, 1.8, this.bodyOrange);
    cab.position.set(0, 0.9, -1.8);
    group.add(cab);

    // Lift platform base
    const platformBase = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 0.3, 2),
      this.bodyGray
    );
    platformBase.position.set(0, 1.5, 0.5);
    platformBase.castShadow = true;
    group.add(platformBase);

    // Lift platform top (raised position)
    const platformTop = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.15, 1.8),
      this.bodyGray
    );
    platformTop.position.set(0, 3.5, 0.5);
    platformTop.castShadow = true;
    group.add(platformTop);

    // Hydraulic pistons (2 cylinders)
    for (const side of [-1, 1]) {
      const piston = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 2, 8),
        this.metalMat
      );
      piston.position.set(side * 1, 2.5, 0.5);
      piston.castShadow = true;
      group.add(piston);
    }

    // Cargo containers on platform
    const cargoColors = [0x336699, 0x669933, 0x996633];
    for (let i = 0; i < 3; i++) {
      const cargo = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.5, 0.5),
        new THREE.MeshStandardMaterial({ color: cargoColors[i], roughness: 0.7 })
      );
      cargo.position.set(-0.6 + i * 0.6, 3.95, 0.5);
      cargo.castShadow = true;
      group.add(cargo);
    }

    // Wheels (4)
    this.addWheels(group, 0.4, 0.3, 2.4, 3, 0.4);

    group.position.set(180, 0, 170);
    group.rotation.y = -0.5;
    scene.add(group);
  }

  // ============================================================
  //  Service Vans (2x)
  // ============================================================
  private createServiceVans(scene: THREE.Scene) {
    const positions = [
      { x: 60, z: 70, rotY: 0.8 },
      { x: 75, z: 90, rotY: -0.4 },
    ];

    for (const pos of positions) {
      const group = new THREE.Group();

      // Chassis
      const chassis = new THREE.Mesh(
        new THREE.BoxGeometry(2, 0.3, 4),
        this.bodyDark
      );
      chassis.position.y = 0.7;
      chassis.castShadow = true;
      group.add(chassis);

      // Van body (one big box)
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 2.2, 4.2),
        this.bodyWhite
      );
      body.position.y = 1.8;
      body.castShadow = true;
      body.receiveShadow = true;
      group.add(body);

      // Windshield
      const windshield = new THREE.Mesh(
        new THREE.PlaneGeometry(1.8, 0.9),
        this.glassMat
      );
      windshield.position.set(0, 2.3, 2.11);
      group.add(windshield);

      // Side windows
      for (const side of [-1, 1]) {
        const sideWin = new THREE.Mesh(
          new THREE.PlaneGeometry(1.5, 0.7),
          this.glassMat
        );
        sideWin.position.set(side * 1.11, 2.2, 0.5);
        sideWin.rotation.y = side * Math.PI / 2;
        group.add(sideWin);
      }

      // Headlights
      for (const side of [-1, 1]) {
        const hl = new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 8, 8),
          this.headlightMat
        );
        hl.position.set(side * 0.7, 1.2, 2.12);
        group.add(hl);
      }

      // Taillights
      for (const side of [-1, 1]) {
        const tl = new THREE.Mesh(
          new THREE.BoxGeometry(0.15, 0.12, 0.05),
          this.taillightMat
        );
        tl.position.set(side * 0.7, 1.2, -2.11);
        group.add(tl);
      }

      // Door handle (small cylinder on side)
      const handle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8),
        this.darkMetalMat
      );
      handle.rotation.x = Math.PI / 2;
      handle.position.set(1.12, 1.8, 0.8);
      group.add(handle);

      // Wheels (4)
      this.addWheels(group, 0.35, 0.25, 1.8, 2.8, 0.35);

      group.position.set(pos.x, 0, pos.z);
      group.rotation.y = pos.rotY;
      scene.add(group);
    }
  }

  // ============================================================
  //  Passenger Bus (1x)
  // ============================================================
  private createPassengerBus(scene: THREE.Scene) {
    const group = new THREE.Group();

    // Chassis
    const chassis = new THREE.Mesh(
      new THREE.BoxGeometry(3, 0.5, 9),
      this.bodyDark
    );
    chassis.position.y = 0.8;
    chassis.castShadow = true;
    group.add(chassis);

    // Bus body
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 3.2, 9.5),
      this.bodyWhite
    );
    body.position.y = 2.4;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Blue stripe along side
    const stripeGeo = new THREE.BoxGeometry(3.22, 0.3, 9.5);
    const stripeMesh = new THREE.Mesh(stripeGeo, new THREE.MeshStandardMaterial({ color: 0x003399, roughness: 0.5 }));
    stripeMesh.position.set(0, 2, 0);
    group.add(stripeMesh);

    // Windshield (large front glass)
    const windshield = new THREE.Mesh(
      new THREE.PlaneGeometry(2.8, 1.5),
      this.glassMat
    );
    windshield.position.set(0, 3.2, 4.76);
    group.add(windshield);

    // Side windows (row along each side)
    for (const side of [-1, 1]) {
      for (let i = 0; i < 6; i++) {
        const win = new THREE.Mesh(
          new THREE.PlaneGeometry(1.1, 0.9),
          this.glassMat
        );
        win.position.set(side * 1.61, 3, -3 + i * 1.3);
        win.rotation.y = side * Math.PI / 2;
        group.add(win);
      }
    }

    // Door (front side, thin box)
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 2.5, 1.5),
      this.glassMat
    );
    door.position.set(1.63, 2.2, 3);
    group.add(door);

    // Door frame
    const doorFrame = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 2.7, 1.7),
      this.darkMetalMat
    );
    doorFrame.position.set(1.62, 2.2, 3);
    group.add(doorFrame);

    // Headlights
    for (const side of [-1, 1]) {
      const hl = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 8, 8),
        this.headlightMat
      );
      hl.position.set(side * 1, 1.5, 4.77);
      group.add(hl);
    }

    // Taillights
    for (const side of [-1, 1]) {
      const tl = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.2, 0.05),
        this.taillightMat
      );
      tl.position.set(side * 1, 1.5, -4.76);
      group.add(tl);
    }

    // Wheels (6 – triple axle for large bus)
    this.addSixWheels(group, 0.5, 0.35, 2.8, 2, 0.5);

    group.position.set(50, 0, 40);
    group.rotation.y = 0.2;
    scene.add(group);
  }

  // ============================================================
  //  Jet Bridges (2x)
  // ============================================================
  private createJetBridges(scene: THREE.Scene) {
    const positions = [
      { x: -30, z: 85, rotY: 0 },
      { x: 30, z: 85, rotY: 0.3 },
    ];

    for (const pos of positions) {
      const group = new THREE.Group();

      // Base structure (connection to terminal)
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(3, 4, 3),
        this.bridgeMat
      );
      base.position.y = 2;
      base.castShadow = true;
      group.add(base);

      // Vertical support column
      const column = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 5, 1.5),
        this.bridgeDarkMat
      );
      column.position.set(0, 4.5, 3);
      column.castShadow = true;
      group.add(column);

      // Main horizontal arm
      const arm = new THREE.Mesh(
        new THREE.BoxGeometry(2.5, 2.5, 8),
        this.bridgeMat
      );
      arm.position.set(0, 5, 7.5);
      arm.castShadow = true;
      arm.receiveShadow = true;
      group.add(arm);

      // Arm roof
      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(2.8, 0.2, 8.2),
        this.bridgeDarkMat
      );
      roof.position.set(0, 6.3, 7.5);
      roof.castShadow = true;
      group.add(roof);

      // Glass panels on arm
      for (const side of [-1, 1]) {
        const glass = new THREE.Mesh(
          new THREE.PlaneGeometry(7, 2),
          this.glassMat
        );
        glass.position.set(side * 1.26, 5, 7.5);
        glass.rotation.y = side * Math.PI / 2;
        group.add(glass);
      }

      // End connector (wider section at aircraft end)
      const connector = new THREE.Mesh(
        new THREE.BoxGeometry(2.8, 2.8, 1),
        this.bridgeDarkMat
      );
      connector.position.set(0, 5, 11.5);
      connector.castShadow = true;
      group.add(connector);

      // Door at end
      const door = new THREE.Mesh(
        new THREE.PlaneGeometry(1.2, 2),
        this.glassMat
      );
      door.position.set(0, 5, 12.06);
      group.add(door);

      // Support struts (diagonal)
      for (const side of [-1, 1]) {
        const strut = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.08, 4, 8),
          this.metalMat
        );
        strut.rotation.x = Math.PI / 4;
        strut.position.set(side * 1, 3, 5);
        strut.castShadow = true;
        group.add(strut);
      }

      group.position.set(pos.x, 0, pos.z);
      group.rotation.y = pos.rotY;
      scene.add(group);
    }
  }

  // ============================================================
  //  Ground Signs (4x)
  // ============================================================
  private createGroundSigns(scene: THREE.Scene) {
    const positions = [
      { x: -100, z: 50, rotY: 0, text: 'A' },
      { x: -50, z: 50, rotY: 0, text: 'B' },
      { x: 150, z: 50, rotY: Math.PI, text: 'C' },
      { x: 250, z: 50, rotY: Math.PI, text: 'D' },
    ];

    for (const pos of positions) {
      const group = new THREE.Group();

      // Sign post
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 2, 8),
        this.poleMat
      );
      post.position.y = 1;
      post.castShadow = true;
      group.add(post);

      // Sign board (white background)
      const board = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 1, 0.1),
        this.signWhiteMat
      );
      board.position.y = 2.2;
      board.castShadow = true;
      group.add(board);

      // Arrow (black triangle pointing right)
      const arrowShape = new THREE.Shape();
      arrowShape.moveTo(-0.2, -0.15);
      arrowShape.lineTo(0.3, 0);
      arrowShape.lineTo(-0.2, 0.15);
      arrowShape.lineTo(-0.2, -0.15);
      const arrowGeo = new THREE.ShapeGeometry(arrowShape);
      const arrow = new THREE.Mesh(arrowGeo, this.signBlackMat);
      arrow.position.set(0, 2.2, 0.06);
      group.add(arrow);

      // Letter (black strip simulating text)
      const letter = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.3, 0.05),
        this.signBlackMat
      );
      letter.position.set(0, 2.5, 0.06);
      group.add(letter);

      group.position.set(pos.x, 0, pos.z);
      group.rotation.y = pos.rotY;
      scene.add(group);
    }
  }

  // ============================================================
  //  Light Poles (8x)
  // ============================================================
  private createLightPoles(scene: THREE.Scene) {
    // Arrange around the airport perimeter
    const positions = [
      { x: -300, z: -20 },
      { x: -150, z: -20 },
      { x: 0, z: -20 },
      { x: 150, z: -20 },
      { x: -300, z: 120 },
      { x: -150, z: 120 },
      { x: 0, z: 120 },
      { x: 150, z: 120 },
    ];

    for (const pos of positions) {
      const group = new THREE.Group();

      // Main pole
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.15, 8, 8),
        this.poleMat
      );
      pole.position.y = 4;
      pole.castShadow = true;
      group.add(pole);

      // Arm (horizontal extension)
      const arm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 2, 8),
        this.poleMat
      );
      arm.rotation.z = Math.PI / 2;
      arm.position.set(1, 8, 0);
      arm.castShadow = true;
      group.add(arm);

      // Light fixture (box at end of arm)
      const fixture = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.15, 0.4),
        this.lightFixtureMat
      );
      fixture.position.set(2, 7.9, 0);
      group.add(fixture);

      // Lens (emissive plane facing down)
      const lens = new THREE.Mesh(
        new THREE.PlaneGeometry(0.7, 0.3),
        this.lightFixtureMat
      );
      lens.rotation.x = Math.PI / 2;
      lens.position.set(2, 7.8, 0);
      group.add(lens);

      // Base plate
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.5, 0.2, 8),
        this.concreteMat
      );
      base.position.y = 0.1;
      base.castShadow = true;
      group.add(base);

      group.position.set(pos.x, 0, pos.z);
      scene.add(group);
    }
  }

  // ============================================================
  //  Barriers (6x)
  // ============================================================
  private createBarriers(scene: THREE.Scene) {
    const positions = [
      { x: -250, z: 100, rotY: 0 },
      { x: -240, z: 100, rotY: 0 },
      { x: -230, z: 100, rotY: 0 },
      { x: 100, z: 150, rotY: Math.PI / 2 },
      { x: 100, z: 160, rotY: Math.PI / 2 },
      { x: 100, z: 170, rotY: Math.PI / 2 },
    ];

    for (const pos of positions) {
      const group = new THREE.Group();

      // Barrier post (left)
      const postL = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 1, 8),
        this.stripeBlack
      );
      postL.position.set(-1.5, 0.5, 0);
      postL.castShadow = true;
      group.add(postL);

      // Barrier post (right)
      const postR = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 1, 8),
        this.stripeBlack
      );
      postR.position.set(1.5, 0.5, 0);
      postR.castShadow = true;
      group.add(postR);

      // Horizontal bar with yellow/black stripes
      const barLength = 3;
      const stripeCount = 6;
      const stripeWidth = barLength / stripeCount;
      for (let i = 0; i < stripeCount; i++) {
        const mat = i % 2 === 0 ? this.stripeYellow : this.stripeBlack;
        const stripe = new THREE.Mesh(
          new THREE.BoxGeometry(stripeWidth, 0.15, 0.12),
          mat
        );
        stripe.position.set(-barLength / 2 + stripeWidth * (i + 0.5), 0.8, 0);
        stripe.castShadow = true;
        group.add(stripe);
      }

      // Lower bar
      for (let i = 0; i < stripeCount; i++) {
        const mat = i % 2 === 0 ? this.stripeYellow : this.stripeBlack;
        const stripe = new THREE.Mesh(
          new THREE.BoxGeometry(stripeWidth, 0.1, 0.1),
          mat
        );
        stripe.position.set(-barLength / 2 + stripeWidth * (i + 0.5), 0.3, 0);
        group.add(stripe);
      }

      group.position.set(pos.x, 0, pos.z);
      group.rotation.y = pos.rotY;
      scene.add(group);
    }
  }

  // ============================================================
  //  Luggage Carts (3x)
  // ============================================================
  private createLuggageCarts(scene: THREE.Scene) {
    const positions = [
      { x: 40, z: 60, rotY: 0.5 },
      { x: 55, z: 65, rotY: 0.3 },
      { x: 70, z: 55, rotY: -0.2 },
    ];

    for (const pos of positions) {
      const group = new THREE.Group();

      // Trailer frame
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.2, 2.5),
        this.bodyDark
      );
      frame.position.y = 0.5;
      frame.castShadow = true;
      group.add(frame);

      // Side rails
      for (const side of [-1, 1]) {
        const rail = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 0.6, 2.5),
          this.metalMat
        );
        rail.position.set(side * 0.9, 0.8, 0);
        rail.castShadow = true;
        group.add(rail);
      }

      // End rails
      for (const z of [-1, 1]) {
        const rail = new THREE.Mesh(
          new THREE.BoxGeometry(1.8, 0.6, 0.08),
          this.metalMat
        );
        rail.position.set(0, 0.8, z * 1.25);
        rail.castShadow = true;
        group.add(rail);
      }

      // Luggage boxes
      const luggageCount = 4;
      for (let i = 0; i < luggageCount; i++) {
        const luggage = new THREE.Mesh(
          new THREE.BoxGeometry(0.5, 0.4, 0.4),
          this.luggageMat
        );
        luggage.position.set(-0.3 + (i % 2) * 0.6, 0.9, -0.5 + Math.floor(i / 2) * 1);
        luggage.castShadow = true;
        group.add(luggage);
      }

      // Wheels (4 small)
      this.addWheels(group, 0.15, 0.1, 1.6, 2, 0.15);

      // Tow hitch (front)
      const hitch = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8),
        this.darkMetalMat
      );
      hitch.rotation.x = Math.PI / 2;
      hitch.position.set(0, 0.5, 1.5);
      group.add(hitch);

      group.position.set(pos.x, 0, pos.z);
      group.rotation.y = pos.rotY;
      scene.add(group);
    }
  }
}