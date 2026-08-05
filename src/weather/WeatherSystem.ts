import * as THREE from 'three';
import { worldRandom } from '../core/Random';

/** Weather configuration */
export interface WeatherConfig {
  type: 'clear' | 'cloudy' | 'overcast' | 'rain' | 'storm';
  windSpeed: number;       // m/s
  windDirection: number;   // radians
  cloudDensity: number;    // 0-1
  rainIntensity: number;   // 0-1
  visibility: number;      // meters
  fogDensity: number;
}

export const WEATHER_PRESETS: Record<string, WeatherConfig> = {
  clear: {
    type: 'clear',
    windSpeed: 2,
    windDirection: 0,
    cloudDensity: 0.1,
    rainIntensity: 0,
    visibility: 10000,
    fogDensity: 0.00008
  },
  cloudy: {
    type: 'cloudy',
    windSpeed: 5,
    windDirection: Math.PI / 4,
    cloudDensity: 0.5,
    rainIntensity: 0,
    visibility: 5000,
    fogDensity: 0.0002
  },
  overcast: {
    type: 'overcast',
    windSpeed: 8,
    windDirection: Math.PI / 2,
    cloudDensity: 0.8,
    rainIntensity: 0,
    visibility: 3000,
    fogDensity: 0.0004
  },
  rain: {
    type: 'rain',
    windSpeed: 12,
    windDirection: Math.PI * 0.75,
    cloudDensity: 0.9,
    rainIntensity: 0.6,
    visibility: 2000,
    fogDensity: 0.0006
  },
  storm: {
    type: 'storm',
    windSpeed: 25,
    windDirection: Math.PI,
    cloudDensity: 1.0,
    rainIntensity: 1.0,
    visibility: 800,
    fogDensity: 0.001
  }
};

/** Full weather system with rain particles, cloud layers, wind, and visibility */
export class WeatherSystem {
    private _scene: THREE.Scene;
    private _config: WeatherConfig;

    // Rain
    private _rainParticles: THREE.Points | null = null;
    private _rainGeometry: THREE.BufferGeometry | null = null;
    private _rainPositions: Float32Array | null = null;

    // Cloud layers
    private _cloudGroups: THREE.Group[] = [];
    // REN-06: Geteilte Ressourcen tracken
    private _puffGeometries: THREE.SphereGeometry[] = [];
    private _cloudMaterials: THREE.Material[] = [];

    // Sky overlay for overcast
    private _skyOverlay: THREE.Mesh | null = null;

    // Wind helper (invisible, for physics)
    private _windVector = new THREE.Vector3();
    private _turbulence = 0;
    // Cached vectors to avoid per-frame allocation
    private _cachedWindEffect = new THREE.Vector3();
    private _cachedTurbulence = new THREE.Vector3();

    // QA-03: seedbares PRNG für reproduzierbare Wettergenerierung
    private readonly _random = worldRandom;

    constructor(scene: THREE.Scene, config: WeatherConfig = WEATHER_PRESETS.clear) {
        this._scene = scene;
        this._config = { ...config };
        this._setupWeather();
    }

    get config(): WeatherConfig {
        return this._config;
    }

    get windVector(): THREE.Vector3 {
        return this._windVector;
    }

    get turbulence(): number {
        return this._turbulence;
    }

    private _setupWeather(): void {
        this._updateWindVector();
        this._createRain();
        this._createClouds();
        this._createSkyOverlay();
        this._applyVisibility();
    }

    private _updateWindVector(): void {
        this._windVector.set(
            Math.cos(this._config.windDirection) * this._config.windSpeed,
            0,
            Math.sin(this._config.windDirection) * this._config.windSpeed
        );
        // Turbulence based on wind speed
        this._turbulence = Math.min(this._config.windSpeed / 30, 1.0);
    }

    private _createRain(): void {
        this._removeRain();

        if (this._config.rainIntensity <= 0) return;

        const count = Math.floor(this._config.rainIntensity * 15000); // Reduced from 50000
        const geo = new THREE.BufferGeometry();
        this._rainPositions = new Float32Array(count * 3);

        // Create rain drops in a large volume around the player
        const spread = 800;
        const height = 300;
        for (let i = 0; i < count; i++) {
            this._rainPositions[i * 3] = (this._random() - 0.5) * spread;
            this._rainPositions[i * 3 + 1] = this._random() * height;
            this._rainPositions[i * 3 + 2] = (this._random() - 0.5) * spread;
        }

        geo.setAttribute('position', new THREE.BufferAttribute(this._rainPositions, 3));

        const mat = new THREE.PointsMaterial({
            color: 0xccccdd,
            size: 1.5,
            transparent: true,
            opacity: this._config.rainIntensity * 0.3,
            depthWrite: false,
            sizeAttenuation: true,
            blending: THREE.AdditiveBlending
        });

        this._rainParticles = new THREE.Points(geo, mat);
        this._scene.add(this._rainParticles);
        this._rainGeometry = geo;
    }

