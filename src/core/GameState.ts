import { GameMode } from '../game/GameMode';
import type { MissionStatus } from '../missions/MissionSystem';

/** Centralized game state to reduce coupling between systems */
export interface GameState {
  // Aircraft
  aircraftType: string;
  speed: number;
  altitude: number;
  heading: number;
  throttle: number;
  verticalSpeed: number;
  pitch: number;
  roll: number;
  onGround: boolean;
  crashed: boolean;

  // Game mode
  gameMode: GameMode;
  cameraMode: string;

  // Mission
  missionStatus: MissionStatus | undefined;

  // Combat
  combatStatus: CombatStatus | undefined;
}

export interface CombatStatus {
  wave: number;
  score: number;
  playerHealth: number;
  maxPlayerHealth: number;
  enemiesAlive: number;
  totalEnemies: number;
}

/** Create an initial empty game state */
export function createInitialState(): GameState {
  return {
    aircraftType: 'cessna',
    speed: 0,
    altitude: 0,
    heading: 0,
    throttle: 0,
    verticalSpeed: 0,
    pitch: 0,
    roll: 0,
    onGround: false,
    crashed: false,
    gameMode: GameMode.FREE_FLIGHT,
    cameraMode: 'chase',
    missionStatus: undefined,
    combatStatus: undefined,
  };
}