/**
 * Zentrale Flughafen-Definition — PHY-15
 *
 * Eine einzige Quelle für alle Flughafen-Dimensionen:
 * - Flache Zone im Höhenfeld (keine Hügel)
 * - Asphalt-Färbung im Terrain
 * - Baum-Ausschlusszone
 * - Kollisions-Bounds der Startbahn
 */

/** Halbe Ausdehnung der flachen Flughafenzone (meters von Ursprung) */
export const AIRPORT_HALF_X = 1000;
export const AIRPORT_HALF_Z = 200;

/** Breite des sanften Übergangs zwischen flacher Zone und Terrain (meters) */
export const AIRPORT_BLEND_WIDTH = 200;

/** Startbahn-Bounds für Kollisionserkennung (meters von Ursprung) */
export const RUNWAY_HALF_LENGTH = 800;
export const RUNWAY_HALF_WIDTH = 30;

/** Asphalt-Färbung: Halbe Ausdehnung im Terrain (meters von Ursprung) */
export const AIRPORT_COLOR_HALF_X = 1000;
export const AIRPORT_COLOR_HALF_Z = 200;

/**
 * Terminal-Vorfeld (Apron) — die einzige asphaltierte Fläche neben Bahn und Rollwegen.
 * Terminal steht bei (TERMINAL_X, 0) mit der Front nach +Z; davor liegt das Vorfeld,
 * dahinter (größeres Z) die Hangars. Alles liegt innerhalb der flachen Zone.
 */
export const TERMINAL_X = 800;
export const APRON_X1 = 660;
export const APRON_X2 = 990;
export const APRON_Z1 = 20;
export const APRON_Z2 = 165;
