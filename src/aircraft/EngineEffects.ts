import * as THREE from 'three';

export class EngineEffects {
    private _group: THREE.Group;
    private _navLights: { left: THREE.Mesh; right: THREE.Mesh; tail: THREE.Mesh } | null = null;
    private _scale: number;

    constructor(aircraftGroup: THREE.Group, scale: number = 1.0) {
        this._group = new THREE.Group();
        this._scale = scale;
        aircraftGroup.add(this._group);
        this._createNavLights();
    }

    get group(): THREE.Group { return this._group; }

    private _createNavLights(): void {
        const makeLight = (color: number) => {
            const geo = new THREE.SphereGeometry(0.15 * this._scale, 8, 8);
            const mat = new THREE.MeshStandardMaterial({
                color, emissive: color, emissiveIntensity: 0,
                transparent: true, opacity: 0.8
            });
            return new THREE.Mesh(geo, mat);
        };

        // UI-10: ICAO-Standards — links rot (Pilotensicht), rechts grün
        // Mit forward=+X, up=+Y: rechte Seite ist -Z, linke Seite ist +Z
        const left = makeLight(0xff0000);   // Rot = linke Seite (Pilotensicht)
        const right = makeLight(0x00ff00);  // Grün = rechte Seite (Pilotensicht)
        const tail = makeLight(0xffffff);

        left.position.set(0, -0.5 * this._scale, 3 * this._scale);
        right.position.set(0, -0.5 * this._scale, -3 * this._scale);
        tail.position.set(-3 * this._scale, 0.5 * this._scale, 0);

        this._group.add(left, right, tail);
        this._navLights = { left, right, tail };
    }

    update(time: number, _throttle: number): void {
        if (!this._navLights) return;

        const blink = Math.sin(time * Math.PI * 2) > 0 ? 3 : 0.1;
        (this._navLights.left.material as THREE.MeshStandardMaterial).emissiveIntensity = blink;
        (this._navLights.right.material as THREE.MeshStandardMaterial).emissiveIntensity = blink;
        (this._navLights.tail.material as THREE.MeshStandardMaterial).emissiveIntensity = blink;
    }

    /** ARCH-02: Remove from parent so disposeGroup doesn't double-dispose */
    dispose(): void {
        this._group.parent?.remove(this._group);
    }
}
