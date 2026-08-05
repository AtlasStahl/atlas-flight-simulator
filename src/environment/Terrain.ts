import * as THREE from 'three';
import { RealisticTrees } from './RealisticTrees';
import { AirportBuildings } from './AirportBuildings';
import { AirportVehicles } from './AirportVehicles';
import { worldRandom } from '../core/Random';
import {
  AIRPORT_HALF_X,
  AIRPORT_HALF_Z,
  AIRPORT_BLEND_WIDTH,
  AIRPORT_COLOR_HALF_X,
  AIRPORT_COLOR_HALF_Z,
  APRON_X1,
  APRON_X2,
  APRON_Z1,
  APRON_Z2,
} from './AirportLayout';

/**
 * See: Becken im Höhenfeld, damit die Wasserfläche in einer Mulde liegt statt auf einem Hang.
 * Der Wasserspiegel liegt unter der Mindesthöhe für Bewuchs (0.5 m), deshalb wächst nichts
 * unter Wasser. Das Ufer liegt LAKE_BANK_HEIGHT über dem Spiegel, damit der See nicht ausläuft.
 */
const LAKE_X = 300;
const LAKE_Z = -1400;
/** Radius der gerenderten Wasserfläche */
const LAKE_WATER_RADIUS = 250;
/**
 * Radius, bei dem das Beckenprofil den Wasserspiegel schneidet. Liegt bewusst deutlich
 * weiter außen als die Wasserfläche — sonst liegt der Seegrund am Rand so dicht unter der
 * Oberfläche, dass Wellentäler und Terrain-Dreiecke durch das Wasser stechen.
 */
const LAKE_SHORE_RADIUS = 310;
/** Radius des Uferwalls */
const LAKE_BASIN_RADIUS = 380;
const LAKE_WATER_LEVEL = 0.4;
const LAKE_DEPTH = 9;
const LAKE_BANK_HEIGHT = 2.5;
/** Breite des Übergangs vom Uferwall ins umgebende Terrain */
const LAKE_BLEND_WIDTH = 160;

// ============================================================
//  Simplex Noise – compact 2D implementation
// ============================================================
class SimplexNoise {
  private _perm = new Uint8Array(512);
  private _grad3: [number, number][];

  constructor(seed: number = 0) {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    // Seed-based shuffle
    let s = seed;
    for (let i = 255; i > 0; i--) {
      s = (s * 16807 + 0) % 2147483647;
      const j = s % (i + 1);
      [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < 512; i++) this._perm[i] = p[i & 255];
    this._grad3 = [
      [1, 1], [-1, 1], [1, -1], [-1, -1],
      [1, 0], [-1, 0], [0, 1], [0, -1],
    ];
  }

  noise2D(x: number, z: number): number {
    const F2 = 0.5 * (Math.sqrt(3) - 1);
    const G2 = (3 - Math.sqrt(3)) / 6;
    const s = (x + z) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(z + s);
    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = x - X0;
    const y0 = z - Y0;
    const i1 = x0 > y0 ? 1 : 0;
    const j1 = x0 > y0 ? 0 : 1;
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;
    const ii = i & 255;
    const jj = j & 255;
    const contrib = (ux: number, uy: number, ix: number, iy: number): number => {
      let t0 = 0.5 - ux * ux - uy * uy;
      if (t0 < 0) return 0;
      t0 *= t0;
      const g = this._grad3[(this._perm[ix + iy] & 7)];
      return t0 * t0 * (g[0] * ux + g[1] * uy);
    };
    return 70 * (
      contrib(x0, y0, ii, jj) +
      contrib(x1, y1, ii + i1, jj + j1) +
      contrib(x2, y2, ii + 1, jj + 1)
    );
  }

  // Fractal noise with multiple octaves
  octaveNoise(x: number, z: number, octaves: number, lacunarity: number = 2, gain: number = 0.5): number {
    let total = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxVal = 0;
    for (let i = 0; i < octaves; i++) {
      total += this.noise2D(x * frequency, z * frequency) * amplitude;
      maxVal += amplitude;
      amplitude *= gain;
      frequency *= lacunarity;
    }
    return total / maxVal;
  }
}

// ============================================================
//  Terrain class
// ============================================================
/** Terrain with heightmap, airport, mountains, water, vegetation, infrastructure */
export class Terrain {
  private _waterGroup = new THREE.Group();
  private _noise = new SimplexNoise(42);

  // Heightmap parameters
  private readonly _terrainSize = 4000;       // world units
  private readonly _segments = 200;
  // PHY-15: _airportX/_airportZ entfernt — AirportLayout.ts ist die einzige Quelle

