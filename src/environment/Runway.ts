import * as THREE from 'three';

/** Runway with markings */
export class Runway {
  // Runway bounds for collision detection (in meters from origin)
  readonly bounds = { x1: -800, x2: 800, z1: -30, z2: 30 };

  private readonly _runwayLength = 1600;

  constructor(scene: THREE.Scene) {
    this.createRunwaySurface(scene);
    this.createMarkings(scene);
    this.createApproachLights(scene);
  }

  private createRunwaySurface(scene: THREE.Scene) {
    const width = 60;
    const length = this._runwayLength;

    // Runway surface - elevated above terrain to avoid Z-fighting
    const runwayGeo = new THREE.PlaneGeometry(length, width, 1, 1);
    const runwayMat = new THREE.MeshStandardMaterial({
      color: 0x3a3a3a,
      roughness: 0.9,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });
    const runway = new THREE.Mesh(runwayGeo, runwayMat);
    runway.rotation.x = -Math.PI / 2;
    runway.position.y = 1.5; // Elevated above terrain (0) to prevent Z-fighting
    runway.receiveShadow = true;
    scene.add(runway);

    // Shoulder (lighter area beside runway)
    for (const side of [-1, 1]) {
      const shoulderGeo = new THREE.PlaneGeometry(length, 8, 1, 1);
      const shoulderMat = new THREE.MeshStandardMaterial({
        color: 0x4a4a4a,
        roughness: 0.95,
        side: THREE.DoubleSide,
      });
      const shoulder = new THREE.Mesh(shoulderGeo, shoulderMat);
      shoulder.rotation.x = -Math.PI / 2;
      shoulder.position.y = 1.2;
      shoulder.position.z = side * (width / 2 + 4);
      shoulder.receiveShadow = true;
      scene.add(shoulder);
    }
  }

  private createMarkings(scene: THREE.Scene) {
    const length = this._runwayLength;
    const markingMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.7,
      side: THREE.DoubleSide,
    });

    // Center line (dashed)
    const numDashes = 32;
    const dashLength = 20;
    const dashGap = 20;
    const startX = -length / 2 + dashLength / 2;
    for (let i = 0; i < numDashes; i++) {
      const dash = new THREE.Mesh(
        new THREE.PlaneGeometry(dashLength, 0.6, 1, 1),
        markingMat
      );
      dash.rotation.x = -Math.PI / 2;
      dash.position.y = 1.55;
      dash.position.x = startX + i * (dashLength + dashGap);
      scene.add(dash);
    }

    // Edge lines (solid)
    for (const side of [-1, 1]) {
      const edgeLine = new THREE.Mesh(
        new THREE.PlaneGeometry(length, 0.4, 1, 1),
        markingMat
      );
      edgeLine.rotation.x = -Math.PI / 2;
      edgeLine.position.y = 1.55;
      edgeLine.position.z = side * 28;
      scene.add(edgeLine);
    }

    // Threshold markings (perpendicular bars at each end)
    const halfLength = length / 2;
    for (const xEnd of [-halfLength + 30, halfLength - 30]) {
      for (let j = 0; j < 4; j++) {
        const bar = new THREE.Mesh(
          new THREE.PlaneGeometry(4, 12, 1, 1),
          markingMat
        );
        bar.rotation.x = -Math.PI / 2;
        bar.position.y = 1.55;
        bar.position.x = xEnd;
        bar.position.z = -10 + j * 7;
        scene.add(bar);
      }
    }

    // Center aiming point markers
    for (const xEnd of [-100, 100]) {
      const aimMark = new THREE.Mesh(
        new THREE.PlaneGeometry(30, 2, 1, 1),
        markingMat
      );
      aimMark.rotation.x = -Math.PI / 2;
      aimMark.position.y = 1.55;
      aimMark.position.x = xEnd;
      scene.add(aimMark);
    }

    // Runway number markers (simple text-like markers at threshold)
    for (const xEnd of [-1400, 1400]) {
      const marker = new THREE.Mesh(
        new THREE.PlaneGeometry(20, 25),
        markingMat
      );
      marker.rotation.x = -Math.PI / 2;
      marker.position.y = 1.55;
      marker.position.x = xEnd;
      marker.position.z = -10;
      scene.add(marker);
    }
  }

  private createApproachLights(scene: THREE.Scene) {
    // PAPI-like lights on each side
    const lightGeo = new THREE.SphereGeometry(0.5, 8, 8);

    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const isRed = i < 2;
        const lightMat = new THREE.MeshStandardMaterial({
          color: isRed ? 0xff0000 : 0xffff00,
          emissive: isRed ? 0xff0000 : 0xffff00,
          emissiveIntensity: 2
        });
        const light = new THREE.Mesh(lightGeo, lightMat);
        light.position.set(-1500, 1.5, side * (35 + i * 3));
        scene.add(light);

        // Point light for glow
        const pointLight = new THREE.PointLight(
          isRed ? 0xff0000 : 0xffff00,
          2,
          50
        );
        pointLight.position.copy(light.position);
        scene.add(pointLight);
      }
    }

    // Approach path lights (center line leading to runway)
    const approachLightGeo = new THREE.SphereGeometry(0.3, 6, 6);
    const approachLightMat = new THREE.MeshStandardMaterial({
      color: 0x00ff00,
      emissive: 0x00ff00,
      emissiveIntensity: 1.5
    });

    for (let i = 0; i < 20; i++) {
      const light = new THREE.Mesh(approachLightGeo, approachLightMat);
      light.position.set(-1500 - 50 - i * 20, 1.5, 0);
      scene.add(light);
    }
  }
}