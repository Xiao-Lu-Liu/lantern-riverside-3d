import * as THREE from 'three';
import { createIcons, Orbit, Footprints, Route, Image as ImageIcon, Camera as CameraIcon, Maximize2, Info, X } from 'lucide';
import { LanternPost } from './rendering.js';
import { buildWorld } from './world.js';
import { ExperienceControls, VIEWS } from './controls.js';

createIcons({ icons: { Orbit, Footprints, Route, Image: ImageIcon, Camera: CameraIcon, Maximize2, Info, X } });

const container = document.getElementById('scene-container');
const loading = document.getElementById('loading');
const loadingBar = document.getElementById('loading-bar');
const loadingTitle = document.getElementById('loading-title');
const placeLabel = document.getElementById('place-label');
const hint = document.getElementById('control-hint');
const perf = document.getElementById('perf');
const tourBar = document.getElementById('tour-bar');
let toastTimer;
function toast(message) {
  const el = document.getElementById('toast'); el.textContent = message; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
}
function progress(value, text) { loadingBar.style.width = `${Math.round(value * 100)}%`; loadingTitle.textContent = text; }

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
} catch {
  loadingTitle.textContent = '当前设备无法开启3D，已保留原画预览';
  loadingBar.style.width = '100%';
  document.querySelectorAll('.mode-switch button,.view-btn,#start-tour,#start-walk').forEach(b => { b.disabled = true; });
  throw new Error('WebGL unavailable');
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NoToneMapping;
renderer.info.autoReset = false;
renderer.domElement.setAttribute('aria-label', '灯会河畔3D画面，拖拽环视');
renderer.domElement.tabIndex = 0;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, .08, 500);
const post = new LanternPost(renderer);
post.setSize(innerWidth, innerHeight, renderer.getPixelRatio());

let currentView = 'river';
const controls = new ExperienceControls(camera, renderer.domElement, (name) => {
  currentView = name;
  document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === name));
  document.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('active', b.dataset.mode === (name === 'river' ? 'overview' : name === 'tour' ? 'tour' : 'walk')));
  if (VIEWS[name]) placeLabel.textContent = VIEWS[name].label;
  if (name === 'tour') { placeLabel.textContent = '沿灯寻景 · 自动导览'; hint.textContent = '点击「导览」暂停或继续 · 随时切换自由漫游'; }
  else if (name === 'walk' || name !== 'river') hint.textContent = 'WASD 移动 · 按住左键环视 · L 锁定鼠标 · Esc 释放';
  else hint.textContent = '拖拽环视 · 滚轮靠近 · 点击左侧切换观景点';
}, (state) => {
  if (state === 'locked') { hint.textContent = '鼠标已锁定 · 移动鼠标环视 · Esc 恢复光标'; toast('按 Esc 可恢复鼠标光标'); }
  else if (controls.mode === 'walk') hint.textContent = 'WASD 移动 · 按住左键环视 · L 锁定鼠标 · Esc 释放';
  if (state === 'free') toast('鼠标光标已恢复');
  if (state === 'unavailable') toast('当前预览不支持锁定鼠标，请按住左键拖动环视');
});

document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => {
  const mode = button.dataset.mode;
  if (mode === 'overview') controls.goToView('river');
  else if (mode === 'walk') { if (controls.mode !== 'walk') controls.goToView('bridge'); }
  else {
    const result = controls.setMode('tour');
    if (result === 'paused') toast('导览已暂停'); else if (result === 'resumed') toast('继续沿灯寻景');
  }
}));
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => controls.goToView(button.dataset.view)));
document.getElementById('start-tour').addEventListener('click', () => controls.setMode('tour', true));
document.getElementById('start-walk').addEventListener('click', () => controls.goToView('bridge'));

let previousFocus;
function openPanel(id) {
  const panel = document.getElementById(id);
  if (!panel.hidden) { closePanel(id); return; }
  document.querySelectorAll('.panel').forEach(p => { p.hidden = true; });
  previousFocus = document.activeElement; panel.hidden = false; panel.querySelector('button')?.focus();
}
function closePanel(id) { document.getElementById(id).hidden = true; previousFocus?.focus?.(); }
document.getElementById('help-btn').addEventListener('click', () => openPanel('help-panel'));
document.getElementById('reference-btn').addEventListener('click', () => openPanel('reference-panel'));
document.getElementById('game-btn').addEventListener('click', () => openPanel('game-panel'));
document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => closePanel(b.dataset.close)));

