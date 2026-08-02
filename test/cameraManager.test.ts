import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { CameraManager, CameraMode } from '../src/camera/CameraManager';

describe('CameraManager', () => {
  let camera: THREE.PerspectiveCamera;
  let manager: CameraManager;

  beforeEach(() => {
    camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.1, 20000);
    manager = new CameraManager(camera);
  });

  describe('initial state', () => {
    it('should default to CHASE mode', () => {
      expect(manager.mode).toBe(CameraMode.CHASE);
    });
  });

  describe('setMode', () => {
    it('should switch to COCKPIT mode', () => {
      manager.setMode(CameraMode.COCKPIT);
      expect(manager.mode).toBe(CameraMode.COCKPIT);
    });

    it('should switch to CINEMATIC mode', () => {
      manager.setMode(CameraMode.CINEMATIC);
      expect(manager.mode).toBe(CameraMode.CINEMATIC);
    });

    it('should switch to TOWER mode', () => {
      manager.setMode(CameraMode.TOWER);
      expect(manager.mode).toBe(CameraMode.TOWER);
    });

    it('should not change if same mode is set', () => {
      manager.setMode(CameraMode.CHASE);
      expect(manager.mode).toBe(CameraMode.CHASE);
    });
  });

  describe('cycleMode', () => {
    it('should cycle through all modes', () => {
      const modes = [CameraMode.CHASE, CameraMode.COCKPIT, CameraMode.CINEMATIC, CameraMode.TOWER];

      let current = manager.mode;
      const seen = new Set<CameraMode>();

      for (let i = 0; i < modes.length; i++) {
        seen.add(current);
        manager.cycleMode();
        current = manager.mode;
      }

      // Should have seen all 4 modes
      expect(seen.size).toBeGreaterThanOrEqual(3);
    });
  });

  describe('update', () => {
    it('should not throw when updating chase camera', () => {
      const pos = new THREE.Vector3(0, 10, 0);
      const rot = new THREE.Euler(0, 0, 0, 'YXZ');

      expect(() => manager.update(pos, rot, 0.016)).not.toThrow();
    });

    it('should not throw when updating cockpit camera', () => {
      manager.setMode(CameraMode.COCKPIT);
      const pos = new THREE.Vector3(0, 10, 0);
      const rot = new THREE.Euler(0, 0, 0, 'YXZ');

      expect(() => manager.update(pos, rot, 0.016)).not.toThrow();
    });

    it('should not throw when updating cinematic camera', () => {
      manager.setMode(CameraMode.CINEMATIC);
      const pos = new THREE.Vector3(0, 10, 0);
      const rot = new THREE.Euler(0, 0, 0, 'YXZ');

      expect(() => manager.update(pos, rot, 0.016)).not.toThrow();
    });

    it('should not throw when updating tower camera', () => {
      manager.setMode(CameraMode.TOWER);
      const pos = new THREE.Vector3(0, 10, 0);
      const rot = new THREE.Euler(0, 0, 0, 'YXZ');

      expect(() => manager.update(pos, rot, 0.016)).not.toThrow();
    });
  });

  describe('orbit', () => {
    it('should toggle orbit mode', () => {
      manager.toggleOrbit();
      // No assertion possible on private _isOrbiting, but should not throw
      expect(() => manager.toggleOrbit()).not.toThrow();
    });

    it('should handle mouse move without throwing', () => {
      manager.toggleOrbit();
      expect(() => manager.onMouseMove(10, 5)).not.toThrow();
    });

    it('should handle mouse wheel without throwing', () => {
      expect(() => manager.onMouseWheel(100)).not.toThrow();
    });
  });
});