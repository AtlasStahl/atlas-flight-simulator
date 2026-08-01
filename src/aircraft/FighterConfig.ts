import * as THREE from 'three';

/** Fighter jet configurations */
export const FIGHTER_CONFIGS = {
  f16: {
    name: 'F-16 Fighting Falcon',
    maxSpeed: 350,        // m/s (~1260 km/h)
    rotateSpeed: 80,      // m/s
    maxClimbRate: 25,     // m/s
    rollRate: 360,
    pitchRate: 120,
    yawRate: 60,
    throttleResponse: 0.85,
    maxThrust: 128000,
    mass: 13000,
    wingArea: 27.87,
    dragCoefficient: 0.018,
    liftCoefficient: 1.6,
    stallSpeed: 40,       // m/s
    color: 0x556b2f,      // Military green
    scale: 1.2,
    type: 'f16' as const,
    hasWeapons: true,
    maxHealth: 150
  },
  su27: {
    name: 'Su-27 Flanker',
    maxSpeed: 380,        // m/s (~1368 km/h)
    rotateSpeed: 85,      // m/s
    maxClimbRate: 28,     // m/s
    rollRate: 300,
    pitchRate: 100,
    yawRate: 50,
    throttleResponse: 0.8,
    maxThrust: 222000,
    mass: 23000,
    wingArea: 43.5,
    dragCoefficient: 0.02,
    liftCoefficient: 1.5,
    stallSpeed: 45,       // m/s
    color: 0x4a4a4a,      // Dark gray
    scale: 1.4,
    type: 'su27' as const,
    hasWeapons: true,
    maxHealth: 180
  }
};

export type FighterType = 'f16' | 'su27';
export type AllAircraftType = 'cessna' | 'boeing' | 'extra' | FighterType;

/** Procedural fighter jet model builder */
export class FighterAircraft {
    private _group: THREE.Group;
    private _propellers: THREE.Mesh[] = [];
    private _engineGlow: THREE.Mesh | null = null;
    private _config: typeof FIGHTER_CONFIGS.f16;

    constructor(config: typeof FIGHTER_CONFIGS.f16) {
        this._config = config;
        this._group = this._createModel();
    }

    get group(): THREE.Group { return this._group; }
    get propellers(): THREE.Mesh[] { return this._propellers; }

