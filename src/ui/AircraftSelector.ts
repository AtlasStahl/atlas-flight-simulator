import { type AircraftConfig, AIRCRAFT_CONFIGS } from '../aircraft/AircraftConfig';

/** Aircraft selection screen */
export class AircraftSelector {
  private _container: HTMLDivElement;
  private _selectedType: keyof typeof AIRCRAFT_CONFIGS = 'cessna';

  constructor(onSelect: (config: AircraftConfig) => void) {
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
    subtitle.textContent = 'Select your aircraft';
    subtitle.style.cssText = 'font-size: 18px; color: #8888aa; margin-bottom: 50px;';
    this._container.appendChild(subtitle);

    // Aircraft cards
    const cardsContainer = document.createElement('div');
    cardsContainer.style.cssText = 'display: flex; gap: 30px; flex-wrap: wrap; justify-content: center;';

    const types: Array<keyof typeof AIRCRAFT_CONFIGS> = ['cessna', 'boeing', 'extra'];
    const descriptions: Record<keyof typeof AIRCRAFT_CONFIGS, string> = {
      cessna: 'Beginner-friendly training aircraft',
      boeing: 'Heavy commercial jetliner',
      extra: 'High-performance aerobatic plane'
    };
    const icons: Record<keyof typeof AIRCRAFT_CONFIGS, string> = {
      cessna: '🛩️',
      boeing: '✈️',
      extra: '🛫'
    };

    for (const type of types) {
      const config = AIRCRAFT_CONFIGS[type];
      const card = document.createElement('div');
      card.style.cssText = `
        width: 280px;
        padding: 30px;
        background: rgba(255,255,255,0.05);
        border: 2px solid rgba(255,255,255,0.1);
        border-radius: 16px;
        cursor: pointer;
        transition: all 0.3s ease;
        text-align: center;
      `;

      card.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 10px;">${icons[type]}</div>
        <h2 style="font-size: 24px; margin-bottom: 8px; color: #ffffff;">${config.name}</h2>
        <p style="font-size: 14px; color: #8888aa; margin-bottom: 20px;">${descriptions[type]}</p>
        <div style="font-size: 13px; color: #666688; text-align: left; line-height: 1.8;">
          <div>Max Speed: ${Math.round(config.maxSpeed * 3.6)} km/h</div>
          <div>Takeoff: ${Math.round(config.rotateSpeed * 3.6)} km/h</div>
          <div>Climb: ${Math.round(config.maxClimbRate * 196)} ft/min</div>
          <div>Roll: ${config.rollRate}°/s</div>
        </div>
      `;

      // Hover effects
      card.addEventListener('mouseenter', () => {
        card.style.borderColor = 'rgba(0,204,255,0.5)';
        card.style.background = 'rgba(0,204,255,0.1)';
        card.style.transform = 'translateY(-5px)';
      });
      card.addEventListener('mouseleave', () => {
        if (this._selectedType !== type) {
          card.style.borderColor = 'rgba(255,255,255,0.1)';
          card.style.background = 'rgba(255,255,255,0.05)';
          card.style.transform = 'translateY(0)';
        }
      });

      // Click handler
      card.addEventListener('click', () => {
        this._selectedType = type;
        // Update visual selection
        Array.from(cardsContainer.children).forEach((c: Element, i: number) => {
          const cardType = types[i];
          const el = c as HTMLDivElement;
          if (cardType === type) {
            el.style.borderColor = '#00ccff';
            el.style.background = 'rgba(0,204,255,0.15)';
            el.style.transform = 'translateY(-5px)';
          } else {
            el.style.borderColor = 'rgba(255,255,255,0.1)';
            el.style.background = 'rgba(255,255,255,0.05)';
            el.style.transform = 'translateY(0)';
          }
        });
      });

      cardsContainer.appendChild(card);
    }

    this._container.appendChild(cardsContainer);

    // Start button
    const startBtn = document.createElement('button');
    startBtn.textContent = 'START FLIGHT';
    startBtn.style.cssText = `
      margin-top: 50px;
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
      onSelect(AIRCRAFT_CONFIGS[this._selectedType]);
    });
    this._container.appendChild(startBtn);

    // Controls info
    const controls = document.createElement('div');
    controls.style.cssText = 'margin-top: 40px; font-size: 13px; color: #555577; text-align: center; line-height: 1.8;';
    controls.innerHTML = `
      <div style="margin-bottom: 10px; color: #777799; font-weight: bold;">Controls</div>
      <div>Pitch: W/S &nbsp;|&nbsp; Roll: A/D or ←/→ &nbsp;|&nbsp; Yaw: Q/E</div>
      <div>Throttle: ↑/↓ &nbsp;|&nbsp; Flaps: G &nbsp;|&nbsp; Brakes: B &nbsp;|&nbsp; Reset: Esc &nbsp;|&nbsp; Menu: ESC</div>
    `;
    this._container.appendChild(controls);

    document.body.appendChild(this._container);
  }

  hide() {
    this._container.style.display = 'none';
  }

  show() {
    this._container.style.display = 'flex';
  }
}