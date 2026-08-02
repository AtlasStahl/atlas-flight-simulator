import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { RingObstacle } from '../src/missions/RingObstacle';

describe('RingObstacle', () => {
  let scene: THREE.Scene;
  let ring: RingObstacle;

  beforeEach(() => {
    scene = new THREE.Scene();
    ring = new RingObstacle(scene, new THREE.Vector3(100, 50, 0), 15);
  });

  describe('position and radius', () => {
    it('should store the correct position', () => {
      expect(ring.position.x).toBe(100);
      expect(ring.position.y).toBe(50);
      expect(ring.position.z).toBe(0);
    });

    it('should store the correct radius', () => {
      expect(ring.radius).toBe(15);
    });
  });

  describe('checkPass', () => {
    it('should return true when aircraft is within ring radius', () => {
      const aircraftPos = new THREE.Vector3(100, 50, 0); // Exactly at ring center
      const result = ring.checkPass(aircraftPos);

      expect(result).toBe(true);
      expect(ring.passed).toBe(true);
    });

    it('should account for aircraft radius in collision', () => {
      const ring2 = new RingObstacle(scene, new THREE.Vector3(200, 50, 0), 10);
      // Aircraft is 5 units outside ring, but with radius 6 it should pass
      const aircraftPos = new THREE.Vector3(215, 50, 0);
      const result = ring2.checkPass(aircraftPos, 6);

      expect(result).toBe(true);
    });

    it('should return false when aircraft is too far', () => {
      const ring2 = new RingObstacle(scene, new THREE.Vector3(300, 50, 0), 10);
      const aircraftPos = new THREE.Vector3(350, 50, 0); // 50 units away

      const result = ring2.checkPass(aircraftPos, 3);

      expect(result).toBe(false);
      expect(ring2.passed).toBe(false);
    });

    it('should return false if already passed', () => {
      ring.checkPass(new THREE.Vector3(100, 50, 0));
      const result = ring.checkPass(new THREE.Vector3(100, 50, 0));

      expect(result).toBe(false);
    });

    it('should change mesh color when passed', () => {
      const material = ring.mesh.material as THREE.MeshStandardMaterial;
      expect(material.color.getHex()).toBe(0x00ff00);

      ring.checkPass(new THREE.Vector3(100, 50, 0));

      expect(material.color.getHex()).toBe(0xffff00);
    });
  });

  describe('mesh creation', () => {
    it('should add mesh to scene', () => {
      expect(scene.children.length).toBeGreaterThan(0);
    });

    it('should create mesh with correct position', () => {
      expect(ring.mesh.position.x).toBe(100);
      expect(ring.mesh.position.y).toBe(50);
      expect(ring.mesh.position.z).toBe(0);
    });
  });
});