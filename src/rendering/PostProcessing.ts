import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export class PostProcessingManager {
    private _composer: EffectComposer;
    private _bloomPass: UnrealBloomPass;

    constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer) {
        this._composer = new EffectComposer(renderer);
        this._composer.addPass(new RenderPass(scene, camera));
        this._bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight), 0.4, 0.5, 0.8
        );
        this._composer.addPass(this._bloomPass);
        this._composer.addPass(new SMAAPass(window.innerWidth, window.innerHeight));
        this._composer.addPass(new OutputPass());
    }

    render(): void { this._composer.render(); }
    resize(w: number, h: number): void {
        this._composer.setSize(w, h);
        this._bloomPass.resolution.set(w, h);
    }
    setBloomStrength(s: number): void { this._bloomPass.strength = s; }
    dispose(): void {
        this._composer.passes.forEach(p => p.dispose?.());
        this._composer.dispose();
    }
}
