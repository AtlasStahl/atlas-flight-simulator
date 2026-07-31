/** Keyboard input management for flight controls */
export class Controls {
  private keys = new Set<string>();

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

  constructor() {
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
  }

  private onKeyDown(e: KeyboardEvent) {
    this.keys.add(e.code);
    // Only prevent default for game keys to avoid interfering with browser shortcuts
    if (['KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyQ', 'KeyE', 'KeyR', 'KeyF', 'KeyG', 'KeyB', 
         'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight',
         'ControlLeft', 'ControlRight'].includes(e.code)) {
      e.preventDefault();
    }
  }

  private onKeyUp(e: KeyboardEvent) {
    this.keys.delete(e.code);
  }

  update() {
    // Pitch: W/S only (Arrow keys are for throttle)
    this.pitchUp = this.keys.has('KeyW');
    this.pitchDown = this.keys.has('KeyS');

    // Roll: A/D or ArrowLeft/ArrowRight
    this.rollLeft = this.keys.has('KeyA') || this.keys.has('ArrowLeft');
    this.rollRight = this.keys.has('KeyD') || this.keys.has('ArrowRight');

    // Yaw: Q/E
    this.yawLeft = this.keys.has('KeyQ');
    this.yawRight = this.keys.has('KeyE');

    // Throttle: ArrowUp/ArrowDown (primary) or Shift/Ctrl or R/F
    this.throttleUp = this.keys.has('ArrowUp') || this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.keys.has('KeyR');
    this.throttleDown = this.keys.has('ArrowDown') || this.keys.has('ControlLeft') || this.keys.has('ControlRight') || this.keys.has('KeyF');

    // Flaps: G
    this.flaps = this.keys.has('KeyG');

    // Brakes: B
    this.brakes = this.keys.has('KeyB');
  }

  reset() {
    this.keys.clear();
  }
}