/** Cockpit-style HUD with realistic analog instruments per aircraft type */
export class HUD {
  private _canvas: HTMLCanvasElement;
  private _ctx: CanvasRenderingContext2D;
  private _overlay: HTMLDivElement;
  private _menuBtn: HTMLButtonElement;
  private _cameraBtn: HTMLButtonElement;
  private _visible: boolean = true;

  // Smoothed values
  private _smoothSpeed = 0;
  private _smoothAltitude = 0;
  private _smoothHeading = 0;
  private _smoothThrottle = 0;
  private _smoothVerticalSpeed = 0;
  private _smoothPitch = 0;
  private _smoothRoll = 0;

  // Needle positions (smoothed separately for realistic inertia)
  private _needleSpeed = 0;
  private _needleAlt = 0;
  private _needleHeading = 0;

  // Instrument positions
  private _airspeedPos = { x: 0, y: 0 };
  private _attitudePos = { x: 0, y: 0 };
  private _altimeterPos = { x: 0, y: 0 };
  private _headingPos = { x: 0, y: 0 };

  // Radii
  private readonly R_AIRSPEED = 60;
  private readonly R_ATTITUDE = 70;
  private readonly R_ALTITUDE = 60;
  private readonly R_HEADING = 50;

  // Aircraft-specific theming
  private _theme = {
    bezel: '#4a4a4a',
    face: '#1a1a1a',
    faceHighlight: '#2a2a2a',
    needle: '#e8e8e8',
    needleAccent: '#ff3333',
    tickColor: '#ffffff',
    textColor: '#cccccc',
    accentColor: '#00cc44',
    stallColor: '#ff6600',
    font: '\'Helvetica Neue\', Arial, sans-serif'
  };

  // Scale per aircraft type
  private _maxSpeed = 400;
  private _maxAlt = 5000;
  private _stallSpeed = 108;

  private _onMenuCallback: () => void;
  private _onCameraCallback: (() => void) | undefined;
  private _gameMode: 'free_flight' | 'ring_mission' | 'combat' = 'free_flight';
  private _aircraftType: string = 'cessna';

