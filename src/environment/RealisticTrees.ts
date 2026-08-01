import * as THREE from 'three';

// ============================================================
//  Realistic Trees – detailed procedural vegetation
// ============================================================

/**
 * Creates detailed, realistic tree models using Three.js procedural geometry
 * and InstancedMesh for performance. Supports pine trees, deciduous trees,
 * bushes, and grass patches.
 */
export class RealisticTrees {
  // Pine tree meshes
  private _pineTrunk: THREE.InstancedMesh | null = null;
  private _pineCanopy1: THREE.InstancedMesh | null = null;
  private _pineCanopy2: THREE.InstancedMesh | null = null;
  private _pineCanopy3: THREE.InstancedMesh | null = null;

  // Deciduous tree meshes
  private _decTrunk: THREE.InstancedMesh | null = null;
  private _decCanopy: THREE.InstancedMesh | null = null;

  // Bush meshes
  private _bush1: THREE.InstancedMesh | null = null;
  private _bush2: THREE.InstancedMesh | null = null;
  private _bush3: THREE.InstancedMesh | null = null;

  // Grass patches
  private _grassPatches: THREE.InstancedMesh | null = null;

  // Track all scene children for cleanup
  private _children: THREE.Object3D[] = [];

  // Height callback from terrain
  private _getHeight: (x: number, z: number) => number;

  // Airport exclusion zone bounds
  private _airportHalfX: number;
  private _airportHalfZ: number;

  constructor(
    getHeight: (x: number, z: number) => number,
    airportHalfX: number = 1000,
    airportHalfZ: number = 200
  ) {
    this._getHeight = getHeight;
    this._airportHalfX = airportHalfX;
    this._airportHalfZ = airportHalfZ;
  }

  /**
   * Create all vegetation and add to scene
   */
  createVegetation(scene: THREE.Scene, terrainSize: number): void {
    this.createPineTrees(scene, terrainSize);
    this.createDeciduousTrees(scene, terrainSize);
    this.createBushes(scene, terrainSize);
    this.createGrassPatches(scene, terrainSize);
  }

