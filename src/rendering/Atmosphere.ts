import * as THREE from 'three';

export class Atmosphere {
    private _fog: THREE.FogExp2;
    private _sky!: THREE.Mesh;
    private _skyMaterial!: THREE.ShaderMaterial;

    constructor(scene: THREE.Scene, sunPosition: THREE.Vector3) {
        this._fog = new THREE.FogExp2(0x87ceeb, 0.00015);
        scene.fog = this._fog;
        this._createSky(scene);
        this.updateSunPosition(sunPosition);
    }

    private _createSky(scene: THREE.Scene): void {
        const geo = new THREE.SphereGeometry(9000, 32, 32);
        this._skyMaterial = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(0x0077ff) },
                bottomColor: { value: new THREE.Color(0xffffff) },
                offset: { value: 20 },
                exponent: { value: 0.6 }
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 wp = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = wp.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor, bottomColor;
                uniform float offset, exponent;
                varying vec3 vWorldPosition;
                void main() {
                    float h = normalize(vWorldPosition + offset).y;
                    gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
                }
            `,
            side: THREE.BackSide
        });
        this._sky = new THREE.Mesh(geo, this._skyMaterial);
        scene.add(this._sky);
    }

    updateSunPosition(sun: THREE.Vector3): void {
        const h = Math.max(0, Math.min(1, sun.y / 1000));
        this._fog.color.copy(new THREE.Color().lerpColors(new THREE.Color(0xffaa00), new THREE.Color(0x87ceeb), h));
        this._skyMaterial.uniforms.topColor.value.copy(new THREE.Color().lerpColors(new THREE.Color(0xff6600), new THREE.Color(0x0077ff), h));
        this._skyMaterial.uniforms.bottomColor.value.copy(new THREE.Color().lerpColors(new THREE.Color(0xffcc88), new THREE.Color(0xffffff), h));
    }

    updateSkyPosition(camPos: THREE.Vector3): void { this._sky.position.copy(camPos); }
    setFogDensity(d: number): void { this._fog.density = d; }
    dispose(scene: THREE.Scene): void {
        scene.remove(this._sky);
        this._sky.geometry.dispose();
        this._skyMaterial.dispose();
        scene.fog = null;
    }
}
