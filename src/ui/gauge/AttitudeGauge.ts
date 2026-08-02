import { GaugeRenderer } from './GaugeRenderer';

/** Attitude Indicator (Artificial Horizon) gauge */
export class AttitudeGauge {
  private _renderer: GaugeRenderer;
  private _ctx: CanvasRenderingContext2D;
  private _x: number;
  private _y: number;
  private _r: number;

  get x(): number { return this._x; }
  get y(): number { return this._y; }
  get r(): number { return this._r; }

  constructor(
    ctx: CanvasRenderingContext2D,
    renderer: GaugeRenderer,
    x: number,
    y: number,
    r: number
  ) {
    this._ctx = ctx;
    this._renderer = renderer;
    this._x = x;
    this._y = y;
    this._r = r;
  }

  draw(pitch: number, roll: number): void {
    const { x, y, r } = this;

    this._renderer.drawGaugeFace(x, y, r);

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
    ctx.font = `8px ${this._renderer.theme.font}`;
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
    ctx.strokeStyle = this._renderer.theme.needleAccent;
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
    ctx.fillStyle = this._renderer.theme.needleAccent;
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
}