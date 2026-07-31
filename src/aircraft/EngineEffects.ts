import * as THREE from 'three';

export class EngineEffects {
    private _navLights: { left: THREE.Mesh; right: THREE.Mesh; tail: THREE.Mesh };
    private _propBlur: THREE.Mesh | null = null;

    createNavLights(group: THREE.Group, leftWing: THREE.Vector3, rightWing: THREE.Vector3, tail: THREE.Vector3) {
        const makeLight = (color: number) => {
            const geo = new THREE.SphereGeometry(0.1, 8, 8);
            const mat = new THREE.MeshStandardMaterial({
                color, emissive: color, emissiveIntensity: 0,
                transparent: true, opacity: 0.8
            });
            return new THREE.Mesh(geo, mat);
        };
        this._navLights = {
            left: makeLight(0xff0000),
            right: makeLight(0x00ff00),
            tail: makeLight(0xffffff)
        };
        this._navLights.left.position.copy(leftWing);
        this._navLights.right.position.copy(rightWing);
        this._navLights.tail.position.copy(tail);
        group.add(this._navLights.left, this._navLights.right, this._navLights.tail);
    }

    createPropellerBlur(group: THREE.Group, position: THREE.Vector3, scale: number) {
        const geo = new THREE.CircleGeometry(1.5 * scale, 32);
        const mat = new THREE.MeshStandardMaterial({
            color: 0x888888, transparent: true, opacity: 0.3,
            side: THREE.DoubleSide, depthWrite: false
        });
        this._propBlur = new THREE.Mesh(geo, mat);
        this._propBlur.position.copy(position);
        group.add(this._propBlur);
    }

    update(time: number, throttle: number) {
        const blink = Math.sin(time * Math.PI) > 0 ? 2 : 0.1;
        this._navLights.left.material.emissiveIntensity = blink;
        this._navLights.right.material.emissiveIntensity = blink;
        this._navLights.tail.material.emissiveIntensity = blink;
        if (this._propBlur) {
            (this._propBlur.material as THREE.MeshStandardMaterial).opacity = 0.1 + throttle * 0.4;
        }
    }
}
