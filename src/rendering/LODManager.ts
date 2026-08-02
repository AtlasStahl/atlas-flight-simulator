import * as THREE from 'three';

/**
 * Simple LOD (Level of Detail) manager for Three.js objects.
 * Switches between detail levels based on camera distance.
 */
export class LODManager {
  private _lodGroups: THREE.LOD[] = [];

  /**
   * Create an LOD-managed object with multiple detail levels.
   * @param highDetail High-detail mesh (close range)
   * @param mediumDetail Medium-detail mesh (mid range)
   * @param lowDetail Low-detail mesh (far range)
   * @param nearDistance Distance threshold for high→medium
   * @param farDistance Distance threshold for medium→low
   */
  createLOD(
    highDetail: THREE.Object3D,
    mediumDetail: THREE.Object3D,
    lowDetail: THREE.Object3D,
    nearDistance: number = 50,
    farDistance: number = 200
  ): THREE.LOD {
    const lod = new THREE.LOD();
    lod.addLevel(highDetail, 0);
    lod.addLevel(mediumDetail, nearDistance);
    lod.addLevel(lowDetail, farDistance);
    this._lodGroups.push(lod);
    return lod;
  }

  /**
   * Update all LOD objects based on camera position.
   * @param camera The camera to use for distance calculations
   */
  update(camera: THREE.Camera): void {
    for (const lod of this._lodGroups) {
      lod.update(camera);
    }
  }

  /**
   * Remove an LOD group from management.
   */
  remove(lod: THREE.LOD): void {
    const idx = this._lodGroups.indexOf(lod);
    if (idx >= 0) this._lodGroups.splice(idx, 1);
  }

  /**
   * Dispose all LOD groups and their geometries/materials.
   */
  disposeAll(): void {
    for (const lod of this._lodGroups) {
      for (const level of lod.levels) {
        const obj = level.object;
        obj.traverse((child: THREE.Object3D) => {
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
    }
    this._lodGroups = [];
  }
}

/**
 * Create simplified geometry for LOD purposes.
 */
export function createLowDetailTree(): THREE.Group {
  const group = new THREE.Group();

  // Simple trunk
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.3, 5, 6),
    new THREE.MeshStandardMaterial({ color: 0x4a3520 })
  );
  group.add(trunk);

  // Single cone canopy
  const canopy = new THREE.Mesh(
    new THREE.ConeGeometry(2.5, 5, 6),
    new THREE.MeshStandardMaterial({ color: 0x1a5c1a })
  );
  canopy.position.y = 3;
  group.add(canopy);

  return group;
}

/**
 * Create ultra-low detail billboard for distant trees.
 */
export function createBillboardTree(): THREE.Group {
  const group = new THREE.Group();

  // Simple flat plane as billboard
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(3, 6),
    new THREE.MeshStandardMaterial({
      color: 0x1a5c1a,
      side: THREE.DoubleSide,
    })
  );
  plane.position.y = 3;
  group.add(plane);

  return group;
}