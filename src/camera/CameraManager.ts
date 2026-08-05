import * as THREE from 'three';

/** Camera view modes */
export const CameraMode = { CHASE: 'chase', COCKPIT: 'cockpit', CINEMATIC: 'cinematic', TOWER: 'tower' } as const;
export type CameraMode = (typeof CameraMode)[keyof typeof CameraMode];

/** Camera manager with multiple view modes and orbit controls */
export class CameraManager {
    private _camera: THREE.PerspectiveCamera;
    private _mode: CameraMode = CameraMode.CHASE;
    private _target = new THREE.Vector3();
    private _lookAtTarget = new THREE.Vector3();

    // Chase camera
    private _chaseOffset = new THREE.Vector3(-20, 6, 0);
    private _chaseSmooth = new THREE.Vector3();

    // Orbit (for Chase mode rotation)
    private _orbitAngleX = 0;
    private _orbitAngleY = 0;
    private _orbitRadius = 0;
    private _isOrbiting = false;

    // Cockpit (CAM-02: skaliert mit Flugzeuggröße)
    private _cockpitOffset = new THREE.Vector3(0.5, 0.8, 0);

    /** CAM-02: Cockpit-Offset aus AircraftConfig setzen */
    setCockpitOffset(offset: { x: number; y: number; z: number }): void {
        this._cockpitOffset.set(offset.x, offset.y, offset.z);
    }

    // Cinematic
    private _cinematicAngle = 0;
    private _cinematicRadius = 40;
    private _cinematicHeight = 15;

    // Tower
    private _towerPosition = new THREE.Vector3(0, 80, -200);
    private _towerLookAt = new THREE.Vector3();

    // Transition (CAM-04: eigenes Zielvektor statt self-reference)
    private _transitionStart = new THREE.Vector3();
    private _transitionTarget = new THREE.Vector3();
    private _transitionProgress = 0;
    private _isTransitioning = false;
    private _transitionSpeed = 2.0;

    // Object pooling - reusable temp vectors
    private _tempOffset = new THREE.Vector3();
    private _tempForward = new THREE.Vector3();

    constructor(camera: THREE.PerspectiveCamera) {
        this._camera = camera;
        this._chaseSmooth.copy(this._chaseOffset);
    }

    get mode(): CameraMode {
        return this._mode;
    }

    setMode(mode: CameraMode): void {
        if (this._mode === mode) return;
        this._mode = mode;
        this._isTransitioning = true;
        this._transitionProgress = 0;
        this._transitionStart.copy(this._camera.position);
        // CAM-04: Zielposition speichern für den Übergang
        this._transitionTarget.copy(this._camera.position);

        switch (mode) {
            case CameraMode.CHASE:
                this._chaseSmooth.copy(this._chaseOffset);
                break;
            case CameraMode.COCKPIT:
                break;
            case CameraMode.CINEMATIC:
                this._cinematicAngle = 0;
                break;
            case CameraMode.TOWER:
                break;
        }
    }

    toggleOrbit(): void {
        this._isOrbiting = !this._isOrbiting;
        if (this._isOrbiting) {
            this._orbitRadius = this._chaseOffset.length();
        }
    }

