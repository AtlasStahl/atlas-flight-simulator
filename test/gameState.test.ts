import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/core/GameState';
import { GameMode } from '../src/game/GameMode';

describe('GameState', () => {
  it('should create initial state with defaults', () => {
    const state = createInitialState();

    expect(state.aircraftType).toBe('cessna');
    expect(state.speed).toBe(0);
    expect(state.altitude).toBe(0);
    expect(state.throttle).toBe(0);
    expect(state.crashed).toBe(false);
    expect(state.gameMode).toBe(GameMode.FREE_FLIGHT);
    expect(state.cameraMode).toBe('chase');
    expect(state.missionStatus).toBeUndefined();
    expect(state.combatStatus).toBeUndefined();
  });

  it('should have correct initial flight values', () => {
    const state = createInitialState();

    expect(state.verticalSpeed).toBe(0);
    expect(state.pitch).toBe(0);
    expect(state.roll).toBe(0);
    expect(state.heading).toBe(0);
    expect(state.onGround).toBe(false);
  });
});