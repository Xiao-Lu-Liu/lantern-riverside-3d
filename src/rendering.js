import * as THREE from 'three';

export const PALETTE = {
  skyTop: 0x111b3c, skyHorizon: 0x53628d, fog: 0x334769,
  stone: 0x77776f, stoneLight: 0xa09a88, wood: 0x6f211b,
  woodLight: 0xa4432f, gold: 0xd9a441, roof: 0x253747,
  leaf: 0x294c39, leafLight: 0x4f6742, water: 0x0c2946,
};

export function createSky() {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uTop: { value: new THREE.Color(PALETTE.skyTop) }, uHorizon: { value: new THREE.Color(PALETTE.skyHorizon) }, uFog: { value: new THREE.Color(PALETTE.fog) } },
    vertexShader: `varying vec3 vDir; void main(){vDir=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `
      varying vec3 vDir; uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uFog;
      float hash(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
      void main(){
        float h=clamp(vDir.y*.85+.15,0.,1.);
        vec3 col=mix(uHorizon,uTop,pow(h,.55));
        float dusk=pow(max(0.,1.-abs(vDir.y)*3.),3.);
        col+=vec3(.10,.045,.055)*dusk;
        vec3 cell=floor(vDir*520.);
        float star=step(.9975,hash(cell))*smoothstep(.02,.3,vDir.y);
        col+=vec3(.8,.86,1.)*star*(.45+hash(cell+2.)*.8);
        float cloud=sin(vDir.x*14.+sin(vDir.z*9.))*sin(vDir.z*17.-vDir.x*4.);
        col+=vec3(.08,.09,.13)*smoothstep(.72,.95,cloud)*smoothstep(.05,.35,vDir.y)*.35;
        col=mix(uFog,col,smoothstep(-.08,.06,vDir.y));
        gl_FragColor=vec4(col,1.);
      }`,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(280, 32, 20), material);
}

export function createWater(lightPositions) {
  const lights = Array.from({ length: 12 }, (_, i) => lightPositions[i] ? new THREE.Vector4(...lightPositions[i]) : new THREE.Vector4(0, 0, 0, 0));
  const material = new THREE.ShaderMaterial({
    uniforms: { uPhase: { value: 0 }, uLights: { value: lights }, uFog: { value: new THREE.Color(PALETTE.fog) } },
    vertexShader: `
      uniform float uPhase; varying vec3 vWorld; varying float vWave;
      void main(){
        vec3 p=position;
        float w=sin(p.x*.55+p.z*.8+uPhase*2.)*.035+sin(p.x*1.4-p.z*.45-uPhase*3.)*.018;
        p.y+=w; vWave=w;
        vec4 world=modelMatrix*vec4(p,1.); vWorld=world.xyz;
        gl_Position=projectionMatrix*viewMatrix*world;
      }`,
    fragmentShader: `
      uniform float uPhase; uniform vec4 uLights[12]; uniform vec3 uFog; varying vec3 vWorld; varying float vWave;
      void main(){
        float ripple=sin(vWorld.x*2.1+vWorld.z*3.8+uPhase*3.)*sin(vWorld.z*6.2-uPhase*2.);
        float fine=sin(vWorld.x*8.5-vWorld.z*11.+uPhase*4.);
        vec3 col=mix(vec3(.004,.018,.046),vec3(.012,.060,.115),.48+.10*ripple+.025*fine);
        float viewGlow=pow(clamp(1.-abs(normalize(cameraPosition-vWorld).y),0.,1.),2.);
        col+=vec3(.018,.035,.065)*viewGlow;
        vec3 reflection=vec3(0.);
        for(int i=0;i<12;i++){
          vec4 L=uLights[i];
          float column=exp(-abs(vWorld.x-L.x)*1.05);
          float reach=exp(-abs(vWorld.z-L.y)*.115);
          float broken=pow(.5+.5*sin(vWorld.z*8.5+sin(vWorld.x*5.)+uPhase*3.),3.);
          float glow=column*reach*(.12+.88*broken)*L.z;
          vec3 tint=mix(vec3(1.,.40,.10),vec3(1.,.12,.19),clamp(L.w,0.,1.));
          reflection+=tint*glow*.8;
        }
        col+=reflection+vec3(.06,.11,.16)*max(vWave,0.)*2.;
        float dist=length(cameraPosition-vWorld);
        float fog=smoothstep(65.,155.,dist);
        col=mix(col,uFog,fog);
        gl_FragColor=vec4(col,1.);
      }`,
  });
  const geometry = new THREE.PlaneGeometry(120, 22, 150, 36).rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = 0.02;
  mesh.receiveShadow = false;
  return mesh;
}

const quadVertex = `varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;

function shaderPass(fragmentShader, uniforms) {
  return new THREE.ShaderMaterial({ uniforms, vertexShader: quadVertex, fragmentShader, depthTest: false, depthWrite: false, toneMapped: false });
}

export class LanternPost {
  constructor(renderer) {
    this.renderer = renderer;
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
    this.scene.add(this.quad);
    const options = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false };
    this.target = new THREE.WebGLRenderTarget(1, 1, { ...options, depthBuffer: true, samples: 2 });
    this.bright = new THREE.WebGLRenderTarget(1, 1, options);
    this.blurA = new THREE.WebGLRenderTarget(1, 1, options);
    this.blurB = new THREE.WebGLRenderTarget(1, 1, options);
    this.prefilter = shaderPass(`
      varying vec2 vUv; uniform sampler2D tInput;
      vec3 clean(vec3 c){c=max(c,vec3(0.));if(!(c.r<64.))c.r=0.;if(!(c.g<64.))c.g=0.;if(!(c.b<64.))c.b=0.;return c;}
      void main(){vec3 c=clean(texture2D(tInput,vUv).rgb);float b=max(c.r,max(c.g,c.b));float knee=.55;float soft=clamp(b-.75+knee,0.,2.*knee);soft=soft*soft/(4.*knee+.0001);float contribution=max(soft,b-.75)/max(b,.0001);gl_FragColor=vec4(c*contribution,1.);}`,
      { tInput: { value: this.target.texture } });
    this.blur = shaderPass(`
      varying vec2 vUv; uniform sampler2D tInput; uniform vec2 uDirection;
      void main(){vec3 c=texture2D(tInput,vUv).rgb*.227027;c+=texture2D(tInput,vUv+uDirection*1.384615).rgb*.316216;c+=texture2D(tInput,vUv-uDirection*1.384615).rgb*.316216;c+=texture2D(tInput,vUv+uDirection*3.230769).rgb*.070270;c+=texture2D(tInput,vUv-uDirection*3.230769).rgb*.070270;gl_FragColor=vec4(c,1.);}`,
      { tInput: { value: null }, uDirection: { value: new THREE.Vector2() } });
    this.composite = shaderPass(`
      varying vec2 vUv; uniform sampler2D tScene; uniform sampler2D tBloom; uniform float uBloom;
      vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
      float hash(vec2 p){return fract(52.9829189*fract(dot(p,vec2(.06711056,.00583715))));}
      void main(){
        vec3 base=texture2D(tScene,vUv).rgb;vec3 bloom=texture2D(tBloom,vUv).rgb;
        vec3 c=base+bloom*uBloom;
        float l=dot(c,vec3(.2126,.7152,.0722));
        c+=vec3(-.012,.006,.025)*(1.-smoothstep(.05,.7,l));
        c+=vec3(.035,.012,-.012)*smoothstep(.45,2.,l);
        c=aces(c*1.08);c=pow(c,vec3(1./2.2));
        float vignette=smoothstep(.92,.24,length(vUv-.5));c*=.88+.12*vignette;
        c+=(hash(gl_FragCoord.xy)-.5)/255.;
        gl_FragColor=vec4(c,1.);
      }`,
      { tScene: { value: this.target.texture }, tBloom: { value: this.blurB.texture }, uBloom: { value: .32 } });
  }
  setSize(width, height, ratio) {
    const w = Math.max(1, Math.floor(width * ratio)), h = Math.max(1, Math.floor(height * ratio));
    this.target.setSize(w, h);
    this.bright.setSize(Math.ceil(w / 4), Math.ceil(h / 4));
    this.blurA.setSize(Math.ceil(w / 4), Math.ceil(h / 4));
    this.blurB.setSize(Math.ceil(w / 4), Math.ceil(h / 4));
  }
  render(scene, camera) {
    const r = this.renderer;
    r.setRenderTarget(this.target); r.render(scene, camera);
    this.quad.material = this.prefilter; r.setRenderTarget(this.bright); r.render(this.scene, this.camera);
    this.quad.material = this.blur;
    this.blur.uniforms.tInput.value = this.bright.texture;
    this.blur.uniforms.uDirection.value.set(1 / this.bright.width, 0);
    r.setRenderTarget(this.blurA); r.render(this.scene, this.camera);
    this.blur.uniforms.tInput.value = this.blurA.texture;
    this.blur.uniforms.uDirection.value.set(0, 1 / this.bright.height);
    r.setRenderTarget(this.blurB); r.render(this.scene, this.camera);
    this.quad.material = this.composite; r.setRenderTarget(null); r.render(this.scene, this.camera);
  }
}
