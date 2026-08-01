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
    // Pitch: W/S
    this.pitchUp = this.keys.has('KeyW');
    this.pitchDown = this.keys.has('KeyS');

    // Roll: A/D or ArrowLeft/ArrowRight
    this.rollLeft = this.keys.has('KeyA') || this.keys.has('ArrowLeft');
    this.rollRight = this.keys.has('KeyD') || this.keys.has('ArrowRight');

    // Yaw: Q/E
    this.yawLeft = this.keys.has('KeyQ');
    this.yawRight = this.keys.has('KeyE');

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