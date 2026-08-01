import * as THREE from 'three';

/** Radar display showing nearby objects and waypoints */
export class RadarDisplay {
    private _canvas: HTMLCanvasElement;
    private _ctx: CanvasRenderingContext2D;
    private _visible: boolean = true;
    private _range: number = 5000; // meters
    private _centerX: number = 0;
    private _centerY: number = 0;
    private _size: number = 180;
    
    // Tracked objects
    private _targets: { pos: THREE.Vector3, type: 'enemy' | 'ally' | 'waypoint' }[] = [];
    private _blips: { x: number, y: number, type: string, life: number }[] = [];

    constructor() {
        this._canvas = document.createElement('canvas');
        this._canvas.width = 360;
        this._canvas.height = 360;
        this._canvas.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            width: 180px;
            height: 180px;
            z-index: 150;
            pointer-events: none;
        `;
        
        this._ctx = this._canvas.getContext('2d')!;
        this._centerX = this._canvas.width / 2;
        this._centerY = this._canvas.height / 2;
        
        document.body.appendChild(this._canvas);
    }

    setRange(range: number): void {
        this._range = range;
    }

    addTarget(pos: THREE.Vector3, type: 'enemy' | 'ally' | 'waypoint'): void {
        this._targets.push({ pos, type });
    }

    clearTargets(): void {
        this._targets = [];
    }

    hide(): void {
        this._visible = false;
        this._canvas.style.display = 'none';
    }

    show(): void {
        this._visible = true;
        this._canvas.style.display = 'block';
    }

    update(playerPos: THREE.Vector3, playerHeading: number): void {
        if (!this._visible) return;
        
        const ctx = this._ctx;
        const w = this._canvas.width;
        const h = this._canvas.height;
        const r = this._size / 2;
        
        // Clear
        ctx.clearRect(0, 0, w, h);
        
        // Background
        ctx.fillStyle = 'rgba(0, 20, 0, 0.7)';
        ctx.beginPath();
        ctx.arc(this._centerX, this._centerY, r, 0, Math.PI * 2);
        ctx.fill();
        
        // Range rings
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.2)';
        ctx.lineWidth = 1;
        for (let i = 1; i <= 3; i++) {
            ctx.beginPath();
            ctx.arc(this._centerX, this._centerY, r * (i / 3), 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Cross-hair
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
        ctx.beginPath();
        ctx.moveTo(this._centerX, this._centerY - r);
        ctx.lineTo(this._centerX, this._centerY + r);
        ctx.moveTo(this._centerX - r, this._centerY);
        ctx.lineTo(this._centerX + r, this._centerY);
        ctx.stroke();
        
        // North indicator
        ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('N', this._centerX, this._centerY - r + 14);
        
        // Player (center)
        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.arc(this._centerX, this._centerY, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Player heading indicator
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this._centerX, this._centerY);
        ctx.lineTo(
            this._centerX + Math.sin(-playerHeading) * 10,
            this._centerY - Math.cos(-playerHeading) * 10
        );
        ctx.stroke();
        
        // Draw targets
        this._blips = [];
        for (const target of this._targets) {
            // Relative position
            const relX = target.pos.x - playerPos.x;
            const relZ = target.pos.z - playerPos.z;
            
            // Rotate by player heading
            const cosH = Math.cos(-playerHeading);
            const sinH = Math.sin(-playerHeading);
            const rotX = relX * cosH - relZ * sinH;
            const rotZ = relX * sinH + relZ * cosH;
            
            // Scale to radar
            const scale = r / this._range;
            const screenX = this._centerX + rotX * scale;
            const screenY = this._centerY - rotZ * scale;
            
            // Only draw if within range
            const dist = Math.sqrt(relX * relX + relZ * relZ);
            if (dist < this._range) {
                // Check if on screen
                const dx = screenX - this._centerX;
                const dy = screenY - this._centerY;
                if (dx * dx + dy * dy < r * r) {
                    let color: string;
                    let size: number;
                    
                    switch (target.type) {
                        case 'enemy':
                            color = '#ff0000';
                            size = 4;
                            break;
                        case 'ally':
                            color = '#0088ff';
                            size = 3;
                            break;
                        case 'waypoint':
                            color = '#ffff00';
                            size = 3;
                            break;
                        default:
                            color = '#ffffff';
                            size = 2;
                    }
                    
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.arc(screenX, screenY, size, 0, Math.PI * 2);
                    ctx.fill();
                    
                    this._blips.push({ x: screenX, y: screenY, type: target.type, life: 1 });
                }
            }
        }
        
        // Range label
        ctx.fillStyle = 'rgba(0, 255, 0, 0.6)';
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`${this._range}m`, this._centerX + 5, this._centerY + r - 5);
    }
}