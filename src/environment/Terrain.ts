import * as THREE from 'three';
import { RealisticTrees } from './RealisticTrees';
import { AirportBuildings } from './AirportBuildings';
import { AirportVehicles } from './AirportVehicles';

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
    let i1 = x0 > y0 ? 1 : 0;
    let j1 = x0 > y0 ? 0 : 1;
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
  private _clouds = new THREE.Group();
  private _waterGroup = new THREE.Group();
  private _noise = new SimplexNoise(42);
  private _heightCache = new Map<string, number>();

  // Heightmap parameters
  private readonly _terrainSize = 4000;       // world units
  private readonly _segments = 200;
  private readonly _maxHeight = 500;
  private readonly _airportX = 1600;
  private readonly _airportZ = 100;

  constructor(scene: THREE.Scene) {
    this.createSky(scene);
    this.createHeightmapTerrain(scene);
    this.createWater(scene);
    new AirportBuildings().createBuildings(scene);
    new AirportVehicles().createVehicles(scene);
    this.createVegetation(scene);
    this.createInfrastructure(scene);
    this.createClouds(scene);
  }

  // ----------------------------------------------------------
  //  Heightmap helpers
  // ----------------------------------------------------------
  /** Get terrain height at world (x, z) */
  getHeight(x: number, z: number): number {
    const key = `${Math.round(x)},${Math.round(z)}`;
    if (this._heightCache.has(key)) return this._heightCache.get(key)!;
    const h = this._rawHeight(x, z);
    this._heightCache.set(key, h);
    return h;
  }

  private _rawHeight(x: number, z: number): number {
    // Airport flat zone - larger and smoother
    const airportHalfX = 1000;
    const airportHalfZ = 200;
    const blendWidth = 400;

    const distX = Math.abs(x);
    const distZ = Math.abs(z);

    // Inside airport: perfectly flat
    if (distX < airportHalfX - blendWidth && distZ < airportHalfZ - blendWidth) {
      return 0;
    }

    // Blend zone: smooth transition from flat to terrain
    let blendX = 0;
    let blendZ = 0;
    if (distX >= airportHalfX - blendWidth && distX < airportHalfX) {
      blendX = (distX - (airportHalfX - blendWidth)) / blendWidth;
      blendX = smoothstep(blendX);
    } else if (distX >= airportHalfX) {
      blendX = 1;
    }
    if (distZ >= airportHalfZ - blendWidth && distZ < airportHalfZ) {
      blendZ = (distZ - (airportHalfZ - blendWidth)) / blendWidth;
      blendZ = smoothstep(blendZ);
    } else if (distZ >= airportHalfZ) {
      blendZ = 1;
    }

    const blendFactor = Math.max(blendX, blendZ);

    // Outside airport: full terrain
    if (blendFactor >= 1) {
      return this._mountainHeight(x, z);
    }

    // Blend zone: mix between flat and terrain
    const terrainH = this._mountainHeight(x, z);
    return terrainH * blendFactor;
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
      // PlaneGeometry is already centered at origin (-half to +half)
      // pos.getX(i) and pos.getY(i) are already world coordinates
      const vx = pos.getX(i);
      const vz = pos.getY(i);
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
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    scene.add(mesh);
  }

  private _getTerrainColor(x: number, z: number, h: number): THREE.Color {
    const moisture = this._noise.noise2D(x * 0.002, z * 0.002) * 0.5 + 0.5;
    const detail = this._noise.noise2D(x * 0.01, z * 0.01) * 0.1;

    // Color zones by height
    const c = new THREE.Color();

    if (h < 2) {
      // Low-lying / wetland – dark green or sand
      if (moisture > 0.5) {
        c.setRGB(0.15 + detail, 0.25 + detail, 0.08);
      } else {
        c.setRGB(0.65 + detail, 0.58 + detail, 0.40);
      }
    } else if (h < 40) {
      // Grass / fields
      const green = 0.30 + moisture * 0.15 + detail;
      c.setRGB(0.18 + detail, green, 0.08 + detail);
    } else if (h < 100) {
      // Forest / dark green
      c.setRGB(0.10 + detail, 0.28 + moisture * 0.08, 0.06);
    } else if (h < 200) {
      // Mountain slope – brown/green mix
      const t = (h - 100) / 100;
      c.lerpColors(
        new THREE.Color(0.10, 0.28, 0.06),
        new THREE.Color(0.35, 0.28, 0.18),
        t
      );
    } else if (h < 300) {
      // Rock
      const t = (h - 200) / 100;
      c.lerpColors(
        new THREE.Color(0.35, 0.28, 0.18),
        new THREE.Color(0.45, 0.42, 0.38),
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

    // Airport area – asphalt/concrete
    if (Math.abs(x) < this._airportX && Math.abs(z) < this._airportZ) {
      c.setRGB(0.28, 0.28, 0.26);
    }

    return c;
  }

  // ----------------------------------------------------------
  //  Water – lakes + river
  // ----------------------------------------------------------
  private createWater(scene: THREE.Scene) {
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x1a6fa0,
      transparent: true,
      opacity: 0.7,
      roughness: 0.05,
      metalness: 0.4,
    });

    // Lakes in valleys
    const lakes = [
      { x: 800, z: 600, r: 100 },
      { x: -600, z: 400, r: 80 },
      { x: 1500, z: -400, r: 120 },
      { x: -1200, z: -600, r: 90 },
      { x: 300, z: -900, r: 110 },
      { x: 1800, z: 1200, r: 70 },
      { x: -1600, z: 800, r: 85 },
    ];

    lakes.forEach(l => {
      const lakeGeo = new THREE.CircleGeometry(l.r, 32);
      const lake = new THREE.Mesh(lakeGeo, waterMat);
      lake.rotation.x = -Math.PI / 2;
      const lh = this._rawHeight(l.x, l.z);
      lake.position.set(l.x, Math.max(lh, 1.5), l.z);
      this._waterGroup.add(lake);
    });

    // River – series of connected segments
    const riverPath: [number, number][] = [];
    for (let t = 0; t <= 1; t += 0.02) {
      const rx = -2000 + t * 4000;
      const rz = Math.sin(t * Math.PI * 3) * 800 + this._noise.noise2D(t * 5, 0) * 200;
      riverPath.push([rx, rz]);
    }

    for (let i = 0; i < riverPath.length - 1; i++) {
      const [x1, z1] = riverPath[i];
      const [x2, z2] = riverPath[i + 1];
      const mx = (x1 + x2) / 2;
      const mz = (z1 + z2) / 2;
      const dx = x2 - x1;
      const dz = z2 - z1;
      const len = Math.sqrt(dx * dx + dz * dz);
      const angle = Math.atan2(dz, dx);
      const riverGeo = new THREE.PlaneGeometry(len, 12);
      const river = new THREE.Mesh(riverGeo, waterMat);
      river.rotation.x = -Math.PI / 2;
      river.rotation.z = -angle;
      const rh = this._rawHeight(mx, mz);
      river.position.set(mx, Math.max(rh, 1.5), mz);
      this._waterGroup.add(river);
    }

    scene.add(this._waterGroup);
  }

  // ----------------------------------------------------------
  //  Vegetation – delegated to RealisticTrees
  // ----------------------------------------------------------
  private createVegetation(scene: THREE.Scene): void {
    const trees = new RealisticTrees(
      this._rawHeight.bind(this),
      this._airportX,
      this._airportZ
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
        const hx = v.cx + (Math.random() - 0.5) * 100;
        const hz = v.cz + (Math.random() - 0.5) * 100;
        const h = this._rawHeight(hx, hz);

        const houseGroup = new THREE.Group();
        // Main body
        const body = new THREE.Mesh(
          new THREE.BoxGeometry(6 + Math.random() * 4, 4 + Math.random() * 2, 5 + Math.random() * 3),
          houseMat
        );
        body.position.y = body.geometry.parameters.height / 2;
        body.castShadow = true;
        houseGroup.add(body);
        // Roof (prism)
        const roofH = 3 + Math.random();
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

  // ----------------------------------------------------------
  //  Sky
  // ----------------------------------------------------------
  private createSky(scene: THREE.Scene) {
    const skyGeo = new THREE.SphereGeometry(8000, 32, 32);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x0077ff) },
        bottomColor: { value: new THREE.Color(0xffffff) },
        offset: { value: 20 },
        exponent: { value: 0.6 },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide,
    });
    scene.add(new THREE.Mesh(skyGeo, skyMat));
  }

  // ----------------------------------------------------------
  //  Clouds
  // ----------------------------------------------------------
  private createClouds(scene: THREE.Scene) {
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
      roughness: 1,
      metalness: 0,
    });

    for (let i = 0; i < 60; i++) {
      const cloudGroup = new THREE.Group();
      const numPuffs = 3 + Math.floor(Math.random() * 4);
      for (let j = 0; j < numPuffs; j++) {
        const radius = 20 + Math.random() * 40;
        const puff = new THREE.Mesh(new THREE.SphereGeometry(radius, 8, 8), cloudMat);
        puff.position.set(
          (Math.random() - 0.5) * 60,
          (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 30,
        );
        puff.scale.y = 0.4;
        cloudGroup.add(puff);
      }
      cloudGroup.position.set(
        (Math.random() - 0.5) * 8000,
        50 + Math.random() * 300,
        (Math.random() - 0.5) * 8000,
      );
      this._clouds.add(cloudGroup);
    }

    scene.add(this._clouds);
  }

  // ----------------------------------------------------------
  //  Update
  // ----------------------------------------------------------
  update(dt: number) {
    // Drift clouds
    this._clouds.children.forEach(cloud => {
      cloud.position.x += 5 * dt;
      if (cloud.position.x > 4000) cloud.position.x = -4000;
    });

    // Animate water (gentle wave)
    this._waterGroup.children.forEach((w, i) => {
      w.position.y += Math.sin(performance.now() * 0.001 + i) * 0.002;
    });
  }
}

// ----------------------------------------------------------
//  Utility
// ----------------------------------------------------------
function smoothstep(t: number): number {
  t = Math.max(0, Math.min(1, t));
  return t * t * (3 - 2 * t);
}