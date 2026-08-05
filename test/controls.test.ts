import { describe, it, expect, beforeEach } from 'vitest';
import { Controls } from '../src/input/Controls';

describe('Controls', () => {
  let controls: Controls;

  beforeEach(() => {
    controls = new Controls();
    controls.reset();
  });

  describe('pitch mapping', () => {
    it('should map S key to pitchUp', () => {
      controls.keys = new Set(['KeyS']);
      controls.update();

      expect(controls.pitchUp).toBe(true);
      expect(controls.pitchDown).toBe(false);
    });

    it('should map W key to pitchDown', () => {
      controls.keys = new Set(['KeyW']);
      controls.update();

      expect(controls.pitchDown).toBe(true);
      expect(controls.pitchUp).toBe(false);
    });
  });

  describe('roll mapping', () => {
    it('should map A key to rollLeft', () => {
      controls.keys = new Set(['KeyA']);
      controls.update();

      expect(controls.rollLeft).toBe(true);
      expect(controls.rollRight).toBe(false);
    });

    it('should map D key to rollRight', () => {
      controls.keys = new Set(['KeyD']);
      controls.update();

      expect(controls.rollRight).toBe(true);
      expect(controls.rollLeft).toBe(false);
    });
  });

  describe('yaw mapping', () => {
    it('should map ArrowLeft to yawLeft', () => {
      controls.keys = new Set(['ArrowLeft']);
      controls.update();

      expect(controls.yawLeft).toBe(true);
      expect(controls.yawRight).toBe(false);
    });

    it('should map ArrowRight to yawRight', () => {
      controls.keys = new Set(['ArrowRight']);
      controls.update();

      expect(controls.yawRight).toBe(true);
      expect(controls.yawLeft).toBe(false);
    });
  });

  describe('throttle mapping', () => {
    it('should map ArrowUp to throttleUp', () => {
      controls.keys = new Set(['ArrowUp']);
      controls.update();

      expect(controls.throttleUp).toBe(true);
      expect(controls.throttleDown).toBe(false);
    });

    it('should map ArrowDown to throttleDown', () => {
      controls.keys = new Set(['ArrowDown']);
      controls.update();

      expect(controls.throttleDown).toBe(true);
      expect(controls.throttleUp).toBe(false);
    });
  });

  describe('special controls', () => {
    it('should map G to flaps', () => {
      controls.keys = new Set(['KeyG']);
      controls.update();

      expect(controls.flaps).toBe(true);
    });

    it('should map B to brakes', () => {
      controls.keys = new Set(['KeyB']);
      controls.update();

      expect(controls.brakes).toBe(true);
    });

    it('should map Space to shoot', () => {
      controls.keys = new Set(['Space']);
      controls.update();

      expect(controls.shoot).toBe(true);
    });

    it('should map V to shoot', () => {
      controls.keys = new Set(['KeyV']);
      controls.update();

      expect(controls.shoot).toBe(true);
    });

    it('should map C to cycleCamera', () => {
      controls.keys = new Set(['KeyC']);
      controls.update();

      expect(controls.cycleCamera).toBe(true);
    });

    it('should map Shift to toggleOrbit', () => {
      controls.keys = new Set(['ShiftLeft']);
      controls.update();

      expect(controls.toggleOrbit).toBe(true);
    });
  });

  describe('multiple keys', () => {
    it('should handle multiple simultaneous inputs', () => {
      controls.keys = new Set(['KeyS', 'KeyD', 'ArrowUp']);
      controls.update();

      expect(controls.pitchUp).toBe(true);
      expect(controls.rollRight).toBe(true);
      expect(controls.throttleUp).toBe(true);
    });
  });

  describe('reset', () => {
    it('should clear all keys', () => {
      controls.keys = new Set(['KeyS', 'KeyA', 'KeyD']);
      controls.reset();

      controls.update();
      expect(controls.pitchUp).toBe(false);
      expect(controls.rollLeft).toBe(false);
      expect(controls.rollRight).toBe(false);
    });
  });
});