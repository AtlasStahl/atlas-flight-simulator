import * as THREE from 'three';

export class EngineEffects {
    private _group: THREE.Group;
    private _navLights: { left: THREE.Mesh; right: THREE.Mesh; tail: THREE.Mesh } | null = null;
    private _propBlur: THREE.Mesh | null = null;

    constructor(aircraftGroup: THREE.Group) {
        this._group = new THREE.Group();
        aircraftGroup.add(this._group);
        this._createNavLights();
    }

    get group(): THREE.Group { return this._group; }

    private _createNavLights(): void {
        const makeLight = (color: number) => {
            const geo = new THREE.SphereGeometry(0.15, 8, 8);
            const mat = new THREE.MeshStandardMaterial({
                color, emissive: color, emissiveIntensity: 0,
                transparent: true, opacity: 0.8
            });
            return new THREE.Mesh(geo, mat);
        };

        const left = makeLight(0xff0000);
        const right = makeLight(0x00ff00);
        const tail = makeLight(0xffffff);

        left.position.set(0, -0.5, 3);
        right.position.set(0, -0.5, -3);
        tail.position.set(-3, 0.5, 0);

        this._group.add(left, right, tail);
        this._navLights = { left, right, tail };
    }

    update(time: number, throttle: number): void {
        if (!this._navLights) return;

        const blink = Math.sin(time * Math.PI * 2) > 0 ? 3 : 0.1;
        (this._navLights.left.material as THREE.MeshStandardMaterial).emissiveIntensity = blink;
        (this._navLights.right.material as THREE.MeshStandardMaterial).emissiveIntensity = blink;
        (this._navLights.tail.material as THREE.MeshStandardMaterial).emissiveIntensity = blink;
    }
}
