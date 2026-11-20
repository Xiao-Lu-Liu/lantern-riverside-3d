import * as THREE from 'three';
import { PALETTE } from './rendering.js';
import { MAT, box, cylinder, tube } from './primitives.js';

function branchBetween(parent, start, end, r0, r1, material) {
  const direction = end.clone().sub(start), length = direction.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, length, 7), material);
  mesh.position.copy(start).add(end).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  mesh.castShadow = true; parent.add(mesh); return mesh;
}

export function createNature(scene, rand) {
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x283d34, roughness: 1 });
  const ground = new THREE.Mesh(new THREE.CircleGeometry(240, 64).rotateX(-Math.PI / 2), groundMat);
  ground.position.y = -.72; ground.receiveShadow = true; scene.add(ground);
  box(scene, [110, 1.2, 32], [0, .05, -24], groundMat).castShadow = false;
  box(scene, [110, 1.2, 28], [0, .05, 22], groundMat).castShadow = false;

  const bankGeo = new THREE.BoxGeometry(1, 1, 1), bank = new THREE.InstancedMesh(bankGeo, MAT.stoneDark, 180);
  const dummy = new THREE.Object3D(); let bi = 0;
  for (const side of [-1, 1]) for (let row = 0; row < 2; row++) for (let i = 0; i < 45; i++) {
    const x = -45 + i * 2.05 + (row % 2) * .8;
    dummy.position.set(x, .1 + row * .43, side * (8.15 + rand() * .16));
    dummy.scale.set(1.85 + rand() * .25, .45 + rand() * .12, .62 + rand() * .18);
    dummy.rotation.set((rand() - .5) * .05, (rand() - .5) * .12, (rand() - .5) * .04);
    dummy.updateMatrix(); bank.setMatrixAt(bi++, dummy.matrix);
  }
  bank.castShadow = true; bank.receiveShadow = true; scene.add(bank);

  const treePositions = [
    [-24,-15,1.5],[-19,-22,1.15],[-5,-21,1.2],[2,-28,1.5],[22,-20,1.35],[28,-12,1.1],
    [32,-29,1.6],[-32,-30,1.4],[-30,20,1.05],[38,24,1.0],[42,8,1.15],[-36,8,1.2],
  ];
  const foliage = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .94, flatShading: true }), treePositions.length * 22);
  let fi = 0;
  for (const [x,z,s] of treePositions) {
    const trunk = new THREE.Group(); trunk.position.set(x,.65,z); scene.add(trunk);
    const height = 5.8 * s;
    branchBetween(trunk,new THREE.Vector3(0,0,0),new THREE.Vector3(.25*s,height*.72,0),.34*s,.16*s,MAT.woodDark);
    for(let b=0;b<6;b++){
      const a=b/6*Math.PI*2+rand()*.4,start=new THREE.Vector3(.15*s,height*(.35+b*.055),0),end=new THREE.Vector3(Math.cos(a)*2.1*s,height*(.7+rand()*.25),Math.sin(a)*2.1*s);
      branchBetween(trunk,start,end,.13*s,.045*s,MAT.woodDark);
    }
    for(let j=0;j<22;j++){
      const a=rand()*Math.PI*2,r=Math.sqrt(rand())*3.1*s,y=height*(.68+rand()*.38);
      dummy.position.set(x+Math.cos(a)*r,y,z+Math.sin(a)*r);
      dummy.scale.setScalar((.75+rand()*.85)*s);dummy.rotation.set(rand()*2,rand()*2,rand()*2);dummy.updateMatrix();
      foliage.setMatrixAt(fi,dummy.matrix);
      foliage.setColorAt(fi,new THREE.Color().setHSL(.29+rand()*.045,.24+rand()*.12,.19+rand()*.12));fi++;
    }
  }
  foliage.castShadow = true; foliage.receiveShadow = true; scene.add(foliage);

  const willow = new THREE.Group(); willow.position.set(-22,.6,5); scene.add(willow);
  branchBetween(willow,new THREE.Vector3(0,0,0),new THREE.Vector3(.7,8.5,0),.65,.28,MAT.woodDark);
  const leafCount=520,willowLeaves=new THREE.InstancedMesh(new THREE.SphereGeometry(.12,5,4),new THREE.MeshStandardMaterial({color:0x657442,roughness:.95}),leafCount);
  let wi=0;
  for(let b=0;b<20;b++){
    const a=b/20*Math.PI*2,reach=3.8+rand()*3.2,top=7.2+rand()*2.2;
    const points=[];
    for(let j=0;j<=10;j++){const t=j/10;points.push(new THREE.Vector3(.5+Math.cos(a)*reach*t,top+Math.sin(t*Math.PI)*1.1-t*t*4.8,Math.sin(a)*reach*t));}
    tube(willow,points,.025,MAT.woodDark,16,5).castShadow=false;
    for(let j=0;j<26;j++){
      const t=.18+j/26*.82,p=new THREE.Vector3(.5+Math.cos(a)*reach*t,top+Math.sin(t*Math.PI)*1.1-t*t*4.8,Math.sin(a)*reach*t);
      p.x+=(rand()-.5)*.45;p.z+=(rand()-.5)*.45;
      dummy.position.copy(p);dummy.scale.set(1.05,2.8+rand(),.65);dummy.rotation.set(rand(),a,rand()*.3);dummy.updateMatrix();willowLeaves.setMatrixAt(wi++,dummy.matrix);
    }
  }
  willow.add(willowLeaves);

  const flowers = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.13,0),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.85}),360);
  for(let i=0;i<360;i++){
    const far=i<250,x=far?(-30+rand()*66):(-25+rand()*14),z=far?(-8.8-rand()*2.2):(7.8+rand()*2.8);
    dummy.position.set(x,.8+rand()*.65,z);dummy.scale.setScalar(.65+rand()*1.25);dummy.rotation.set(rand(),rand(),rand());dummy.updateMatrix();flowers.setMatrixAt(i,dummy.matrix);
    flowers.setColorAt(i,new THREE.Color().setHSL(.94+rand()*.05,.52+rand()*.28,.55+rand()*.22));
  }
  flowers.castShadow=false;scene.add(flowers);

  const mountainMat=new THREE.MeshStandardMaterial({color:0x273a50,roughness:1,flatShading:true});
  for(let i=0;i<16;i++){
    const mountain=new THREE.Mesh(new THREE.SphereGeometry(1,8,5),mountainMat);
    const a=(i/16)*Math.PI*1.3+.72,height=11+rand()*13;
    mountain.position.set(Math.cos(a)*112,-4+rand()*3,Math.sin(a)*112-18);
    mountain.scale.set(18+rand()*15,height,13+rand()*10);mountain.rotation.y=rand()*Math.PI;scene.add(mountain);
  }

  const fireflyCount=90,fireflyBase=new Float32Array(fireflyCount*3),fireflyPos=new Float32Array(fireflyCount*3),offsets=new Float32Array(fireflyCount);
  for(let i=0;i<fireflyCount;i++){
    fireflyBase[i*3]=-25+rand()*55;fireflyBase[i*3+1]=1+rand()*5;fireflyBase[i*3+2]=-15+rand()*28;offsets[i]=rand()*Math.PI*2;
  }
  fireflyPos.set(fireflyBase);
  const fireflyGeo=new THREE.BufferGeometry();fireflyGeo.setAttribute('position',new THREE.BufferAttribute(fireflyPos,3));
  const fireflies=new THREE.Points(fireflyGeo,new THREE.PointsMaterial({color:0xffd681,size:.075,transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false,sizeAttenuation:true}));scene.add(fireflies);

  return {
    sample(phase){
      willow.rotation.z=Math.sin(phase)*.004;
      for(let i=0;i<fireflyCount;i++){
        fireflyPos[i*3]=fireflyBase[i*3]+Math.sin(phase+offsets[i])*.35;
        fireflyPos[i*3+1]=fireflyBase[i*3+1]+Math.sin(phase*2+offsets[i])*.18;
        fireflyPos[i*3+2]=fireflyBase[i*3+2]+Math.cos(phase+offsets[i])*.28;
      }
      fireflyGeo.attributes.position.needsUpdate=true;
    },
  };
}
