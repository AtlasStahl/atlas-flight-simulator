/** Aircraft-specific HUD theme configurations */

export interface HUDTheme {
  bezel: string;
  face: string;
  faceHighlight: string;
  needle: string;
  needleAccent: string;
  tickColor: string;
  textColor: string;
  accentColor: string;
  stallColor: string;
  font: string;
}

export interface HUDScale {
  maxSpeed: number;
  maxAlt: number;
  stallSpeed: number;
}

export const AIRCRAFT_THEMES: Record<string, { theme: HUDTheme; scale: HUDScale }> = {
  cessna: {
    theme: {
      bezel: '#5a5a5a', face: '#1a1a1a', faceHighlight: '#2a2a2a',
      needle: '#e8e8e8', needleAccent: '#ff3333',
      tickColor: '#ffffff', textColor: '#cccccc',
      accentColor: '#00cc44', stallColor: '#ff6600',
      font: 'Arial, sans-serif'
    },
    scale: { maxSpeed: 400, maxAlt: 5000, stallSpeed: 108 }
  },
  boeing: {
    theme: {
      bezel: '#3a3a3a', face: '#0a0a0a', faceHighlight: '#1a1a1a',
      needle: '#ffffff', needleAccent: '#0088ff',
      tickColor: '#dddddd', textColor: '#bbbbbb',
      accentColor: '#00aaff', stallColor: '#ff8800',
      font: 'Helvetica, sans-serif'
    },
    scale: { maxSpeed: 900, maxAlt: 12000, stallSpeed: 198 }
  },
  extra: {
    theme: {
      bezel: '#4a4a4a', face: '#151515', faceHighlight: '#252525',
      needle: '#ff4444', needleAccent: '#ff4444',
      tickColor: '#ffffff', textColor: '#dddddd',
      accentColor: '#ff6600', stallColor: '#ff0000',
      font: 'Arial, sans-serif'
    },
    scale: { maxSpeed: 700, maxAlt: 6000, stallSpeed: 90 }
  },
  f16: {
    theme: {
      bezel: '#2a3a2a', face: '#050a05', faceHighlight: '#0a150a',
      needle: '#00ff44', needleAccent: '#00ff44',
      tickColor: '#00ff44', textColor: '#00cc33',
      accentColor: '#00ff88', stallColor: '#ff4400',
      font: 'Courier New, monospace'
    },
    scale: { maxSpeed: 1400, maxAlt: 15000, stallSpeed: 144 }
  },
  su27: {
    theme: {
      bezel: '#3a3a3a', face: '#0a0a0a', faceHighlight: '#151515',
      needle: '#ffcc00', needleAccent: '#ffcc00',
      tickColor: '#ffcc00', textColor: '#cccccc',
      accentColor: '#ffaa00', stallColor: '#ff4400',
      font: 'Arial, sans-serif'
    },
    scale: { maxSpeed: 1400, maxAlt: 15000, stallSpeed: 162 }
  }
};

/** Default theme fallback */
export const DEFAULT_THEME: HUDTheme = {
  bezel: '#4a4a4a', face: '#1a1a1a', faceHighlight: '#2a2a2a',
  needle: '#e8e8e8', needleAccent: '#ff3333',
  tickColor: '#ffffff', textColor: '#cccccc',
  accentColor: '#00cc44', stallColor: '#ff6600',
  font: 'Arial, sans-serif'
};

export const DEFAULT_SCALE: HUDScale = { maxSpeed: 400, maxAlt: 5000, stallSpeed: 108 };

/** Get theme and scale for an aircraft type */
export function getAircraftTheme(type: string): { theme: HUDTheme; scale: HUDScale } {
  return AIRCRAFT_THEMES[type] || { theme: DEFAULT_THEME, scale: DEFAULT_SCALE };
}