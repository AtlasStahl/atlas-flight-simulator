/** Cockpit-style HUD with Canvas-rendered round instruments + MENU button */
export class HUD {
  private _canvas: HTMLCanvasElement;
  private _ctx: CanvasRenderingContext2D;
  private _overlay: HTMLDivElement;
  private _menuBtn: HTMLButtonElement;
  private _cameraBtn: HTMLButtonElement;
  private _visible: boolean = true;

  // Smoothed values to prevent jitter
  private _smoothSpeed = 0;
  private _smoothAltitude = 0;
  private _smoothHeading = 0;
  private _smoothThrottle = 0;
  private _smoothVerticalSpeed = 0;
  private _smoothPitch = 0;
  private _smoothRoll = 0;
  private readonly SMOOTH = 0.12; // smoothing factor

  // Instrument positions (relative to canvas)
  private _airspeedPos = { x: 0, y: 0 };
  private _attitudePos = { x: 0, y: 0 };
  private _altimeterPos = { x: 0, y: 0 };

  // Compact instrument radii (smaller to fit in a single row)
  private readonly R_AIRSPEED = 55;
  private readonly R_ATTITUDE = 65;
  private readonly R_ALTITUDE = 55;

  private _onMenuCallback: () => void;
  private _onCameraCallback: (() => void) | undefined;
  private _gameMode: 'free_flight' | 'ring_mission' | 'combat' = 'free_flight';

  constructor(onMenu: () => void, gameMode: 'free_flight' | 'ring_mission' | 'combat' = 'free_flight') {
    this._onMenuCallback = onMenu;
    this._gameMode = gameMode;

    // Overlay container (no background tint - cleaner look)
    this._overlay = document.createElement('div');
    this._overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 100;
    `;

    // Canvas for instruments
    this._canvas = document.createElement('canvas');
    this._canvas.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    `;
    this._overlay.appendChild(this._canvas);

    // MENU button (top-right corner)
    this._menuBtn = document.createElement('button');
    this._menuBtn.textContent = '☰ MENU';
    this._menuBtn.style.cssText = `
      position: absolute;
      top: 16px;
      right: 16px;
      z-index: 200;
      pointer-events: auto;
      padding: 8px 18px;
      font-size: 12px;
      font-weight: 600;
      font-family: 'Segoe UI', Tahoma, sans-serif;
      letter-spacing: 0.5px;
      background: rgba(8, 12, 24, 0.85);
      color: #ffffff;
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 6px;
      cursor: pointer;
      backdrop-filter: blur(10px);
      transition: all 0.15s ease;
    `;
    this._menuBtn.addEventListener('mouseenter', () => {
      this._menuBtn.style.background = 'rgba(0, 120, 200, 0.7)';
      this._menuBtn.style.borderColor = 'rgba(100, 200, 255, 0.6)';
    });
    this._menuBtn.addEventListener('mouseleave', () => {
      this._menuBtn.style.background = 'rgba(8, 12, 24, 0.85)';
      this._menuBtn.style.borderColor = 'rgba(255,255,255,0.15)';
    });
    this._menuBtn.addEventListener('click', () => {
      this._onMenuCallback();
    });
    this._overlay.appendChild(this._menuBtn);

    // Camera button (top-center)
    this._cameraBtn = document.createElement('button');
    this._cameraBtn.textContent = '📷 KAMERA';
    this._cameraBtn.style.cssText = `
      position: absolute;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 200;
      pointer-events: auto;
      padding: 8px 18px;
      font-size: 12px;
      font-weight: 600;
      font-family: 'Segoe UI', Tahoma, sans-serif;
      letter-spacing: 0.5px;
      background: rgba(8, 12, 24, 0.85);
      color: #00ccff;
      border: 1px solid rgba(0, 204, 255, 0.3);
      border-radius: 6px;
      cursor: pointer;
      backdrop-filter: blur(10px);
      transition: all 0.15s ease;
    `;
    this._cameraBtn.addEventListener('mouseenter', () => {
      this._cameraBtn.style.background = 'rgba(0, 120, 200, 0.7)';
      this._cameraBtn.style.borderColor = 'rgba(100, 200, 255, 0.6)';
    });
    this._cameraBtn.addEventListener('mouseleave', () => {
      this._cameraBtn.style.background = 'rgba(8, 12, 24, 0.85)';
      this._cameraBtn.style.borderColor = 'rgba(0, 204, 255, 0.3)';
    });
    this._cameraBtn.addEventListener('click', () => {
      this._onCameraCallback?.();
    });
    this._overlay.appendChild(this._cameraBtn);

    this._ctx = this._canvas.getContext('2d')!;

    document.body.appendChild(this._overlay);

    window.addEventListener('resize', () => this.onResize());
    this.onResize();
  }