    private _removeRain(): void {
        if (this._rainParticles) {
            this._scene.remove(this._rainParticles);
            this._rainGeometry?.dispose();
            (this._rainParticles.material as THREE.PointsMaterial).dispose();
            this._rainParticles = null;
            this._rainGeometry = null;
            this._rainPositions = null;
        }
    }

    private _createClouds(): void {
        this._removeClouds();

        if (this._config.cloudDensity <= 0) return;

        const layers = 3;
        const cloudsPerLayer = Math.floor(this._config.cloudDensity * 60); // Balanced cloud count

        // Shared geometry pool for cloud puffs (reduces memory)
        const puffGeometries = [
            new THREE.SphereGeometry(1, 12, 10), // Lower segment count - optimized for distance viewing
            new THREE.SphereGeometry(1, 10, 8),
            new THREE.SphereGeometry(1, 8, 6),
        ];
        this._puffGeometries = puffGeometries;

        for (let l = 0; l < layers; l++) {
            const group = new THREE.Group();
            const altitude = 250 + l * 120; // Better altitude distribution

            // Cloud material — one per layer, tracked for single dispose
            const cloudMat = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.7 + l * 0.05,
                depthWrite: false,
            });
            this._cloudMaterials.push(cloudMat);

            for (let i = 0; i < cloudsPerLayer; i++) {
                // Each cloud is a cluster of spheres for fluffy volumetric look
                const cloudGroup = new THREE.Group();
                // QA-03: Reproduzierbare Wolken-Generierung
                const numPuffs = 5 + Math.floor(this._random() * 4); // 5-8 puffs per cloud

                for (let p = 0; p < numPuffs; p++) {
                    const size = 15 + this._random() * 35; // Larger puffs for better visibility from below
                    const geoIdx = Math.floor(this._random() * puffGeometries.length);
                    const puff = new THREE.Mesh(puffGeometries[geoIdx], cloudMat);

                    // Position puffs in a more horizontal spread (wider, less tall) for better viewing from below
                    puff.position.set(
                        (this._random() - 0.5) * 50, // Wider horizontal spread
                        (this._random() - 0.5) * 8,  // Flatter vertical profile
                        (this._random() - 0.5) * 50  // Wider depth spread
                    );
                    // Equal scaling for round appearance
                    const scale = size * (0.8 + this._random() * 0.4);
                    puff.scale.set(scale, scale * 0.7, scale); // Slightly flattened for natural look
                    cloudGroup.add(puff);
                }

                // Position clouds in a large area around the aircraft
                cloudGroup.position.set(
                    (this._random() - 0.5) * 6000,
                    altitude + this._random() * 40,
                    (this._random() - 0.5) * 6000
                );

                group.add(cloudGroup);
            }