    onMouseMove(dx: number, dy: number): void {
        if (!this._isOrbiting) return;

        const sensitivity = 0.005;
        this._orbitAngleY -= dx * sensitivity;
        this._orbitAngleX -= dy * sensitivity;

        this._orbitAngleX = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this._orbitAngleX));
    }

    onMouseWheel(delta: number): void {
        // Zoom works in Chase mode (adjusting chase distance) and orbit mode
        if (this._isOrbiting || this._mode === CameraMode.CHASE) {
            this._orbitRadius += delta * 0.05;
            this._orbitRadius = Math.max(5, Math.min(100, this._orbitRadius));
            // Also adjust chase offset for non-orbit chase mode
            if (this._mode === CameraMode.CHASE && !this._isOrbiting) {
                const currentDist = this._chaseOffset.length();
                const newDist = Math.max(5, Math.min(100, this._orbitRadius));
                const scale = newDist / currentDist;
                this._chaseOffset.multiplyScalar(scale);
            }
        }
    }

    update(aircraftPos: THREE.Vector3, aircraftRot: THREE.Euler, dt: number): void {
        this._target.copy(aircraftPos);

        if (this._isTransitioning) {
            this._transitionProgress += dt * this._transitionSpeed;
            if (this._transitionProgress >= 1) {
                this._transitionProgress = 1;
                this._isTransitioning = false;
            }
        }

        switch (this._mode) {
            case CameraMode.CHASE:
                this._updateChase(aircraftPos, aircraftRot, dt);
                break;
            case CameraMode.COCKPIT:
                this._updateCockpit(aircraftPos, aircraftRot, dt);
                break;
            case CameraMode.CINEMATIC:
                this._updateCinematic(aircraftPos, aircraftRot, dt);
                break;
            case CameraMode.TOWER:
                this._updateTower(aircraftPos, dt);
                break;
        }

        if (this._isTransitioning) {
            // CAM-04: Zielposition nach dem Modus-Update speichern, dann interpolieren
            this._transitionTarget.copy(this._camera.position);
            const t = this._smoothStep(this._transitionProgress);
            this._camera.position.lerpVectors(this._transitionStart, this._transitionTarget, t);
        }
    }

    private _updateChase(aircraftPos: THREE.Vector3, aircraftRot: THREE.Euler, dt: number): void {

        if (this._isOrbiting) {
            this._tempOffset.set(
                Math.sin(this._orbitAngleY) * Math.cos(this._orbitAngleX) * this._orbitRadius,
                Math.sin(this._orbitAngleX) * this._orbitRadius,
                Math.cos(this._orbitAngleY) * Math.cos(this._orbitAngleX) * this._orbitRadius
            );
            this._camera.position.copy(aircraftPos).add(this._tempOffset);
            this._lookAtTarget.copy(aircraftPos);
        } else {
            this._tempOffset.copy(this._chaseOffset);
            this._tempOffset.applyEuler(aircraftRot);

            this._chaseSmooth.lerp(this._tempOffset, 5 * dt);
            this._camera.position.copy(aircraftPos).add(this._chaseSmooth);
            this._camera.position.y = Math.max(this._camera.position.y, 2);

            this._lookAtTarget.copy(aircraftPos);
            this._tempForward.set(1, 0, 0).applyEuler(aircraftRot);
            this._lookAtTarget.add(this._tempForward.multiplyScalar(20));
        }

        this._camera.lookAt(this._lookAtTarget);
    }

    private _updateCockpit(aircraftPos: THREE.Vector3, aircraftRot: THREE.Euler, _dt: number): void {
        this._tempOffset.copy(this._cockpitOffset);
        this._tempOffset.applyEuler(aircraftRot);
        this._camera.position.copy(aircraftPos).add(this._tempOffset);

        // REN-10: _tempForward wiederverwenden, kein neues Objekt
        this._tempForward.set(1, 0, 0).applyEuler(aircraftRot).multiplyScalar(100);
        this._lookAtTarget.copy(this._camera.position).add(this._tempForward);

        this._camera.lookAt(this._lookAtTarget);
    }

    private _updateCinematic(aircraftPos: THREE.Vector3, _aircraftRot: THREE.Euler, dt: number): void {
        this._cinematicAngle += dt * 0.3;

        const x = Math.sin(this._cinematicAngle) * this._cinematicRadius;
        const z = Math.cos(this._cinematicAngle) * this._cinematicRadius;
        const y = this._cinematicHeight + Math.sin(this._cinematicAngle * 0.5) * 5;

        this._camera.position.set(
            aircraftPos.x + x,
            aircraftPos.y + y,
            aircraftPos.z + z
        );

        this._lookAtTarget.copy(aircraftPos);
        this._camera.lookAt(this._lookAtTarget);
    }

    private _updateTower(aircraftPos: THREE.Vector3, dt: number): void {
        this._camera.position.copy(this._towerPosition);
        // CAM-03: Turmkamera hat Reichweitenbegrenzung (3000 m)
        const dist = this._camera.position.distanceTo(aircraftPos);
        if (dist > 3000) {
            // Flugzeug außerhalb der Sichtweite — Kamera schaut geradeaus
            this._towerLookAt.set(this._towerPosition.x + 500, this._towerPosition.y, this._towerPosition.z);
        } else {
            this._towerLookAt.lerp(aircraftPos, 2 * dt);
        }
        this._camera.lookAt(this._towerLookAt);
    }

    private _smoothStep(t: number): number {
        return t * t * (3 - 2 * t);
    }

    cycleMode(): CameraMode {
        const modes = Object.values(CameraMode);
        const currentIndex = modes.indexOf(this._mode);
        const nextIndex = (currentIndex + 1) % modes.length;
        this.setMode(modes[nextIndex]);
        return modes[nextIndex];
    }
}