  // ----------------------------------------------------------
  //  Pine trees – tapered trunk + 3 cone canopy layers
  // ----------------------------------------------------------
  private createPineTrees(scene: THREE.Scene, terrainSize: number): void {
    const maxCount = 1000;

    // Trunk: tapered cylinder (bottom r=0.35, top r=0.12, height=5.5)
    const trunkGeo = new THREE.CylinderGeometry(0.12, 0.35, 5.5, 8);
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x4a3520,
      roughness: 0.95,
      metalness: 0.0,
    });

    // Canopy layers: 3 cones with decreasing radius
    const canopy1Geo = new THREE.ConeGeometry(2.8, 3.5, 8);
    const canopy2Geo = new THREE.ConeGeometry(2.2, 3.0, 8);
    const canopy3Geo = new THREE.ConeGeometry(1.4, 2.5, 8);

    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x1a5c1a,
      roughness: 0.9,
      metalness: 0.0,
    });

    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, maxCount);
    const canopy1 = new THREE.InstancedMesh(canopy1Geo, canopyMat, maxCount);
    const canopy2 = new THREE.InstancedMesh(canopy2Geo, canopyMat, maxCount);
    const canopy3 = new THREE.InstancedMesh(canopy3Geo, canopyMat, maxCount);

    const dummy = new THREE.Object3D();
    let idx = 0;

    for (let i = 0; i < maxCount * 3 && idx < maxCount; i++) {
      const x = (Math.random() - 0.5) * terrainSize;
      const z = (Math.random() - 0.5) * terrainSize;

      if (this._inAirportZone(x, z, 150)) continue;

      const h = this._getHeight(x, z);
      // Pines on hills and mountains (15-350m) - ensure not floating in air
      if (h < 15 || h > 350) continue;
      // Ensure tree won't appear to float - check that terrain is solid at this height
      if (h > 200) continue; // Don't place on steep mountains where they'd look floating

      const scale = 1.5 + Math.random() * 1.2; // Increased from 0.7-1.3 to 1.5-2.7 for better visibility
      const rotation = Math.random() * Math.PI * 2;

      // Trunk positioned at terrain surface (base of trunk at y=h)
      // Cylinder center is at half height, so y = h + (5.5/2)*scale = h + 2.75*scale
      dummy.position.set(x, h + 2.75 * scale, z);
      dummy.scale.set(scale, scale, scale);
      dummy.rotation.set(0, rotation, 0);
      dummy.updateMatrix();
      trunks.setMatrixAt(idx, dummy.matrix);

      // Canopy layer 1 (bottom, widest) - sits on top of trunk
      // Trunk top is at h + 5.5*scale, canopy1 center is at h + 5.5*scale + 1.75*scale
      dummy.position.set(x, h + 5.5 * scale + 1.75 * scale, z);
      dummy.updateMatrix();
      canopy1.setMatrixAt(idx, dummy.matrix);

      // Canopy layer 2 (middle)
      dummy.position.set(x, h + 5.5 * scale + 3.5 * scale + 1.5 * scale, z);
      dummy.updateMatrix();
      canopy2.setMatrixAt(idx, dummy.matrix);

      // Canopy layer 3 (top, narrowest)
      dummy.position.set(x, h + 5.5 * scale + 5.5 * scale + 1.25 * scale, z);
      dummy.updateMatrix();
      canopy3.setMatrixAt(idx, dummy.matrix);

      idx++;
    }

    // Set actual counts
    trunks.count = idx;
    canopy1.count = idx;
    canopy2.count = idx;
    canopy3.count = idx;

    // Enable shadows
    trunks.castShadow = true;
    trunks.receiveShadow = true;
    canopy1.castShadow = true;
    canopy2.castShadow = true;
    canopy3.castShadow = true;

    scene.add(trunks);
    scene.add(canopy1);
    scene.add(canopy2);
    scene.add(canopy3);
    this._children.push(trunks, canopy1, canopy2, canopy3);

    this._pineTrunk = trunks;
    this._pineCanopy1 = canopy1;
    this._pineCanopy2 = canopy2;
    this._pineCanopy3 = canopy3;
  }

  // ----------------------------------------------------------
  //  Deciduous trees – curved trunk + multi-sphere canopy
  // ----------------------------------------------------------
  private createDeciduousTrees(scene: THREE.Scene, terrainSize: number): void {
    const maxCount = 800;

    // Trunk: slightly tapered cylinder
    const trunkGeo = new THREE.CylinderGeometry(0.15, 0.4, 5, 8);
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x5c3a1e,
      roughness: 0.9,
      metalness: 0.0,
    });

    // Canopy: sphere geometry for organic overlapping clusters
    const canopyGeo = new THREE.SphereGeometry(1, 8, 8);
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x3a8c3f,
      roughness: 0.9,
      metalness: 0.0,
    });

    // 4 sphere instances per tree for organic canopy shape
    const spheresPerTree = 4;
    const trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, maxCount);
    const canopyMesh = new THREE.InstancedMesh(canopyGeo, canopyMat, maxCount * spheresPerTree);

    const dummy = new THREE.Object3D();
    let idx = 0;

    // Canopy sphere offsets for organic shape (relative positions and scales)
    const sphereConfigs = [
      { ox: 0, oz: 0, oy: 0, s: 1.0 },       // Center sphere (largest)
      { ox: 0.8, oz: 0.5, oy: -0.3, s: 0.75 }, // Right-front
      { ox: -0.7, oz: -0.6, oy: -0.2, s: 0.7 }, // Left-back
      { ox: 0.3, oz: -0.9, oy: 0.2, s: 0.65 },  // Back
    ];

    for (let i = 0; i < maxCount * 2 && idx < maxCount; i++) {
      const x = (Math.random() - 0.5) * terrainSize;
      const z = (Math.random() - 0.5) * terrainSize;

      if (this._inAirportZone(x, z, 120)) continue;

      const h = this._getHeight(x, z);
      // Deciduous trees at lower-mid elevations (5-150m) - ensure not floating
      if (h < 5 || h > 150) continue;
      // Keep away from steep terrain
      if (h > 100) continue;

      const scale = 1.5 + Math.random() * 1.2; // Increased from 0.7-1.3 to 1.5-2.7 for better visibility
      const rotation = Math.random() * Math.PI * 2;

      // Trunk with slight lean - base at terrain surface
      dummy.position.set(x, h + 2.5 * scale, z);
      dummy.scale.set(scale, scale, scale);
      dummy.rotation.set(
        (Math.random() - 0.5) * 0.1, // Slight forward/back lean
        rotation,
        (Math.random() - 0.5) * 0.1  // Slight side lean
      );
      dummy.updateMatrix();
      trunkMesh.setMatrixAt(idx, dummy.matrix);

      // Canopy spheres - start at top of trunk (h + 5*scale)
      const canopyBaseY = h + 5 * scale;
      for (let s = 0; s < spheresPerTree; s++) {
        const cfg = sphereConfigs[s];
        const sphereScale = scale * cfg.s * (0.85 + Math.random() * 0.3);

        dummy.position.set(
          x + cfg.ox * scale,
          canopyBaseY + cfg.oy * scale,
          z + cfg.oz * scale
        );
        dummy.scale.set(sphereScale, sphereScale * 0.85, sphereScale);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        canopyMesh.setMatrixAt(idx * spheresPerTree + s, dummy.matrix);
      }

      idx++;
    }

    // Set actual counts
    trunkMesh.count = idx;
    canopyMesh.count = idx * spheresPerTree;

    // No instanceColor needed - material color is used directly

    // Enable shadows
    trunkMesh.castShadow = true;
    trunkMesh.receiveShadow = true;
    canopyMesh.castShadow = true;

    scene.add(trunkMesh);
    scene.add(canopyMesh);
    this._children.push(trunkMesh, canopyMesh);

    this._decTrunk = trunkMesh;
    this._decCanopy = canopyMesh;
  }

  // ----------------------------------------------------------
  //  Bushes – cluster of 3 sphere layers
  // ----------------------------------------------------------
  private createBushes(scene: THREE.Scene, terrainSize: number): void {
    const maxCount = 500;

    // 3 sphere sizes for bush cluster
    const bush1Geo = new THREE.SphereGeometry(1.0, 7, 7);
    const bush2Geo = new THREE.SphereGeometry(0.7, 6, 6);
    const bush3Geo = new THREE.SphereGeometry(0.5, 5, 5);

    const bushMat = new THREE.MeshStandardMaterial({
      color: 0x2d6b2d,
      roughness: 0.9,
      metalness: 0.0,
    });

    const bush1 = new THREE.InstancedMesh(bush1Geo, bushMat, maxCount);
    const bush2 = new THREE.InstancedMesh(bush2Geo, bushMat, maxCount);
    const bush3 = new THREE.InstancedMesh(bush3Geo, bushMat, maxCount);

    const dummy = new THREE.Object3D();
    let idx = 0;

    for (let i = 0; i < maxCount * 2 && idx < maxCount; i++) {
      const x = (Math.random() - 0.5) * terrainSize;
      const z = (Math.random() - 0.5) * terrainSize;

      if (this._inAirportZone(x, z, 80)) continue;

      const h = this._getHeight(x, z);
      // Bushes at low-mid elevations (2-80m) - keep them grounded
      if (h < 2 || h > 80) continue;

      const scale = 1.2 + Math.random() * 1.5; // Increased from 0.5-1.3 to 1.2-2.7 for better visibility

      // Main bush sphere
      dummy.position.set(x, h + 0.7 * scale, z);
      dummy.scale.set(scale, scale * 0.7, scale);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      bush1.setMatrixAt(idx, dummy.matrix);

      // Offset sphere 1
      dummy.position.set(x + 0.6 * scale, h + 0.5 * scale, z + 0.3 * scale);
      dummy.scale.set(scale * 0.7, scale * 0.5, scale * 0.7);
      dummy.updateMatrix();
      bush2.setMatrixAt(idx, dummy.matrix);

      // Offset sphere 2
      dummy.position.set(x - 0.5 * scale, h + 0.4 * scale, z - 0.5 * scale);
      dummy.scale.set(scale * 0.5, scale * 0.4, scale * 0.5);
      dummy.updateMatrix();
      bush3.setMatrixAt(idx, dummy.matrix);

      idx++;
    }

    // Set actual counts FIRST
    bush1.count = idx;
    bush2.count = idx;
    bush3.count = idx;

    // No instanceColor needed - material color is used directly

    bush1.castShadow = true;
    bush2.castShadow = true;
    bush3.castShadow = true;

    scene.add(bush1);
    scene.add(bush2);
    scene.add(bush3);
    this._children.push(bush1, bush2, bush3);

    this._bush1 = bush1;
    this._bush2 = bush2;
    this._bush3 = bush3;
  }

  // ----------------------------------------------------------
  //  Grass patches – scattered circle geometries
  // ----------------------------------------------------------
  private createGrassPatches(scene: THREE.Scene, terrainSize: number): void {
    const maxCount = 120;
    const patchGeo = new THREE.CircleGeometry(1, 8);
    const patchMat = new THREE.MeshStandardMaterial({
      color: 0x4a8c3f,
      roughness: 0.9,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });

    const patches = new THREE.InstancedMesh(patchGeo, patchMat, maxCount);

    const dummy = new THREE.Object3D();
    let idx = 0;

    for (let i = 0; i < maxCount * 3 && idx < maxCount; i++) {
      const x = (Math.random() - 0.5) * terrainSize;
      const z = (Math.random() - 0.5) * terrainSize;

      if (this._inAirportZone(x, z, 80)) continue;

      const h = this._getHeight(x, z);
      // Grass on low-mid terrain (3-80m)
      if (h < 3 || h > 80) continue;

      const size = 8 + Math.random() * 18;

      dummy.position.set(x, h + 0.15, z);
      dummy.scale.set(size, size, size);
      dummy.rotation.set(-Math.PI / 2, Math.random() * Math.PI, 0);
      dummy.updateMatrix();
      patches.setMatrixAt(idx, dummy.matrix);

      idx++;
    }

    patches.count = idx;
    patches.receiveShadow = true;

    scene.add(patches);
    this._children.push(patches);
    this._grassPatches = patches;
  }

  // ----------------------------------------------------------
  //  Cleanup – dispose all geometries and materials
  // ----------------------------------------------------------
  dispose(): void {
    const meshes = [
      this._pineTrunk,
      this._pineCanopy1,
      this._pineCanopy2,
      this._pineCanopy3,
      this._decTrunk,
      this._decCanopy,
      this._bush1,
      this._bush2,
      this._bush3,
      this._grassPatches,
    ];

    for (const mesh of meshes) {
      if (!mesh) continue;
      mesh.geometry.dispose();
      if (mesh.material && !(mesh.material instanceof Array)) {
        (mesh.material as THREE.Material).dispose();
      }
    }

    // Remove from parent scene
    for (const child of this._children) {
      if (child.parent) {
        child.parent.remove(child);
      }
    }
    this._children.length = 0;
  }

  // ----------------------------------------------------------
  //  Helpers
  // ----------------------------------------------------------

  /** Check if position is within airport exclusion zone */
  private _inAirportZone(
    x: number,
    z: number,
    buffer: number = 0
  ): boolean {
    // Much larger exclusion zone to prevent trees from appearing near flight paths
    const exclusionX = this._airportHalfX + 400 + buffer; // Increased from 150 to 550+
    const exclusionZ = this._airportHalfZ + 300 + buffer; // Increased from 200 to 500+
    return (
      Math.abs(x) < exclusionX &&
      Math.abs(z) < exclusionZ
    );
  }

  /** Return a slightly varied THREE.Color from base RGB */
  private _varyColor(
    r: number,
    g: number,
    b: number,
    variance: number
  ): THREE.Color {
    return new THREE.Color(
      Math.max(0, Math.min(1, r + (Math.random() - 0.5) * variance)),
      Math.max(0, Math.min(1, g + (Math.random() - 0.5) * variance)),
      Math.max(0, Math.min(1, b + (Math.random() - 0.5) * variance))
    );
  }
}