import * as THREE from 'three';

/** Chase camera that follows the aircraft with smoothing */
export class ChaseCamera {
  private _camera: THREE.PerspectiveCamera;
  private _targetOffset = new THREE.Vector3();
  private _currentOffset = new THREE.Vector3();
  private _lookAtTarget = new THREE.Vector3();

  constructor(camera: THREE.PerspectiveCamera) {
    this._camera = camera;
  }

  get camera(): THREE.PerspectiveCamera {
    return this._camera;
  }

  update(aircraftPosition: THREE.Vector3, aircraftRotation: THREE.Euler, dt: number) {
    // Camera close behind and above the aircraft - much closer for visibility
    const chaseDistance = 12;
    const chaseHeight = 4;

    // Transform offset by aircraft rotation
    const offset = new THREE.Vector3(-chaseDistance, chaseHeight, 0);
    offset.applyEuler(aircraftRotation);

    this._targetOffset.copy(offset);
    this._currentOffset.lerp(this._targetOffset, 5 * dt);

    // Camera position - clamp to stay above ground
    this._camera.position.copy(aircraftPosition).add(this._currentOffset);
    this._camera.position.y = Math.max(this._camera.position.y, 2);

    // Look directly at the aircraft
    this._lookAtTarget.copy(aircraftPosition);

    this._camera.lookAt(this._lookAtTarget);
  }
}