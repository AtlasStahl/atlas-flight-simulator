/** Cockpit-style HUD with Canvas-rendered round instruments */
export class HUD {
  private _canvas: HTMLCanvasElement;
  private _ctx: CanvasRenderingContext2D;
  private _overlay: HTMLDivElement;
  private _visible: boolean = true;

  // Instrument positions (relative to canvas)
  private _airspeedPos = { x: 0, y: 0 };
  private _attitudePos = { x: 0, y: 0 };
  private _altimeterPos = { x: 0, y: 0 };
  private _headingPos = { x: 0, y: 0 };
  private _vsiPos = { x: 0, y: 0 };
  private _throttlePos = { x: 0, y: 0 };

  // Instrument radii
  private readonly R_AIRSPEED = 75;
  private readonly R_ATTITUDE = 90;
  private readonly R_ALTITUDE = 75;
  private readonly R_HEADING = 60;
  private readonly R_VSI = 60;
  private readonly R_THROTTLE = 50;

  constructor() {
    // Semi-transparent dark overlay
    this._overlay = document.createElement('div');
    this._overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 100;
      background: rgba(0, 0, 0, 0.15);
    `;

    // Single large canvas for all instruments
    this._canvas = document.createElement('canvas');
    this._canvas.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    `;
    this._overlay.appendChild(this._canvas);

    this._ctx = this._canvas.getContext('2d')!;

    document.body.appendChild(this._overlay);

    // Handle resize
    window.addEventListener('resize', () => this.onResize());
    this.onResize();
  }

  private onResize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this._canvas.width = window.innerWidth * dpr;
    this._canvas.height = window.innerHeight * dpr;
    this._ctx.scale(dpr, dpr);

    // Calculate instrument positions based on screen size
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Instruments at BOTTOM of screen, not blocking the view
    const panelY = h - 140; // Bottom panel, 140px from bottom

    // Layout:
    // [Airspeed]  [Attitude]  [Altimeter]
    //              [Heading]

    const maxW = Math.min(w * 0.9, 1000);
    const startX = (w - maxW) / 2;

    // Main row at bottom
    this._airspeedPos.x = startX + this.R_AIRSPEED;
    this._airspeedPos.y = panelY;

    this._attitudePos.x = startX + maxW * 0.5;
    this._attitudePos.y = panelY;

    this._altimeterPos.x = startX + maxW;
    this._altimeterPos.y = panelY;

    // Heading below attitude (smaller)
    this._headingPos.x = this._attitudePos.x;
    this._headingPos.y = panelY + this.R_ATTITUDE + 40;

    // VSI and Throttle below the main row
    this._vsiPos.x = startX + this.R_VSI + 40;
    this._vsiPos.y = panelY + this.R_AIRSPEED + 40;

