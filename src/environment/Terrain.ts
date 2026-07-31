import * as THREE from 'three';

/** Terrain, sky, and clouds */
export class Terrain {
  private _clouds = new THREE.Group();

  constructor(scene: THREE.Scene) {
    this.createGround(scene);
    this.createSky(scene);
    this.createClouds(scene);
    this.createMountains(scene);
    this.createLakes(scene);
    this.createTrees(scene);
    this.createRoads(scene);
  }

  private createGround(scene: THREE.Scene) {
    // Main ground
    const groundGeo = new THREE.PlaneGeometry(20000, 20000);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x3a7d3a,
      roughness: 0.9,
      metalness: 0.0
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1;
    ground.receiveShadow = true;
    scene.add(ground);

    // Grid helper for spatial reference
    const grid = new THREE.GridHelper(10000, 100, 0x2a5d2a, 0x2a5d2a);
    grid.position.y = 0;
    scene.add(grid);
  }

  private createSky(scene: THREE.Scene) {
    // Sky gradient using a large sphere
    const skyGeo = new THREE.SphereGeometry(8000, 32, 32);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x0077ff) },
        bottomColor: { value: new THREE.Color(0xffffff) },
        offset: { value: 20 },
        exponent: { value: 0.6 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    scene.add(sky);
  }

  private createClouds(scene: THREE.Scene) {
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
      roughness: 1,
      metalness: 0
    });

    // Create scattered clouds at various heights
    for (let i = 0; i < 60; i++) {
      const cloudGroup = new THREE.Group();

      // Each cloud is made of 3-6 overlapping spheres
      const numPuffs = 3 + Math.floor(Math.random() * 4);
      for (let j = 0; j < numPuffs; j++) {
        const radius = 20 + Math.random() * 40;
        const puff = new THREE.Mesh(new THREE.SphereGeometry(radius, 8, 8), cloudMat);
        puff.position.set(
          (Math.random() - 0.5) * 60,
          (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 30
        );
        puff.scale.y = 0.4;
        cloudGroup.add(puff);
      }

      cloudGroup.position.set(
        (Math.random() - 0.5) * 8000,
        50 + Math.random() * 300, // Lower altitude range: 50-350m (reachable by aircraft)
        (Math.random() - 0.5) * 8000
      );
      this._clouds.add(cloudGroup);
    }

    scene.add(this._clouds);
  }

  private createMountains(scene: THREE.Scene) {
    const mountainColors = [0x8B7355, 0x6B5B4F, 0x7B6B5F, 0x5B4B3F];
    const snowColor = 0xffffff;
    
    // Create mountain ranges closer to the runway for better visibility
    const ranges = [
      { centerX: 2000, centerZ: 1200, count: 8 },
      { centerX: -2000, centerZ: 1000, count: 6 },
      { centerX: 2500, centerZ: -1200, count: 7 },
      { centerX: -1800, centerZ: -1000, count: 6 },
      { centerX: 3000, centerZ: 0, count: 5 },
    ];

    ranges.forEach(range => {
      for (let i = 0; i < range.count; i++) {
      const height = 150 + Math.random() * 350;
      const radius = 60 + Math.random() * 80;
        const x = range.centerX + (Math.random() - 0.5) * 800;
        const z = range.centerZ + (Math.random() - 0.5) * 800;
        
        // Mountain cone
        const mountainGeo = new THREE.ConeGeometry(radius, height, 8);
        const mountainMat = new THREE.MeshStandardMaterial({
          color: mountainColors[Math.floor(Math.random() * mountainColors.length)],
          roughness: 0.9,
          flatShading: true
        });
        const mountain = new THREE.Mesh(mountainGeo, mountainMat);
        mountain.position.set(x, height / 2, z);
        scene.add(mountain);

        // Snow cap on tall mountains
        if (height > 250) {
          const snowHeight = height * 0.2;
          const snowRadius = radius * 0.3;
          const snowGeo = new THREE.ConeGeometry(snowRadius, snowHeight, 8);
          const snowMat = new THREE.MeshStandardMaterial({
            color: snowColor,
            roughness: 0.5
          });
          const snow = new THREE.Mesh(snowGeo, snowMat);
          snow.position.set(x, height - snowHeight / 2, z);
          scene.add(snow);
        }
      }
    });
  }

  private createLakes(scene: THREE.Scene) {
    const lakePositions = [
      { x: 800, z: 600, radius: 100 },
      { x: -600, z: 400, radius: 80 },
      { x: 1500, z: -400, radius: 120 },
      { x: -1200, z: -600, radius: 90 },
      { x: 300, z: -900, radius: 110 },
    ];

    lakePositions.forEach(lake => {
      const lakeGeo = new THREE.CircleGeometry(lake.radius, 32);
      const lakeMat = new THREE.MeshStandardMaterial({
        color: 0x006994,
        transparent: true,
        opacity: 0.7,
        roughness: 0.1,
        metalness: 0.3
      });
      const lakeMesh = new THREE.Mesh(lakeGeo, lakeMat);
      lakeMesh.rotation.x = -Math.PI / 2;
      lakeMesh.position.set(lake.x, -0.05, lake.z);
      scene.add(lakeMesh);
    });
  }

  private createTrees(scene: THREE.Scene) {
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const canopyMats = [
      new THREE.MeshStandardMaterial({ color: 0x228B22 }),
      new THREE.MeshStandardMaterial({ color: 0x2E8B57 }),
      new THREE.MeshStandardMaterial({ color: 0x3CB371 }),
    ];

    // Create 500 trees scattered around, avoiding runway
    for (let i = 0; i < 500; i++) {
      let x, z;
      let attempts = 0;
      
      // Find position outside runway area, closer to runway for visibility
      do {
        x = (Math.random() - 0.5) * 5000;
        z = (Math.random() - 0.5) * 3000;
        attempts++;
      } while ((Math.abs(x) < 1600 && Math.abs(z) < 600) && attempts < 10);

      // Skip if too close to runway
      if (Math.abs(x) < 1600 && Math.abs(z) < 600) continue;

      const treeGroup = new THREE.Group();
      
      // Trunk
      const trunkHeight = 3 + Math.random() * 2;
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.4, trunkHeight, 6),
        trunkMat
      );
      trunk.position.y = trunkHeight / 2;
      treeGroup.add(trunk);

      // Canopy
      const canopyHeight = 5 + Math.random() * 5;
      const canopyRadius = 2 + Math.random() * 2;
      const canopy = new THREE.Mesh(
        new THREE.ConeGeometry(canopyRadius, canopyHeight, 8),
        canopyMats[Math.floor(Math.random() * canopyMats.length)]
      );
      canopy.position.y = trunkHeight + canopyHeight / 2;
      treeGroup.add(canopy);

      treeGroup.position.set(x, 0, z);
      scene.add(treeGroup);
    }
  }

  private createRoads(scene: THREE.Scene) {
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x444444,
      roughness: 0.8
    });

    const roads = [
      { x: 0, z: 800, width: 15, length: 4000, rotation: 0 },
      { x: 0, z: -800, width: 15, length: 4000, rotation: 0 },
      { x: 1500, z: 0, width: 15, length: 2000, rotation: Math.PI / 2 },
      { x: -1500, z: 0, width: 15, length: 2000, rotation: Math.PI / 2 },
    ];

    roads.forEach(road => {
      const roadGeo = new THREE.PlaneGeometry(road.length, road.width);
      const roadMesh = new THREE.Mesh(roadGeo, roadMat);
      roadMesh.rotation.x = -Math.PI / 2;
      roadMesh.rotation.z = road.rotation;
      roadMesh.position.set(road.x, 0.01, road.z);
      scene.add(roadMesh);
    });
  }

  update(dt: number) {
    // Slowly drift clouds
    this._clouds.children.forEach(cloud => {
      (cloud as THREE.Group).position.x += 5 * dt;
      if ((cloud as THREE.Group).position.x > 4000) {
        (cloud as THREE.Group).position.x = -4000;
      }
    });
  }
}