  constructor(onMenu: () => void, gameMode: 'free_flight' | 'ring_mission' | 'combat' = 'free_flight') {
    this._onMenuCallback = onMenu;
    this._gameMode = gameMode;

    // Overlay container
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
    this._menuBtn.textContent = 'MENU';
    this._menuBtn.style.cssText = `
      position: absolute;
      top: 16px;
      right: 16px;
      z-index: 200;
      pointer-events: auto;
      padding: 6px 14px;
      font-size: 11px;
      font-weight: 500;
      font-family: 'Helvetica Neue', Arial, sans-serif;
      letter-spacing: 1px;
      background: rgba(8, 12, 24, 0.8);
      color: #ffffff;
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.15s ease;
    `;
    this._menuBtn.addEventListener('mouseenter', () => {
      this._menuBtn.style.background = 'rgba(56, 56, 255, 0.6)';
    });
    this._menuBtn.addEventListener('mouseleave', () => {
      this._menuBtn.style.background = 'rgba(8, 12, 24, 0.8)';
    });
    this._menuBtn.addEventListener('click', () => {
      this._onMenuCallback();
    });
    this._overlay.appendChild(this._menuBtn);

    // Camera button (top-center)
    this._cameraBtn = document.createElement('button');
    this._cameraBtn.textContent = 'KAMERA';
    this._cameraBtn.style.cssText = `
      position: absolute;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 200;
      pointer-events: auto;
      padding: 6px 14px;
      font-size: 11px;
      font-weight: 500;
      font-family: 'Helvetica Neue', Arial, sans-serif;
      letter-spacing: 1px;
      background: rgba(8, 12, 24, 0.8);
      color: #3838FF;
      border: 1px solid rgba(56, 56, 255, 0.25);
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.15s ease;
    `;
    this._cameraBtn.addEventListener('mouseenter', () => {
      this._cameraBtn.style.background = 'rgba(56, 56, 255, 0.5)';
      this._cameraBtn.style.color = '#ffffff';
    });
    this._cameraBtn.addEventListener('mouseleave', () => {
      this._cameraBtn.style.background = 'rgba(8, 12, 24, 0.8)';
      this._cameraBtn.style.color = '#3838FF';
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
    // Reset transform before re-scaling
    this._ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const w = window.innerWidth;
    const h = window.innerHeight;

    // Classic cockpit layout - moved higher to avoid blocking aircraft view at start
    const panelY = h - 180;
    const spacing = Math.min(w * 0.2, 240);
    const centerX = w / 2;

    this._attitudePos.x = centerX;
    this._attitudePos.y = panelY;

    this._airspeedPos.x = centerX - spacing;
    this._airspeedPos.y = panelY;

    this._altimeterPos.x = centerX + spacing;
    this._altimeterPos.y = panelY;

    // Heading indicator above attitude
    this._headingPos.x = centerX;
    this._headingPos.y = panelY - 130;
  }

  private lerp(current: number, target: number, factor: number): number {
    return current + (target - current) * factor;
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
    _cameraMode?: string,
    combatStatus?: { wave: number; score: number; playerHealth: number; maxPlayerHealth: number; enemiesAlive: number; totalEnemies: number }
  ) {
    if (!this._visible) return;

    // Apply aircraft-specific theme
    this.applyAircraftTheme();

    // Smooth raw values first
    this._smoothSpeed = this.lerp(this._smoothSpeed, speed, 0.1);
    this._smoothAltitude = this.lerp(this._smoothAltitude, altitude, 0.1);
    this._smoothHeading = this.lerp(this._smoothHeading, heading, 0.1);
    this._smoothThrottle = this.lerp(this._smoothThrottle, throttle, 0.1);
    this._smoothVerticalSpeed = this.lerp(this._smoothVerticalSpeed, verticalSpeed, 0.1);
    this._smoothPitch = this.lerp(this._smoothPitch, pitch, 0.15);
    this._smoothRoll = this.lerp(this._smoothRoll, roll, 0.15);

    // Smooth needle positions (realistic inertia - slower than value smoothing)
    const needleSmooth = this._aircraftType === 'boeing' ? 0.04 : 0.06;
    this._needleSpeed = this.lerp(this._needleSpeed, this._smoothSpeed * 3.6, needleSmooth);
    this._needleAlt = this.lerp(this._needleAlt, Math.max(0, this._smoothAltitude), needleSmooth);
    this._needleHeading = this.lerp(this._needleHeading, this._smoothHeading, needleSmooth);

    const w = window.innerWidth;
    const h = window.innerHeight;

    // Clear canvas
    this._ctx.clearRect(0, 0, w, h);

    // Draw analog instruments
    this.drawAirspeedIndicator(this._needleSpeed);
    this.drawAltimeter(this._needleAlt);
    this.drawAttitudeIndicator(this._smoothPitch, this._smoothRoll);
    this.drawHeadingIndicator(this._needleHeading);

    // Draw info panels
    this.drawStatus(onGround, crashed);
    this.drawThrottleBar(this._smoothThrottle, this._smoothVerticalSpeed);

    // Draw mission/combat status
    if (missionStatus) {
      this.drawMissionStatus(missionStatus);
    }
    if (combatStatus) {
      this.drawCombatStatus(combatStatus);
    }
  }

  setGameMode(mode: 'free_flight' | 'ring_mission' | 'combat'): void {
    this._gameMode = mode;
  }

  setAircraftType(type: string): void {
    this._aircraftType = type;
    this.applyAircraftTheme();
  }

  setCameraCallback(callback: () => void): void {
    this._onCameraCallback = callback;
  }

  updateCameraButton(mode: string): void {
    const cameraLabels: Record<string, string> = {
      chase: 'VERFOLGUNG',
      cockpit: 'COCKPIT',
      cinematic: 'KINO',
      tower: 'TURM'
    };
    this._cameraBtn.textContent = `${cameraLabels[mode] || mode}`;
  }

  private applyAircraftTheme(): void {
    switch (this._aircraftType) {
      case 'cessna':
        this._theme = {
          bezel: '#5a5a5a', face: '#1a1a1a', faceHighlight: '#2a2a2a',
          needle: '#e8e8e8', needleAccent: '#ff3333',
          tickColor: '#ffffff', textColor: '#cccccc',
          accentColor: '#00cc44', stallColor: '#ff6600',
          font: '\'Helvetica Neue\', Arial, sans-serif'
        };
        this._maxSpeed = 400; this._maxAlt = 5000; this._stallSpeed = 108;
        break;
      case 'boeing':
        this._theme = {
          bezel: '#3a3a3a', face: '#0a0a0a', faceHighlight: '#1a1a1a',
          needle: '#ffffff', needleAccent: '#0088ff',
          tickColor: '#dddddd', textColor: '#bbbbbb',
          accentColor: '#00aaff', stallColor: '#ff8800',
          font: '\'Helvetica Neue\', Arial, sans-serif'
        };
        this._maxSpeed = 900; this._maxAlt = 12000; this._stallSpeed = 198;
        break;
      case 'extra':
        this._theme = {
          bezel: '#4a4a4a', face: '#151515', faceHighlight: '#252525',
          needle: '#ff4444', needleAccent: '#ff4444',
          tickColor: '#ffffff', textColor: '#dddddd',
          accentColor: '#ff6600', stallColor: '#ff0000',
          font: '\'Helvetica Neue\', Arial, sans-serif'
        };
        this._maxSpeed = 700; this._maxAlt = 6000; this._stallSpeed = 90;
        break;
      case 'f16':
        this._theme = {
          bezel: '#2a3a2a', face: '#050a05', faceHighlight: '#0a150a',
          needle: '#00ff44', needleAccent: '#00ff44',
          tickColor: '#00ff44', textColor: '#00cc33',
          accentColor: '#00ff88', stallColor: '#ff4400',
          font: '\'Helvetica Neue\', Arial, sans-serif'
        };
        this._maxSpeed = 1400; this._maxAlt = 15000; this._stallSpeed = 144;
        break;
      case 'su27':
        this._theme = {
          bezel: '#3a3a3a', face: '#0a0a0a', faceHighlight: '#151515',
          needle: '#ffcc00', needleAccent: '#ffcc00',
          tickColor: '#ffcc00', textColor: '#cccccc',
          accentColor: '#ffaa00', stallColor: '#ff4400',
          font: '\'Helvetica Neue\', Arial, sans-serif'
        };
        this._maxSpeed = 1400; this._maxAlt = 15000; this._stallSpeed = 162;
        break;
      default:
        this._theme = {
          bezel: '#4a4a4a', face: '#1a1a1a', faceHighlight: '#2a2a2a',
          needle: '#e8e8e8', needleAccent: '#ff3333',
          tickColor: '#ffffff', textColor: '#cccccc',
          accentColor: '#00cc44', stallColor: '#ff6600',
          font: '\'Helvetica Neue\', Arial, sans-serif'
        };
        this._maxSpeed = 400; this._maxAlt = 5000; this._stallSpeed = 108;
    }
  }

  // --- Analog Gauge Drawing ---

  private drawGaugeFace(x: number, y: number, r: number) {
    const ctx = this._ctx;

    // Outer bezel with depth
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    const bezelGrad = ctx.createRadialGradient(x - r * 0.2, y - r * 0.2, 0, x, y, r + 5);
    bezelGrad.addColorStop(0, '#666666');
    bezelGrad.addColorStop(0.5, this._theme.bezel);
    bezelGrad.addColorStop(1, '#222222');
    ctx.beginPath();
    ctx.arc(x, y, r + 5, 0, Math.PI * 2);
    ctx.fillStyle = bezelGrad;
    ctx.fill();
    ctx.restore();

    // Gauge face
    const faceGrad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
    faceGrad.addColorStop(0, this._theme.faceHighlight);
    faceGrad.addColorStop(1, this._theme.face);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = faceGrad;
    ctx.fill();

    // Inner ring
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Glass reflection
    const glassGrad = ctx.createLinearGradient(x - r, y - r, x + r * 0.5, y + r);
    glassGrad.addColorStop(0, 'rgba(255,255,255,0.08)');
    glassGrad.addColorStop(0.4, 'rgba(255,255,255,0)');
    glassGrad.addColorStop(1, 'rgba(0,0,0,0.1)');
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = glassGrad;
    ctx.fill();
  }

  private drawAnalogNeedle(x: number, y: number, angle: number, length: number, isAccent: boolean = false) {
    const ctx = this._ctx;
    const tipX = x + Math.cos(angle) * length;
    const tipY = y + Math.sin(angle) * length;

    // Needle shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(tipX, tipY);
    ctx.strokeStyle = isAccent ? this._theme.needleAccent : this._theme.needle;
    ctx.lineWidth = isAccent ? 3 : 2;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();

    // Center pivot
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = isAccent ? this._theme.needleAccent : '#888888';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }

  private drawTicks(x: number, y: number, r: number, startAngle: number, sweepAngle: number, maxVal: number, step: number) {
    const ctx = this._ctx;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let v = 0; v <= maxVal; v += step) {
      const angle = startAngle + (v / maxVal) * sweepAngle;
      const outerR = r - 6;
      const innerR = r - 16;

      // Major tick
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(angle) * outerR, y + Math.sin(angle) * outerR);
      ctx.lineTo(x + Math.cos(angle) * innerR, y + Math.sin(angle) * innerR);
      ctx.strokeStyle = this._theme.tickColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Minor ticks
      for (let m = 1; m < 5; m++) {
        const minorAngle = startAngle + ((v + m * (step / 5)) / maxVal) * sweepAngle;
        const minorInnerR = r - 11;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(minorAngle) * outerR, y + Math.sin(minorAngle) * outerR);
        ctx.lineTo(x + Math.cos(minorAngle) * minorInnerR, y + Math.sin(minorAngle) * minorInnerR);
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      // Number
      const textR = r - 26;
      ctx.fillStyle = this._theme.textColor;
      ctx.font = `10px ${this._theme.font}`;
      ctx.fillText(v.toString(), x + Math.cos(angle) * textR, y + Math.sin(angle) * textR);
    }
  }

