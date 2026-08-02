import { type AircraftConfig, AIRCRAFT_CONFIGS } from '../aircraft/AircraftConfig';
import { GameMode, GAME_MODES } from '../game/GameMode';
import { WEATHER_PRESETS } from '../weather/WeatherSystem';

/** Simplified single-page menu with independent aircraft, mode, and weather selection */
export class AdvancedMenu {
    private _container!: HTMLDivElement;
    private _selectedAircraft: string = 'cessna';
    private _selectedWeather: string = 'clear';
    private _selectedGameMode: GameMode = GameMode.FREE_FLIGHT;
    private _starting: boolean = false;

    // References to sections for independent updates
    private _aircraftRow: HTMLDivElement | null = null;
    private _modeCol: HTMLDivElement | null = null;
    private _weatherCol: HTMLDivElement | null = null;
    private _startBtn: HTMLButtonElement | null = null;

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
            font-family: 'Helvetica Neue', Arial, sans-serif;
            color: #FFFFFF;
            overflow-y: auto;
        `;

        // Title
        const title = document.createElement('h1');
        title.textContent = 'Atlas Flight Simulator';
        title.style.cssText = `
            font-size: 42px;
            font-weight: 500;
            margin-bottom: 5px;
            color: #FFFFFF;
        `;
        this._container.appendChild(title);

        const subtitle = document.createElement('p');
        subtitle.textContent = 'Flugzeug · Modus · Wetter';
        subtitle.style.cssText = 'font-size: 14px; color: #575756; margin-bottom: 20px; letter-spacing: 1px;';
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
        this._startBtn = document.createElement('button');
        this._startBtn.textContent = 'START FLIGHT';
        this._startBtn.style.cssText = `
            margin-top: 15px;
            padding: 12px 45px;
            font-size: 15px;
            font-weight: 500;
            font-family: 'Helvetica Neue', Arial, sans-serif;
            letter-spacing: 1px;
            background: linear-gradient(180deg, #3838FF, #2828CC);
            color: #FFFFFF;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s ease;
        `;
        this._startBtn!.addEventListener('mouseenter', () => {
            this._startBtn!.style.background = 'linear-gradient(180deg, #5555FF, #3838FF)';
        });
        this._startBtn!.addEventListener('mouseleave', () => {
            this._startBtn!.style.background = 'linear-gradient(180deg, #3838FF, #2828CC)';
        });
        this._startBtn!.addEventListener('click', () => {
            if (this._starting) return;
            this._starting = true;
            this._startBtn!.textContent = '⏳ STARTING...';
            this._startBtn!.style.background = 'linear-gradient(180deg, #B2B2B2, #575756)';
            this._startBtn!.style.cursor = 'default';
            this._startBtn!.style.transform = 'scale(1)';
            this.hide();
            this._onSelect(
                AIRCRAFT_CONFIGS[this._selectedAircraft as keyof typeof AIRCRAFT_CONFIGS],
                this._selectedWeather,
                this._selectedGameMode
            );
        });
        this._container.appendChild(this._startBtn);

        // Quick Start Guide
        const quickStart = document.createElement('div');
        quickStart.style.cssText = `
            margin-top: 10px;
            padding: 12px 20px;
            background: rgba(56, 56, 255, 0.08);
            border: 1px solid rgba(56, 56, 255, 0.2);
            border-radius: 6px;
            font-size: 12px;
            font-family: 'Helvetica Neue', Arial, sans-serif;
            color: #B2B2B2;
            text-align: center;
            line-height: 1.8;
            max-width: 600px;
        `;
        quickStart.innerHTML = `
            <strong style="color: #FFFFFF;">Kurzanleitung zum Abheben</strong><br>
            <span style="color: #B2B2B2;">
            1. Schub erh&ouml;hen: <kbd style="background:rgba(56,56,255,0.2);padding:1px 6px;border-radius:3px;color:#FFFFFF;">&uarr;</kbd> &nbsp;|&nbsp;
            2. Beschleunigen bis Abhebegeschwindigkeit erreicht ist &nbsp;|&nbsp;
            3. Nase hoch: <kbd style="background:rgba(56,56,255,0.2);padding:1px 6px;border-radius:3px;color:#FFFFFF;">S</kbd> gedr&uuml;ckt halten &nbsp;|&nbsp;
            4. Fliegen &#x1F6EB;
            </span>
        `;
        this._container.appendChild(quickStart);

        // Controls info
        const controls = document.createElement('div');
        controls.style.cssText = `
            margin-top: 8px;
            padding: 8px 16px;
            background: rgba(0,0,0,0.3);
            border-radius: 6px;
            font-size: 11px;
            font-family: 'Helvetica Neue', Arial, sans-serif;
            color: #575756;
            text-align: center;
            line-height: 1.8;
        `;
        controls.innerHTML = `
            <strong style="color: #B2B2B2;">Steuerung</strong><br>
            <span>Nase hoch/runter: <kbd style="background:rgba(56,56,255,0.15);padding:1px 5px;border-radius:3px;color:#FFFFFF;">S</kbd>/<kbd style="background:rgba(56,56,255,0.15);padding:1px 5px;border-radius:3px;color:#FFFFFF;">W</kbd> &nbsp;|&nbsp;
            Rollen: <kbd style="background:rgba(56,56,255,0.15);padding:1px 5px;border-radius:3px;color:#FFFFFF;">A</kbd>/<kbd style="background:rgba(56,56,255,0.15);padding:1px 5px;border-radius:3px;color:#FFFFFF;">D</kbd> &nbsp;|&nbsp;
            Gieren: <kbd style="background:rgba(56,56,255,0.15);padding:1px 5px;border-radius:3px;color:#FFFFFF;">&larr;</kbd>/<kbd style="background:rgba(56,56,255,0.15);padding:1px 5px;border-radius:3px;color:#FFFFFF;">&rarr;</kbd> &nbsp;|&nbsp;
            Schub: <kbd style="background:rgba(56,56,255,0.15);padding:1px 5px;border-radius:3px;color:#FFFFFF;">&uarr;</kbd>/<kbd style="background:rgba(56,56,255,0.15);padding:1px 5px;border-radius:3px;color:#FFFFFF;">&darr;</kbd></span><br>
            <span>Klappen: <kbd style="background:rgba(56,56,255,0.15);padding:1px 5px;border-radius:3px;color:#FFFFFF;">G</kbd> &nbsp;|&nbsp;
            Bremsen: <kbd style="background:rgba(56,56,255,0.15);padding:1px 5px;border-radius:3px;color:#FFFFFF;">B</kbd> &nbsp;|&nbsp;
            Kamera: <kbd style="background:rgba(56,56,255,0.15);padding:1px 5px;border-radius:3px;color:#FFFFFF;">C</kbd> &nbsp;|&nbsp;
            Kamera-Orbit: <kbd style="background:rgba(56,56,255,0.15);padding:1px 5px;border-radius:3px;color:#FFFFFF;">Shift</kbd> + Maus &nbsp;|&nbsp;
            Schie&szlig;en: <kbd style="background:rgba(56,56,255,0.15);padding:1px 5px;border-radius:3px;color:#FFFFFF;">Space</kbd>/<kbd style="background:rgba(56,56,255,0.15);padding:1px 5px;border-radius:3px;color:#FFFFFF;">V</kbd> &nbsp;|&nbsp;
            Men&uuml;: <kbd style="background:rgba(56,56,255,0.15);padding:1px 5px;border-radius:3px;color:#FFFFFF;">ESC</kbd></span>
        `;
        this._container.appendChild(controls);

        document.body.appendChild(this._container);
    }

    private _renderAircraftCards() {
        if (!this._aircraftRow) return;
        this._aircraftRow.innerHTML = '';

        const types: Array<keyof typeof AIRCRAFT_CONFIGS> = ['cessna', 'boeing', 'extra', 'f16', 'su27'];
        const icons: Record<string, string> = { cessna: '🛩️', boeing: '✈️', extra: '🛫', f16: '⚡', su27: '🔥' };
        const typeLabels: Record<string, string> = { cessna: 'Propeller', boeing: 'Jet', extra: 'Kunstflug', f16: 'Jäger', su27: 'Jäger' };

        for (const type of types) {
            const config = AIRCRAFT_CONFIGS[type];
            const card = document.createElement('div');
            const sel = this._selectedAircraft === type;
            card.style.cssText = `
                padding: 10px 14px 8px 14px;
                background: ${sel ? 'rgba(56,56,255,0.15)' : 'rgba(255,255,255,0.03)'};
                border: 2px solid ${sel ? '#3838FF' : 'rgba(255,255,255,0.08)'};
                border-radius: 6px;
                cursor: pointer;
                text-align: center;
                min-width: 110px;
                transition: all 0.15s ease;
            `;
            card.innerHTML = `
                <div style="font-size: 18px; margin-bottom: 2px;">${icons[type]}</div>
                <div style="font-size: 11px; font-weight: 500; font-family: 'Helvetica Neue', Arial, sans-serif; color: ${sel ? '#FFFFFF' : '#B2B2B2'}; margin-top: 2px;">${config.name}</div>
                <div style="font-size: 9px; color: #575756; margin-top: 3px; line-height: 1.5; font-family: 'Helvetica Neue', Arial, sans-serif;">
                    ${typeLabels[type]}<br>
                    <span style="color: ${sel ? '#B2B2B2' : '#575756'};">${Math.round(config.maxSpeed*3.6)} km/h</span>
                    <span style="color: #575756;"> | Abheben: ${Math.round(config.rotateSpeed*3.6)} km/h</span>
                </div>
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
        header.style.cssText = 'font-size: 12px; color: #B2B2B2; font-weight: 500; font-family: \'Helvetica Neue\', Arial, sans-serif;';
        this._modeCol.appendChild(header);

        for (const key of Object.keys(GAME_MODES)) {
            const mode = GAME_MODES[key as GameMode];
            const sel = this._selectedGameMode === key;
            const btn = document.createElement('div');
            btn.style.cssText = `
                padding: 6px 10px;
                background: ${sel ? 'rgba(56,56,255,0.15)' : 'rgba(255,255,255,0.03)'};
                border: 2px solid ${sel ? '#3838FF' : 'rgba(255,255,255,0.08)'};
                border-radius: 6px;
                cursor: pointer;
                font-size: 11px;
                font-family: 'Helvetica Neue', Arial, sans-serif;
            `;
            btn.innerHTML = `<div style="color: ${sel ? '#FFFFFF' : '#B2B2B2'}; font-weight: 500;">${mode.icon} ${mode.name}</div>`;
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
        header.style.cssText = 'font-size: 12px; color: #B2B2B2; font-weight: 500; font-family: \'Helvetica Neue\', Arial, sans-serif;';
        this._weatherCol.appendChild(header);

        const icons: Record<string, string> = { clear: '☀️', cloudy: '⛅', overcast: '☁️', rain: '🌧️', storm: '⛈️' };
        for (const key of Object.keys(WEATHER_PRESETS)) {
            const sel = this._selectedWeather === key;
            const btn = document.createElement('div');
            btn.style.cssText = `
                padding: 6px 10px;
                background: ${sel ? 'rgba(56,56,255,0.15)' : 'rgba(255,255,255,0.03)'};
                border: 2px solid ${sel ? '#3838FF' : 'rgba(255,255,255,0.08)'};
                border-radius: 6px;
                cursor: pointer;
                font-size: 11px;
                font-family: 'Helvetica Neue', Arial, sans-serif;
            `;
            btn.innerHTML = `<div style="color: ${sel ? '#FFFFFF' : '#B2B2B2'}; font-weight: 500;">${icons[key]} ${key.charAt(0).toUpperCase()+key.slice(1)}</div>`;
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
        this._starting = false; // Reset so START FLIGHT button works again
        if (this._startBtn) {
            this._startBtn.textContent = 'START FLIGHT';
            this._startBtn.style.background = 'linear-gradient(180deg, #3838FF, #2828CC)';
            this._startBtn.style.borderColor = '#5555FF';
            this._startBtn.style.cursor = 'pointer';
        }
    }
}