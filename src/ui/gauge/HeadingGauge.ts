import { GaugeRenderer } from './GaugeRenderer';

/** Heading Indicator (Compass) gauge */
export class HeadingGauge {
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

  draw(heading: number): void {
    const { x, y, r } = this;

    this._renderer.drawGaugeFace(x, y, r);

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

      ctx.fillStyle = isCardinal ? this._renderer.theme.accentColor : this._renderer.theme.textColor;
      ctx.font = isCardinal ? `bold 10px ${this._renderer.theme.font}` : `9px ${this._renderer.theme.font}`;
      ctx.fillText(directions[i], Math.cos(angle) * textR, Math.sin(angle) * textR);

      // Tick marks
      const outerR = r - 6;
      const innerR = r - 12;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR);
      ctx.lineTo(Math.cos(angle) * innerR, Math.sin(angle) * innerR);
      ctx.strokeStyle = isCardinal ? this._renderer.theme.accentColor : 'rgba(255,255,255,0.5)';
      ctx.lineWidth = isCardinal ? 1.5 : 0.8;
      ctx.stroke();
    }

    ctx.restore();

    // Fixed pointer at top
    ctx.fillStyle = this._renderer.theme.needleAccent;
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
    ctx.fillStyle = this._renderer.theme.accentColor;
    ctx.font = `bold 10px ${this._renderer.theme.font}`;
    ctx.textAlign = 'center';
    ctx.fillText(Math.round(headingDeg).toString().padStart(3, ' '), x, y + r - 14);
  }
}