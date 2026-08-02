import * as THREE from 'three';
import { EnemyAircraft } from './EnemyAircraft';

/** Manages combat waves, enemy spawning, and player weapons */
export class CombatManager {
    private _scene: THREE.Scene;
    private _enemies: EnemyAircraft[] = [];
    private _bullets: THREE.Mesh[] = [];
    private _wave: number = 0;
    private _enemiesPerWave: number = 3;
    private _spawnTimer: number = 0;
    private _spawnInterval: number = 3;
    private _isActive: boolean = false;
    private _playerHealth: number = 100;
    private _maxPlayerHealth: number = 100;
    private _score: number = 0;
    private _lastShot: number = 0;
    private _shootCooldown: number = 0.15;

    // Shared bullet geometry and material (object pooling)
    private _bulletGeo = new THREE.SphereGeometry(0.3, 4, 4);
    private _bulletMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });

    // Explosion particles
    private _explosions: THREE.Points[] = [];

    constructor(scene: THREE.Scene) {
        this._scene = scene;
    }

    get wave(): number { return this._wave; }
    get score(): number { return this._score; }
    get playerHealth(): number { return this._playerHealth; }
    get maxPlayerHealth(): number { return this._maxPlayerHealth; }
    get enemiesAlive(): number { 
        return this._enemies.filter(e => e.alive).length; 
    }
    get totalEnemiesInWave(): number { return this._enemiesPerWave; }
    get isActive(): boolean { return this._isActive; }

    startWave(): void {
        this._isActive = true;
        this._wave++;
        this._enemiesPerWave = Math.min(3 + this._wave * 2, 15);
        this._spawnTimer = 0;
        this._playerHealth = this._maxPlayerHealth;
    }

    endWave(): void {
        this._isActive = false;
        this._removeEnemies();
    }

    reset(): void {
        this._removeEnemies();
        this._removeBullets();
        this._removeExplosions();
        this._wave = 0;
        this._score = 0;
        this._playerHealth = this._maxPlayerHealth;
        this._isActive = false;
    }

    private _removeEnemies(): void {
        for (const enemy of this._enemies) {
            enemy.cleanup();
            this._scene.remove(enemy.group);
        }
        this._enemies = [];
    }

    private _removeBullets(): void {
        for (const bullet of this._bullets) {
            this._scene.remove(bullet);
            bullet.geometry.dispose();
            (bullet.material as THREE.MeshBasicMaterial).dispose();
        }
        this._bullets = [];
    }

    private _removeExplosions(): void {
        for (const explosion of this._explosions) {
            this._scene.remove(explosion);
            explosion.geometry.dispose();
            (explosion.material as THREE.PointsMaterial).dispose();
        }
        this._explosions = [];
    }

    update(dt: number, playerPosition: THREE.Vector3, playerRotation: THREE.Euler, time: number, controls: { shoot: boolean }): { playerHit: boolean } {
        const result = { playerHit: false };
        
        if (!this._isActive) return result;
        
        // Spawn enemies
        const aliveCount = this._enemies.filter(e => e.alive).length;
        if (aliveCount < this._enemiesPerWave && this._spawnTimer <= 0) {
            this._spawnEnemy(playerPosition);
            this._spawnTimer = this._spawnInterval;
        }
        this._spawnTimer -= dt;
        
        // Check if wave is complete
        if (aliveCount === 0 && this._enemies.length >= this._enemiesPerWave) {
            this.startWave(); // Next wave
        }
        
        // Update enemies
        for (const enemy of this._enemies) {
            const enemyResult = enemy.update(dt, playerPosition, time);
            
            if (enemyResult.hit) {
                result.playerHit = true;
                this._playerHealth -= 10;
            }
        }
        
        // Player shooting
        if (controls.shoot && time - this._lastShot > this._shootCooldown) {
            this._lastShot = time;
            this._shoot(playerPosition, playerRotation);
        }
        
        // Update bullets
        this._updateBullets(dt, playerPosition);
        
        // Update explosions
        this._updateExplosions(dt);
        
        return result;
    }

    private _spawnEnemy(playerPosition: THREE.Vector3): void {
        const angle = Math.random() * Math.PI * 2;
        const distance = 800 + Math.random() * 400;
        const altitude = 200 + Math.random() * 300;
        
        const position = new THREE.Vector3(
            playerPosition.x + Math.cos(angle) * distance,
            altitude,
            playerPosition.z + Math.sin(angle) * distance
        );
        
        const speed = 60 + Math.random() * 40 + this._wave * 5;
        const health = 80 + this._wave * 10;
        
        const enemy = new EnemyAircraft(this._scene, position, { speed, health });
        this._enemies.push(enemy);
    }

    private _shoot(playerPosition: THREE.Vector3, playerRotation: THREE.Euler): void {
        // Clone material to avoid shared state issues, reuse geometry
        const bullet = new THREE.Mesh(this._bulletGeo, this._bulletMat.clone());
        
        // Position at aircraft nose
        const offset = new THREE.Vector3(3, 0, 0).applyEuler(playerRotation);
        bullet.position.copy(playerPosition).add(offset);
        
        // Velocity in direction aircraft is facing
        const direction = new THREE.Vector3(1, 0, 0).applyEuler(playerRotation);
        bullet.userData.velocity = direction.multiplyScalar(300);
        bullet.userData.life = 3;
        
        this._scene.add(bullet);
        this._bullets.push(bullet);
    }

    private _updateBullets(dt: number, playerPosition: THREE.Vector3): void {
        for (let i = this._bullets.length - 1; i >= 0; i--) {
            const bullet = this._bullets[i];
            const velocity = bullet.userData.velocity as THREE.Vector3;
            const life = (bullet.userData.life as number) - dt;
            
            bullet.position.add(velocity.clone().multiplyScalar(dt));
            bullet.userData.life = life;
            
            // Check collision with enemies
            let hit = false;
            for (const enemy of this._enemies) {
                if (!enemy.alive) continue;
                
                const dist = bullet.position.distanceTo(enemy.position);
                if (dist < 15) {
                    enemy.takeDamage(25);
                    hit = true;
                    
                    if (!enemy.alive) {
                        this._score += 100;
                        // Add explosion
                        const explosion = enemy.getExplosion();
                        if (explosion) {
                            this._scene.add(explosion);
                            this._explosions.push(explosion);
                        }
                    }
                    break;
                }
            }
            
            // Remove if hit, expired, or too far
            if (hit || life <= 0 || bullet.position.distanceTo(playerPosition) > 1000) {
                this._scene.remove(bullet);
                bullet.geometry.dispose();
                (bullet.material as THREE.MeshBasicMaterial).dispose();
                this._bullets.splice(i, 1);
            }
        }
    }

    private _updateExplosions(dt: number): void {
        for (let i = this._explosions.length - 1; i >= 0; i--) {
            const explosion = this._explosions[i];
            const life = (explosion.userData.life as number) - dt;
            explosion.userData.life = life;
            
            // Expand and fade
            const positions = explosion.geometry.attributes.position.array as Float32Array;
            const velocities = explosion.userData.velocities as THREE.Vector3[];
            
            if (velocities) {
                for (let j = 0; j < velocities.length; j++) {
                    positions[j * 3] += velocities[j].x * dt;
                    positions[j * 3 + 1] += velocities[j].y * dt;
                    positions[j * 3 + 2] += velocities[j].z * dt;
                }
                explosion.geometry.attributes.position.needsUpdate = true;
            }
            
            // Fade out
            const mat = explosion.material as THREE.PointsMaterial;
            mat.opacity = Math.max(0, life / 2);
            
            if (life <= 0) {
                this._scene.remove(explosion);
                explosion.geometry.dispose();
                mat.dispose();
                this._explosions.splice(i, 1);
            }
        }
    }

    takePlayerDamage(amount: number): void {
        this._playerHealth -= amount;
        this._playerHealth = Math.max(0, this._playerHealth);
    }

    healPlayer(amount: number): void {
        this._playerHealth = Math.min(this._maxPlayerHealth, this._playerHealth + amount);
    }
}