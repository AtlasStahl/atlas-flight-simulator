/** Game mode definitions */
export const GameMode = { FREE_FLIGHT: 'free_flight', RING_MISSION: 'ring_mission', COMBAT: 'combat' } as const;
export type GameMode = (typeof GameMode)[keyof typeof GameMode];

export interface GameModeConfig {
    mode: GameMode;
    name: string;
    description: string;
    icon: string;
    allowedAircraft: string[];
}

export const GAME_MODES: Record<GameMode, GameModeConfig> = {
    [GameMode.FREE_FLIGHT]: {
        mode: GameMode.FREE_FLIGHT,
        name: 'Freiflug',
        description: 'Erkunde die Welt ohne Einschränkungen',
        icon: '🌍',
        allowedAircraft: ['cessna', 'boeing', 'extra', 'f16', 'su27']
    },
    [GameMode.RING_MISSION]: {
        mode: GameMode.RING_MISSION,
        name: 'Ring-Mission',
        description: 'Fliege durch alle Ringe für Punkte',
        icon: '💍',
        allowedAircraft: ['cessna', 'extra', 'f16']
    },
    [GameMode.COMBAT]: {
        mode: GameMode.COMBAT,
        name: 'Kampfmission',
        description: 'Besiege feindliche Flugzeuge in Wellen',
        icon: '⚔️',
        allowedAircraft: ['f16', 'su27']
    }
};