    this._throttlePos.x = startX + maxW - this.R_THROTTLE - 40;
    this._throttlePos.y = this._vsiPos.y;
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
    missionStatus?: { totalRings: number; ringsPassed: number; score: number; timeElapsed: number; completed: boolean }
  ) {
    if (!this._visible) return;

    const w = window.innerWidth;
    const h = window.innerHeight;

    // Clear canvas
    this._ctx.clearRect(0, 0, w, h);

    // Draw all instruments
    this.drawAirspeed(speed * 3.6); // m/s to km/h
    this.drawAltimeter(Math.max(0, altitude));
    this.drawVSI(verticalSpeed);
    this.drawAttitude(pitch, roll);
    this.drawHeading(heading);
    this.drawThrottle(throttle);

    // Draw status text at top
    this.drawStatus(onGround, crashed);

    // Draw mission status if provided
    if (missionStatus) {
      this.drawMissionStatus(missionStatus);
    }

    // Draw controls reference at bottom
    this.drawControlsReference();
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

  private drawVSI(verticalSpeed: number) {
    const { x, y } = this._vsiPos;
    const r = this.R_VSI;

    this.drawGaugeBackground(x, y, r);

    const ctx = this._ctx;
    const maxVS = 10; // -10 to +10 m/s

    // Scale: -10 to +10, arc from 135° to 405° (270° sweep)
    const startAngle = Math.PI * 0.75;
    const sweepAngle = Math.PI * 1.5;

    // Tick marks
    ctx.fillStyle = '#ffffff';
    ctx.font = '9px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let v = -10; v <= 10; v += 2) {
      const angle = startAngle + ((v + maxVS) / (maxVS * 2)) * sweepAngle;
      const outerR = r - 6;
      const innerR = r - 14;

      ctx.beginPath();
      ctx.moveTo(x + Math.cos(angle) * outerR, y + Math.sin(angle) * outerR);
      ctx.lineTo(x + Math.cos(angle) * innerR, y + Math.sin(angle) * innerR);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Number
      const textR = r - 22;
      ctx.fillText(v.toString(), x + Math.cos(angle) * textR, y + Math.sin(angle) * textR);
    }

    // Green zone around center (±2 m/s)
    const greenStart = startAngle + ((-2 + maxVS) / (maxVS * 2)) * sweepAngle;
    const greenEnd = startAngle + ((2 + maxVS) / (maxVS * 2)) * sweepAngle;
    this.drawArcSegment(x, y, r - 3, greenStart, greenEnd, '#00cc00', 3);

    // Needle
    const clampedVS = Math.max(-maxVS, Math.min(maxVS, verticalSpeed));
    const needleAngle = startAngle + ((clampedVS + maxVS) / (maxVS * 2)) * sweepAngle;
    this.drawNeedle(x, y, needleAngle, r - 15, 2);

    // Label
    ctx.fillStyle = '#cccccc';
    ctx.font = 'bold 10px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('VSI', x, y - r + 38);

    // Digital readout
    ctx.fillStyle = '#111111';
    ctx.fillRect(x - 22, y + r - 30, 44, 16);
    ctx.strokeStyle = '#555555';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 22, y + r - 30, 44, 16);
    ctx.fillStyle = '#00ff00';
    ctx.font = '11px Courier New, monospace';
    ctx.fillText(verticalSpeed.toFixed(1), x, y + r - 19);
  }

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

  private drawHeading(heading: number) {
    const { x, y } = this._headingPos;
    const r = this.R_HEADING;

    this.drawGaugeBackground(x, y, r);

    const ctx = this._ctx;

    // Convert heading to degrees (0-360)
    const headingDeg = (((heading * 180 / Math.PI) % 360) + 360) % 360;

    // Compass rose - draw cardinal directions
    ctx.fillStyle = '#cccccc';
    ctx.font = 'bold 10px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const directions = [
      { angle: 0, label: 'N' },
      { angle: 90, label: 'E' },
      { angle: 180, label: 'S' },
      { angle: 270, label: 'W' }
    ];

    // Draw compass marks around the edge
    const startAngle = -Math.PI / 2; // Start from top (North)
    for (let deg = 0; deg < 360; deg += 10) {
      const angle = startAngle + (deg * Math.PI / 180);
      const isCardinal = deg % 90 === 0;
      const isMajor = deg % 30 === 0;

      const outerR = r - 6;
      const innerR = isCardinal ? r - 18 : isMajor ? r - 14 : r - 10;

      ctx.beginPath();
      ctx.moveTo(x + Math.cos(angle) * outerR, y + Math.sin(angle) * outerR);
      ctx.lineTo(x + Math.cos(angle) * innerR, y + Math.sin(angle) * innerR);
      ctx.strokeStyle = isCardinal ? '#ffffff' : '#aaaaaa';
      ctx.lineWidth = isCardinal ? 2 : 1;
      ctx.stroke();
    }

    // Cardinal direction labels
    for (const dir of directions) {
      const angle = startAngle + (dir.angle * Math.PI / 180);
      const textR = r - 26;
      const color = dir.angle === 0 ? '#ff4444' : '#cccccc'; // North in red
      ctx.fillStyle = color;
      ctx.font = dir.angle === 0 ? 'bold 12px Arial, sans-serif' : '10px Arial, sans-serif';
      ctx.fillText(dir.label, x + Math.cos(angle) * textR, y + Math.sin(angle) * textR);
    }

    // Heading needle (points to current heading, rotated opposite to show direction)
    const needleAngle = startAngle + headingDeg * Math.PI / 180;
    this.drawNeedle(x, y, needleAngle, r - 16, 2);

    // Label
    ctx.fillStyle = '#cccccc';
    ctx.font = 'bold 10px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HDG', x, y - r + 35);

    // Digital readout
    ctx.fillStyle = '#111111';
    ctx.fillRect(x - 22, y + r - 30, 44, 16);
    ctx.strokeStyle = '#555555';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 22, y + r - 30, 44, 16);
    ctx.fillStyle = '#00ff00';
    ctx.font = '11px Courier New, monospace';
    ctx.fillText(Math.round(headingDeg).toString(), x, y + r - 19);
  }

  private drawThrottle(throttle: number) {
    const { x, y } = this._throttlePos;
    const r = this.R_THROTTLE;

    this.drawGaugeBackground(x, y, r);

    const ctx = this._ctx;

    // Scale: 0-100%, arc from 135° to 405° (270° sweep)
    const startAngle = Math.PI * 0.75;
    const sweepAngle = Math.PI * 1.5;

    // Tick marks
    ctx.fillStyle = '#ffffff';
    ctx.font = '9px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let t = 0; t <= 100; t += 10) {
      const angle = startAngle + (t / 100) * sweepAngle;
      const outerR = r - 5;
      const innerR = r - 12;

      ctx.beginPath();
      ctx.moveTo(x + Math.cos(angle) * outerR, y + Math.sin(angle) * outerR);
      ctx.lineTo(x + Math.cos(angle) * innerR, y + Math.sin(angle) * innerR);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Number
      const textR = r - 20;
      ctx.fillText(t.toString(), x + Math.cos(angle) * textR, y + Math.sin(angle) * textR);
    }

    // Green fill arc (0 to current throttle)
    const clampedThrottle = Math.max(0, Math.min(100, throttle * 100));
    if (clampedThrottle > 0) {
      const fillEnd = startAngle + (clampedThrottle / 100) * sweepAngle;
      ctx.beginPath();
      ctx.arc(x, y, r - 4, startAngle, fillEnd);
      ctx.strokeStyle = '#00cc00';
      ctx.lineWidth = 5;
      ctx.stroke();
    }

    // Needle
    const needleAngle = startAngle + (clampedThrottle / 100) * sweepAngle;
    this.drawNeedle(x, y, needleAngle, r - 14, 2);

    // Label
    ctx.fillStyle = '#cccccc';
    ctx.font = 'bold 10px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('THR', x, y - r + 32);

    // Digital readout
    ctx.fillStyle = '#111111';
    ctx.fillRect(x - 20, y + r - 28, 40, 15);
    ctx.strokeStyle = '#555555';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 20, y + r - 28, 40, 15);
    ctx.fillStyle = '#00ff00';
    ctx.font = '10px Courier New, monospace';
    ctx.fillText(Math.round(clampedThrottle) + '%', x, y + r - 17);
  }

  private drawStatus(onGround: boolean, crashed: boolean) {
    const ctx = this._ctx;
    const w = window.innerWidth;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // Status background
    const textY = 15;
    const padding = 15;

    let statusText: string;
    let textColor: string;

    if (crashed) {
      statusText = 'CRASHED - Press Esc to reset';
      textColor = '#ff4444';
    } else if (onGround) {
      statusText = 'ON GROUND';
      textColor = '#ffcc00';
    } else {
      statusText = 'AIRBORNE';
      textColor = '#00cc00';
    }

    ctx.font = 'bold 16px Arial, sans-serif';
    const metrics = ctx.measureText(statusText);
    const textW = metrics.width;

    // Background panel
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect((w - textW) / 2 - padding, textY - 5, textW + padding * 2, 28);

    // Status text
    ctx.fillStyle = textColor;
    ctx.fillText(statusText, w / 2, textY);
  }

  private drawControlsReference() {
    const ctx = this._ctx;
    const w = window.innerWidth;
    const h = window.innerHeight;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    const textY = h - 20;
    const controls = 'Pitch: W/S  |  Roll: A/D  |  Yaw: Q/E  |  Throttle: Shift↑/Ctrl↓  |  Flaps: G  |  Brakes: B  |  Reset: Esc';

    ctx.font = '12px Arial, sans-serif';
    ctx.fillStyle = 'rgba(200, 200, 200, 0.5)';
    ctx.fillText(controls, w / 2, textY);
  }

  private drawMissionStatus(missionStatus: { totalRings: number; ringsPassed: number; score: number; timeElapsed: number; completed: boolean }) {
    const ctx = this._ctx;
    const w = window.innerWidth;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const textY = 50;
    const padding = 12;

    const statusText = `Rings: ${missionStatus.ringsPassed}/${missionStatus.totalRings}  |  Score: ${missionStatus.score}  |  Time: ${Math.floor(missionStatus.timeElapsed)}s`;

    ctx.font = '14px Arial, sans-serif';
    const metrics = ctx.measureText(statusText);
    const textW = metrics.width;

    // Background panel
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect((w - textW) / 2 - padding, textY - 4, textW + padding * 2, 24);

    // Mission text
    ctx.fillStyle = '#88ccff';
    ctx.fillText(statusText, w / 2, textY);
  }

  hide() {
    this._visible = false;
    this._overlay.style.display = 'none';
  }

  show() {
    this._visible = true;
    this._overlay.style.display = 'block';
  }
}