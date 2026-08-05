import * as THREE from 'three';
import { worldRandom } from '../core/Random';

/** Enemy aircraft AI with waypoint navigation and attack behavior */
export class EnemyAircraft {
    private _group: THREE.Group;
    private _position: THREE.Vector3;
    private _rotation: THREE.Euler;
    private _velocity: THREE.Vector3;
    private _health: number;
    private _maxHealth: number;
    private _alive: boolean;
    private _speed: number;
    private _state: 'patrol' | 'attack' | 'retreat';
    private _stateTimer: number;
    private _waypoints!: THREE.Vector3[];
    private _currentWaypoint: number;
    private _homePosition: THREE.Vector3;
    private _playerPosition: THREE.Vector3;
    private _lastShot: number;
    private _shootInterval: number;
    private _color: number;
    private _scale: number;
    private _trailParticles: THREE.Points | null = null;
    private _hitFlashTimer: number = 0;
    private _originalColors: Map<THREE.Mesh, number> = new Map();
    // REN-10: Wiederverwendbare Vektoren für Hot-Path
    private readonly _tmpDir = new THREE.Vector3();
    private readonly _tmpVel = new THREE.Vector3();
    private readonly _tmpTargetRot = new THREE.Euler(0, 0, 0, 'YXZ');

    // QA-03: seedbares PRNG für reproduzierbare Waypoints
    private readonly _random = worldRandom;

    constructor(scene: THREE.Scene, position: THREE.Vector3, config?: { speed?: number, health?: number }) {
        this._position = position.clone();
        this._rotation = new THREE.Euler(0, 0, 0, 'YXZ');
        this._velocity = new THREE.Vector3();
        this._health = config?.health ?? 100;
        this._maxHealth = this._health;
        this._alive = true;
        this._speed = config?.speed ?? 80;
        this._state = 'patrol';
        this._stateTimer = 0;
        this._currentWaypoint = 0;
        this._homePosition = position.clone();
        this._playerPosition = new THREE.Vector3();
        this._lastShot = 0;
        this._shootInterval = 2;
        this._color = 0xff2200;
        this._scale = 1.0;

        this._group = this._createModel();
        this._group.position.copy(this._position);
        scene.add(this._group);

        this._generateWaypoints();
        this._createTrail();
    }

    get group(): THREE.Group { return this._group; }
    get position(): THREE.Vector3 { return this._position; }
    get health(): number { return this._health; }
    get maxHealth(): number { return this._maxHealth; }
    get alive(): boolean { return this._alive; }
    get state(): string { return this._state; }
    get explosionComplete(): boolean { return !this._alive && this._hitFlashTimer <= 0 && this._group.visible === false; }

    /** Explosion-Referenz zurückgeben und löschen (RES-03: kein doppelter Besitz) */
    getExplosion(): THREE.Points | null {
      const explosion = this._group.userData.explosion as THREE.Points | undefined;
      delete this._group.userData.explosion;
      return explosion ?? null;
    }

