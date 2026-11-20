import * as THREE from 'three';
import { MAT, box, cylinder, sphere, tube, createRoof, createSimpleLantern, shadows } from './primitives.js';

export function bridgeDeck(x) { return .82 + 2.05 * Math.max(0, 1 - (x / 8.5) ** 2); }

function archWedge(innerX, innerY, outerX, outerY, a0, a1, depth) {
  const shape = new THREE.Shape();
  shape.moveTo(Math.cos(a0) * innerX, Math.sin(a0) * innerY);
  shape.lineTo(Math.cos(a0) * outerX, Math.sin(a0) * outerY);
  shape.absellipse(0, 0, outerX, outerY, a0, a1, false, 0);
  shape.lineTo(Math.cos(a1) * innerX, Math.sin(a1) * innerY);
  shape.absellipse(0, 0, innerX, innerY, a1, a0, true, 0);
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: .025, bevelThickness: .025, bevelSegments: 1, curveSegments: 5 });
}

export function createBridge() {
  const group = new THREE.Group(); group.name = '石拱桥';
  const half = 8.5, width = 4.2;
  const shape = new THREE.Shape();
  shape.moveTo(-half, 0); shape.lineTo(half, 0);
  for (let i = 0; i <= 32; i++) { const x = half - i / 32 * half * 2; shape.lineTo(x, bridgeDeck(x)); }
  shape.closePath();
  const hole = new THREE.Path();
  hole.moveTo(-5.25, .02); hole.absellipse(0, .02, 5.25, 2.25, Math.PI, 0, true, 0); hole.lineTo(5.25, .02); hole.closePath();
  shape.holes.push(hole);
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false, curveSegments: 32 }), MAT.stone);
  body.position.z = -width / 2; body.castShadow = true; body.receiveShadow = true; group.add(body);
  const count = 19;
  for (let i = 0; i < count; i++) {
    const a0 = i / count * Math.PI + .006, a1 = (i + 1) / count * Math.PI - .006;
    for (const z of [-width / 2 - .035, width / 2 - .16]) {
      const stone = new THREE.Mesh(archWedge(5.22, 2.23, 5.82, 2.68, a0, a1, .19), i % 3 === 0 ? MAT.stoneLight : MAT.stone);
      stone.position.z = z; stone.castShadow = true; group.add(stone);
    }
  }
  const steps = 34;
  for (let i = 0; i < steps; i++) {
    const x = -half + (i + .5) / steps * half * 2;
    const next = x + .05, slope = Math.atan2(bridgeDeck(next) - bridgeDeck(x), .05);
    box(group, [half * 2 / steps - .025, .16, width + .18], [x, bridgeDeck(x) + .025, 0], i % 4 === 0 ? MAT.stoneLight : MAT.stone, [0, 0, slope]);
  }
  for (const side of [-1, 1]) {
    const railPoints = [];
    for (let i = 0; i <= 32; i++) { const x = -half + i / 32 * half * 2; railPoints.push(new THREE.Vector3(x, bridgeDeck(x) + 1.25, side * (width / 2 + .05))); }
    tube(group, railPoints, .105, MAT.woodLight, 48, 7);
    const lower = railPoints.map(p => p.clone().add(new THREE.Vector3(0, -.58, 0)));
    tube(group, lower, .07, MAT.woodLight, 48, 6);
    for (let i = 0; i <= 10; i++) {
      const x = -half + i / 10 * half * 2, y = bridgeDeck(x);
      box(group, [.19, 1.35, .19], [x, y + .64, side * (width / 2 + .05)], MAT.woodLight);
      sphere(group, .17, [x, y + 1.42, side * (width / 2 + .05)], [1, 1, 1], MAT.gold, 10);
      if (i < 10) {
        const nx = -half + (i + .5) / 10 * half * 2;
        box(group, [.09, .63, .09], [nx, bridgeDeck(nx) + .76, side * (width / 2 + .05)], MAT.woodLight, [0, 0, -.18]);
      }
    }
  }
  group.rotation.y = Math.PI / 2;
  group.position.set(-11, 0, 0);
  return group;
}

function createScreenTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 384;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 384); gradient.addColorStop(0, '#f8dda0'); gradient.addColorStop(1, '#d89a54');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 768, 384);
  ctx.strokeStyle = '#75462d'; ctx.lineWidth = 7; ctx.strokeRect(17, 17, 734, 350);
  ctx.fillStyle = '#e7a743'; ctx.beginPath(); ctx.arc(450, 135, 72, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#572c28'; ctx.lineCap = 'round';
  const branches = [[80,320,250,170,330,95],[155,290,110,165,60,120],[215,225,365,245,480,205],[260,180,250,90,310,45],[335,110,430,85,500,30]];
  for (const b of branches) { ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(b[0],b[1]); ctx.quadraticCurveTo(b[2],b[3],b[4],b[5]); ctx.stroke(); }
  const blossoms = [[110,165],[155,245],[235,170],[255,95],[310,62],[340,118],[405,86],[475,45],[355,235],[455,205],[75,125]];
  for (const [x,y] of blossoms) for (let i=0;i<5;i++){const a=i/5*Math.PI*2;ctx.fillStyle=i%2?'#a93445':'#c9505d';ctx.beginPath();ctx.arc(x+Math.cos(a)*10,y+Math.sin(a)*10,8,0,Math.PI*2);ctx.fill();}
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}

