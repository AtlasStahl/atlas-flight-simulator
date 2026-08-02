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

  constructor() {
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
  }

  private onKeyDown(e: KeyboardEvent) {
    this.keys.add(e.code);
    if (['KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyQ', 'KeyE', 'KeyR', 'KeyF', 'KeyG', 'KeyB', 
         'KeyV', 'KeyC', 'Space',
         'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
         'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight'].includes(e.code)) {
      e.preventDefault();
    }
  }

  private onKeyUp(e: KeyboardEvent) {
    this.keys.delete(e.code);
  }

  update() {
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