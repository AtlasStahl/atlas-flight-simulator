import { GaugeRenderer } from './GaugeRenderer';
import { HUDScale } from './HUDTheme';

/** Altimeter gauge - draws analog altitude indicator with needle */
export class AltimeterGauge {
  private _renderer: GaugeRenderer;

  constructor(
    private _ctx: CanvasRenderingContext2D,
    renderer: GaugeRenderer,
    private _x: number,
    private _y: number,
    private _r: number,
    private _scale: HUDScale
  ) {
    this._renderer = renderer;
  }

  draw(altitude: number): void {
    const { x, y, r } = this;
    const maxAlt = this._scale.maxAlt;

    this._renderer.drawGaugeFace(x, y, r);

    const step = maxAlt <= 6000 ? 500 : 1000;
    const startAngle = Math.PI * 0.75;
    const sweepAngle = Math.PI * 1.5;

    this._renderer.drawTicks(x, y, r, startAngle, sweepAngle, maxAlt, step);

    // Needle
    const clampedAlt = Math.max(0, Math.min(maxAlt, altitude));
    const needleAngle = startAngle + (clampedAlt / maxAlt) * sweepAngle;
    this._renderer.drawNeedle(x, y, needleAngle, r - 16, false);

    // Label
    const ctx = this._ctx;
    ctx.fillStyle = this._renderer.textColor;
    ctx.font = `bold 9px ${this._renderer.font}`;
    ctx.textAlign = 'center';
    ctx.fillText('ALT', x, y - r + 40);

    // Digital readout
    this._renderer.drawDigitalReadout(x, y + r - 30, Math.round(clampedAlt).toString(), this._renderer.accentColor);
  }
}