  constructor(scene: THREE.Scene) {
    // createSky() removed — Atmosphere owns the sky sphere (REN-01 fix)
    this.createHeightmapTerrain(scene);
    this.createWater(scene);
    new AirportBuildings().createBuildings(scene);
    new AirportVehicles().createVehicles(scene);
    this.createVegetation(scene);
    this.createInfrastructure(scene);
    // Clouds are now managed by WeatherSystem - removed duplicate cloud system
  }

  // ----------------------------------------------------------
  //  Heightmap helpers
  // ----------------------------------------------------------
  /** Get terrain height at world (x, z) — PHY-13: stetig, kein Caching, keine Allokation */
  getHeight(x: number, z: number): number {
    // PHY-14: Außerhalb des Meshes (±_terrainSize/2) keine Höhe liefern — Ozeanebene 0
    const half = this._terrainSize / 2;
    if (x < -half || x > half || z < -half || z > half) {
      return 0;
    }
    return this._rawHeight(x, z);
  }

  private _rawHeight(x: number, z: number): number {
    // PHY-15: Zentrale Konstanten aus AirportLayout.ts
    const airportHalfX = AIRPORT_HALF_X;
    const airportHalfZ = AIRPORT_HALF_Z;
    const blendWidth = AIRPORT_BLEND_WIDTH;

    const distX = Math.abs(x);
    const distZ = Math.abs(z);

    // Inside airport: perfectly flat
    if (distX < airportHalfX && distZ < airportHalfZ) {
      return 0;
    }

    // Blend zone: smooth transition from flat to terrain
    let blendX = 0;
    let blendZ = 0;
    if (distX >= airportHalfX && distX < airportHalfX + blendWidth) {
      blendX = (distX - airportHalfX) / blendWidth;
      blendX = smoothstep(blendX);
    } else if (distX >= airportHalfX + blendWidth) {
      blendX = 1;
    }
    if (distZ >= airportHalfZ && distZ < airportHalfZ + blendWidth) {
      blendZ = (distZ - airportHalfZ) / blendWidth;
      blendZ = smoothstep(blendZ);
    } else if (distZ >= airportHalfZ + blendWidth) {
      blendZ = 1;
    }

    const blendFactor = Math.max(blendX, blendZ);

    // Outside airport: full terrain
    if (blendFactor >= 1) {
      return this._lakeBasin(x, z, this._mountainHeight(x, z));
    }

    // Blend zone: mix between flat and terrain
    const terrainH = this._mountainHeight(x, z);
    return terrainH * blendFactor;
  }

  /** Senkt das Terrain im Seebereich zu einer Mulde ab; außerhalb unverändert. */
  private _lakeBasin(x: number, z: number, height: number): number {
    const dist = this._distanceToLake(x, z);
    if (dist >= LAKE_BASIN_RADIUS + LAKE_BLEND_WIDTH) return height;

    const rimHeight = LAKE_WATER_LEVEL + LAKE_BANK_HEIGHT;

    if (dist < LAKE_SHORE_RADIUS) {
      // Beckenboden: tiefste Stelle in der Mitte, an der Wasserlinie auf Spiegelhöhe
      const bottom = LAKE_WATER_LEVEL - LAKE_DEPTH;
      return bottom + (LAKE_WATER_LEVEL - bottom) * smoothstep(dist / LAKE_SHORE_RADIUS);
    }
    if (dist < LAKE_BASIN_RADIUS) {
      // Ufer: von der Wasserlinie auf den Uferwall
      const t = smoothstep((dist - LAKE_SHORE_RADIUS) / (LAKE_BASIN_RADIUS - LAKE_SHORE_RADIUS));
      return LAKE_WATER_LEVEL + (rimHeight - LAKE_WATER_LEVEL) * t;
    }
    // Übergang vom Uferwall zurück auf das umgebende Terrain
    const t = smoothstep((dist - LAKE_BASIN_RADIUS) / LAKE_BLEND_WIDTH);
    return rimHeight * (1 - t) + height * t;
  }

  /** Position und Ausdehnung der Wasserfläche — Quelle für DynamicWater */
  get lake(): { x: number; z: number; waterLevel: number; radius: number } {
    return { x: LAKE_X, z: LAKE_Z, waterLevel: LAKE_WATER_LEVEL, radius: LAKE_WATER_RADIUS };
  }

  private _distanceToLake(x: number, z: number): number {
    const dx = x - LAKE_X;
    const dz = z - LAKE_Z;
    return Math.sqrt(dx * dx + dz * dz);
  }

  private _mountainHeight(x: number, z: number): number {
    const scale = 0.001;
    // Multi-octave noise for varied terrain
    const n1 = this._noise.octaveNoise(x * scale, z * scale, 5, 2.0, 0.5);
    // Ridge noise for sharp mountain peaks
    const n2 = Math.abs(this._noise.octaveNoise((x + 500) * scale * 1.5, (z + 500) * scale * 1.5, 4, 2.2, 0.45));
    // Valley noise - lower areas
    const n3 = this._noise.octaveNoise((x + 1000) * scale * 0.5, (z + 1000) * scale * 0.5, 3, 1.8, 0.5);

    const combined = n1 * 0.3 + n2 * n2 * 0.5 + n3 * 0.2;

    // Map to height range: 0 to ~300m max
    const height = Math.max(0, combined * 300);

    // Flatten low areas (valleys)
    if (height < 5) {
      return height * 0.3;
    }

    return height;
  }

