import type { HUDTheme } from './HUDTheme';

/** Common canvas drawing utilities for gauge instruments */
export class GaugeRenderer {
  private _ctx: CanvasRenderingContext2D;
  public theme: HUDTheme;

  constructor(
    ctx: CanvasRenderingContext2D,
    theme: HUDTheme
  ) {
    this._ctx = ctx;
    this.theme = theme;
  }

  get accentColor(): string { return this.theme.accentColor; }
  get textColor(): string { return this.theme.textColor; }
  get font(): string { return this.theme.font; }

  /** Draw a circular gauge face with bezel, face gradient, and glass reflection */
  drawGaugeFace(x: number, y: number, r: number): void {
    const ctx = this._ctx;

    // Outer bezel with depth
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    const bezelGrad = ctx.createRadialGradient(x - r * 0.2, y - r * 0.2, 0, x, y, r + 5);
    bezelGrad.addColorStop(0, '#666666');
    bezelGrad.addColorStop(0.5, this.theme.bezel);
    bezelGrad.addColorStop(1, '#222222');
    ctx.beginPath();
    ctx.arc(x, y, r + 5, 0, Math.PI * 2);
    ctx.fillStyle = bezelGrad;
    ctx.fill();
    ctx.restore();

    // Gauge face
    const faceGrad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
    faceGrad.addColorStop(0, this.theme.faceHighlight);
    faceGrad.addColorStop(1, this.theme.face);
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

  /** Draw an analog needle from center at a given angle */
  drawNeedle(x: number, y: number, angle: number, length: number, isAccent: boolean = false): void {
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
    ctx.strokeStyle = isAccent ? this.theme.needleAccent : this.theme.needle;
    ctx.lineWidth = isAccent ? 3 : 2;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();

    // Center pivot
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = isAccent ? this.theme.needleAccent : '#888888';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }

  /** Draw major and minor tick marks with labels */
  drawTicks(
    x: number, y: number, r: number,
    startAngle: number, sweepAngle: number,
    maxVal: number, step: number
  ): void {
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
      ctx.strokeStyle = this.theme.tickColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Minor ticks
      for (let m = 1; m < 5; m++) {
        const minorAngle = startAngle + ((v + m * (step / 5)) / maxVal) * sweepAngle;
        const minorInnerR = r - 11;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(minorAngle) * outerR, y + Math.sin(minorAngle) * outerR);
        ctx.lineTo(x + Math.cos(minorAngle) * minorInnerR, y + Math.sin(minorAngle) * innerR);
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      // Number label
      const textR = r - 26;
      ctx.fillStyle = this.theme.textColor;
      ctx.font = `10px ${this.theme.font}`;
      ctx.fillText(v.toString(), x + Math.cos(angle) * textR, y + Math.sin(angle) * textR);
    }
  }

  /** Draw a colored arc segment */
  drawArc(x: number, y: number, r: number, startAngle: number, endAngle: number, color: string, width: number): void {
    const ctx = this._ctx;
    ctx.beginPath();
    ctx.arc(x, y, r, startAngle, endAngle);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  /** Draw a digital readout box below a gauge */
  drawDigitalReadout(x: number, y: number, value: string, color: string): void {
    const ctx = this._ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x - 22, y, 44, 16);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x - 22, y, 44, 16);
    ctx.fillStyle = color;
    ctx.font = `bold 11px ${this.theme.font}`;
    ctx.textAlign = 'center';
    ctx.fillText(value, x, y + 12);
  }
}