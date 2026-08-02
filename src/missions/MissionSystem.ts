import * as THREE from 'three';
import { RingObstacle } from './RingObstacle';

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
      const radius = 15 + Math.random() * 10;
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

    const completed = ringsPassed === this._rings.length;
    const timeElapsed = (performance.now() - this._startTime) / 1000;

    return {
      totalRings: this._rings.length,
      ringsPassed,
      score: this._score,
      timeElapsed,
      completed
    };
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