import { GaugeRenderer } from './GaugeRenderer';
import { HUDScale } from './HUDTheme';

/** Airspeed Indicator gauge - draws analog speed indicator with needle */
export class AirspeedGauge {
  private _renderer: GaugeRenderer;

  constructor(
    private _ctx: CanvasRenderingContext2D,
    renderer: GaugeRenderer,
    private _x: number,
    private _y: number,
    private _r: number,
    private _scale: HUDScale,
    private _isAccent: boolean
  ) {
    this._renderer = renderer;
  }

  draw(speedKmh: number): void {
    const { x, y, r } = this;
    const maxSpeed = this._scale.maxSpeed;
    const stallSpeed = this._scale.stallSpeed;

    this._renderer.drawGaugeFace(x, y, r);

    const step = maxSpeed <= 500 ? 50 : maxSpeed <= 1000 ? 100 : 200;
    const startAngle = Math.PI * 0.75;
    const sweepAngle = Math.PI * 1.5;

    this._renderer.drawTicks(x, y, r, startAngle, sweepAngle, maxSpeed, step);

    // Green arc (safe range)
    const greenStart = startAngle + (stallSpeed / maxSpeed) * sweepAngle;
    const greenEnd = startAngle + (maxSpeed * 0.75 / maxSpeed) * sweepAngle;
    this._renderer.drawArc(x, y, r - 3, greenStart, greenEnd, this._renderer.accentColor, 3);

    // Yellow arc (caution)
    const yellowStart = greenEnd;
    const yellowEnd = startAngle + (maxSpeed * 0.9 / maxSpeed) * sweepAngle;
    this._renderer.drawArc(x, y, r - 3, yellowStart, yellowEnd, '#ffcc00', 3);

    // Red arc (danger)
    const redStart = yellowEnd;
    const redEnd = startAngle + sweepAngle;
    this._renderer.drawArc(x, y, r - 3, redStart, redEnd, '#ff3333', 3);

    // Needle
    const clampedSpeed = Math.max(0, Math.min(maxSpeed, speedKmh));
    const needleAngle = startAngle + (clampedSpeed / maxSpeed) * sweepAngle;
    this._renderer.drawNeedle(x, y, needleAngle, r - 18, this._isAccent);

    // Label
    const ctx = this._ctx;
    ctx.fillStyle = this._renderer.textColor;
    ctx.font = `bold 9px ${this._renderer.font}`;
    ctx.textAlign = 'center';
    ctx.fillText('KTS', x, y + r - 40);

    // Digital readout
    this._renderer.drawDigitalReadout(x, y + r - 30, Math.round(clampedSpeed).toString(), this._renderer.accentColor);
  }
}