function curtain(width, height, direction) {
  const segX = 16, segY = 16, positions = [], indices = [];
  for (let y = 0; y <= segY; y++) for (let x = 0; x <= segX; x++) {
    const u = x / segX, v = y / segY;
    const spread = .45 + .55 * Math.abs(v - .55) * 1.7;
    positions.push((u - .5) * width * spread * direction, (0.5 - v) * height, Math.sin(u * Math.PI * 8) * .09 + Math.sin(v * 3) * .04);
  }
  for (let y=0;y<segY;y++) for(let x=0;x<segX;x++){const a=y*(segX+1)+x,b=a+1,c=a+segX+1,d=c+1;indices.push(a,c,b,b,c,d);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();
  const mesh=new THREE.Mesh(g,MAT.redCloth);mesh.castShadow=true;return mesh;
}

export function createStage() {
  const group = new THREE.Group(); group.name = '临河戏台';
  box(group, [12.4, .75, 7.4], [0, .65, 0], MAT.stoneDark);
  box(group, [11.8, .28, 6.9], [0, 1.14, 0], MAT.woodDark);
  for (const x of [-5.2, -3.4, 3.4, 5.2]) for (const z of [-2.75, 2.75]) {
    cylinder(group, .17, .21, 5.2, [x, 3.72, z], MAT.woodLight, 12);
    cylinder(group, .28, .32, .25, [x, 1.28, z], MAT.stoneLight, 12);
    box(group, [.5, .18, .5], [x, 6.22, z], MAT.gold);
  }
  box(group, [10.8, 4.5, .24], [0, 3.65, -2.9], MAT.wood);
  const screenMat = new THREE.MeshStandardMaterial({ map: createScreenTexture(), emissiveMap: createScreenTexture(), emissive: 0xffb85a, emissiveIntensity: .75, roughness: .8 });
  box(group, [6.1, 3.05, .08], [0, 3.9, -2.72], screenMat);
  for (const side of [-1, 1]) { const c = curtain(2.25, 4.25, side); c.position.set(side * 3.65, 3.85, -2.45); group.add(c); }
  box(group, [10.8, .35, .35], [0, 6.18, 2.75], MAT.woodLight);
  box(group, [10.8, .35, .35], [0, 6.18, -2.75], MAT.woodLight);
  for (let i=0;i<5;i++) box(group,[3.3,.22,.65],[0,.18+i*.22,4.5-i*.52],MAT.woodDark);
  group.add(createRoof(14, 9, 6.25, 2.2, true));
  for (const x of [-4.65,4.65]) { const lantern=createSimpleLantern(.72);lantern.position.set(x,5.25,2.7);group.add(lantern); }
  const drum = new THREE.Group();
  const drumBody = cylinder(drum,.65,.65,.65,[0,0,0],MAT.redCloth,24);drumBody.rotation.z=Math.PI/2;
  for(const x of [-.34,.34]){const skin=cylinder(drum,.68,.68,.05,[x,0,0],MAT.stoneLight,24);skin.rotation.z=Math.PI/2;}
  drum.position.set(4.4,2.35,-1.3);group.add(drum);
  box(group,[.18,1.3,.18],[4.4,1.65,-1.3],MAT.woodDark);
  group.position.set(10.5, .25, -14.5);
  return shadows(group);
}

export function createHouse(width = 7, depth = 5, height = 4, variant = 0) {
  const group = new THREE.Group();
  box(group,[width,height,depth],[0,height/2,0],variant%2?MAT.stoneLight:MAT.woodDark);
  const glow = new THREE.MeshStandardMaterial({color:0xf4bd67,emissive:0xff8a2b,emissiveIntensity:1.8,roughness:.8});
  for(const x of [-width*.28,0,width*.28]){
    box(group,[width*.14,height*.32,.05],[x,height*.55,depth/2+.03],glow);
    box(group,[.06,height*.34,.08],[x,height*.55,depth/2+.07],MAT.woodDark);
  }
  group.add(createRoof(width+1.5,depth+1.4,height+.05,height*.38,false));
  return group;
}

export function createFishLantern(scale = 1) {
  const group = new THREE.Group();
  const fishMat = new THREE.MeshStandardMaterial({color:0xf6ad45,emissive:0xff6b1c,emissiveIntensity:2.4,roughness:.55});
  sphere(group,.62,[0,0,0],[1.25,.66,.45],fishMat,20);
  const tail=new THREE.Mesh(new THREE.ConeGeometry(.48,.72,3),fishMat);tail.rotation.z=-Math.PI/2;tail.position.x=-1.03;group.add(tail);
  for(const x of [-.48,-.18,.12,.42]){const rib=new THREE.Mesh(new THREE.TorusGeometry(.35,.018,5,20),MAT.gold);rib.rotation.y=Math.PI/2;rib.scale.set(1,1,.75);rib.position.x=x;group.add(rib);}
  sphere(group,.065,[.53,.13,.28],[1,1,1],MAT.woodDark,8);
  const fin=new THREE.Mesh(new THREE.ConeGeometry(.22,.5,3),fishMat);fin.position.set(0,.48,0);group.add(fin);
  cylinder(group,.012,.012,1.4,[0,1.05,0],MAT.rope,5);
  group.scale.setScalar(scale);return group;
}

export function createLotusLantern(scale = 1) {
  const group=new THREE.Group();
  cylinder(group,.62,.68,.12,[0,0,0],MAT.bamboo,24);
  for(let i=0;i<10;i++){
    const a=i/10*Math.PI*2;
    const petal=sphere(group,.35,[Math.cos(a)*.26,.36,Math.sin(a)*.26],[.48,1.15,.22],MAT.pinkGlow,12);
    petal.rotation.z=Math.cos(a)*.48;petal.rotation.x=Math.sin(a)*.48;petal.rotation.y=-a;
  }
  sphere(group,.2,[0,.36,0],[1,1.25,1],MAT.warmGlow,12);
  group.scale.setScalar(scale);return group;
}

export function createBoat() {
  const group=new THREE.Group();group.name='乌篷船';
  const length=11,halfWidth=1.65,nx=32,nq=14,positions=[],indices=[];
  for(let i=0;i<=nx;i++){
    const u=i/nx,w=halfWidth*Math.pow(Math.sin(Math.PI*u),.43)+.035;
    for(let j=0;j<=nq;j++){
      const q=j/nq*2-1,endRise=.5*Math.pow(Math.abs(u*2-1),4);
      positions.push((u-.5)*length,.12+.82*Math.abs(q)**2+endRise,q*w);
    }
  }
  for(let i=0;i<nx;i++)for(let j=0;j<nq;j++){const a=i*(nq+1)+j,b=a+1,c=a+nq+1,d=c+1;indices.push(a,c,b,b,c,d);}
  const hullGeo=new THREE.BufferGeometry();hullGeo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));hullGeo.setIndex(indices);hullGeo.computeVertexNormals();
  const hull=new THREE.Mesh(hullGeo,MAT.woodDark);hull.castShadow=true;hull.receiveShadow=true;group.add(hull);
  box(group,[8.9,.14,2.65],[0,.86,0],MAT.bamboo);
  for(const side of [-1,1]){
    const points=[];for(let i=0;i<=24;i++){const u=i/24,w=halfWidth*Math.pow(Math.sin(Math.PI*u),.43)+.035;points.push(new THREE.Vector3((u-.5)*length,.96+.5*Math.pow(Math.abs(u*2-1),4),side*w));}
    tube(group,points,.075,MAT.woodLight,36,6);
  }
  const canopyPos=[],canopyIdx=[],cu=18,cv=18;
  for(let i=0;i<=cu;i++)for(let j=0;j<=cv;j++){
    const u=i/cu,a=j/cv*Math.PI;
    canopyPos.push(.2+u*4.6,1.05+Math.sin(a)*2.05,Math.cos(a)*1.48);
  }
  for(let i=0;i<cu;i++)for(let j=0;j<cv;j++){const a=i*(cv+1)+j,b=a+1,c=a+cv+1,d=c+1;canopyIdx.push(a,b,c,b,d,c);}
  const canopyGeo=new THREE.BufferGeometry();canopyGeo.setAttribute('position',new THREE.Float32BufferAttribute(canopyPos,3));canopyGeo.setIndex(canopyIdx);canopyGeo.computeVertexNormals();
  const canopy=new THREE.Mesh(canopyGeo,MAT.redCloth);canopy.castShadow=true;group.add(canopy);
  for(let i=0;i<=7;i++){
    const x=.2+i/7*4.6,points=[];for(let j=0;j<=16;j++){const a=j/16*Math.PI;points.push(new THREE.Vector3(x,1.06+Math.sin(a)*2.06,Math.cos(a)*1.49));}
    tube(group,points,.025,MAT.gold,20,5);
  }
  for(let j=1;j<6;j++){
    const a=j/6*Math.PI,points=[];for(let i=0;i<=10;i++)points.push(new THREE.Vector3(.2+i/10*4.6,1.06+Math.sin(a)*2.06,Math.cos(a)*1.49));
    tube(group,points,.022,MAT.gold,16,5);
  }
  for(const side of [-1,1]){
    box(group,[4.6,1.1,.07],[2.5,1.42,side*1.4],MAT.bamboo);
    for(let i=0;i<8;i++)box(group,[.045,1.05,.08],[.45+i*.58,1.44,side*1.44],MAT.woodDark);
  }
  for(const x of [.65,4.15]){const l=createSimpleLantern(.55);l.position.set(x,2.15,1.55);group.add(l);}
  const oar=cylinder(group,.045,.045,4.5,[-1.8,1.15,.3],MAT.bamboo,8);oar.rotation.z=Math.PI/2.5;oar.rotation.x=.3;
  box(group,[.8,.08,.3],[-3.25,.63,.85],MAT.bamboo,[0,.2,-.45]);
  cylinder(group,.035,.045,2.4,[-4.25,2.02,0],MAT.bamboo,8);
  const flagGeo=new THREE.BufferGeometry();flagGeo.setAttribute('position',new THREE.Float32BufferAttribute([-4.25,3.15,0,-4.25,2.35,0,-2.95,2.75,0],3));flagGeo.computeVertexNormals();
  const flag=new THREE.Mesh(flagGeo,MAT.redCloth);group.add(flag);
  const medallion=new THREE.Mesh(new THREE.CircleGeometry(.68,32),new THREE.MeshStandardMaterial({color:0x1e514e,emissive:0x0b302d,emissiveIntensity:.5,side:THREE.DoubleSide}));medallion.position.set(2.55,1.55,1.46);group.add(medallion);
  const fish=createFishLantern(.42);fish.position.set(2.55,1.55,1.49);group.add(fish);
  group.position.set(9,.05,4.3);group.rotation.y=-.1;
  return group;
}