            this._scene.add(group);
            this._cloudGroups.push(group);
        }
    }

    private _removeClouds(): void {
        // REN-06: scene.remove auf Group detachiert alle Kinder automatisch.
        // Geteilte Ressourcen (Geometrien/Materialien) genau einmal freigeben.
        for (const group of this._cloudGroups) {
            this._scene.remove(group);
        }
        this._cloudGroups = [];
        for (const geo of this._puffGeometries) {
            geo.dispose();
        }
        this._puffGeometries = [];
        for (const mat of this._cloudMaterials) {
            mat.dispose();
        }
        this._cloudMaterials = [];
    }

    private _createSkyOverlay(): void {
        this._removeSkyOverlay();

        if (this._config.cloudDensity < 0.5) return;

        const geo = new THREE.SphereGeometry(9500, 32, 32);
        const mat = new THREE.MeshBasicMaterial({
            color: new THREE.Color(0x888888).lerp(new THREE.Color(0x333333), this._config.cloudDensity),
            side: THREE.BackSide,
            transparent: true,
            opacity: this._config.cloudDensity * 0.5
        });

        this._skyOverlay = new THREE.Mesh(geo, mat);
        this._scene.add(this._skyOverlay);
    }

    private _removeSkyOverlay(): void {
        if (this._skyOverlay) {
            this._scene.remove(this._skyOverlay);
            this._skyOverlay.geometry.dispose();
            (this._skyOverlay.material as THREE.MeshBasicMaterial).dispose();
            this._skyOverlay = null;
        }
    }

    private _applyVisibility(): void {
        // This will be applied to the atmosphere/fog externally
    }

    /** Switch to a new weather preset */
    setPreset(preset: WeatherConfig): void {
        this._config = { ...preset };
        this._setupWeather();
    }

    /** Update weather simulation */
    update(dt: number, aircraftPos: THREE.Vector3): void {
        // Update rain
        if (this._rainPositions && this._rainGeometry) {
            const rainSpeed = 30 + this._config.windSpeed * 2;
            const windX = Math.cos(this._config.windDirection) * this._config.windSpeed;
            const windZ = Math.sin(this._config.windDirection) * this._config.windSpeed;

            for (let i = 0; i < this._rainPositions.length / 3; i++) {
                this._rainPositions[i * 3] += windX * dt;
                this._rainPositions[i * 3 + 1] -= rainSpeed * dt;
                this._rainPositions[i * 3 + 2] += windZ * dt;

                // Reset if below ground or too far from aircraft (REN-07: Weltkoordinaten, kein doppelter Offset)
                if (this._rainPositions[i * 3 + 1] < 0 ||
                    Math.abs(this._rainPositions[i * 3] - aircraftPos.x) > 1000 ||
                    Math.abs(this._rainPositions[i * 3 + 2] - aircraftPos.z) > 1000) {
                    // QA-03: Reproduzierbare Regen-Reset-Positionen
                    this._rainPositions[i * 3] = aircraftPos.x + (this._random() - 0.5) * 2000;
                    this._rainPositions[i * 3 + 1] = 200 + this._random() * 300;
                    this._rainPositions[i * 3 + 2] = aircraftPos.z + (this._random() - 0.5) * 2000;
                }
            }

            this._rainGeometry.attributes.position.needsUpdate = true;
        }

        // REN-07: Regen-Container bleibt bei (0,0,0) — Partikel sind in Weltkoordinaten
        // (früher: this._rainParticles.position.copy(aircraftPos) — doppelter Offset)

        // Drift clouds and wrap around aircraft (REN-06: Wolkenfeld folgt Flugzeug)
        // Groups don't drift — individual clouds drift within group bounds and wrap.
        // This avoids accumulated group offset breaking the wrap check.
        const WIND_DRIFT = 0.1;
        const CLOUD_WRAP_HALF = 3000; // half of the 6000 spread used during creation
        for (const group of this._cloudGroups) {
            // Snap group to aircraft so wrap stays relative
            group.position.x = aircraftPos.x;
            group.position.z = aircraftPos.z;

            for (const cloud of group.children) {
                // Drift
                cloud.position.x += Math.cos(this._config.windDirection) * this._config.windSpeed * dt * WIND_DRIFT;
                cloud.position.z += Math.sin(this._config.windDirection) * this._config.windSpeed * dt * WIND_DRIFT;

                // Wrap X relative to group center (= aircraft)
                const dx = cloud.position.x;
                if (dx > CLOUD_WRAP_HALF) cloud.position.x -= CLOUD_WRAP_HALF * 2;
                else if (dx < -CLOUD_WRAP_HALF) cloud.position.x += CLOUD_WRAP_HALF * 2;

                // Wrap Z relative to group center (= aircraft)
                const dz = cloud.position.z;
                if (dz > CLOUD_WRAP_HALF) cloud.position.z -= CLOUD_WRAP_HALF * 2;
                else if (dz < -CLOUD_WRAP_HALF) cloud.position.z += CLOUD_WRAP_HALF * 2;
            }
        }

        // Move sky overlay
        if (this._skyOverlay) {
            this._skyOverlay.position.copy(aircraftPos);
        }
    }

    /** Get wind effect on aircraft physics — out-parameter pattern to avoid mutating internal state */
    getWindEffect(out: THREE.Vector3): THREE.Vector3 {
        out.copy(this._cachedWindEffect);
        return out;
    }

    /** Get turbulence force — out-parameter pattern to avoid mutating internal state */
    getTurbulence(out: THREE.Vector3): THREE.Vector3 {
        out.copy(this._cachedTurbulence);
        return out;
    }

    cleanup(): void {
        this._removeRain();
        this._removeClouds();
        this._removeSkyOverlay();
    }
}