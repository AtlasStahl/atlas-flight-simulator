import * as THREE from 'three';

/** Runway with markings */
export class Runway {
  // Runway bounds for collision detection (in meters from origin)
  readonly bounds = { x1: -1500, x2: 1500, z1: -30, z2: 30 };

  constructor(scene: THREE.Scene) {
    this.createRunwaySurface(scene);
    this.createMarkings(scene);
    this.createApproachLights(scene);
  }

  private createRunwaySurface(scene: THREE.Scene) {
    const width = 60;
    const length = 3000;

    // Runway surface
    const runwayGeo = new THREE.PlaneGeometry(length, width);
    const runwayMat = new THREE.MeshStandardMaterial({
      color: 0x444444,
      roughness: 0.8,
      metalness: 0.0
    });
    const runway = new THREE.Mesh(runwayGeo, runwayMat);
    runway.rotation.x = -Math.PI / 2;
    runway.position.y = 0.01; // Slightly above ground
    runway.receiveShadow = true;
    scene.add(runway);

    // Shoulder (lighter area beside runway)
    for (const side of [-1, 1]) {
      const shoulderGeo = new THREE.PlaneGeometry(length, 10);
      const shoulderMat = new THREE.MeshStandardMaterial({ color: 0x555555 });
      const shoulder = new THREE.Mesh(shoulderGeo, shoulderMat);
      shoulder.rotation.x = -Math.PI / 2;
      shoulder.position.y = 0.005;
      shoulder.position.z = side * (width / 2 + 5);
      scene.add(shoulder);
    }
  }

  private createMarkings(scene: THREE.Scene) {
    const markingMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const centerLineMat = new THREE.MeshStandardMaterial({ color: 0xffffff });

    // Center line (dashed)
    const numDashes = 60;
    const dashLength = 15;
    const dashGap = 15;
    for (let i = 0; i < numDashes; i++) {
      const dash = new THREE.Mesh(
        new THREE.PlaneGeometry(dashLength, 0.8),
        centerLineMat
      );
      dash.rotation.x = -Math.PI / 2;
      dash.position.y = 0.02;
      dash.position.x = -1500 + (dashLength / 2) + i * (dashLength + dashGap);
      scene.add(dash);
    }

    // Edge lines (solid)
    for (const side of [-1, 1]) {
      const edgeLine = new THREE.Mesh(
        new THREE.PlaneGeometry(3000, 0.5),
        centerLineMat
      );
      edgeLine.rotation.x = -Math.PI / 2;
      edgeLine.position.y = 0.02;
      edgeLine.position.z = side * 28;
      scene.add(edgeLine);
    }

    // Threshold markings (perpendicular bars at each end)
    for (const xEnd of [-1450, 1450]) {
      for (let j = 0; j < 6; j++) {
        const bar = new THREE.Mesh(
          new THREE.PlaneGeometry(3, 15),
          markingMat
        );
        bar.rotation.x = -Math.PI / 2;
        bar.position.y = 0.02;
        bar.position.x = xEnd;
        bar.position.z = -15 + j * 6;
        scene.add(bar);
      }
    }

    // Center aiming point markers
    for (const xEnd of [-200, 200]) {
      const aimMark = new THREE.Mesh(
        new THREE.PlaneGeometry(40, 3),
        markingMat
      );
      aimMark.rotation.x = -Math.PI / 2;
      aimMark.position.y = 0.02;
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
      marker.position.y = 0.02;
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
        light.position.set(-1500, 0.5, side * (35 + i * 3));
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
      light.position.set(-1500 - 50 - i * 20, 0.3, 0);
      scene.add(light);
    }
  }
}