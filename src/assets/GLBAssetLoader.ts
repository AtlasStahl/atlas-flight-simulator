import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

/**
 * Läd GLB/GLTF-Assets von drei.jsassets.com mit Draco-Komprimierung.
 * Assets liegen lokal unter `public/assets/` für nullify delivery.
 */
export class GLBAssetLoader {
  private _glTFLoader: GLTFLoader;
  private _dracoLoader: DRACOLoader;
  private _cache = new Map<string, THREE.Group>();

  constructor() {
    this._dracoLoader = new DRACOLoader();
    this._dracoLoader.setDecoderPath('https://raw.githubusercontent.com/gero3/draw.gltf.delivery/main/draco/');

    this._glTFLoader = new GLTFLoader();
    this._glTFLoader.setDRACOLoader(this._dracoLoader);
  }

  /**
   * Läd eine GLB-Datei und liefert eine `THREE.Group` mit Scene-Graph.
   * @param path Relative Pfad zu `public/assets/`, z.B. `assets/trees/pine-01.glb`
   */
  async load(path: string): Promise<THREE.Group> {
    if (this._cache.has(path)) {
      return this._cache.get(path)!;
    }

    const delivery = await this._glTFLoader.loadAsync(path);
    const group = delivery.scene as THREE.Group;

    // Nullify Scale (three.jsassets.com uses meters, Three.js uses units)
    group.scale.setScalar(1);

    // Enable shadows on all meshes
    group.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    this._cache.set(path, group);
    return group;
  }

  /**
   * Läd multiple Assets parallel und liefert ein Array von Groups.
   */
  async loadMultiple(paths: string[]): Promise<THREE.Group[]> {
    const promises = paths.map(p => this.load(p));
    return Promise.all(promises);
  }

  /**
   * Liefert eine cloned Instanz eines geladenen Assets für InstancedMesh.
   */
  cloneModel(path: string): THREE.Group {
    const original = this._cache.get(path);
    if (!original) throw new Error(`Asset not loaded: ${path}`);
    return original.clone() as THREE.Group;
  }
}