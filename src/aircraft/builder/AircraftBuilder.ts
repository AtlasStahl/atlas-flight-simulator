import * as THREE from 'three';

/** Aircraft model builder interface */
export interface AircraftBuilder {
  build(group: THREE.Group, scale: number): void;
}

/** Base builder with common material helpers */
export abstract class BaseAircraftBuilder implements AircraftBuilder {
  protected createBodyMaterial(color: number) {
    return new THREE.MeshStandardMaterial({
      color,
      metalness: 0.25,
      roughness: 0.45,
    });
  }

  protected createGlassMaterial() {
    return new THREE.MeshStandardMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.4,
      metalness: 0.05,
      roughness: 0.05,
    });
  }

  protected createMetalMaterial() {
    return new THREE.MeshStandardMaterial({
      color: 0xaaaaaa,
      metalness: 0.9,
      roughness: 0.15,
    });
  }

  protected createTireMaterial() {
    return new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.95,
      metalness: 0.0,
    });
  }

  abstract build(group: THREE.Group, scale: number): void;
}