async function toggleFullscreen() {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
  catch { toast('当前浏览器未允许全屏'); }
}
document.getElementById('fullscreen-btn').addEventListener('click', toggleFullscreen);
document.getElementById('capture-btn').addEventListener('click', () => {
  renderer.info.reset(); post.render(scene, camera);
  renderer.domElement.toBlob(blob => {
    if (!blob) { toast('留影未成功，请再试一次'); return; }
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.download = `灯会河畔-${currentView}.png`; link.href = url; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); toast('已保存此刻灯影');
  }, 'image/png');
});
addEventListener('keydown', (event) => {
  if (event.code === 'Escape') document.querySelectorAll('.panel').forEach(p => { if (!p.hidden) closePanel(p.id); });
  if (/INPUT|TEXTAREA/.test(event.target.tagName)) return;
  const viewKeys = { Digit1: 'river', Digit2: 'bridge', Digit3: 'stage', Digit4: 'boat' };
  if (viewKeys[event.code]) controls.goToView(viewKeys[event.code]);
  if (event.code === 'KeyF') toggleFullscreen();
  if (event.code === 'KeyH') openPanel('help-panel');
});

const joystick = document.getElementById('joystick'), stick = document.getElementById('stick');
let joystickPointer = null;
function moveStick(event) {
  const rect = joystick.getBoundingClientRect(), dx = event.clientX - (rect.left + rect.width / 2), dy = event.clientY - (rect.top + rect.height / 2);
  const length = Math.hypot(dx, dy), scale = length > 35 ? 35 / length : 1, x = dx * scale, y = dy * scale;
  stick.style.transform = `translate(${x}px,${y}px)`; controls.joystick.set(x / 35, y / 35);
}
joystick.addEventListener('pointerdown', event => { joystickPointer = event.pointerId; joystick.setPointerCapture(event.pointerId); moveStick(event); });
joystick.addEventListener('pointermove', event => { if (event.pointerId === joystickPointer) moveStick(event); });
function resetStick(event) { if (event.pointerId !== joystickPointer) return; joystickPointer = null; stick.style.transform = ''; controls.joystick.set(0, 0); }
joystick.addEventListener('pointerup', resetStick); joystick.addEventListener('pointercancel', resetStick);

progress(.06, '正在点亮河畔灯火');
const captureMode = new URLSearchParams(location.search).has('t') || new URLSearchParams(location.search).has('capture');
const freezeFrame = new URLSearchParams(location.search).has('t');
const world = await buildWorld(scene, renderer, progress, freezeFrame);
const DURATION = 48;
let simT = 0, paused = captureMode, acc = 0, frames = 0, fpsTime = 0, fps = 60, frameEMA = 16;
const clock = new THREE.Clock();
function sample(t) {
  const wrapped = ((t % DURATION) + DURATION) % DURATION;
  world.sample(wrapped / DURATION * Math.PI * 2);
}
function draw() {
  renderer.info.reset(); post.render(scene, camera);
}
function resize() {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); post.setSize(innerWidth, innerHeight, renderer.getPixelRatio());
  if (paused) draw();
}
addEventListener('resize', resize);

sample(0); controls.update(0); draw();
progress(1, '灯火已就绪');
document.getElementById('poster').classList.add('ready');
loading.classList.add('done');
setTimeout(() => { loading.hidden = true; }, 400);
window.__SCENE_READY__ = true;
window.__ASSET_STATUS__ = world.stats;

let lastRenderedAt = -Infinity;
function animationFrame(timestamp) {
  if (timestamp - lastRenderedAt < 1000 / 60 - 1) return;
  lastRenderedAt = timestamp;
  const elapsed = clock.getDelta();
  const dt = Math.min(elapsed, .05);
  if (!paused) {
    acc += dt;
    while (acc >= 1 / 60) { acc -= 1 / 60; simT += 1 / 60; sample(simT); }
    const tourProgress = controls.update(dt);
    if (tourProgress !== null && controls.mode === 'tour') {
      tourBar.style.transform = `scaleX(${tourProgress})`;
      const index = Math.floor(tourProgress * 4);
      placeLabel.textContent = ['河畔初见 · 灯影入水','乌篷船头 · 随风听桨','石拱桥上 · 鱼灯引路','临河戏台 · 花木入画'][Math.min(index,3)];
    }
  }
  draw();
  frameEMA = frameEMA * .96 + elapsed * 1000 * .04; frames++; fpsTime += elapsed;
  if (fpsTime > .75) { fps = Math.round(frames / fpsTime); frames = 0; fpsTime = 0; perf.textContent = `${fps} fps · ${renderer.info.render.calls} calls · ${Math.round(renderer.info.render.triangles / 1000)}k tris`; }
  if (frameEMA > 29 && renderer.getPixelRatio() > 1.01 && simT > 5) {
    renderer.setPixelRatio(1); post.setSize(innerWidth, innerHeight, 1); frameEMA = 16;
  }
}
if (!captureMode) renderer.setAnimationLoop(animationFrame);

window.__seek = (t) => {
  const value = Number(t); paused = true; acc = 0; simT = Number.isFinite(value) && value > 0 ? value : 0;
  sample(simT); controls.seek(simT); document.body.classList.add('seeking'); draw();
};
window.__play = () => { paused = false; document.body.classList.remove('seeking'); clock.getDelta(); if (captureMode) renderer.setAnimationLoop(animationFrame); };
window.__capture = () => { draw(); return renderer.domElement.toDataURL('image/png'); };
const timeParam = new URLSearchParams(location.search).get('t');
if (timeParam !== null) window.__seek(timeParam);