export function createDock() {
  const group=new THREE.Group();group.name='近岸码头';
  box(group,[10,.75,6],[-16,.37,10.5],MAT.stoneDark);
  for(let x=0;x<5;x++)for(let z=0;z<3;z++)box(group,[1.94,.18,1.94],[-20+x*2,.82,8.5+z*2],(x+z)%3===0?MAT.stoneLight:MAT.stone);
  cylinder(group,.28,.32,1.1,[-11.8,1.35,8.1],MAT.stoneLight,12);
  for(let i=0;i<4;i++){const coil=new THREE.Mesh(new THREE.TorusGeometry(.48+i*.11,.035,6,32),MAT.rope);coil.rotation.x=Math.PI/2;coil.position.set(-14.5,.98,9.2);group.add(coil);}
  const lamp=createSimpleLantern(.7);lamp.position.set(-18.8,1.75,8.2);group.add(lamp);
  const vaseMat=new THREE.MeshStandardMaterial({color:0xb9c8c4,roughness:.45,metalness:.05});
  sphere(group,.48,[-19.2,1.35,11.7],[.75,1.35,.75],vaseMat,20);
  cylinder(group,.2,.28,.55,[-19.2,2.05,11.7],vaseMat,16);
  for(let i=0;i<3;i++){
    const fan=new THREE.Mesh(new THREE.CircleGeometry(.68,24,0,Math.PI),new THREE.MeshStandardMaterial({color:[0xa63c35,0x314e70,0xd5c69c][i],side:THREE.DoubleSide,roughness:.9}));
    fan.position.set(-17.8+i*.62,1.25,10.9);fan.rotation.set(-.25,.2-i*.2,Math.PI);group.add(fan);
  }
  return group;
}
