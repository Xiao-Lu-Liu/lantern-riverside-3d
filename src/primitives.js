import * as THREE from 'three';
import { PALETTE } from './rendering.js';

export const MAT = {
  stone: new THREE.MeshStandardMaterial({ color: PALETTE.stone, roughness: .94 }),
  stoneLight: new THREE.MeshStandardMaterial({ color: PALETTE.stoneLight, roughness: .9 }),
  stoneDark: new THREE.MeshStandardMaterial({ color: 0x4b514e, roughness: .96 }),
  wood: new THREE.MeshStandardMaterial({ color: PALETTE.wood, roughness: .72 }),
  woodLight: new THREE.MeshStandardMaterial({ color: PALETTE.woodLight, roughness: .68 }),
  woodDark: new THREE.MeshStandardMaterial({ color: 0x351a17, roughness: .82 }),
  gold: new THREE.MeshStandardMaterial({ color: PALETTE.gold, metalness: .48, roughness: .4 }),
  roof: new THREE.MeshStandardMaterial({ color: PALETTE.roof, roughness: .7, metalness: .08, side: THREE.DoubleSide }),
  roofEdge: new THREE.MeshStandardMaterial({ color: 0x53616a, roughness: .66 }),
  redCloth: new THREE.MeshStandardMaterial({ color: 0x8e2028, roughness: .9, side: THREE.DoubleSide }),
  warmGlow: new THREE.MeshStandardMaterial({ color: 0xffc56b, emissive: 0xff7b24, emissiveIntensity: 3.2, roughness: .55 }),
  pinkGlow: new THREE.MeshStandardMaterial({ color: 0xffa0a9, emissive: 0xff3859, emissiveIntensity: 2.2, roughness: .6 }),
  bamboo: new THREE.MeshStandardMaterial({ color: 0x9a7444, roughness: .88 }),
  rope: new THREE.MeshStandardMaterial({ color: 0xa88956, roughness: 1 }),
};

export function box(parent, size, position, material = MAT.wood, rotation = null) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  if (rotation) mesh.rotation.set(...rotation);
  mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh);
  return mesh;
}

export function cylinder(parent, radiusTop, radiusBottom, height, position, material = MAT.wood, segments = 10) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material);
  mesh.position.set(...position); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh);
  return mesh;
}

export function sphere(parent, radius, position, scale, material, detail = 12) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, detail, Math.max(6, detail / 2)), material);
  mesh.position.set(...position); mesh.scale.set(...scale); mesh.castShadow = true; parent.add(mesh);
  return mesh;
}

export function tube(parent, points, radius, material = MAT.wood, tubularSegments = 32, radialSegments = 6) {
  const curve = new THREE.CatmullRomCurve3(points);
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, false), material);
  mesh.castShadow = true; parent.add(mesh); return mesh;
}

export function roofHeight(u, v, base, height) {
  const av = Math.abs(v), au = Math.abs(u);
  return base + height * (1 - av) * (1 - .28 * au ** 3) + .34 * av ** 7 + .26 * (au * av) ** 5;
}

export function createRoof(width, depth, base, height, detailed = true) {
  const group = new THREE.Group();
  const nx = detailed ? 28 : 14, nz = detailed ? 18 : 10;
  const positions = [], uvs = [], indices = [];
  for (let iz = 0; iz <= nz; iz++) {
    const v = iz / nz * 2 - 1;
    for (let ix = 0; ix <= nx; ix++) {
      const u = ix / nx * 2 - 1;
      positions.push(u * width / 2, roofHeight(u, v, base, height), v * depth / 2);
      uvs.push(ix / nx, iz / nz);
    }
  }
  for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) {
    const a = iz * (nx + 1) + ix, b = a + 1, c = a + nx + 1, d = c + 1;
    indices.push(a, c, b, b, c, d);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  const roof = new THREE.Mesh(geometry, MAT.roof); roof.castShadow = true; roof.receiveShadow = true; group.add(roof);
  const ribs = detailed ? Math.floor(width / .42) : Math.floor(width / .8);
  for (let i = 0; i <= ribs; i++) {
    const u = i / ribs * 2 - 1, points = [];
    for (let j = 0; j <= 14; j++) {
      const v = j / 14 * 2 - 1;
      points.push(new THREE.Vector3(u * width / 2, roofHeight(u, v, base, height) + .045, v * depth / 2));
    }
    tube(group, points, detailed ? .035 : .045, MAT.roofEdge, 14, 5).castShadow = false;
  }
  const ridge = [];
  for (let i = 0; i <= 20; i++) {
    const u = i / 20 * 2 - 1;
    ridge.push(new THREE.Vector3(u * width / 2, roofHeight(u, 0, base, height) + .13, 0));
  }
  tube(group, ridge, .11, MAT.roofEdge, 24, 7);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const points = [];
    for (let i = 0; i <= 7; i++) {
      const t = i / 7, u = sx * (.78 + .22 * t), v = sz * (.78 + .22 * t);
      points.push(new THREE.Vector3(u * width / 2, roofHeight(u, v, base, height) + .12 + .28 * t ** 4, v * depth / 2));
    }
    tube(group, points, .075, MAT.gold, 10, 6);
  }
  return group;
}

export function createSimpleLantern(scale = 1) {
  const group = new THREE.Group();
  sphere(group, .38, [0, 0, 0], [1, 1.18, 1], MAT.warmGlow, 16);
  for (const y of [-.43, .43]) cylinder(group, .24, .24, .08, [0, y, 0], MAT.gold, 16);
  const ribMat = MAT.gold;
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2, points = [];
    for (let j = 0; j <= 8; j++) {
      const t = j / 8 * Math.PI, r = .38 * Math.sin(t);
      points.push(new THREE.Vector3(Math.cos(a) * r, .44 * Math.cos(t), Math.sin(a) * r));
    }
    tube(group, points, .009, ribMat, 8, 4).castShadow = false;
  }
  cylinder(group, .018, .018, .5, [0, .72, 0], MAT.rope, 5);
  cylinder(group, .035, .012, .42, [0, -.7, 0], MAT.redCloth, 6);
  group.scale.setScalar(scale);
  return group;
}

export function shadows(group, cast = true) {
  group.traverse((o) => { if (o.isMesh) { o.castShadow = cast; o.receiveShadow = true; } });
  return group;
}
