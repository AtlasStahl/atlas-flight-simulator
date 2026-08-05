/** Keyboard input management for flight controls */
export class Controls {
  private keys = new Set<string>();

  // Flight controls
  pitchDown = false;
  pitchUp = false;
  rollLeft = false;
  rollRight = false;
  yawLeft = false;
  yawRight = false;
  throttleUp = false;
  throttleDown = false;
  flaps = false;
  brakes = false;

  // Combat & Camera
  shoot = false;
  cycleCamera = false;
  toggleOrbit = false;

  private _boundKeyDown: (e: KeyboardEvent) => void;
  private _boundKeyUp: (e: KeyboardEvent) => void;

  private _boundBlur: () => void;
  private _boundVisibility: () => void;
  private _enabled: boolean = true;

  constructor() {
    this._boundKeyDown = (e) => this.onKeyDown(e);
    this._boundKeyUp = (e) => this.onKeyUp(e);
    this._boundBlur = () => this.reset();
    this._boundVisibility = () => {
      if (document.hidden) this.reset();
    };
    window.addEventListener('keydown', this._boundKeyDown);
    window.addEventListener('keyup', this._boundKeyUp);
    window.addEventListener('blur', this._boundBlur);
    document.addEventListener('visibilitychange', this._boundVisibility);
  }

  /** Remove event listeners to prevent memory leaks */
  dispose(): void {
    window.removeEventListener('keydown', this._boundKeyDown);
    window.removeEventListener('keyup', this._boundKeyUp);
    window.removeEventListener('blur', this._boundBlur);
    document.removeEventListener('visibilitychange', this._boundVisibility);
  }

  private onKeyDown(e: KeyboardEvent) {
    this.keys.add(e.code);
    // Only preventDefault for keys that are actually bound
    if (['KeyW', 'KeyS', 'KeyA', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
         'KeyG', 'KeyB', 'KeyC', 'KeyV', 'Space',
         'ShiftLeft', 'ShiftRight'].includes(e.code)) {
      e.preventDefault();
    }
  }

  private onKeyUp(e: KeyboardEvent) {
    this.keys.delete(e.code);
  }

  /** Enable or disable controls; disabling also resets all keys */
  setEnabled(enabled: boolean): void {
    this._enabled = enabled;
    if (!enabled) this.reset();
  }

  update() {
    if (!this._enabled) return;
    // Pitch: S=Up (nose up), W=Down (nose down) - standard flight simulator
    this.pitchUp = this.keys.has('KeyS');
    this.pitchDown = this.keys.has('KeyW');

    // Roll: A=Left wing down, D=Right wing down
    this.rollLeft = this.keys.has('KeyA');
    this.rollRight = this.keys.has('KeyD');

    // Yaw: ArrowLeft/ArrowRight
    this.yawLeft = this.keys.has('ArrowLeft');
    this.yawRight = this.keys.has('ArrowRight');

    // Throttle: ArrowUp/ArrowDown
    this.throttleUp = this.keys.has('ArrowUp');
    this.throttleDown = this.keys.has('ArrowDown');

    // Flaps: G
    this.flaps = this.keys.has('KeyG');

    // Brakes: B
    this.brakes = this.keys.has('KeyB');

    // Shoot: Space or V
    this.shoot = this.keys.has('Space') || this.keys.has('KeyV');

    // Cycle camera: C
    this.cycleCamera = this.keys.has('KeyC');

    // Toggle orbit: Right mouse (handled separately) or Shift
    this.toggleOrbit = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
  }

  reset() {
    this.keys.clear();
  }
}