  private drawArc(x: number, y: number, r: number, startAngle: number, endAngle: number, color: string, width: number) {
    const ctx = this._ctx;
    ctx.beginPath();
    ctx.arc(x, y, r, startAngle, endAngle);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  // --- Airspeed Indicator ---
  private drawAirspeedIndicator(speedKmh: number) {
    const { x, y } = this._airspeedPos;
    const r = this.R_AIRSPEED;
    const maxSpeed = this._maxSpeed;
    const stallSpeed = this._stallSpeed;

    this.drawGaugeFace(x, y, r);

    const step = maxSpeed <= 500 ? 50 : maxSpeed <= 1000 ? 100 : 200;
    const startAngle = Math.PI * 0.75;
    const sweepAngle = Math.PI * 1.5;

    this.drawTicks(x, y, r, startAngle, sweepAngle, maxSpeed, step);

    // Green arc (safe range)
    const greenStart = startAngle + (stallSpeed / maxSpeed) * sweepAngle;
    const greenEnd = startAngle + (maxSpeed * 0.75 / maxSpeed) * sweepAngle;
    this.drawArc(x, y, r - 3, greenStart, greenEnd, this._theme.accentColor, 3);

    // Yellow arc (caution)
    const yellowStart = greenEnd;
    const yellowEnd = startAngle + (maxSpeed * 0.9 / maxSpeed) * sweepAngle;
    this.drawArc(x, y, r - 3, yellowStart, yellowEnd, '#ffcc00', 3);

    // Red arc (danger)
    const redStart = yellowEnd;
    const redEnd = startAngle + sweepAngle;
    this.drawArc(x, y, r - 3, redStart, redEnd, '#ff3333', 3);

    // Stall warning — pulsing warning when near or below stall speed
    const ctx = this._ctx;
    const isNearStall = speedKmh < stallSpeed * 1.15;
    if (isNearStall) {
      const pulse = Math.sin(performance.now() / 200) * 0.4 + 0.6;
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.fillStyle = this._theme.stallColor;
      ctx.font = `bold 16px ${this._theme.font}`;
      ctx.textAlign = 'center';
      ctx.fillText('⚠ STALL', x, y + r + 20);
      ctx.restore();
    }

    // Needle
    const clampedSpeed = Math.max(0, Math.min(maxSpeed, speedKmh));
    const needleAngle = startAngle + (clampedSpeed / maxSpeed) * sweepAngle;
    const isAccent = this._aircraftType === 'extra' || this._aircraftType === 'f16' || this._aircraftType === 'su27';
    this.drawAnalogNeedle(x, y, needleAngle, r - 18, isAccent);

    // Label
    ctx.fillStyle = this._theme.textColor;
    ctx.font = `bold 9px ${this._theme.font}`;
    ctx.textAlign = 'center';
    ctx.fillText('KM/H', x, y + r - 40);

    // Digital readout at bottom
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x - 22, y + r - 30, 44, 16);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x - 22, y + r - 30, 44, 16);
    ctx.fillStyle = isNearStall ? this._theme.stallColor : this._theme.accentColor;
    ctx.font = `bold 11px ${this._theme.font}`;
    ctx.fillText(Math.round(clampedSpeed).toString(), x, y + r - 18);
  }

  // --- Altimeter ---
  private drawAltimeter(altitude: number) {
    const { x, y } = this._altimeterPos;
    const r = this.R_ALTITUDE;
    const maxAlt = this._maxAlt;

    this.drawGaugeFace(x, y, r);

    const step = maxAlt <= 6000 ? 500 : 1000;
    const startAngle = Math.PI * 0.75;
    const sweepAngle = Math.PI * 1.5;

    this.drawTicks(x, y, r, startAngle, sweepAngle, maxAlt, step);

    // Needle
    const clampedAlt = Math.max(0, Math.min(maxAlt, altitude));
    const needleAngle = startAngle + (clampedAlt / maxAlt) * sweepAngle;
    this.drawAnalogNeedle(x, y, needleAngle, r - 16, false);

    // Label
    const ctx = this._ctx;
    ctx.fillStyle = this._theme.textColor;
    ctx.font = `bold 9px ${this._theme.font}`;
    ctx.textAlign = 'center';
    ctx.fillText('ALT', x, y - r + 40);

    // Digital readout
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x - 22, y + r - 30, 44, 16);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x - 22, y + r - 30, 44, 16);
    ctx.fillStyle = this._theme.accentColor;
    ctx.font = `bold 11px ${this._theme.font}`;
    ctx.fillText(Math.round(clampedAlt).toString(), x, y + r - 18);
  }

  // --- Attitude Indicator ---
  private drawAttitudeIndicator(pitch: number, roll: number) {
    const { x, y } = this._attitudePos;
    const r = this.R_ATTITUDE;

    this.drawGaugeFace(x, y, r);

    const ctx = this._ctx;

    // Clip to circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r - 2, 0, Math.PI * 2);
    ctx.clip();

    // Apply roll rotation
    ctx.translate(x, y);
    ctx.rotate(roll);

    // Pitch offset
    const pitchScale = r * 0.6;
    const pitchOffset = pitch * pitchScale;

    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, -r, 0, pitchOffset);
    skyGrad.addColorStop(0, '#1a4488');
    skyGrad.addColorStop(1, '#2266aa');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(-r, -r + pitchOffset, r * 2, r);

    // Ground gradient
    const groundGrad = ctx.createLinearGradient(0, pitchOffset, 0, r);
    groundGrad.addColorStop(0, '#553311');
    groundGrad.addColorStop(1, '#664422');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(-r, pitchOffset, r * 2, r);

    // Horizon line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r, pitchOffset);
    ctx.lineTo(r, pitchOffset);
    ctx.stroke();

    // Pitch ladder
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 0.8;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = `8px ${this._theme.font}`;
    ctx.textAlign = 'center';

    for (const deg of [-20, -10, 10, 20]) {
      const lineY = pitchOffset - (deg * Math.PI / 180) * pitchScale;
      const lineWidth = deg % 20 === 0 ? 35 : 20;

      ctx.beginPath();
      ctx.moveTo(-lineWidth, lineY);
      ctx.lineTo(lineWidth, lineY);
      ctx.stroke();

      if (deg !== 0) {
        ctx.fillText(deg.toString(), lineWidth + 10, lineY + 3);
      }
    }

    ctx.restore();

    // Fixed aircraft reference
    ctx.strokeStyle = this._theme.needleAccent;
    ctx.lineWidth = 3;

    // Horizontal wing line
    ctx.beginPath();
    ctx.moveTo(x - 38, y);
    ctx.lineTo(x - 10, y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + 10, y);
    ctx.lineTo(x + 38, y);
    ctx.stroke();

    // Center dot
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fillStyle = this._theme.needleAccent;
    ctx.fill();

    // Roll indicator
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r - 2, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(x, y - r + 10);
    ctx.lineTo(x - 6, y - r + 18);
    ctx.lineTo(x + 6, y - r + 18);
    ctx.closePath();
    ctx.fill();

    // Roll marks
    for (const deg of [-60, -30, 0, 30, 60]) {
      const angle = -Math.PI / 2 + (deg * Math.PI / 180);
      const outerR = r - 5;
      const innerR = r - 11;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(angle) * outerR, y + Math.sin(angle) * outerR);
      ctx.lineTo(x + Math.cos(angle) * innerR, y + Math.sin(angle) * innerR);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = deg === 0 ? 2 : 1;
      ctx.stroke();
    }
    ctx.restore();
  }

  // --- Heading Indicator ---
  private drawHeadingIndicator(heading: number) {
    const { x, y } = this._headingPos;
    const r = this.R_HEADING;

    this.drawGaugeFace(x, y, r);

    const ctx = this._ctx;

    // Convert to degrees
    const headingDeg = (((heading * 180 / Math.PI) % 360) + 360) % 360;

    // Draw compass card
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r - 2, 0, Math.PI * 2);
    ctx.clip();

    ctx.translate(x, y);
    ctx.rotate(-headingDeg * Math.PI / 180);

    // Cardinal directions
    const directions = ['N', '30', '60', '90', '120', '150', 'S', '210', '240', '270', '300', '330'];
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < directions.length; i++) {
      const angle = (i * 30) * Math.PI / 180;
      const textR = r - 16;
      const isCardinal = i === 0 || i === 6;

      ctx.fillStyle = isCardinal ? this._theme.accentColor : this._theme.textColor;
      ctx.font = isCardinal ? `bold 10px ${this._theme.font}` : `9px ${this._theme.font}`;
      ctx.fillText(directions[i], Math.cos(angle) * textR, Math.sin(angle) * textR);

      // Tick marks
      const outerR = r - 6;
      const innerR = r - 12;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR);
      ctx.lineTo(Math.cos(angle) * innerR, Math.sin(angle) * innerR);
      ctx.strokeStyle = isCardinal ? this._theme.accentColor : 'rgba(255,255,255,0.5)';
      ctx.lineWidth = isCardinal ? 1.5 : 0.8;
      ctx.stroke();
    }

    ctx.restore();

    // Fixed pointer at top
    ctx.fillStyle = this._theme.needleAccent;
    ctx.beginPath();
    ctx.moveTo(x, y - r + 8);
    ctx.lineTo(x - 5, y - r + 16);
    ctx.lineTo(x + 5, y - r + 16);
    ctx.closePath();
    ctx.fill();

    // Digital heading
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x - 20, y + r - 24, 40, 14);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x - 20, y + r - 24, 40, 14);
    ctx.fillStyle = this._theme.accentColor;
    ctx.font = `bold 10px ${this._theme.font}`;
    ctx.textAlign = 'center';
    ctx.fillText(Math.round(headingDeg).toString().padStart(3, ' '), x, y + r - 14);
  }

  // --- Status Panel ---
  private drawStatus(onGround: boolean, crashed: boolean) {
    const ctx = this._ctx;
    const x = 16;
    const y = 60;

    ctx.fillStyle = 'rgba(8, 12, 24, 0.85)';
    ctx.beginPath();
    ctx.roundRect(x, y, 140, 44, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(56, 56, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    let statusText: string;
    let textColor: string;

    if (crashed) {
      statusText = 'ABGESTÜRZT';
      textColor = '#ff4444';
    } else if (onGround) {
      statusText = 'AM BODEN';
      textColor = '#ffcc00';
    } else {
      statusText = 'FLUG';
      textColor = '#00cc44';
    }

    // Dot indicator (no glow, Rams 10)
    ctx.beginPath();
    ctx.arc(x + 16, y + 22, 5, 0, Math.PI * 2);
    ctx.fillStyle = textColor;
    ctx.fill();

    ctx.fillStyle = textColor;
    ctx.font = 'bold 12px \'Helvetica Neue\', Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(statusText, x + 28, y + 26);

    let subText: string;
    if (crashed) {
      subText = 'ESC drücken zum Neustart';
    } else if (onGround) {
      subText = 'Schub erhöhen & Nase hoch';
    } else {
      switch (this._gameMode) {
        case 'combat': subText = 'Space/V zum Schießen!'; break;
        case 'ring_mission': subText = 'Durch die Ringe fliegen!'; break;
        default: subText = 'Frei erkunden!';
      }
    }

    ctx.fillStyle = '#575756';
    ctx.font = '9px \'Helvetica Neue\', Arial, sans-serif';
    ctx.fillText(subText, x + 16, y + 40);
  }

  // --- Throttle Bar ---
  private drawThrottleBar(throttle: number, verticalSpeed: number) {
    const ctx = this._ctx;
    const w = window.innerWidth;
    const x = w - 180;
    const y = 60;
    const panelW = 165;
    const panelH = 100;

    ctx.fillStyle = 'rgba(8, 12, 24, 0.85)';
    ctx.beginPath();
    ctx.roundRect(x, y, panelW, panelH, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(56, 56, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Throttle bar
    ctx.fillStyle = '#B2B2B2';
    ctx.font = '10px \'Helvetica Neue\', Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('SCHUB', x + 12, y + 24);

    const barX = x + 75;
    const barY = y + 14;
    const barW = panelW - 90;
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

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px \'Helvetica Neue\', Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(throttle * 100)}%`, x + panelW - 12, y + 24);
    ctx.textAlign = 'left';

    // VSI
    ctx.fillStyle = '#B2B2B2';
    ctx.font = '10px \'Helvetica Neue\', Arial, sans-serif';
    ctx.fillText('STEIGEN', x + 12, y + 58);
    const vsiColor = verticalSpeed > 0.5 ? '#00cc44' : verticalSpeed < -0.5 ? '#ff6644' : '#ffffff';
    ctx.fillStyle = vsiColor;
    ctx.font = 'bold 14px \'Helvetica Neue\', Arial, sans-serif';
    const vsiSign = verticalSpeed >= 0 ? '+' : '';
    ctx.fillText(`${vsiSign}${verticalSpeed.toFixed(1)} m/s`, x + 75, y + 58);

    // Separator
    ctx.strokeStyle = 'rgba(56, 56, 255, 0.15)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x + 12, y + 72);
    ctx.lineTo(x + panelW - 12, y + 72);
    ctx.stroke();

    // Aircraft name
    const aircraftNames: Record<string, string> = {
      cessna: 'Cessna 172', boeing: 'Boeing 737', extra: 'Extra 300',
      f16: 'F-16 Fighting Falcon', su27: 'Su-27 Flanker'
    };
    ctx.fillStyle = '#575756';
    ctx.font = '9px \'Helvetica Neue\', Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(aircraftNames[this._aircraftType] || 'Unknown', x + panelW / 2, y + 88);
  }

  private drawMissionStatus(missionStatus: { totalRings: number; ringsPassed: number; score: number; timeElapsed: number; completed: boolean }) {
    const ctx = this._ctx;
    const x = 16;
    const y = 112;
    const panelW = 140;
    const panelH = missionStatus.completed ? 65 : 45;

    ctx.fillStyle = 'rgba(8, 12, 24, 0.85)';
    ctx.beginPath();
    ctx.roundRect(x, y, panelW, panelH, 8);
    ctx.fill();
    ctx.strokeStyle = missionStatus.completed ? 'rgba(0, 180, 90, 0.5)' : 'rgba(56, 56, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#B2B2B2';
    ctx.font = '10px \'Helvetica Neue\', Arial, sans-serif';
    ctx.fillText('RINGE', x + 12, y + 18);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px \'Helvetica Neue\', Arial, sans-serif';
    ctx.fillText(`${missionStatus.ringsPassed} / ${missionStatus.totalRings}`, x + 65, y + 18);

    ctx.fillStyle = '#B2B2B2';
    ctx.font = '10px \'Helvetica Neue\', Arial, sans-serif';
    ctx.fillText('PUNKTE', x + 12, y + 36);
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 13px \'Helvetica Neue\', Arial, sans-serif';
    ctx.fillText(`${missionStatus.score}`, x + 65, y + 36);

    if (missionStatus.completed) {
      ctx.fillStyle = '#00cc44';
      ctx.font = 'bold 11px \'Helvetica Neue\', Arial, sans-serif';
      ctx.fillText(`✓ GESCHAFFT  ${Math.floor(missionStatus.timeElapsed)}s`, x + 12, y + 55);
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

  private drawCombatStatus(combat: { wave: number; score: number; playerHealth: number; maxPlayerHealth: number; enemiesAlive: number; totalEnemies: number }): void {
    const ctx = this._ctx;
    const w = window.innerWidth;
    const x = w - 210;
    const y = 170;
    const panelW = 190;
    const panelH = 115;

    ctx.fillStyle = 'rgba(24, 8, 8, 0.85)';
    ctx.beginPath();
    ctx.roundRect(x, y, panelW, panelH, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(220, 80, 80, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#ff6644';
    ctx.font = 'bold 11px \'Helvetica Neue\', Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`WELLE ${combat.wave}`, x + 12, y + 20);

    ctx.fillStyle = '#B2B2B2';
    ctx.font = '10px \'Helvetica Neue\', Arial, sans-serif';
    ctx.fillText('PUNKTE', x + 12, y + 40);
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 13px \'Helvetica Neue\', Arial, sans-serif';
    ctx.fillText(`${combat.score}`, x + 65, y + 40);

    ctx.fillStyle = '#B2B2B2';
    ctx.font = '10px \'Helvetica Neue\', Arial, sans-serif';
    ctx.fillText('HP', x + 12, y + 62);

    const barX = x + 38;
    const barY = y + 52;
    const barW = panelW - 55;
    const barH = 12;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(barX, barY, barW, barH);

    const healthPercent = combat.playerHealth / combat.maxPlayerHealth;
    const hpW = healthPercent * barW;
    const hpColor = healthPercent > 0.6 ? '#00cc44' : healthPercent > 0.3 ? '#ffcc00' : '#ff4444';
    ctx.fillStyle = hpColor;
    ctx.fillRect(barX, barY, hpW, barH);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(barX, barY, barW, barH);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px \'Helvetica Neue\', Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(combat.playerHealth)}/${combat.maxPlayerHealth}`, x + panelW - 12, y + 62);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#B2B2B2';
    ctx.font = '10px \'Helvetica Neue\', Arial, sans-serif';
    ctx.fillText('FEINDE', x + 12, y + 88);
    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 13px \'Helvetica Neue\', Arial, sans-serif';
    ctx.fillText(`${combat.enemiesAlive} / ${combat.totalEnemies}`, x + 65, y + 88);

    ctx.strokeStyle = 'rgba(220, 80, 80, 0.3)';
    ctx.font = '9px \'Helvetica Neue\', Arial, sans-serif';
    ctx.fillText('⊕ ZIEL', x + 12, y + 108);
  }
}
