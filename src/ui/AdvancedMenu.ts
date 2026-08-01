import { type AircraftConfig, AIRCRAFT_CONFIGS } from '../aircraft/AircraftConfig';
import { GameMode, GAME_MODES } from '../game/GameMode';
import { WEATHER_PRESETS } from '../weather/WeatherSystem';

/** Simplified single-page menu with independent aircraft, mode, and weather selection */
export class AdvancedMenu {
    private _container: HTMLDivElement;
    private _selectedAircraft: string = 'cessna';
    private _selectedWeather: string = 'clear';
    private _selectedGameMode: GameMode = GameMode.FREE_FLIGHT;

    // References to sections for independent updates
    private _aircraftRow: HTMLDivElement | null = null;
    private _modeCol: HTMLDivElement | null = null;
    private _weatherCol: HTMLDivElement | null = null;

    private _onSelect: (config: AircraftConfig, weather: string, mode: GameMode) => void;

    constructor(onSelect: (config: AircraftConfig, weather: string, mode: GameMode) => void) {
        this._onSelect = onSelect;
        this._build();
    }

    private _build() {
        this._container = document.createElement('div');
        this._container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(180deg, #0c1220 0%, #1a2035 100%);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 200;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: white;
            overflow-y: auto;
        `;

        // Title
        const title = document.createElement('h1');
        title.textContent = '✈ Flight Simulator';
        title.style.cssText = `
            font-size: 42px;
            margin-bottom: 5px;
            color: #ffffff;
            text-shadow: 0 0 20px rgba(0, 150, 255, 0.5);
        `;
        this._container.appendChild(title);

        const subtitle = document.createElement('p');
        subtitle.textContent = 'Flugzeug · Modus · Wetter';
        subtitle.style.cssText = 'font-size: 15px; color: #6688aa; margin-bottom: 20px;';
        this._container.appendChild(subtitle);

        // Single-page content
        const contentArea = document.createElement('div');
        contentArea.style.cssText = 'width: 950px; max-width: 95vw; display: flex; flex-direction: column; gap: 15px;';

        // Aircraft row (independent section)
        this._aircraftRow = document.createElement('div');
        this._aircraftRow.style.cssText = 'display: flex; gap: 8px; flex-wrap: wrap; justify-content: center;';
        this._renderAircraftCards();
        contentArea.appendChild(this._aircraftRow);

        // Mode + Weather row
        const bottomRow = document.createElement('div');
        bottomRow.style.cssText = 'display: flex; gap: 15px;';

        // Mode column (independent section)
        this._modeCol = document.createElement('div');
        this._modeCol.style.cssText = 'flex: 1; display: flex; flex-direction: column; gap: 6px;';
        this._renderModeButtons();
        bottomRow.appendChild(this._modeCol);

        // Weather column (independent section)
        this._weatherCol = document.createElement('div');
        this._weatherCol.style.cssText = 'flex: 1; display: flex; flex-direction: column; gap: 6px;';
        this._renderWeatherButtons();
        bottomRow.appendChild(this._weatherCol);

        contentArea.appendChild(bottomRow);
        this._container.appendChild(contentArea);

        // Start button
        const startBtn = document.createElement('button');
        startBtn.textContent = 'START FLIGHT';
        startBtn.style.cssText = `
            margin-top: 15px;
            padding: 12px 45px;
            font-size: 15px;
            font-weight: bold;
            background: linear-gradient(180deg, #0088cc, #006699);
            color: #ffffff;
            border: 1px solid #00aaff;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s ease;
        `;
        startBtn.addEventListener('mouseenter', () => {
            startBtn.style.background = 'linear-gradient(180deg, #0099dd, #0077aa)';
            startBtn.style.transform = 'scale(1.02)';
        });
        startBtn.addEventListener('mouseleave', () => {
            startBtn.style.background = 'linear-gradient(180deg, #0088cc, #006699)';
            startBtn.style.transform = 'scale(1)';
        });
        startBtn.addEventListener('click', () => {
            this.hide();
            this._onSelect(
                AIRCRAFT_CONFIGS[this._selectedAircraft as keyof typeof AIRCRAFT_CONFIGS],
                this._selectedWeather,
                this._selectedGameMode
            );
        });
        this._container.appendChild(startBtn);

        // Controls info
        const controls = document.createElement('div');
        controls.style.cssText = `
            margin-top: 12px;
            padding: 8px 16px;
            background: rgba(0,0,0,0.3);
            border-radius: 6px;
            font-size: 11px;
            color: #556688;
            text-align: center;
            line-height: 1.6;
        `;
        controls.innerHTML = `
            <strong>Steuerung</strong> | Pitch: W/S | Roll: A/D | Yaw: ←/→ | Throttle: ↑/↓<br>
            Kamera: C | Schießen: Space/V | Menü: ESC
        `;
        this._container.appendChild(controls);

        document.body.appendChild(this._container);
    }

    private _renderAircraftCards() {
        if (!this._aircraftRow) return;
        this._aircraftRow.innerHTML = '';

        const types: Array<keyof typeof AIRCRAFT_CONFIGS> = ['cessna', 'boeing', 'extra', 'f16', 'su27'];
        const icons: Record<string, string> = { cessna: '🛩️', boeing: '✈️', extra: '🛫', f16: '🎖️', su27: '🎖️' };

        for (const type of types) {
            const config = AIRCRAFT_CONFIGS[type];
            const card = document.createElement('div');
            const sel = this._selectedAircraft === type;
            card.style.cssText = `
                padding: 8px 12px;
                background: ${sel ? 'rgba(0,100,200,0.4)' : 'rgba(255,255,255,0.03)'};
                border: 2px solid ${sel ? '#0088cc' : 'rgba(255,255,255,0.08)'};
                border-radius: 6px;
                cursor: pointer;
                text-align: center;
                min-width: 120px;
            `;
            card.innerHTML = `
                <div style="font-size: 16px;">${icons[type]}</div>
                <div style="font-size: 12px; font-weight: bold; color: ${sel ? '#00ccff' : '#aabbcc'}; margin-top: 2px;">${config.name}</div>
                <div style="font-size: 9px; color: #556688; margin-top: 2px;">${Math.round(config.maxSpeed*3.6)} km/h</div>
            `;
            card.addEventListener('click', () => {
                this._selectedAircraft = type;
                this._renderAircraftCards();
            });
            this._aircraftRow.appendChild(card);
        }
    }

    private _renderModeButtons() {
        if (!this._modeCol) return;
        this._modeCol.innerHTML = '';

        const header = document.createElement('div');
        header.textContent = 'Modus';
        header.style.cssText = 'font-size: 12px; color: #88aacc; font-weight: bold;';
        this._modeCol.appendChild(header);

        for (const key of Object.keys(GAME_MODES)) {
            const mode = GAME_MODES[key as GameMode];
            const sel = this._selectedGameMode === key;
            const btn = document.createElement('div');
            btn.style.cssText = `
                padding: 6px 10px;
                background: ${sel ? 'rgba(0,100,200,0.4)' : 'rgba(255,255,255,0.03)'};
                border: 2px solid ${sel ? '#0088cc' : 'rgba(255,255,255,0.08)'};
                border-radius: 6px;
                cursor: pointer;
                font-size: 11px;
            `;
            btn.innerHTML = `<div style="color: ${sel ? '#00ccff' : '#aabbcc'}; font-weight: bold;">${mode.icon} ${mode.name}</div>`;
            btn.addEventListener('click', () => {
                this._selectedGameMode = key as GameMode;
                this._renderModeButtons();
            });
            this._modeCol.appendChild(btn);
        }
    }

    private _renderWeatherButtons() {
        if (!this._weatherCol) return;
        this._weatherCol.innerHTML = '';

        const header = document.createElement('div');
        header.textContent = 'Wetter';
        header.style.cssText = 'font-size: 12px; color: #88aacc; font-weight: bold;';
        this._weatherCol.appendChild(header);

        const icons: Record<string, string> = { clear: '☀️', cloudy: '⛅', overcast: '☁️', rain: '🌧️', storm: '⛈️' };
        for (const key of Object.keys(WEATHER_PRESETS)) {
            const sel = this._selectedWeather === key;
            const btn = document.createElement('div');
            btn.style.cssText = `
                padding: 6px 10px;
                background: ${sel ? 'rgba(0,100,200,0.4)' : 'rgba(255,255,255,0.03)'};
                border: 2px solid ${sel ? '#0088cc' : 'rgba(255,255,255,0.08)'};
                border-radius: 6px;
                cursor: pointer;
                font-size: 11px;
            `;
            btn.innerHTML = `<div style="color: ${sel ? '#00ccff' : '#aabbcc'}; font-weight: bold;">${icons[key]} ${key.charAt(0).toUpperCase()+key.slice(1)}</div>`;
            btn.addEventListener('click', () => {
                this._selectedWeather = key;
                this._renderWeatherButtons();
            });
            this._weatherCol.appendChild(btn);
        }
    }

    hide() {
        this._container.style.display = 'none';
    }

    show() {
        this._container.style.display = 'flex';
    }
}