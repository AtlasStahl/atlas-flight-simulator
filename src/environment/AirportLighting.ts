import * as THREE from 'three';

export class AirportLighting {
    private _lights = new THREE.Group();

    constructor(scene: THREE.Scene, bounds: { x1: number; x2: number; z1: number; z2: number }) {
        this._createRunwayEdgeLights(bounds);
        this._createPAPILights(bounds);
        scene.add(this._lights);
    }

    private _createRunwayEdgeLights(bounds: { x1: number; x2: number; z1: number; z2: number }) {
        const spacing = 30;
        const count = Math.floor((bounds.x2 - bounds.x1) / spacing);
        for (let i = 0; i < count; i++) {
            const x = bounds.x1 + i * spacing;
            for (const [z, color] of [[bounds.z2 + 5, 0xffffff], [bounds.z1 - 5, 0x00ff00]]) {
                const bulb = new THREE.Mesh(
                    new THREE.SphereGeometry(0.15, 8, 8),
                    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 2, transparent: true, opacity: 0.9 })
                );
                bulb.position.set(x, 0.3, z);
                this._lights.add(bulb);
            }
        }
    }

    private _createPAPILights(bounds: { x1: number; x2: number; z1: number; z2: number }) {
        for (let i = 0; i < 4; i++) {
            const isRed = i < 2;
            const light = new THREE.Mesh(
                new THREE.SphereGeometry(0.2, 8, 8),
                new THREE.MeshStandardMaterial({
                    color: isRed ? 0xff0000 : 0xffffff,
                    emissive: isRed ? 0xff0000 : 0xffffff,
                    emissiveIntensity: 3, transparent: true, opacity: 0.9
                })
            );
            light.position.set(bounds.x1 - 50, 0.5 + i * 0.3, bounds.z2 + 20);
            this._lights.add(light);
        }
    }

    setIntensity(intensity: number) {
        this._lights.traverse((child) => {
            if (child instanceof THREE.Mesh && 'emissiveIntensity' in child.material) {
                (child.material as THREE.MeshStandardMaterial).emissiveIntensity = intensity;
            }
        });
    }
}
