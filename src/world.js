import * as THREE from 'three';
import { PALETTE, createSky, createWater } from './rendering.js';
import { MAT, box, cylinder, tube, createSimpleLantern } from './primitives.js';
import { createBridge, createStage, createBoat, createDock, createHouse, createFishLantern, createLotusLantern } from './architecture.js';
import { createNature } from './nature.js';

function mulberry32(a) { return function(){a=(a+0x6d2b79f5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;}; }

async function importAsset(path) {
  const url = new URL(`${import.meta.env.BASE_URL}assets/${path}/asset.mjs`, document.baseURI).href;
  return import(/* @vite-ignore */ url);
}

function normalizeAsset(root, height, ground) {
  const placement = new THREE.Group(); placement.add(root);
  const bounds = new THREE.Box3().setFromObject(root), size = bounds.getSize(new THREE.Vector3());
  const scale = height / Math.max(size.y, .001); placement.scale.setScalar(scale);
  placement.updateMatrixWorld(true);
  const scaled = new THREE.Box3().setFromObject(placement);
  root.position.y += (ground - scaled.min.y) / scale;
  return placement;
}

export async function buildWorld(scene, renderer, progress = () => {}, waitForAssets = false) {
  const rand = mulberry32(20261119);
  scene.background = new THREE.Color(PALETTE.fog);
  scene.fog = new THREE.Fog(PALETTE.fog, 58, 155);
  scene.add(createSky());

  const hemi = new THREE.HemisphereLight(0x91a9df, 0x243126, 1.45); scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffd3a0, 2.15); key.position.set(-18, 28, 16); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.camera.left = -42; key.shadow.camera.right = 42;
  key.shadow.camera.top = 38; key.shadow.camera.bottom = -38; key.shadow.camera.near = 1; key.shadow.camera.far = 90;
  key.shadow.normalBias = .045; key.shadow.bias = -.00012; scene.add(key);
  const fill = new THREE.DirectionalLight(0x718dd6, .72); fill.position.set(24, 14, -20); scene.add(fill);
  const bounce = new THREE.DirectionalLight(0x9b5a38, .16); bounce.position.set(0, -8, 5); scene.add(bounce);

  progress(.14, '铺设河道与两岸');
  const nature = createNature(scene, rand);
  const bridge = createBridge(); scene.add(bridge);
  const stage = createStage(); scene.add(stage);
  const boat = createBoat(); scene.add(boat);
  scene.add(createDock());

  const houseData = [[-25,-28,7,5,4],[-13,-30,8,5,5],[-2,-32,7,5,4],[23,-29,8,5,5],[31,-22,6,4,3.6]];
  houseData.forEach(([x,z,w,d,h],i)=>{const house=createHouse(w,d,h,i);house.position.set(x,.65,z);house.rotation.y=(i-2)*.06;scene.add(house);});

  const gantry = new THREE.Group();
  cylinder(gantry,.2,.27,6.8,[-19,3.9,2],MAT.woodDark,12);
  box(gantry,[7.5,.28,.3],[-15.5,7.15,2],MAT.woodDark);
  for(const x of [-18.2,-15.7,-13.2]){
    const curl=[];for(let i=0;i<=10;i++){const t=i/10;curl.push(new THREE.Vector3(x+Math.sin(t*Math.PI)*.35,6.9-t*.8,2));}
    tube(gantry,curl,.018,MAT.gold,10,5);
  }
  scene.add(gantry);

  const fishA=createFishLantern(.9);fishA.position.set(-15.8,5.4,-.2);fishA.rotation.y=.2;scene.add(fishA);
  const fishB=createFishLantern(.68);fishB.position.set(-6.4,4.6,-3);fishB.rotation.y=-.35;scene.add(fishB);
  for(const [x,y,z] of [[-15.8,6.7,-.2],[-6.4,5.6,-3]]){
    const points=[new THREE.Vector3(x,y-1.4,z),new THREE.Vector3(x,y,z),new THREE.Vector3(x+.8,y+.35,z),new THREE.Vector3(x+1.2,y,z)];tube(scene,points,.035,MAT.gold,16,6);
  }

  const floaters=[];
  const floaterData=[[-2,2.2,.8,'lotus'],[1.8,-2.2,.62,'round'],[-5.5,4.4,.46,'lotus'],[16,-2.5,.5,'round']];
  for(const [x,z,s,type] of floaterData){
    const item=type==='lotus'?createLotusLantern(s):createSimpleLantern(s);
    item.position.set(x,.17,z);scene.add(item);floaters.push({item,x,z,offset:rand()*Math.PI*2});
  }

  const reflectionLights=[[-11,-3,1.2,0],[9,3.5,1.5,0],[-2,2.2,1.1,1],[1.8,-2.2,.8,0],[-17,2,1.1,0],[10.5,-8,1.5,0],[-15.8,-.2,.75,0],[16,-2.5,.55,0]];
  const water=createWater(reflectionLights);scene.add(water);

  const moonMat=new THREE.MeshBasicMaterial({color:new THREE.Color(1.8,1.45,.9)});
  const moon=new THREE.Mesh(new THREE.SphereGeometry(3.3,24,16),moonMat);moon.position.set(-52,45,-105);scene.add(moon);

  const localLights=[[-16,5,2,0xff8b35,20,13],[-11,4,-2,0xff9a42,15,11],[10,4,-10,0xff9b48,22,15],[9,2.6,4,0xff8c32,14,10]];
  for(const [x,y,z,color,intensity,distance] of localLights){const light=new THREE.PointLight(color,intensity,distance,2);light.position.set(x,y,z);scene.add(light);}

  progress(.48, '悬挂花灯与点缀建筑');
  const stats = { pavilionLoaded: false, lanternLoaded: false };
  const enhance = async () => {
    try {
      const { createAsset } = await importAsset('pavilion');
      const root = await createAsset(THREE,{states:'lazy',sharedResources:true});
      root.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=true;}});
      const pavilion=normalizeAsset(root,8.2,.65);pavilion.position.set(-3,0,-23);scene.add(pavilion);stats.pavilionLoaded=true;
    } catch { stats.pavilionLoaded = false; }
    progress(.76, '点亮河畔灯影');
    try {
      const { createAsset } = await importAsset('lantern');
      const root = await createAsset(THREE,{states:'lazy',sharedResources:true});
      root.traverse(o=>{if(o.isMesh){o.castShadow=false;const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats){if(m.emissive){m.emissive.set(0x6f1308);m.emissiveIntensity=.5;}}}});
      const positions=[[-18.2,5.7,2,1.75],[-15.7,5.65,2,1.55],[-13.2,5.75,2,1.35],[-12.8,4.7,4.8,1.1],[-9.2,4.8,-4.8,1.05],[15.2,4.8,-11.6,1.1]];
      for(const [x,y,z,h] of positions){const clone=root.clone(true),placement=normalizeAsset(clone,h,0);placement.position.set(x,y-h*.5,z);scene.add(placement);}
      stats.lanternLoaded=true;
    } catch { stats.lanternLoaded = false; }
    if(!stats.lanternLoaded){for(const [x,y,z] of [[-18.2,5.7,2],[-15.7,5.65,2],[-13.2,5.75,2]]){const l=createSimpleLantern(1.1);l.position.set(x,y,z);scene.add(l);}}
    if(!stats.pavilionLoaded){const fallback=createHouse(8,6,5,1);fallback.position.set(-3,.65,-23);scene.add(fallback);}
    renderer.shadowMap.needsUpdate=true;
  };
  const enhanced = enhance();
  if (waitForAssets) await enhanced;

  progress(.92, '整理游览路径');
  renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
  return {
    sample(phase){
      water.material.uniforms.uPhase.value=phase;
      boat.position.y=.05+Math.sin(phase*2)*.045;boat.rotation.z=Math.sin(phase)*.007;
      fishA.rotation.z=Math.sin(phase*2)*.035;fishB.rotation.z=Math.sin(phase*2+.8)*.04;
      for(const f of floaters){f.item.position.y=.17+Math.sin(phase*2+f.offset)*.035;f.item.position.x=f.x+Math.sin(phase+f.offset)*.12;f.item.rotation.y=Math.sin(phase+f.offset)*.08;}
      nature.sample(phase);
    },
    stats,
  };
}
