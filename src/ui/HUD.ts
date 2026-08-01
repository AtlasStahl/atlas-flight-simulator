/** Cockpit-style HUD with Canvas-rendered round instruments + MENU button */
export class HUD {
  private _canvas: HTMLCanvasElement;
  private _ctx: CanvasRenderingContext2D;
  private _overlay: HTMLDivElement;
  private _menuBtn: HTMLButtonElement;
  private _visible: boolean = true;

  // Instrument positions (relative to canvas)
  private _airspeedPos = { x: 0, y: 0 };
  private _attitudePos = { x: 0, y: 0 };
  private _altimeterPos = { x: 0, y: 0 };

  // Compact instrument radii (smaller to fit in a single row)
  private readonly R_AIRSPEED = 55;
  private readonly R_ATTITUDE = 65;
  private readonly R_ALTITUDE = 55;

  private _onMenuCallback: () => void;
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
      padding: 10px 24px;
      font-size: 14px;
      font-weight: bold;
      font-family: 'Segoe UI', Tahoma, sans-serif;
      letter-spacing: 1px;
      background: rgba(10, 10, 30, 0.75);
      color: #ffffff;
      border: 1px solid rgba(255,255,255,0.25);
      border-radius: 8px;
      cursor: pointer;
      backdrop-filter: blur(8px);
      transition: all 0.2s ease;
    `;
    this._menuBtn.addEventListener('mouseenter', () => {
      this._menuBtn.style.background = 'rgba(0, 150, 255, 0.6)';
      this._menuBtn.style.borderColor = 'rgba(100, 200, 255, 0.8)';
    });
    this._menuBtn.addEventListener('mouseleave', () => {
      this._menuBtn.style.background = 'rgba(10, 10, 30, 0.75)';
      this._menuBtn.style.borderColor = 'rgba(255,255,255,0.25)';
    });
    this._menuBtn.addEventListener('click', () => {
      this._onMenuCallback();
    });
    this._overlay.appendChild(this._menuBtn);

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

    const w = window.innerWidth;
    const h = window.innerHeight;

    // Clear canvas
    this._ctx.clearRect(0, 0, w, h);

    // Draw main instruments
    this.drawAirspeed(speed * 3.6); // m/s to km/h
    this.drawAltimeter(Math.max(0, altitude));
    this.drawAttitude(pitch, roll);

    // Draw info panels (top-left: status + mission, top-right: heading/throttle/vsi)
    this.drawStatus(onGround, crashed);
    this.drawInfoPanel(heading, throttle, verticalSpeed);

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

  // --- Instruments ---

  private drawAirspeed(speedKmh: number) {
    const { x, y } = this._airspeedPos;
    const r = this.R_AIRSPEED;

    this.drawGaugeBackground(x, y, r);

    // Scale: 0-400 km/h, arc from 135° to 405° (270° sweep)
    const startAngle = Math.PI * 0.75; // 135°
    const sweepAngle = Math.PI * 1.5; // 270°
    const maxSpeed = 400;

    // Tick marks and numbers
    const ctx = this._ctx;
    ctx.fillStyle = '#ffffff';
    ctx.font = '11px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let s = 0; s <= maxSpeed; s += 50) {
      const angle = startAngle + (s / maxSpeed) * sweepAngle;
      const outerR = r - 8;
      const innerR = r - 18;

      // Major tick
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(angle) * outerR, y + Math.sin(angle) * outerR);
      ctx.lineTo(x + Math.cos(angle) * innerR, y + Math.sin(angle) * innerR);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Minor ticks
      for (let m = 1; m < 5; m++) {
        const minorAngle = startAngle + ((s + m * 10) / maxSpeed) * sweepAngle;
        const minorInnerR = r - 13;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(minorAngle) * outerR, y + Math.sin(minorAngle) * outerR);
        ctx.lineTo(x + Math.cos(minorAngle) * minorInnerR, y + Math.sin(minorAngle) * minorInnerR);
        ctx.strokeStyle = '#aaaaaa';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Number
      const textR = r - 28;
      ctx.fillText(s.toString(), x + Math.cos(angle) * textR, y + Math.sin(angle) * textR);
    }

    // Color arcs
    // Green: 100-300 km/h
    const greenStart = startAngle + (100 / maxSpeed) * sweepAngle;
    const greenEnd = startAngle + (300 / maxSpeed) * sweepAngle;
    this.drawArcSegment(x, y, r - 4, greenStart, greenEnd, '#00cc00', 4);

    // Yellow: 300-350 km/h
    const yellowStart = greenEnd;
    const yellowEnd = startAngle + (350 / maxSpeed) * sweepAngle;
    this.drawArcSegment(x, y, r - 4, yellowStart, yellowEnd, '#ffcc00', 4);

    // Red: 350+ km/h
    const redStart = yellowEnd;
    const redEnd = startAngle + sweepAngle;
    this.drawArcSegment(x, y, r - 4, redStart, redEnd, '#ff0000', 4);

    // Needle
    const clampedSpeed = Math.max(0, Math.min(maxSpeed, speedKmh));
    const needleAngle = startAngle + (clampedSpeed / maxSpeed) * sweepAngle;
    this.drawNeedle(x, y, needleAngle, r - 20, 3);

    // Label
    ctx.fillStyle = '#cccccc';
    ctx.font = 'bold 11px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('KM/H', x, y + r - 42);

    // Digital readout at bottom
    ctx.fillStyle = '#111111';
    ctx.fillRect(x - 25, y + r - 35, 50, 18);
    ctx.strokeStyle = '#555555';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 25, y + r - 35, 50, 18);
    ctx.fillStyle = '#00ff00';
    ctx.font = '12px Courier New, monospace';
    ctx.fillText(Math.round(clampedSpeed).toString(), x, y + r - 23);
  }

  private drawAltimeter(altitude: number) {
    const { x, y } = this._altimeterPos;
    const r = this.R_ALTITUDE;

    this.drawGaugeBackground(x, y, r);

    const ctx = this._ctx;
    const maxAlt = 5000;

    // Scale: 0-5000m, arc from 135° to 405° (270° sweep)
    const startAngle = Math.PI * 0.75;
    const sweepAngle = Math.PI * 1.5;

    // Tick marks and numbers
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let a = 0; a <= maxAlt; a += 500) {
      const angle = startAngle + (a / maxAlt) * sweepAngle;
      const outerR = r - 8;
      const innerR = r - 16;

      // Major tick
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(angle) * outerR, y + Math.sin(angle) * outerR);
      ctx.lineTo(x + Math.cos(angle) * innerR, y + Math.sin(angle) * innerR);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Number
      const textR = r - 24;
      ctx.fillText((a / 1000).toFixed(1), x + Math.cos(angle) * textR, y + Math.sin(angle) * textR);
    }

    // Needle for 100m increments (long needle)
    const clampedAlt = Math.max(0, Math.min(maxAlt, altitude));
    const needleAngle = startAngle + (clampedAlt / maxAlt) * sweepAngle;
    this.drawNeedle(x, y, needleAngle, r - 18, 2);

    // Label
    ctx.fillStyle = '#cccccc';
    ctx.font = 'bold 11px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ALT', x, y - r + 42);

    // Digital readout
    ctx.fillStyle = '#111111';
    ctx.fillRect(x - 25, y + r - 35, 50, 18);
    ctx.strokeStyle = '#555555';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 25, y + r - 35, 50, 18);
    ctx.fillStyle = '#00ff00';
    ctx.font = '12px Courier New, monospace';
    ctx.fillText(Math.round(clampedAlt).toString(), x, y + r - 23);
  }

  // --- Attitude indicator (center instrument) ---
  private drawAttitude(pitch: number, roll: number) {
    const { x, y } = this._attitudePos;
    const r = this.R_ATTITUDE;

    this.drawGaugeBackground(x, y, r);

    const ctx = this._ctx;

    // Clip to circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r - 2, 0, Math.PI * 2);
    ctx.clip();

    // Apply roll rotation
    ctx.translate(x, y);
    ctx.rotate(roll);

    // Pitch offset (pixels per radian)
    const pitchScale = r * 0.8;
    const pitchOffset = pitch * pitchScale;

    // Sky (top half) - blue
    ctx.fillStyle = '#2266aa';
    ctx.fillRect(-r, -r + pitchOffset, r * 2, r);

    // Ground (bottom half) - brown
    ctx.fillStyle = '#664422';
    ctx.fillRect(-r, pitchOffset, r * 2, r);

    // Horizon line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r, pitchOffset);
    ctx.lineTo(r, pitchOffset);
    ctx.stroke();

    // Pitch ladder lines
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#ffffff';
    ctx.font = '9px Arial, sans-serif';
    ctx.textAlign = 'center';

    for (const deg of [-30, -20, -10, 10, 20, 30]) {
      const lineY = pitchOffset - (deg * Math.PI / 180) * pitchScale;
      const lineWidth = deg % 20 === 0 ? 40 : 25;

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(-lineWidth, lineY);
      ctx.lineTo(lineWidth, lineY);
      ctx.stroke();

      // Small wings for non-zero
      if (deg !== 0) {
        ctx.beginPath();
        ctx.moveTo(-lineWidth, lineY);
        ctx.lineTo(-lineWidth + 5, lineY - (deg > 0 ? -3 : 3));
        ctx.lineTo(lineWidth - 5, lineY - (deg > 0 ? -3 : 3));
        ctx.lineTo(lineWidth, lineY);
        ctx.fillStyle = deg > 0 ? '#ffffff' : '#cccccc';
        ctx.fill();

        // Label
        ctx.fillText(deg.toString(), lineWidth + 12, lineY + 3);
      }
    }

    ctx.restore();

    // Fixed aircraft reference symbol (center)
    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth = 3;

    // Horizontal wing line
    ctx.beginPath();
    ctx.moveTo(x - 35, y);
    ctx.lineTo(x - 8, y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + 8, y);
    ctx.lineTo(x + 35, y);
    ctx.stroke();

    // Center dot
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#ffcc00';
    ctx.fill();

    // Roll indicator arc at top
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r - 2, 0, Math.PI * 2);
    ctx.clip();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y - r + 12);
    ctx.lineTo(x - 8, y - r + 20);
    ctx.lineTo(x + 8, y - r + 20);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Roll scale marks
    for (const deg of [-60, -45, -30, -20, 0, 20, 30, 45, 60]) {
      const angle = -Math.PI / 2 + (deg * Math.PI / 180);
      const outerR = r - 6;
      const innerR = r - 12;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(angle) * outerR, y + Math.sin(angle) * outerR);
      ctx.lineTo(x + Math.cos(angle) * innerR, y + Math.sin(angle) * innerR);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = deg === 0 ? 2 : 1;
      ctx.stroke();
    }
    ctx.restore();
  }

  // --- Info panel (top-right): heading, throttle, VSI ---
  private drawInfoPanel(heading: number, throttle: number, verticalSpeed: number) {
    const ctx = this._ctx;
    const w = window.innerWidth;
    const x = w - 200;
    const y = 60;
    const panelW = 170;
    const panelH = 110;

    // Panel background
    ctx.fillStyle = 'rgba(10, 10, 30, 0.65)';
    ctx.beginPath();
    ctx.roundRect(x, y, panelW, panelH, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(100, 200, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Heading
    const headingDeg = (((heading * 180 / Math.PI) % 360) + 360) % 360;
    ctx.fillStyle = '#88aacc';
    ctx.font = '11px Segoe UI, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('HDG', x + 12, y + 22);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Segoe UI, sans-serif';
    ctx.fillText(`${Math.round(headingDeg).toString().padStart(3, ' ')}°`, x + 60, y + 22);

    // Throttle bar
    ctx.fillStyle = '#88aacc';
    ctx.font = '11px Segoe UI, sans-serif';
    ctx.fillText('THR', x + 12, y + 48);

    const barX = x + 60;
    const barY = y + 38;
    const barW = panelW - 80;
    const barH = 12;
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(barX, barY, barW, barH);
    const thrW = throttle * barW;
    const thrGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    thrGrad.addColorStop(0, '#00cc44');
    thrGrad.addColorStop(0.7, '#ffcc00');
    thrGrad.addColorStop(1, '#ff4400');
    ctx.fillStyle = thrGrad;
    ctx.fillRect(barX, barY, thrW, barH);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    // Throttle %
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px Segoe UI, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(throttle * 100)}%`, x + panelW - 12, y + 48);
    ctx.textAlign = 'left';

    // VSI
    ctx.fillStyle = '#88aacc';
    ctx.font = '11px Segoe UI, sans-serif';
    ctx.fillText('V/S', x + 12, y + 78);
    const vsiColor = verticalSpeed > 0.5 ? '#00cc44' : verticalSpeed < -0.5 ? '#ff6644' : '#ffffff';
    ctx.fillStyle = vsiColor;
    ctx.font = 'bold 14px Segoe UI, sans-serif';
    const vsiSign = verticalSpeed >= 0 ? '+' : '';
    ctx.fillText(`${vsiSign}${verticalSpeed.toFixed(1)} m/s`, x + 60, y + 78);

    // Small arrow
    ctx.fillStyle = vsiColor;
    ctx.beginPath();
    if (verticalSpeed > 0.5) {
      // Up arrow
      ctx.moveTo(x + panelW - 20, y + 68);
      ctx.lineTo(x + panelW - 14, y + 78);
      ctx.lineTo(x + panelW - 26, y + 78);
    } else if (verticalSpeed < -0.5) {
      // Down arrow
      ctx.moveTo(x + panelW - 20, y + 82);
      ctx.lineTo(x + panelW - 14, y + 72);
      ctx.lineTo(x + panelW - 26, y + 72);
    } else {
      // Horizontal line
      ctx.moveTo(x + panelW - 26, y + 75);
      ctx.lineTo(x + panelW - 14, y + 75);
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

    // Background panel
    ctx.fillStyle = 'rgba(10, 10, 30, 0.65)';
    ctx.beginPath();
    ctx.roundRect(x, y, 140, 44, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(100, 200, 255, 0.3)';
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

    // Dot indicator
    ctx.beginPath();
    ctx.arc(x + 16, y + 22, 5, 0, Math.PI * 2);
    ctx.fillStyle = textColor;
    ctx.fill();

    ctx.fillStyle = textColor;
    ctx.font = 'bold 13px Segoe UI, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(statusText, x + 28, y + 26);

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

    ctx.fillStyle = '#6688aa';
    ctx.font = '10px Segoe UI, sans-serif';
    ctx.fillText(subText, x + 16, y + 40);
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
    const y = 112;
    const panelW = 140;
    const panelH = missionStatus.completed ? 70 : 44;

    // Background
    ctx.fillStyle = 'rgba(10, 10, 30, 0.65)';
    ctx.beginPath();
    ctx.roundRect(x, y, panelW, panelH, 8);
    ctx.fill();
    ctx.strokeStyle = missionStatus.completed ? 'rgba(0, 200, 100, 0.5)' : 'rgba(100, 200, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.textAlign = 'left';

    // Rings
    ctx.fillStyle = '#88aacc';
    ctx.font = '11px Segoe UI, sans-serif';
    ctx.fillText('RINGS', x + 14, y + 18);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px Segoe UI, sans-serif';
    ctx.fillText(`${missionStatus.ringsPassed} / ${missionStatus.totalRings}`, x + 70, y + 18);

    // Score + Time
    ctx.fillStyle = '#88aacc';
    ctx.font = '11px Segoe UI, sans-serif';
    ctx.fillText('SCORE', x + 14, y + 36);
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 13px Segoe UI, sans-serif';
    ctx.fillText(`${missionStatus.score}`, x + 70, y + 36);

    if (missionStatus.completed) {
      ctx.fillStyle = '#00cc44';
      ctx.font = 'bold 12px Segoe UI, sans-serif';
      ctx.fillText(`✓ COMPLETE  ${Math.floor(missionStatus.timeElapsed)}s`, x + 14, y + 60);
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
    const ctx = this._ctx;
    const w = window.innerWidth;
    const x = w / 2 - 60;
    const y = 10;
    const panelW = 120;
    const panelH = 28;

    // Panel background
    ctx.fillStyle = 'rgba(10, 10, 30, 0.65)';
    ctx.beginPath();
    ctx.roundRect(x, y, panelW, panelH, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(100, 200, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Mode label
    const modeLabels: Record<string, string> = {
      chase: 'CHASE CAM',
      cockpit: 'COCKPIT',
      cinematic: 'CINEMATIC',
      tower: 'TOWER'
    };

    ctx.fillStyle = '#00ccff';
    ctx.font = 'bold 11px Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(modeLabels[mode] || mode.toUpperCase(), x + panelW / 2, y + 18);
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