    private _createModel(): THREE.Group {
        const group = new THREE.Group();

        // Fuselage
        const fuselageGeo = new THREE.CylinderGeometry(0.4, 0.3, 6, 8);
        const fuselageMat = new THREE.MeshStandardMaterial({
            color: this._color,
            roughness: 0.4,
            metalness: 0.6
        });
        const fuselage = new THREE.Mesh(fuselageGeo, fuselageMat);
        fuselage.rotation.z = Math.PI / 2;
        group.add(fuselage);

        // Wings
        const wingGeo = new THREE.BoxGeometry(1.5, 0.1, 4);
        const wingMat = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.5
        });
        const wings = new THREE.Mesh(wingGeo, wingMat);
        group.add(wings);

        // Tail
        const tailGeo = new THREE.BoxGeometry(0.8, 1.2, 0.1);
        const tail = new THREE.Mesh(tailGeo, wingMat);
        tail.position.set(-2.5, 0.5, 0);
        group.add(tail);

        // Cockpit
        const cockpitGeo = new THREE.SphereGeometry(0.35, 8, 6);
        const cockpitMat = new THREE.MeshStandardMaterial({
            color: 0x88ccff,
            transparent: true,
            opacity: 0.7
        });
        const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
        cockpit.position.set(1, 0.3, 0);
        group.add(cockpit);

        // Engine glow
        const engineGeo = new THREE.SphereGeometry(0.25, 8, 8);
        const engineMat = new THREE.MeshBasicMaterial({
            color: 0xff6600
        });
        const engine = new THREE.Mesh(engineGeo, engineMat);
        engine.position.set(-3, 0, 0);
        group.add(engine);

        group.scale.setScalar(this._scale);
        return group;
    }

    private _createTrail(): void {
        const count = 100;
        const geo = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            positions[i * 3] = 0;
            positions[i * 3 + 1] = 0;
            positions[i * 3 + 2] = 0;
        }

        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const mat = new THREE.PointsMaterial({
            color: 0xff4400,
            size: 2,
            transparent: true,
            opacity: 0.5,
            depthWrite: false
        });

        this._trailParticles = new THREE.Points(geo, mat);
        this._group.add(this._trailParticles);
    }

    private _generateWaypoints(): void {
        this._waypoints = [];
        const numWaypoints = 4;
        const radius = 500;

        for (let i = 0; i < numWaypoints; i++) {
            const angle = (i / numWaypoints) * Math.PI * 2;
            const wp = new THREE.Vector3(
                this._homePosition.x + Math.cos(angle) * radius,
                100 + this._random() * 200,
                this._homePosition.z + Math.sin(angle) * radius
            );
            this._waypoints.push(wp);
        }
    }

    update(dt: number, playerPosition: THREE.Vector3, time: number): { shot?: boolean, hit?: boolean } {
        if (!this._alive) return {};

        this._playerPosition.copy(playerPosition);
        this._stateTimer -= dt;

        // State machine
        switch (this._state) {
            case 'patrol':
                this._updatePatrol(dt);
                break;
            case 'attack':
                this._updateAttack(dt);
                break;
            case 'retreat':
                this._updateRetreat(dt);
                break;
        }

        // Check distance to player for state changes
        const distToPlayer = this._position.distanceTo(playerPosition);

        if (this._state === 'patrol' && distToPlayer < 300) {
            this._state = 'attack';
            this._stateTimer = 5;
        } else if (this._state === 'attack' && (distToPlayer > 500 || this._health < this._maxHealth * 0.3)) {
            this._state = 'retreat';
            this._stateTimer = 3;
        } else if (this._state === 'retreat' && this._stateTimer <= 0) {
            this._state = 'patrol';
        }

        // Update position and rotation
        this._group.position.copy(this._position);
        this._group.rotation.copy(this._rotation);

        // Shooting
        const result: { shot?: boolean, hit?: boolean } = {};
        if (this._state === 'attack' && time - this._lastShot > this._shootInterval) {
            this._lastShot = time;
            result.shot = true;
            // Check if shot hits player (simple distance check)
            if (distToPlayer < 50) {
                result.hit = true;
            }
        }

        return result;
    }

    private _updatePatrol(dt: number): void {
        const target = this._waypoints[this._currentWaypoint];
        this._tmpDir.subVectors(target, this._position);

        if (this._tmpDir.length() < 20) {
            this._currentWaypoint = (this._currentWaypoint + 1) % this._waypoints.length;
            return;
        }

        this._tmpDir.normalize();
        this._velocity.copy(this._tmpDir.multiplyScalar(this._speed));
        this._tmpVel.copy(this._velocity).multiplyScalar(dt);
        this._position.add(this._tmpVel);

        // Smooth rotation towards velocity
        this._tmpTargetRot.y = Math.atan2(this._velocity.z, this._velocity.x);
        this._rotation.y += (this._tmpTargetRot.y - this._rotation.y) * 2 * dt;
    }

    private _updateAttack(dt: number): void {
        // Move towards player
        this._tmpDir.subVectors(this._playerPosition, this._position);
        const dist = this._tmpDir.length();

        if (dist > 100) {
            this._tmpDir.normalize();
            this._velocity.copy(this._tmpDir.multiplyScalar(this._speed * 1.5));
            this._tmpVel.copy(this._velocity).multiplyScalar(dt);
            this._position.add(this._tmpVel);
        } else {
            // Circle around player
            this._tmpDir.set(-this._tmpDir.z, 0, this._tmpDir.x).normalize();
            this._velocity.copy(this._tmpDir.multiplyScalar(this._speed));
            this._tmpVel.copy(this._velocity).multiplyScalar(dt);
            this._position.add(this._tmpVel);
        }

        // Keep altitude
        this._position.y = Math.max(this._position.y, 50);

        // Rotate towards player
        this._tmpTargetRot.y = Math.atan2(this._velocity.z, this._velocity.x);
        this._rotation.y += (this._tmpTargetRot.y - this._rotation.y) * 3 * dt;

        if (this._stateTimer <= 0) {
            this._state = 'patrol';
        }
    }

    private _updateRetreat(dt: number): void {
        // Fly away from player
        this._tmpDir.subVectors(this._position, this._playerPosition).normalize();
        this._velocity.copy(this._tmpDir.multiplyScalar(this._speed * 2));
        this._tmpVel.copy(this._velocity).multiplyScalar(dt);
        this._position.add(this._tmpVel);

        // Gain altitude
        this._position.y += 50 * dt;

        this._tmpTargetRot.y = Math.atan2(this._velocity.z, this._velocity.x);
        this._rotation.y += (this._tmpTargetRot.y - this._rotation.y) * 2 * dt;

        if (this._stateTimer <= 0) {
            this._state = 'patrol';
        }
    }

    takeDamage(amount: number): void {
        this._health -= amount;

        if (this._health <= 0) {
            this._alive = false;
            this._explode();
        } else {
            // Flash white using timer-based approach (no setTimeout on potentially disposed materials)
            this._hitFlashTimer = 0.1;
            this._group.traverse(child => {
                if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
                    if (!this._originalColors.has(child)) {
                        this._originalColors.set(child, child.material.color.getHex());
                    }
                    child.material.color.setHex(0xffffff);
                }
            });
        }
    }

    updateHitFlash(dt: number): void {
        if (this._hitFlashTimer > 0) {
            this._hitFlashTimer -= dt;
            if (this._hitFlashTimer <= 0) {
                this._group.traverse(child => {
                    if (child instanceof THREE.Mesh && this._originalColors.has(child)) {
                        (child.material as THREE.MeshStandardMaterial).color.setHex(this._originalColors.get(child)!);
                        this._originalColors.delete(child);
                    }
                });
            }
        }
    }

    private _explode(): void {
        // Make group invisible; explosion particles below provide visual feedback
        this._group.visible = false;

        // Create explosion particles
        const particleCount = 50;
        const particleGeo = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities: THREE.Vector3[] = [];

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = this._position.x;
            positions[i * 3 + 1] = this._position.y;
            positions[i * 3 + 2] = this._position.z;

            // QA-03: Reproduzierbare Partikel-Geschwindigkeiten
            velocities.push(new THREE.Vector3(
                (this._random() - 0.5) * 100,
                (this._random() - 0.5) * 100,
                (this._random() - 0.5) * 100
            ));
        }

        particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const particleMat = new THREE.PointsMaterial({
            color: 0xff4400,
            size: 5,
            transparent: true,
            depthWrite: false
        });

        const particles = new THREE.Points(particleGeo, particleMat);
        particles.userData.velocities = velocities;
        particles.userData.life = 2;

        // This will be added to scene by the combat system
        this._group.userData.explosion = particles;
    }

    reset(_scene: THREE.Scene): void {
        this._health = this._maxHealth;
        this._alive = true;
        this._state = 'patrol';
        this._position.copy(this._homePosition);
        this._group.visible = true;
        this._group.position.copy(this._position);
    }

    cleanup(): void {
        // Dispose trail particles
        if (this._trailParticles) {
            this._group.remove(this._trailParticles);
            this._trailParticles.geometry.dispose();
            (this._trailParticles.material as THREE.PointsMaterial).dispose();
            this._trailParticles = null;
        }
        // Dispose all mesh geometries and materials in the group
        this._group.traverse(child => {
            if (child instanceof THREE.Mesh) {
                child.geometry?.dispose();
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    child.material?.dispose();
                }
            }
        });
    }
}
