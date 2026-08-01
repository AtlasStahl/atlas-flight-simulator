import { type AircraftConfig, AIRCRAFT_CONFIGS } from '../aircraft/AircraftConfig';
import { GameMode, GAME_MODES } from '../game/GameMode';
import { WEATHER_PRESETS } from '../weather/WeatherSystem';

/** Simplified single-page menu with aircraft, mode, and weather selection */
export class AdvancedMenu {
    private _container: HTMLDivElement;
    private _selectedAircraft: string = 'cessna';
    private _selectedWeather: string = 'clear';
    private _selectedGameMode: GameMode = GameMode.FREE_FLIGHT;

    constructor(onSelect: (config: AircraftConfig, weather: string, mode: GameMode) => void) {
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

        // Aircraft row
        this._buildAircraftRow(contentArea);

        // Mode + Weather row
        const bottomRow = document.createElement('div');
        bottomRow.style.cssText = 'display: flex; gap: 15px;';
        this._buildModeCol(bottomRow);
        this._buildWeatherCol(bottomRow);
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
            onSelect(
                AIRCRAFT_CONFIGS[this._selectedAircraft],
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
            <strong>Steuerung</strong> | Pitch: W/S | Roll: A/D | Yaw: Q/E | Throttle: ↑/↓<br>
            Kamera: C | Schießen: Space/V | Menü: ESC
        `;
        this._container.appendChild(controls);

        document.body.appendChild(this._container);
    }

    private _buildAircraftRow(parent: HTMLDivElement) {
        const row = document.createElement('div');
        row.style.cssText = 'display: flex; gap: 8px; flex-wrap: wrap; justify-content: center;';

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
                parent.innerHTML = '';
                this._buildAircraftRow(parent);
            });
            row.appendChild(card);
        }
        parent.appendChild(row);
    }

    private _buildModeCol(parent: HTMLDivElement) {
        const col = document.createElement('div');
        col.style.cssText = 'flex: 1; display: flex; flex-direction: column; gap: 6px;';

        const header = document.createElement('div');
        header.textContent = 'Modus';
        header.style.cssText = 'font-size: 12px; color: #88aacc; font-weight: bold;';
        col.appendChild(header);

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
                parent.innerHTML = '';
                this._buildModeCol(parent);
            });
            col.appendChild(btn);
        }
        parent.appendChild(col);
    }

    private _buildWeatherCol(parent: HTMLDivElement) {
        const col = document.createElement('div');
        col.style.cssText = 'flex: 1; display: flex; flex-direction: column; gap: 6px;';

        const header = document.createElement('div');
        header.textContent = 'Wetter';
        header.style.cssText = 'font-size: 12px; color: #88aacc; font-weight: bold;';
        col.appendChild(header);

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
                parent.innerHTML = '';
                this._buildWeatherCol(parent);
            });
            col.appendChild(btn);
        }
        parent.appendChild(col);
    }

    hide() {
        this._container.style.display = 'none';
    }

    show() {
        this._container.style.display = 'flex';
    }
}