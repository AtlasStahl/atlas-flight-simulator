import * as THREE from 'three';

export class DynamicWater {
    private _mesh: THREE.Mesh;
    private _time = 0;

    constructor(scene: THREE.Scene, position: THREE.Vector3, size: number = 200) {
        const geo = new THREE.PlaneGeometry(size, size, 64, 64);
        const mat = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                waterColor: { value: new THREE.Color(0x1a6fa0) },
                sunDirection: { value: new THREE.Vector3(0.5, 1, 0.3).normalize() },
                cameraPosition: { value: new THREE.Vector3() }
            },
            vertexShader: `
                uniform float time;
                varying vec3 vWorldPosition, vNormal;
                vec3 gerstnerWave(vec2 p, float steep, float waveLen, vec2 dir, float t) {
                    float c = steep / waveLen;
                    vec2 d = normalize(dir);
                    float w = c * dot(p, d) * waveLen - t * steep * 2.0;
                    return vec3(d.x * sin(w) / c, steep * cos(w), d.y * sin(w) / c);
                }
                void main() {
                    vec3 pos = position + gerstnerWave(pos.xz, 0.04, 6.0, vec2(1.0, 0.5), time)
                               + gerstnerWave(pos.xz, 0.03, 4.0, vec2(0.8, 1.0), time * 1.3)
                               + gerstnerWave(pos.xz, 0.02, 2.0, vec2(-0.5, 0.8), time * 0.7);
                    vNormal = normalize(cross(dFdx(pos), dFdy(pos)));
                    vec4 worldPos = modelMatrix * vec4(pos, 1.0);
                    vWorldPosition = worldPos.xyz;
                    gl_Position = projectionMatrix * viewMatrix * worldPos;
                }
            `,
            fragmentShader: `
                uniform vec3 waterColor, sunDirection, cameraPosition;
                varying vec3 vWorldPosition, vNormal;
                void main() {
                    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
                    vec3 normal = normalize(vNormal);
                    float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.0);
                    fresnel = mix(0.04, 1.0, fresnel);
                    vec3 halfDir = normalize(sunDirection + viewDir);
                    float spec = pow(max(dot(normal, halfDir), 0.0), 128.0);
                    vec3 color = mix(waterColor, vec3(1.0), fresnel * 0.5) + spec * 0.5;
                    gl_FragColor = vec4(color, 0.85);
                }
            `,
            transparent: true, side: THREE.DoubleSide, depthWrite: false
        });
        this._mesh = new THREE.Mesh(geo, mat);
        this._mesh.position.copy(position);
        this._mesh.rotation.x = -Math.PI / 2;
        scene.add(this._mesh);
    }

    update(dt: number, cameraPos: THREE.Vector3) {
        this._time += dt;
        (this._mesh.material as THREE.ShaderMaterial).uniforms.time.value = this._time;
        (this._mesh.material as THREE.ShaderMaterial).uniforms.cameraPosition.value.copy(cameraPos);
    }
}
