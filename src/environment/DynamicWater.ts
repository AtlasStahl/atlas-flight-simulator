import * as THREE from 'three';

/**
 * Animierte Wasserfläche mit Gerstner-Wellen.
 *
 * `PlaneGeometry` liegt in der lokalen **XY**-Ebene, die Flächennormale ist lokal **+Z**.
 * Die Wellen werden deshalb über `position.xy` ausgewertet und die Höhenauslenkung auf
 * `position.z` gelegt; erst das Mesh selbst wird über `rotation.x = -PI/2` waagerecht gedreht.
 */
export class DynamicWater {
    private _mesh: THREE.Mesh;
    private _time = 0;

    /** @param radius Radius der sichtbaren (kreisrunden) Wasserfläche in Metern */
    constructor(scene: THREE.Scene, position: THREE.Vector3, radius: number = 150) {
        const geo = new THREE.PlaneGeometry(radius * 2, radius * 2, 96, 96);
        const mat = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                waterColor: { value: new THREE.Color(0x2a7fb0) },
                deepColor: { value: new THREE.Color(0x0d3d5c) },
                sunDirection: { value: new THREE.Vector3(0.5, 1, 0.3).normalize() },
                uCameraPosition: { value: new THREE.Vector3() },
                uRadius: { value: radius }
            },
            vertexShader: `
                uniform float time;
                varying vec3 vWorldPosition, vNormal;
                varying vec2 vLocal;

                // Gerstner-Welle in der lokalen XY-Ebene; z ist die Höhenauslenkung.
                // steepness in [0,1]; die Amplitude folgt aus a = steepness / k.
                vec3 gerstner(vec2 p, float wavelength, float steepness, vec2 dir, float t) {
                    float k = 6.283185 / wavelength;
                    float a = steepness / k;
                    vec2 d = normalize(dir);
                    float phase = k * dot(d, p) - sqrt(9.81 * k) * t;
                    return vec3(d * (a * cos(phase)), a * sin(phase));
                }

                // Binnensee: flache Kräuselung. Größere Amplituden lassen die Wellentäler
                // am Ufer unter den Seegrund tauchen und reißen Löcher in die Fläche.
                vec3 waveOffset(vec2 p, float t) {
                    return gerstner(p, 26.0, 0.035, vec2( 1.0,  0.4), t)
                         + gerstner(p, 14.0, 0.025, vec2( 0.7, -1.0), t)
                         + gerstner(p,  7.0, 0.015, vec2(-0.5,  0.9), t);
                }

                void main() {
                    vec2 p = position.xy;
                    vec3 displaced = position + waveOffset(p, time);

                    // Normale aus den Tangenten der ausgelenkten Fläche
                    float eps = 1.0;
                    vec2 px = p + vec2(eps, 0.0);
                    vec2 py = p + vec2(0.0, eps);
                    vec3 tx = vec3(px, position.z) + waveOffset(px, time) - displaced;
                    vec3 ty = vec3(py, position.z) + waveOffset(py, time) - displaced;
                    vNormal = normalize(normalMatrix * normalize(cross(tx, ty)));

                    vLocal = p;
                    vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
                    vWorldPosition = worldPos.xyz;
                    gl_Position = projectionMatrix * viewMatrix * worldPos;
                }
            `,
            fragmentShader: `
                uniform vec3 waterColor;
                uniform vec3 deepColor;
                uniform vec3 sunDirection;
                uniform vec3 uCameraPosition;
                uniform float uRadius;
                varying vec3 vWorldPosition, vNormal;
                varying vec2 vLocal;

                void main() {
                    // Runde Wasserfläche aus dem quadratischen Gitter schneiden
                    float d = length(vLocal) / uRadius;
                    if (d > 1.0) discard;

                    vec3 viewDir = normalize(uCameraPosition - vWorldPosition);
                    vec3 normal = normalize(vNormal);
                    if (dot(normal, viewDir) < 0.0) normal = -normal;

                    float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.0);
                    fresnel = mix(0.04, 1.0, fresnel);
                    vec3 halfDir = normalize(sunDirection + viewDir);
                    float spec = pow(max(dot(normal, halfDir), 0.0), 64.0);

                    vec3 base = mix(deepColor, waterColor, max(dot(normal, sunDirection), 0.0));
                    vec3 color = mix(base, vec3(0.62, 0.76, 0.88), fresnel * 0.35) + spec * 0.35;
                    // Deckend bis kurz vor das Ufer, dort weiche Kante statt harter Schnittlinie
                    gl_FragColor = vec4(color, smoothstep(1.0, 0.93, d));
                }
            `,
            transparent: true, side: THREE.DoubleSide, depthWrite: false
        });
        this._mesh = new THREE.Mesh(geo, mat);
        this._mesh.position.copy(position);
        this._mesh.rotation.x = -Math.PI / 2;
        scene.add(this._mesh);
    }

    update(dt: number, cameraPos?: THREE.Vector3) {
        this._time += dt;
        (this._mesh.material as THREE.ShaderMaterial).uniforms.time.value = this._time;
        if (cameraPos) {
            (this._mesh.material as THREE.ShaderMaterial).uniforms.uCameraPosition.value.copy(cameraPos);
        }
    }

    /** Dispose water mesh resources and remove from scene */
    dispose(scene: THREE.Scene): void {
        scene.remove(this._mesh);
        this._mesh.geometry.dispose();
        (this._mesh.material as THREE.ShaderMaterial).dispose();
    }
}