    private _createModel(): THREE.Group {
        const group = new THREE.Group();
        const scale = this._config.scale;
        
        // Fuselage - sleek delta wing design
        const fuselageGeo = new THREE.ConeGeometry(0.6 * scale, 8 * scale, 8);
        const fuselageMat = new THREE.MeshStandardMaterial({ 
            color: this._config.color,
            roughness: 0.3,
            metalness: 0.7
        });
        const fuselage = new THREE.Mesh(fuselageGeo, fuselageMat);
        fuselage.rotation.z = -Math.PI / 2;
        group.add(fuselage);
        
        // Nose cone
        const noseGeo = new THREE.SphereGeometry(0.3 * scale, 8, 6);
        const noseMat = new THREE.MeshStandardMaterial({ 
            color: 0x333333,
            roughness: 0.2
        });
        const nose = new THREE.Mesh(noseGeo, noseMat);
        nose.position.set(4 * scale, 0, 0);
        group.add(nose);
        
        // Delta wings
        const wingShape = new THREE.Shape();
        wingShape.moveTo(0, 0);
        wingShape.lineTo(-2 * scale, 3 * scale);
        wingShape.lineTo(-1.5 * scale, 0);
        wingShape.lineTo(-2 * scale, -3 * scale);
        wingShape.lineTo(0, 0);
        
        const wingGeo = new THREE.ExtrudeGeometry(wingShape, {
            depth: 0.15 * scale,
            bevelEnabled: true,
            bevelThickness: 0.05 * scale,
            bevelSize: 0.05 * scale
        });
        const wingMat = new THREE.MeshStandardMaterial({ 
            color: this._config.color,
            roughness: 0.4,
            metalness: 0.6
        });
        const wings = new THREE.Mesh(wingGeo, wingMat);
        wings.position.set(-0.5 * scale, -0.15 * scale, 0);
        wings.rotation.x = Math.PI / 2;
        group.add(wings);
        
        // Vertical stabilizers (twin tails)
        const tailGeo = new THREE.BoxGeometry(0.8 * scale, 1.5 * scale, 0.1 * scale);
        const tailMat = new THREE.MeshStandardMaterial({ 
            color: 0x444444,
            roughness: 0.5
        });
        
        const tail1 = new THREE.Mesh(tailGeo, tailMat);
        tail1.position.set(-3 * scale, 0.8 * scale, 0.8 * scale);
        tail1.rotation.z = -0.3;
        group.add(tail1);
        
        const tail2 = new THREE.Mesh(tailGeo, tailMat);
        tail2.position.set(-3 * scale, 0.8 * scale, -0.8 * scale);
        tail2.rotation.z = 0.3;
        group.add(tail2);
        
        // Cockpit canopy
        const cockpitGeo = new THREE.SphereGeometry(0.4 * scale, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
        const cockpitMat = new THREE.MeshStandardMaterial({ 
            color: 0x88ccff,
            transparent: true,
            opacity: 0.6,
            roughness: 0.1
        });
        const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
        cockpit.position.set(1.5 * scale, 0.3 * scale, 0);
        group.add(cockpit);
        
        // Engine nozzle
        const nozzleGeo = new THREE.CylinderGeometry(0.35 * scale, 0.45 * scale, 0.5 * scale, 12);
        const nozzleMat = new THREE.MeshStandardMaterial({ 
            color: 0x222222,
            roughness: 0.2,
            metalness: 0.9
        });
        const nozzle = new THREE.Mesh(nozzleGeo, nozzleMat);
        nozzle.rotation.z = Math.PI / 2;
        nozzle.position.set(-4 * scale, 0, 0);
        group.add(nozzle);
        
        // Engine glow (afterburner)
        const glowGeo = new THREE.SphereGeometry(0.3 * scale, 8, 8);
        const glowMat = new THREE.MeshBasicMaterial({ 
            color: 0xff6600,
            transparent: true,
            opacity: 0.7
        });
        this._engineGlow = new THREE.Mesh(glowGeo, glowMat);
        this._engineGlow.position.set(-4.3 * scale, 0, 0);
        this._engineGlow.visible = false;
        group.add(this._engineGlow);
        
        // Landing gear (simplified)
        const gearMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const gearGeo = new THREE.CylinderGeometry(0.05 * scale, 0.05 * scale, 0.5 * scale, 6);
        
        const frontGear = new THREE.Mesh(gearGeo, gearMat);
        frontGear.position.set(2 * scale, -0.5 * scale, 0);
        group.add(frontGear);
        
        const leftGear = new THREE.Mesh(gearGeo, gearMat);
        leftGear.position.set(-1 * scale, -0.5 * scale, 1.5 * scale);
        group.add(leftGear);
        
        const rightGear = new THREE.Mesh(gearGeo, gearMat);
        rightGear.position.set(-1 * scale, -0.5 * scale, -1.5 * scale);
        group.add(rightGear);
        
        // Wingtip missiles
        const missileGeo = new THREE.CylinderGeometry(0.08 * scale, 0.08 * scale, 1.2 * scale, 6);
        const missileMat = new THREE.MeshStandardMaterial({ color: 0x666666 });
        
        const missile1 = new THREE.Mesh(missileGeo, missileMat);
        missile1.position.set(-1.5 * scale, 0, 3.2 * scale);
        missile1.rotation.x = Math.PI / 2;
        group.add(missile1);
        
        const missile2 = new THREE.Mesh(missileGeo, missileMat);
        missile2.position.set(-1.5 * scale, 0, -3.2 * scale);
        missile2.rotation.x = Math.PI / 2;
        group.add(missile2);
        
        return group;
    }

    updateEngineGlow(throttle: number, dt: number): void {
        if (this._engineGlow) {
            this._engineGlow.visible = throttle > 0.7;
            if (this._engineGlow.visible) {
                const intensity = (throttle - 0.7) / 0.3;
                (this._engineGlow.material as THREE.MeshBasicMaterial).opacity = intensity * 0.8;
                this._engineGlow.scale.setScalar(1 + Math.sin(performance.now() * 0.01) * 0.1);
            }
        }
    }
}