  // ----------------------------------------------------------
  //  Heightmap terrain with vertex colors
  // ----------------------------------------------------------
  private createHeightmapTerrain(scene: THREE.Scene) {
    const geo = new THREE.PlaneGeometry(
      this._terrainSize, this._terrainSize,
      this._segments, this._segments
    );
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    for (let i = 0; i < pos.count; i++) {
      // Das Mesh wird über rotation.x = -PI/2 gekippt: lokales +Y wird zu Welt -Z.
      // Ohne die Negierung liegt das gerenderte Gelände gespiegelt zur Höhenabfrage.
      const vx = pos.getX(i);
      const vz = -pos.getY(i);
      const h = this._rawHeight(vx, vz);
      pos.setZ(i, h);

      // Vertex color based on height + noise
      const color = this._getTerrainColor(vx, vz, h);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geo.computeVertexNormals();
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
      metalness: 0.0,
      flatShading: false,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    // Terrain receives shadows but doesn't cast them (flat ground self-shadowing adds acne/cost)
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    scene.add(mesh);
  }

  private _getTerrainColor(x: number, z: number, h: number): THREE.Color {
    const moisture = this._noise.noise2D(x * 0.002, z * 0.002) * 0.5 + 0.5;
    const detail = this._noise.noise2D(x * 0.01, z * 0.01) * 0.1;

    // Color zones by height - more vibrant colors
    const c = new THREE.Color();

    // Seegrund: dunkler Schlick statt Wiese, damit nichts Grünes durchs Wasser schimmert
    if (h < LAKE_WATER_LEVEL && this._distanceToLake(x, z) < LAKE_SHORE_RADIUS) {
      const depth = Math.min(1, (LAKE_WATER_LEVEL - h) / LAKE_DEPTH);
      c.setRGB(0.16 - depth * 0.09, 0.20 - depth * 0.10, 0.19 - depth * 0.08);
      return c;
    }

    if (h < 2) {
      // Low-lying / wetland – dark green or sand
      if (moisture > 0.5) {
        c.setRGB(0.20 + detail, 0.35 + detail, 0.12); // Rich wetland green
      } else {
        c.setRGB(0.70 + detail, 0.63 + detail, 0.45); // Warm sand
      }
    } else if (h < 40) {
      // Grass / fields - vibrant green
      const green = 0.40 + moisture * 0.20 + detail;
      c.setRGB(0.22 + detail, green, 0.12 + detail);
    } else if (h < 100) {
      // Forest / dark green - deeper greens
      c.setRGB(0.12 + detail, 0.35 + moisture * 0.10, 0.08);
    } else if (h < 200) {
      // Mountain slope – brown/green mix
      const t = (h - 100) / 100;
      c.lerpColors(
        new THREE.Color(0.12, 0.35, 0.08),
        new THREE.Color(0.42, 0.32, 0.22),
        t
      );
    } else if (h < 300) {
      // Rock - lighter gray-brown
      const t = (h - 200) / 100;
      c.lerpColors(
        new THREE.Color(0.42, 0.32, 0.22),
        new THREE.Color(0.55, 0.52, 0.48),
        t
      );
    } else if (h < 400) {
      // Snow transition
      const t = (h - 300) / 100;
      c.lerpColors(
        new THREE.Color(0.45, 0.42, 0.38),
        new THREE.Color(0.85, 0.85, 0.88),
        t
      );
    } else {
      // Snow cap
      c.setRGB(0.90 + detail, 0.90 + detail, 0.92);
    }

    // Flughafengelände: gemähtes Grün wie auf einem echten Flugplatz; asphaltiert ist nur
    // das Vorfeld. Bahn und Rollwege sind eigene Meshes und liegen darüber. (PHY-15)
    if (Math.abs(x) < AIRPORT_COLOR_HALF_X && Math.abs(z) < AIRPORT_COLOR_HALF_Z) {
      const onApron = x > APRON_X1 && x < APRON_X2 && z > APRON_Z1 && z < APRON_Z2;
      if (onApron) {
        c.setRGB(0.30, 0.30, 0.28);
      } else {
        c.setRGB(0.26 + detail, 0.44 + detail, 0.17);
      }
    }

    return c;
  }

  // ----------------------------------------------------------
  //  Water – removed static lakes/river (DynamicWater handles water rendering)
  //  Static water planes were appearing to float on hills
  // ----------------------------------------------------------
  private createWater(scene: THREE.Scene) {
    // No static water - DynamicWater is used for realistic water rendering
    // Empty water group is still added to scene for compatibility
    scene.add(this._waterGroup);
  }

  // ----------------------------------------------------------
  //  Vegetation – delegated to RealisticTrees
  // ----------------------------------------------------------
  private createVegetation(scene: THREE.Scene): void {
    const trees = new RealisticTrees(
      this.getHeight.bind(this),
      AIRPORT_HALF_X,
      AIRPORT_HALF_Z
    );
    trees.createVegetation(scene, this._terrainSize);
  }

  // ----------------------------------------------------------
  //  Infrastructure – roads, villages, bridges
  // ----------------------------------------------------------
  private createInfrastructure(scene: THREE.Scene) {
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.8 });
    const houseMat = new THREE.MeshStandardMaterial({ color: 0xc4a882, roughness: 0.8 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x8b3a3a, roughness: 0.7 });
    const bridgeMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.6, metalness: 0.3 });

    // --- Roads ---
    const roads = [
      { x: 0, z: 800, w: 12, l: 4000, rot: 0 },
      { x: 0, z: -800, w: 12, l: 4000, rot: 0 },
      { x: 1500, z: 0, w: 12, l: 2000, rot: Math.PI / 2 },
      { x: -1500, z: 0, w: 12, l: 2000, rot: Math.PI / 2 },
      { x: 600, z: 1200, w: 10, l: 1500, rot: 0.3 },
      { x: -800, z: -1200, w: 10, l: 1200, rot: -0.2 },
    ];

    roads.forEach(r => {
      const roadGeo = new THREE.PlaneGeometry(r.l, r.w);
      const road = new THREE.Mesh(roadGeo, roadMat);
      road.rotation.x = -Math.PI / 2;
      road.rotation.z = r.rot;
      road.position.set(r.x, 0.05, r.z);
      scene.add(road);
    });

    // --- Villages ---
    const villages = [
      { cx: 600, cz: 1200, count: 8 },
      { cx: -800, cz: -1000, count: 6 },
      { cx: 1200, cz: -600, count: 5 },
      { cx: -1000, cz: 600, count: 7 },
    ];

    villages.forEach(v => {
      for (let i = 0; i < v.count; i++) {
        // QA-03: Reproduzierbare Dorf-Positionen und -Größen
        const hx = v.cx + (worldRandom() - 0.5) * 100;
        const hz = v.cz + (worldRandom() - 0.5) * 100;
        const h = this._rawHeight(hx, hz);

        const houseGroup = new THREE.Group();
        // Main body
        const body = new THREE.Mesh(
          new THREE.BoxGeometry(6 + worldRandom() * 4, 4 + worldRandom() * 2, 5 + worldRandom() * 3),
          houseMat
        );
        body.position.y = body.geometry.parameters.height / 2;
        body.castShadow = true;
        houseGroup.add(body);
        // Roof (prism)
        const roofH = 3 + worldRandom();
        const roofW = body.geometry.parameters.width + 1;
        const roofD = body.geometry.parameters.depth + 1;
        const roofGeo = new THREE.ConeGeometry(Math.sqrt(roofW * roofW + roofD * roofD) / 2, roofH, 4);
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.y = body.geometry.parameters.height + roofH / 2;
        roof.rotation.y = Math.PI / 4;
        houseGroup.add(roof);
        houseGroup.position.set(hx, h, hz);
        scene.add(houseGroup);
      }
    });

    // --- Bridges over river ---
    const bridgePositions = [
      { x: 0, z: 800 },
      { x: 800, z: 200 },
      { x: -600, z: -400 },
    ];

    bridgePositions.forEach(bp => {
      const h = this._rawHeight(bp.x, bp.z);
      const bridge = new THREE.Mesh(
        new THREE.BoxGeometry(20, 0.5, 16),
        bridgeMat
      );
      bridge.position.set(bp.x, Math.max(h, 2) + 1, bp.z);
      bridge.castShadow = true;
      scene.add(bridge);
      // Railings
      for (const s of [-1, 1]) {
        const rail = new THREE.Mesh(
          new THREE.BoxGeometry(20, 1, 0.3),
          bridgeMat
        );
        rail.position.set(bp.x, Math.max(h, 2) + 2, bp.z + s * 7.5);
        scene.add(rail);
      }
    });
  }

  // Sky removed — Atmosphere owns the sky sphere (REN-01 fix)
  // private createSky(scene: THREE.Scene) { ... }

  // update() removed — _waterGroup is always empty (RES-06 fix)
  update(_dt: number) {
    // no-op
  }
}

// ----------------------------------------------------------
//  Utility
// ----------------------------------------------------------
function smoothstep(t: number): number {
  t = Math.max(0, Math.min(1, t));
  return t * t * (3 - 2 * t);
}