  private onResize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this._canvas.width = window.innerWidth * dpr;
    this._canvas.height = window.innerHeight * dpr;
    this._ctx.scale(dpr, dpr);

    const w = window.innerWidth;
    const h = window.innerHeight;

    // Single compact row at the bottom of the screen
    // Panel sits at bottom with enough margin to avoid clipping
    const panelH = Math.max(this.R_ATTITUDE * 2 + 30, 160);
    const panelY = h - panelH / 2 - 10;

    // 3 instruments evenly spaced in a horizontal row
    const spacing = Math.min(w * 0.22, 280);
    const centerX = w / 2;

    this._attitudePos.x = centerX;
    this._attitudePos.y = panelY;

    this._airspeedPos.x = centerX - spacing;
    this._airspeedPos.y = panelY;

    this._altimeterPos.x = centerX + spacing;
    this._altimeterPos.y = panelY;
  }

  // Linear interpolation for smoothing
  private lerp(current: number, target: number): number {
    return current + (target - current) * this.SMOOTH;
  }

  update(
    speed: number,
    altitude: number,
    heading: number,
    throttle: number,
    verticalSpeed: number,
    pitch: number,
    roll: number,
    onGround: boolean,
    crashed: boolean,
    missionStatus?: { totalRings: number; ringsPassed: number; score: number; timeElapsed: number; completed: boolean },
    cameraMode?: string,
    combatStatus?: { wave: number; score: number; playerHealth: number; maxPlayerHealth: number; enemiesAlive: number; totalEnemies: number }
  ) {
    if (!this._visible) return;

    // Smooth values to prevent jitter
    this._smoothSpeed = this.lerp(this._smoothSpeed, speed);
    this._smoothAltitude = this.lerp(this._smoothAltitude, altitude);
    this._smoothHeading = this.lerp(this._smoothHeading, heading);
    this._smoothThrottle = this.lerp(this._smoothThrottle, throttle);
    this._smoothVerticalSpeed = this.lerp(this._smoothVerticalSpeed, verticalSpeed);
    this._smoothPitch = this.lerp(this._smoothPitch, pitch);
    this._smoothRoll = this.lerp(this._smoothRoll, roll);

    const w = window.innerWidth;
    const h = window.innerHeight;

    // Clear canvas
    this._ctx.clearRect(0, 0, w, h);

    // Draw minimal digital instruments
    this.drawDigitalSpeed(this._smoothSpeed * 3.6);
    this.drawDigitalAltitude(Math.max(0, this._smoothAltitude));
    this.drawMiniAttitude(this._smoothPitch, this._smoothRoll);

    // Draw info panels
    this.drawStatus(onGround, crashed);
    this.drawInfoPanel(this._smoothHeading, this._smoothThrottle, this._smoothVerticalSpeed);

    // Draw camera mode indicator
    if (cameraMode) {
      this.drawCameraMode(cameraMode);
    }

    // Draw mission status if provided (only for ring mission mode)
    if (missionStatus) {
      this.drawMissionStatus(missionStatus);
    }

    // Draw combat status if provided
    if (combatStatus) {
      this.drawCombatStatus(combatStatus);
    }

    // Draw controls reference (minimal, bottom center)
    this.drawControlsReference();
  }

  setGameMode(mode: 'free_flight' | 'ring_mission' | 'combat'): void {
    this._gameMode = mode;
    console.log('HUD game mode set to:', mode);
  }

  setCameraCallback(callback: () => void): void {
    this._onCameraCallback = callback;
  }

  updateCameraButton(mode: string): void {
    this._cameraBtn.textContent = `📷 ${mode}`;
  }

  // --- Drawing helpers ---

  private drawGaugeBackground(x: number, y: number, r: number) {
    const ctx = this._ctx;

    // Outer shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;

    // Outer bezel
    ctx.beginPath();
    ctx.arc(x, y, r + 4, 0, Math.PI * 2);
    ctx.fillStyle = '#3a3a3a';
    ctx.fill();
    ctx.restore();

    // Main gauge face
    const grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
    grad.addColorStop(0, '#2a2a2a');
    grad.addColorStop(1, '#1a1a1a');
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Inner ring
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.strokeStyle = '#555555';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private drawNeedle(x: number, y: number, angle: number, length: number, width: number = 3) {
    const ctx = this._ctx;
    const tipX = x + Math.cos(angle) * length;
    const tipY = y + Math.sin(angle) * length;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(tipX, tipY);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();

    // Center pivot
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#cccccc';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }

  private drawArcSegment(x: number, y: number, r: number, startAngle: number, endAngle: number, color: string, lineWidth: number = 3) {
    const ctx = this._ctx;
    ctx.beginPath();
    ctx.arc(x, y, r, startAngle, endAngle);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }

  // --- Digital Speed Display (bottom-left) ---
  private drawDigitalSpeed(speedKmh: number) {
    const ctx = this._ctx;
    const w = window.innerWidth;
    const x = 20;
    const y = w * 0.6 + 60;
    const panelW = 160;
    const panelH = 80;

    // Background
    const panelGrad = ctx.createLinearGradient(x, y, x, y + panelH);
    panelGrad.addColorStop(0, 'rgba(8, 12, 24, 0.88)');
    panelGrad.addColorStop(1, 'rgba(8, 12, 24, 0.75)');
    ctx.fillStyle = panelGrad;
    ctx.beginPath();
    ctx.roundRect(x, y, panelW, panelH, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(80, 160, 220, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Label
    ctx.fillStyle = '#6688aa';
    ctx.font = '10px Segoe UI, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('SPEED', x + 14, y + 22);

    // Value
    const speedColor = speedKmh > 350 ? '#ff4444' : speedKmh > 300 ? '#ffcc00' : '#00ff00';
    ctx.fillStyle = speedColor;
    ctx.font = 'bold 32px Segoe UI, sans-serif';
    ctx.fillText(Math.round(speedKmh).toString().padStart(3, ' '), x + 14, y + 58);

    // Unit
    ctx.fillStyle = '#6688aa';
    ctx.font = '12px Segoe UI, sans-serif';
    ctx.fillText('km/h', x + 110, y + 58);
  }

  // --- Digital Altitude Display (bottom-right) ---
  private drawDigitalAltitude(altitude: number) {
    const ctx = this._ctx;
    const w = window.innerWidth;
    const x = w - 180;
    const y = w * 0.6 + 60;
    const panelW = 160;
    const panelH = 80;

    // Background
    const panelGrad = ctx.createLinearGradient(x, y, x, y + panelH);
    panelGrad.addColorStop(0, 'rgba(8, 12, 24, 0.88)');
    panelGrad.addColorStop(1, 'rgba(8, 12, 24, 0.75)');
    ctx.fillStyle = panelGrad;
    ctx.beginPath();
    ctx.roundRect(x, y, panelW, panelH, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(80, 160, 220, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Label
    ctx.fillStyle = '#6688aa';
    ctx.font = '10px Segoe UI, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('ALTITUDE', x + 14, y + 22);

    // Value
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Segoe UI, sans-serif';
    ctx.fillText(Math.round(altitude).toString().padStart(4, ' '), x + 14, y + 58);

    // Unit
    ctx.fillStyle = '#6688aa';
    ctx.font = '12px Segoe UI, sans-serif';
    ctx.fillText('m', x + 130, y + 58);
  }

  // --- Mini Attitude Indicator (bottom-center) ---
  private drawMiniAttitude(pitch: number, roll: number) {
    const ctx = this._ctx;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const x = w / 2;
    const y = h - 80;
    const r = 50;

    // Background circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(8, 12, 24, 0.85)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(80, 160, 220, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Clip to circle
    ctx.clip();

    // Apply roll rotation
    ctx.translate(x, y);
    ctx.rotate(roll);

    // Pitch offset
    const pitchOffset = pitch * 40;

    // Sky
    ctx.fillStyle = '#1a5599';
    ctx.fillRect(-r, -r + pitchOffset, r * 2, r);

    // Ground
    ctx.fillStyle = '#664422';
    ctx.fillRect(-r, pitchOffset, r * 2, r);

    // Horizon line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r, pitchOffset);
    ctx.lineTo(r, pitchOffset);
    ctx.stroke();

    ctx.restore();

    // Aircraft reference
    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x - 40, y);
    ctx.lineTo(x - 10, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 10, y);
    ctx.lineTo(x + 40, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#ffcc00';
    ctx.fill();

    // Roll indicator at top
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r - 1, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(x, y - r + 8);
    ctx.lineTo(x - 5, y - r + 14);
    ctx.lineTo(x + 5, y - r + 14);
    ctx.closePath();
    ctx.fill();

    // Roll marks
    for (const deg of [-30, 0, 30]) {
      const angle = -Math.PI / 2 + (deg * Math.PI / 180);
      const outerR = r - 4;
      const innerR = r - 9;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(angle) * outerR, y + Math.sin(angle) * outerR);
      ctx.lineTo(x + Math.cos(angle) * innerR, y + Math.sin(angle) * innerR);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = deg === 0 ? 1.5 : 0.8;
      ctx.stroke();
    }
    ctx.restore();
  }

  // --- Info panel (top-right): heading, throttle, VSI ---
  private drawInfoPanel(heading: number, throttle: number, verticalSpeed: number) {
    const ctx = this._ctx;
    const w = window.innerWidth;
    const x = w - 195;
    const y = 60;
    const panelW = 175;
    const panelH = 115;

    // Panel background with gradient
    const panelGrad = ctx.createLinearGradient(x, y, x, y + panelH);
    panelGrad.addColorStop(0, 'rgba(8, 12, 24, 0.88)');
    panelGrad.addColorStop(1, 'rgba(8, 12, 24, 0.75)');
    ctx.fillStyle = panelGrad;
    ctx.beginPath();
    ctx.roundRect(x, y, panelW, panelH, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(80, 160, 220, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Separator line
    ctx.strokeStyle = 'rgba(80, 160, 220, 0.15)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x + 12, y + 38);
    ctx.lineTo(x + panelW - 12, y + 38);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 12, y + 72);
    ctx.lineTo(x + panelW - 12, y + 72);
    ctx.stroke();

    // Heading
    const headingDeg = (((heading * 180 / Math.PI) % 360) + 360) % 360;
    ctx.fillStyle = '#6688aa';
    ctx.font = '10px Segoe UI, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('HEADING', x + 12, y + 24);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Segoe UI, sans-serif';
    ctx.fillText(`${Math.round(headingDeg).toString().padStart(3, ' ')}°`, x + 80, y + 24);

    // Throttle bar
    ctx.fillStyle = '#6688aa';
    ctx.font = '10px Segoe UI, sans-serif';
    ctx.fillText('THROTTLE', x + 12, y + 56);

    const barX = x + 80;
    const barY = y + 46;
    const barW = panelW - 95;
    const barH = 14;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 3);
    ctx.fill();
    const thrW = throttle * barW;
    if (thrW > 0) {
      const thrGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
      thrGrad.addColorStop(0, '#00cc44');
      thrGrad.addColorStop(0.7, '#ffcc00');
      thrGrad.addColorStop(1, '#ff4400');
      ctx.fillStyle = thrGrad;
      ctx.beginPath();
      ctx.roundRect(barX, barY, thrW, barH, 3);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 3);
    ctx.stroke();

    // Throttle %
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Segoe UI, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(throttle * 100)}%`, x + panelW - 12, y + 56);
    ctx.textAlign = 'left';

    // VSI
    ctx.fillStyle = '#6688aa';
    ctx.font = '10px Segoe UI, sans-serif';
    ctx.fillText('VERT. SPEED', x + 12, y + 90);
    const vsiColor = verticalSpeed > 0.5 ? '#00cc44' : verticalSpeed < -0.5 ? '#ff6644' : '#ffffff';
    ctx.fillStyle = vsiColor;
    ctx.font = 'bold 16px Segoe UI, sans-serif';
    const vsiSign = verticalSpeed >= 0 ? '+' : '';
    ctx.fillText(`${vsiSign}${verticalSpeed.toFixed(1)} m/s`, x + 80, y + 90);

    // Small arrow
    ctx.fillStyle = vsiColor;
    ctx.beginPath();
    if (verticalSpeed > 0.5) {
      // Up arrow
      ctx.moveTo(x + panelW - 20, y + 80);
      ctx.lineTo(x + panelW - 14, y + 90);
      ctx.lineTo(x + panelW - 26, y + 90);
    } else if (verticalSpeed < -0.5) {
      // Down arrow
      ctx.moveTo(x + panelW - 20, y + 94);
      ctx.lineTo(x + panelW - 14, y + 84);
      ctx.lineTo(x + panelW - 26, y + 84);
    } else {
      // Horizontal line
      ctx.moveTo(x + panelW - 26, y + 87);
      ctx.lineTo(x + panelW - 14, y + 87);
      ctx.lineWidth = 2;
      ctx.stroke();
      return;
    }
    ctx.closePath();
    ctx.fill();
  }

  // --- Status (top-left): airborne/crashed + mission ---
  private drawStatus(onGround: boolean, crashed: boolean) {
    const ctx = this._ctx;
    const x = 16;
    const y = 60;

    // Background panel with gradient
    const panelGrad = ctx.createLinearGradient(x, y, x, y + 50);
    panelGrad.addColorStop(0, 'rgba(8, 12, 24, 0.88)');
    panelGrad.addColorStop(1, 'rgba(8, 12, 24, 0.75)');
    ctx.fillStyle = panelGrad;
    ctx.beginPath();
    ctx.roundRect(x, y, 150, 50, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(80, 160, 220, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    let statusText: string;
    let textColor: string;

    if (crashed) {
      statusText = 'CRASHED';
      textColor = '#ff4444';
    } else if (onGround) {
      statusText = 'ON GROUND';
      textColor = '#ffcc00';
    } else {
      statusText = 'AIRBORNE';
      textColor = '#00cc44';
    }

    // Dot indicator with glow
    ctx.save();
    ctx.shadowColor = textColor;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(x + 18, y + 25, 5, 0, Math.PI * 2);
    ctx.fillStyle = textColor;
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = textColor;
    ctx.font = 'bold 14px Segoe UI, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(statusText, x + 30, y + 29);

    // Sub-text based on game mode
    let subText: string;
    if (crashed) {
      subText = 'Press ESC to reset';
    } else if (onGround) {
      subText = 'Throttle up & pitch back';
    } else {
      // Mode-specific hints
      switch (this._gameMode) {
        case 'combat':
          subText = 'Space/V to shoot enemies!';
          break;
        case 'ring_mission':
          subText = 'Fly through rings!';
          break;
        default:
          subText = 'Explore freely!';
      }
    }

    ctx.fillStyle = '#5577aa';
    ctx.font = '10px Segoe UI, sans-serif';
    ctx.fillText(subText, x + 16, y + 44);
  }

  private drawControlsReference() {
    const ctx = this._ctx;
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Minimal controls hint - only visible when on ground or just started
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    const textY = h - 12;

    ctx.font = '11px Segoe UI, sans-serif';
    ctx.fillStyle = 'rgba(150, 180, 220, 0.35)';
    ctx.fillText('W/S Pitch  •  A/D Roll  •  Q/E Yaw  •  ↑/↓ Throttle  •  G Flaps  •  B Brakes', w / 2, textY);
  }

  private drawMissionStatus(missionStatus: { totalRings: number; ringsPassed: number; score: number; timeElapsed: number; completed: boolean }) {
    const ctx = this._ctx;
    const x = 16;
    const y = 118;
    const panelW = 150;
    const panelH = missionStatus.completed ? 75 : 50;

    // Background with gradient
    const panelGrad = ctx.createLinearGradient(x, y, x, y + panelH);
    panelGrad.addColorStop(0, 'rgba(8, 12, 24, 0.88)');
    panelGrad.addColorStop(1, 'rgba(8, 12, 24, 0.75)');
    ctx.fillStyle = panelGrad;
    ctx.beginPath();
    ctx.roundRect(x, y, panelW, panelH, 8);
    ctx.fill();
    ctx.strokeStyle = missionStatus.completed ? 'rgba(0, 180, 90, 0.5)' : 'rgba(80, 160, 220, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.textAlign = 'left';

    // Rings
    ctx.fillStyle = '#6688aa';
    ctx.font = '10px Segoe UI, sans-serif';
    ctx.fillText('RINGS', x + 14, y + 20);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Segoe UI, sans-serif';
    ctx.fillText(`${missionStatus.ringsPassed} / ${missionStatus.totalRings}`, x + 70, y + 20);

    // Score
    ctx.fillStyle = '#6688aa';
    ctx.font = '10px Segoe UI, sans-serif';
    ctx.fillText('SCORE', x + 14, y + 38);
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 14px Segoe UI, sans-serif';
    ctx.fillText(`${missionStatus.score}`, x + 70, y + 38);

    if (missionStatus.completed) {
      ctx.fillStyle = '#00cc44';
      ctx.font = 'bold 12px Segoe UI, sans-serif';
      ctx.fillText(`✓ COMPLETE  ${Math.floor(missionStatus.timeElapsed)}s`, x + 14, y + 62);
    }
  }

  hide() {
    this._visible = false;
    this._overlay.style.display = 'none';
  }

  show() {
    this._visible = true;
    this._overlay.style.display = 'block';
  }

  private drawCameraMode(mode: string): void {
    // Removed - camera mode is now shown in the button
  }

  private drawCombatStatus(combat: { wave: number; score: number; playerHealth: number; maxPlayerHealth: number; enemiesAlive: number; totalEnemies: number }): void {
    const ctx = this._ctx;
    const w = window.innerWidth;
    const x = w - 220;
    const y = 180;
    const panelW = 190;
    const panelH = 120;

    // Panel background
    ctx.fillStyle = 'rgba(30, 10, 10, 0.75)';
    ctx.beginPath();
    ctx.roundRect(x, y, panelW, panelH, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 100, 100, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Wave
    ctx.fillStyle = '#ff6644';
    ctx.font = 'bold 12px Segoe UI, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`WAVE ${combat.wave}`, x + 14, y + 22);

    // Score
    ctx.fillStyle = '#88aacc';
    ctx.font = '11px Segoe UI, sans-serif';
    ctx.fillText('SCORE', x + 14, y + 42);
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 14px Segoe UI, sans-serif';
    ctx.fillText(`${combat.score}`, x + 70, y + 42);

    // Health bar
    ctx.fillStyle = '#88aacc';
    ctx.font = '11px Segoe UI, sans-serif';
    ctx.fillText('HP', x + 14, y + 64);

    const barX = x + 40;
    const barY = y + 54;
    const barW = panelW - 60;
    const barH = 12;
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(barX, barY, barW, barH);
    
    const healthPercent = combat.playerHealth / combat.maxPlayerHealth;
    const hpW = healthPercent * barW;
    const hpColor = healthPercent > 0.6 ? '#00cc44' : healthPercent > 0.3 ? '#ffcc00' : '#ff4444';
    ctx.fillStyle = hpColor;
    ctx.fillRect(barX, barY, hpW, barH);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    // Health text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px Segoe UI, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(combat.playerHealth)}/${combat.maxPlayerHealth}`, x + panelW - 12, y + 64);
    ctx.textAlign = 'left';

    // Enemies
    ctx.fillStyle = '#88aacc';
    ctx.font = '11px Segoe UI, sans-serif';
    ctx.fillText('ENEMIES', x + 14, y + 90);
    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 14px Segoe UI, sans-serif';
    ctx.fillText(`${combat.enemiesAlive} / ${combat.totalEnemies}`, x + 70, y + 90);

    // Target reticle
    ctx.strokeStyle = 'rgba(255, 100, 100, 0.3)';
    ctx.font = '10px Segoe UI, sans-serif';
    ctx.fillText('⊕ TARGET', x + 14, y + 110);
  }
}