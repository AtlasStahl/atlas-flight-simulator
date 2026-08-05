import * as THREE from 'three';
import { RingObstacle } from './RingObstacle';
import { worldRandom } from '../core/Random';

export interface MissionStatus {
  totalRings: number;
  ringsPassed: number;
  score: number;
  timeElapsed: number;
  completed: boolean;
}

/** Mission management system for ring-flying challenges */
export class MissionSystem {
  private _rings: RingObstacle[] = [];
  private _startTime: number = 0;
  private _score: number = 0;
  // REN-10: Wiederverwendbares Status-Objekt statt pro-Frame-Allokation
  private readonly _status: MissionStatus = { totalRings: 0, ringsPassed: 0, score: 0, timeElapsed: 0, completed: false };

  /** QA-03: seedbares PRNG für reproduzierbare Missionen */
  private readonly _random = worldRandom;

  constructor(_scene: THREE.Scene) {
    // Don't create rings yet - wait for ring_mission mode
  }

  createRingMission(scene: THREE.Scene) {
    // Use clearRings which now properly disposes
    this.clearRings(scene);
    this._startTime = performance.now();

    // Create 8 rings in a path around the runway
    const ringPositions = [
      new THREE.Vector3(500, 50, 200),
      new THREE.Vector3(800, 80, 400),
      new THREE.Vector3(1200, 120, 300),
      new THREE.Vector3(1500, 100, -200),
      new THREE.Vector3(1800, 150, -400),
      new THREE.Vector3(2000, 180, -100),
      new THREE.Vector3(2200, 120, 200),
      new THREE.Vector3(2400, 80, 400),
    ];

    ringPositions.forEach((pos, i) => {
      const radius = 15 + this._random() * 10;
      const rotationY = (i * Math.PI) / 4; // Varying orientations
      this._rings.push(new RingObstacle(scene, pos, radius, rotationY));
    });
  }

  update(aircraftPosition: THREE.Vector3): MissionStatus {
    let ringsPassed = 0;
    let newScore = this._score;

    this._rings.forEach(ring => {
      if (ring.checkPass(aircraftPosition)) {
        newScore += 100;
      }
      if (ring.passed) ringsPassed++;
    });

    this._score = newScore;

    const completed = this._rings.length > 0 && ringsPassed === this._rings.length;
    const timeElapsed = (performance.now() - this._startTime) / 1000;

    // REN-10: Wiederverwendbares Objekt statt pro-Frame-Allokation
    this._status.totalRings = this._rings.length;
    this._status.ringsPassed = ringsPassed;
    this._status.score = this._score;
    this._status.timeElapsed = timeElapsed;
    this._status.completed = completed;
    return this._status;
  }

  reset(scene: THREE.Scene) {
    // Only create rings when explicitly called for ring mission
    this.createRingMission(scene);
  }

  clearRings(scene: THREE.Scene) {
    // Remove all rings with proper disposal (for free flight mode)
    for (const ring of this._rings) {
      scene.remove(ring.mesh);
      ring.mesh.geometry?.dispose();
      if (Array.isArray(ring.mesh.material)) {
        ring.mesh.material.forEach(m => m.dispose());
      } else {
        ring.mesh.material?.dispose();
      }
    }
    this._rings = [];
    this._score = 0;
  }
}