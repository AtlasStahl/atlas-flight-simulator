import * as THREE from 'three';

/** Ring obstacle that the aircraft must fly through */
export class RingObstacle {
  private _mesh: THREE.Mesh;
  private _position: THREE.Vector3;
  private _radius: number;
  private _passed: boolean = false;

  constructor(scene: THREE.Scene, position: THREE.Vector3, radius: number, rotationY: number = 0) {
    this._position = position;
    this._radius = radius;

    // Create ring using TorusGeometry
    const geometry = new THREE.TorusGeometry(radius, 1.5, 8, 32);
    const material = new THREE.MeshStandardMaterial({
      color: 0x00ff00, // Green initially
      emissive: 0x00ff00,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.8
    });

    this._mesh = new THREE.Mesh(geometry, material);
    this._mesh.position.copy(position);
    this._mesh.rotation.y = rotationY;
    scene.add(this._mesh);
  }

  get mesh(): THREE.Mesh { return this._mesh; }
  get position(): THREE.Vector3 { return this._position; }
  get radius(): number { return this._radius; }
  get passed(): boolean { return this._passed; }
  set passed(value: boolean) { this._passed = value; }

  /** Dispose ring resources and remove from scene */
  dispose(scene: THREE.Scene): void {
    scene.remove(this._mesh);
    this._mesh.geometry?.dispose();
    if (Array.isArray(this._mesh.material)) {
      this._mesh.material.forEach(m => m.dispose());
    } else {
      this._mesh.material?.dispose();
    }
  }

  // Check if aircraft has flown through this ring
  checkPass(aircraftPosition: THREE.Vector3, aircraftRadius: number = 3): boolean {
    if (this._passed) return false;

    // Calculate distance from ring center
    const dist = this._position.distanceTo(aircraftPosition);

    // Check if within ring radius (with tolerance for aircraft size)
    // The aircraft passes if its center is within (ringRadius + aircraftRadius)
    const passThreshold = this._radius + aircraftRadius;
    if (dist < passThreshold) {
      this._passed = true;
      // Change color to indicate passed
      (this._mesh.material as THREE.MeshStandardMaterial).color.set(0xffff00);
      (this._mesh.material as THREE.MeshStandardMaterial).emissive.set(0xffff00);
      return true;
    }
    return false;
  }
}