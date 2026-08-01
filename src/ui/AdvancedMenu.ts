import { type AircraftConfig, AIRCRAFT_CONFIGS } from '../aircraft/AircraftConfig';
import { GameMode, GAME_MODES } from '../game/GameMode';
import { WEATHER_PRESETS } from '../weather/WeatherSystem';

/** Advanced menu with aircraft selection, game modes, and weather settings */
export class AdvancedMenu {
    private _container: HTMLDivElement;
    private _selectedAircraft: string = 'cessna';
    private _selectedWeather: string = 'clear';
    private _selectedGameMode: GameMode = GameMode.FREE_FLIGHT;
    private _currentTab: 'aircraft' | 'mode' | 'weather' = 'aircraft';

    constructor(onSelect: (config: AircraftConfig, weather: string, mode: GameMode) => void) {
        this._container = document.createElement('div');
        this._container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #0a0a2e 0%, #1a1a4e 50%, #0a0a2e 100%);
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
            font-size: 48px;
            margin-bottom: 10px;
            background: linear-gradient(90deg, #00ccff, #00ff88);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            text-shadow: none;
        `;
        this._container.appendChild(title);

        const subtitle = document.createElement('p');
        subtitle.textContent = 'Configure your flight experience';
        subtitle.style.cssText = 'font-size: 18px; color: #8888aa; margin-bottom: 30px;';
        this._container.appendChild(subtitle);

        // Tab navigation
        const tabContainer = document.createElement('div');
        tabContainer.style.cssText = 'display: flex; gap: 10px; margin-bottom: 30px;';
        
        const tabs: Array<{ key: 'aircraft' | 'mode' | 'weather', label: string, icon: string }> = [
            { key: 'aircraft', label: 'Aircraft', icon: '✈️' },
            { key: 'mode', label: 'Game Mode', icon: '🎮' },
            { key: 'weather', label: 'Weather', icon: '🌤️' }
        ];

        for (const tab of tabs) {
            const btn = document.createElement('button');
            btn.innerHTML = `${tab.icon} ${tab.label}`;
            btn.style.cssText = `
                padding: 12px 24px;
                font-size: 14px;
                font-weight: bold;
                background: ${this._currentTab === tab.key ? 'rgba(0, 204, 255, 0.3)' : 'rgba(255,255,255,0.05)'};
                color: ${this._currentTab === tab.key ? '#00ccff' : '#8888aa'};
                border: 2px solid ${this._currentTab === tab.key ? '#00ccff' : 'rgba(255,255,255,0.1)'};
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.3s ease;
            `;
            
            btn.addEventListener('click', () => {
                this._currentTab = tab.key;
                this._render();
            });
            
            tabContainer.appendChild(btn);
        }
        
        this._container.appendChild(tabContainer);

        // Content area
        const contentArea = document.createElement('div');
        contentArea.style.cssText = 'width: 800px; max-width: 90vw;';
        this._container.appendChild(contentArea);

        // Start button
        const startBtn = document.createElement('button');
        startBtn.textContent = 'START FLIGHT';
        startBtn.style.cssText = `
            margin-top: 30px;
            padding: 16px 60px;
            font-size: 18px;
            font-weight: bold;
            background: linear-gradient(90deg, #00ccff, #00ff88);
            color: #0a0a2e;
            border: none;
            border-radius: 30px;
            cursor: pointer;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        `;
        startBtn.addEventListener('mouseenter', () => {
            startBtn.style.transform = 'scale(1.05)';
            startBtn.style.boxShadow = '0 0 30px rgba(0,204,255,0.5)';
        });
        startBtn.addEventListener('mouseleave', () => {
            startBtn.style.transform = 'scale(1)';
            startBtn.style.boxShadow = 'none';
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
        controls.style.cssText = 'margin-top: 30px; font-size: 12px; color: #555577; text-align: center; line-height: 1.8;';
        controls.innerHTML = `
            <div style="margin-bottom: 8px; color: #777799; font-weight: bold;">Controls</div>
            <div>Pitch: W/S | Roll: A/D | Yaw: Q/E | Throttle: ↑/↓</div>
            <div>Flaps: G | Brakes: B | Camera: C | Orbit: Shift | Shoot: Space/V</div>
            <div>Menu: ESC</div>
        `;
        this._container.appendChild(controls);

        document.body.appendChild(this._container);
        
        // Initial render
        this._render();
    }

    private _render(): void {
        // Find content area and clear it
        const children = Array.from(this._container.children);
        const contentArea = children.find(el => el instanceof HTMLDivElement && el.style.width === '800px');
        if (contentArea) {
            contentArea.innerHTML = '';
            
            switch (this._currentTab) {
                case 'aircraft':
                    this._renderAircraftTab(contentArea);
                    break;
                case 'mode':
                    this._renderModeTab(contentArea);
                    break;
                case 'weather':
                    this._renderWeatherTab(contentArea);
                    break;
            }
        }
    }

    private _renderAircraftTab(container: Element): void {
        const cardsContainer = document.createElement('div');
        cardsContainer.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;';

        const types: Array<keyof typeof AIRCRAFT_CONFIGS> = ['cessna', 'boeing', 'extra', 'f16', 'su27'];
        const descriptions: Record<string, string> = {
            cessna: 'Beginner-friendly training aircraft',
            boeing: 'Heavy commercial jetliner',
            extra: 'High-performance aerobatic plane',
            f16: 'Multirole fighter jet',
            su27: 'Heavy air superiority fighter'
        };
        const icons: Record<string, string> = {
            cessna: '🛩️',
            boeing: '✈️',
            extra: '🛫',
            f16: '🎖️',
            su27: '🎖️'
        };

        for (const type of types) {
            const config = AIRCRAFT_CONFIGS[type];
            const card = document.createElement('div');
            const isSelected = this._selectedAircraft === type;
            
            card.style.cssText = `
                padding: 20px;
                background: ${isSelected ? 'rgba(0, 204, 255, 0.15)' : 'rgba(255,255,255,0.05)'};
                border: 2px solid ${isSelected ? '#00ccff' : 'rgba(255,255,255,0.1)'};
                border-radius: 12px;
                cursor: pointer;
                transition: all 0.3s ease;
                text-align: center;
            `;

            card.innerHTML = `
                <div style="font-size: 36px; margin-bottom: 8px;">${icons[type]}</div>
                <h3 style="font-size: 18px; margin-bottom: 6px; color: #ffffff;">${config.name}</h3>
                <p style="font-size: 12px; color: #8888aa; margin-bottom: 15px;">${descriptions[type]}</p>
                <div style="font-size: 11px; color: #666688; text-align: left; line-height: 1.6;">
                    <div>Max Speed: ${Math.round(config.maxSpeed * 3.6)} km/h</div>
                    <div>Takeoff: ${Math.round(config.rotateSpeed * 3.6)} km/h</div>
                    <div>Roll: ${config.rollRate}°/s</div>
                    ${config.type === 'f16' || config.type === 'su27' ? '<div style="color: #ff4444;">⚔️ Combat Ready</div>' : ''}
                </div>
            `;

            card.addEventListener('mouseenter', () => {
                if (!isSelected) {
                    card.style.borderColor = 'rgba(0,204,255,0.5)';
                    card.style.background = 'rgba(0,204,255,0.1)';
                }
            });
            card.addEventListener('mouseleave', () => {
                if (!isSelected) {
                    card.style.borderColor = 'rgba(255,255,255,0.1)';
                    card.style.background = 'rgba(255,255,255,0.05)';
                }
            });

            card.addEventListener('click', () => {
                this._selectedAircraft = type;
                this._render();
            });

            cardsContainer.appendChild(card);
        }

        container.appendChild(cardsContainer);
    }

    private _renderModeTab(container: Element): void {
        const modesContainer = document.createElement('div');
        modesContainer.style.cssText = 'display: flex; flex-direction: column; gap: 15px;';

        for (const modeKey of Object.keys(GAME_MODES)) {
            const mode = GAME_MODES[modeKey as GameMode];
            const isSelected = this._selectedGameMode === modeKey;
            
            const card = document.createElement('div');
            card.style.cssText = `
                padding: 20px;
                background: ${isSelected ? 'rgba(0, 204, 255, 0.15)' : 'rgba(255,255,255,0.05)'};
                border: 2px solid ${isSelected ? '#00ccff' : 'rgba(255,255,255,0.1)'};
                border-radius: 12px;
                cursor: pointer;
                transition: all 0.3s ease;
            `;

            card.innerHTML = `
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="font-size: 36px;">${mode.icon}</div>
                    <div>
                        <h3 style="font-size: 18px; margin: 0 0 5px 0; color: #ffffff;">${mode.name}</h3>
                        <p style="font-size: 13px; color: #8888aa; margin: 0;">${mode.description}</p>
                    </div>
                </div>
            `;

            card.addEventListener('click', () => {
                this._selectedGameMode = modeKey as GameMode;
                this._render();
            });

            modesContainer.appendChild(card);
        }

        container.appendChild(modesContainer);
    }

    private _renderWeatherTab(container: Element): void {
        const weatherContainer = document.createElement('div');
        weatherContainer.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;';

        const weatherTypes: Array<keyof typeof WEATHER_PRESETS> = ['clear', 'cloudy', 'overcast', 'rain', 'storm'];
        const weatherIcons: Record<string, string> = {
            clear: '☀️',
            cloudy: '⛅',
            overcast: '☁️',
            rain: '🌧️',
            storm: '⛈️'
        };
        const weatherDescriptions: Record<string, string> = {
            clear: 'Clear skies, perfect visibility',
            cloudy: 'Partly cloudy, mild winds',
            overcast: 'Heavy cloud cover, reduced visibility',
            rain: 'Rain, moderate winds',
            storm: 'Thunderstorm, strong turbulence'
        };

        for (const weather of weatherTypes) {
            const config = WEATHER_PRESETS[weather];
            const isSelected = this._selectedWeather === weather;
            
            const card = document.createElement('div');
            card.style.cssText = `
                padding: 15px;
                background: ${isSelected ? 'rgba(0, 204, 255, 0.15)' : 'rgba(255,255,255,0.05)'};
                border: 2px solid ${isSelected ? '#00ccff' : 'rgba(255,255,255,0.1)'};
                border-radius: 12px;
                cursor: pointer;
                transition: all 0.3s ease;
                text-align: center;
            `;

            card.innerHTML = `
                <div style="font-size: 32px; margin-bottom: 8px;">${weatherIcons[weather]}</div>
                <h3 style="font-size: 16px; margin: 0 0 5px 0; color: #ffffff; text-transform: capitalize;">${weather}</h3>
                <p style="font-size: 11px; color: #8888aa; margin: 0 0 10px 0;">${weatherDescriptions[weather]}</p>
                <div style="font-size: 10px; color: #666688; text-align: left; line-height: 1.5;">
                    <div>Wind: ${config.windSpeed} m/s</div>
                    <div>Visibility: ${config.visibility}m</div>
                </div>
            `;

            card.addEventListener('click', () => {
                this._selectedWeather = weather;
                this._render();
            });

            weatherContainer.appendChild(card);
        }

        container.appendChild(weatherContainer);
    }

    hide(): void {
        this._container.style.display = 'none';
    }

    show(): void {
        this._container.style.display = 'flex';
    }
}