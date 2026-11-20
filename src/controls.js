import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { bridgeDeck } from './architecture.js';

export const VIEWS = {
  river: { position: [25, 11.5, 28], target: [0, 3.5, -4], label: '河畔全景 · 蓝调时刻' },
  bridge: { position: [-11, 4.4, 6.3], target: [3, 3.2, -10], label: '石拱桥头 · 鱼灯映水' },
  stage: { position: [6.8, 3.05, -9.2], target: [10.5, 4, -14.5], label: '临河戏台 · 花木入画' },
  boat: { position: [5.8, 2.65, 6.9], target: [11, 2.3, -.5], label: '乌篷船头 · 灯影随行' },
};

function groundHeight(x, z) {
  if (Math.abs(x + 11) < 2.35 && Math.abs(z) < 8.8) return bridgeDeck(-z) + .1;
  if (x > 4 && x < 14.8 && z > 1.8 && z < 7.4) return .96;
  if (x > -21.2 && x < -10.8 && z > 7.2 && z < 13.7) return .91;
  if (x > 4.2 && x < 16.8 && z > -18.4 && z < -10.6) return 1.28;
  return .65;
}

function walkable(x, z) {
  if (x < -34 || x > 34 || z < -32 || z > 28) return false;
  if (Math.abs(x + 11) < 2.35 && Math.abs(z) < 8.9) return true;
  if (x > 4 && x < 14.8 && z > 1.8 && z < 7.4) return true;
  return z >= 8 || z <= -8;
}

export class ExperienceControls {
  constructor(camera, domElement, onViewChange, onPointerState = () => {}) {
    this.camera = camera; this.dom = domElement; this.onViewChange = onViewChange; this.onPointerState = onPointerState;
    this.mode = 'overview'; this.keys = new Set(); this.yaw = 0; this.pitch = 0;
    this.joystick = new THREE.Vector2(); this.tourTime = 0; this.tourPaused = false;
    this.dragging = false; this.dragDistance = 0; this.lastPointer = new THREE.Vector2();
    this.forward = new THREE.Vector3(); this.right = new THREE.Vector3(); this.move = new THREE.Vector3();
    this.orbit = new OrbitControls(camera, domElement);
    this.orbit.enableDamping = true; this.orbit.dampingFactor = .065;
    this.orbit.minDistance = 8; this.orbit.maxDistance = 72;
    this.orbit.maxPolarAngle = Math.PI * .47; this.orbit.minPolarAngle = Math.PI * .12;
    this.orbit.target.set(...VIEWS.river.target);
    this.tourPosition = new THREE.CatmullRomCurve3([
      new THREE.Vector3(25, 10, 27), new THREE.Vector3(14, 3.4, 11),
      new THREE.Vector3(5.8, 2.7, 6.9), new THREE.Vector3(-3, 4.4, 6),
      new THREE.Vector3(-11, 5.1, 4), new THREE.Vector3(-11, 5.2, -3.8),
      new THREE.Vector3(-3, 3.2, -9.4), new THREE.Vector3(8, 3, -9.2),
      new THREE.Vector3(18, 5.5, 3),
    ], true, 'catmullrom', .35);
    this.tourTarget = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 3, -4), new THREE.Vector3(8, 2.5, 1),
      new THREE.Vector3(10, 2.4, -5), new THREE.Vector3(-11, 3.2, -2),
      new THREE.Vector3(-11, 3.5, -8), new THREE.Vector3(4, 3.5, -14),
      new THREE.Vector3(10.5, 4, -14.5), new THREE.Vector3(10.5, 4, -14.5),
      new THREE.Vector3(0, 3, -4),
    ], true, 'catmullrom', .35);
    this.bind(); this.goToView('river', true);
  }
  bind() {
    addEventListener('keydown', (event) => {
      if (/INPUT|TEXTAREA/.test(event.target.tagName)) return;
      this.keys.add(event.code);
      if (this.mode === 'walk' && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(event.code)) event.preventDefault();
      if (event.code === 'KeyL' && !event.repeat && this.mode === 'walk') {
        if (document.pointerLockElement === this.dom) this.releasePointer();
        else this.lockPointer();
      }
    });
    addEventListener('keyup', (event) => this.keys.delete(event.code));
    addEventListener('blur', () => this.resetInput());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.resetInput(); });
    document.addEventListener('pointerlockchange', () => {
      this.resetDrag();
      this.keys.clear();
      this.onPointerState(document.pointerLockElement === this.dom ? 'locked' : 'free');
    });
    document.addEventListener('pointerlockerror', () => this.onPointerState('unavailable'));
    this.dom.addEventListener('pointerdown', (event) => {
      if (this.mode !== 'walk' || event.button !== 0 || document.pointerLockElement === this.dom) return;
      this.dragging = true; this.dragDistance = 0; this.lastPointer.set(event.clientX, event.clientY);
      this.activePointer = event.pointerId;
      this.dom.classList.add('dragging');
      this.dom.setPointerCapture(event.pointerId);
    });
    this.dom.addEventListener('pointermove', (event) => {
      if (this.mode !== 'walk' || !this.dragging || event.pointerId !== this.activePointer || document.pointerLockElement) return;
      const dx = event.clientX - this.lastPointer.x, dy = event.clientY - this.lastPointer.y;
      this.dragDistance += Math.abs(dx) + Math.abs(dy); this.lastPointer.set(event.clientX, event.clientY);
      this.look(dx, dy);
    });
    const endDrag = event => { if (event.pointerId === this.activePointer) this.resetDrag(); };
    this.dom.addEventListener('pointerup', endDrag);
    this.dom.addEventListener('pointercancel', endDrag);
    this.dom.addEventListener('lostpointercapture', endDrag);
    document.addEventListener('mousemove', (event) => {
      if (document.pointerLockElement === this.dom && this.mode === 'walk') this.look(event.movementX, event.movementY);
    });
  }
  resetDrag() {
    const pointer = this.activePointer;
    this.activePointer = null; this.dragging = false;
    this.dom.classList.remove('dragging');
    if (pointer !== null && pointer !== undefined && this.dom.hasPointerCapture(pointer)) this.dom.releasePointerCapture(pointer);
  }
  resetInput() { this.resetDrag(); this.keys.clear(); this.joystick.set(0, 0); }
  releasePointer() {
    this.resetInput();
    if (document.pointerLockElement === this.dom) document.exitPointerLock?.();
  }
  async lockPointer() {
    if (this.mode !== 'walk') return;
    try {
      if (!this.dom.requestPointerLock) { this.onPointerState('unavailable'); return; }
      await this.dom.requestPointerLock();
      if (this.mode !== 'walk') this.releasePointer();
    } catch { this.onPointerState('unavailable'); }
  }
  look(dx, dy) {
    this.yaw -= dx * .0024; this.pitch -= dy * .0022;
    this.pitch = THREE.MathUtils.clamp(this.pitch, -1.15, 1.15);
  }
  syncAngles() {
    const direction = this.camera.getWorldDirection(new THREE.Vector3());
    this.yaw = Math.atan2(-direction.x, -direction.z); this.pitch = Math.asin(direction.y);
    this.camera.rotation.order = 'YXZ';
  }
  hideIntro() {
    const intro = document.getElementById('intro');
    intro.classList.add('hidden'); intro.inert = true;
  }
  setMode(mode, force = false) {
    if (mode === 'tour' && this.mode === 'tour' && !force) { this.tourPaused = !this.tourPaused; return this.tourPaused ? 'paused' : 'resumed'; }
    this.releasePointer();
    this.mode = mode; this.orbit.enabled = mode === 'overview'; this.hideIntro();
    document.body.classList.toggle('walk-on', mode === 'walk'); document.body.classList.toggle('tour-on', mode === 'tour');
    if (document.pointerLockElement && mode !== 'walk') document.exitPointerLock?.();
    if (mode === 'walk') { this.syncAngles(); this.onViewChange('walk'); }
    if (mode === 'tour') { this.tourTime = 0; this.tourPaused = false; this.updateTour(0); this.onViewChange('tour'); }
    return mode;
  }
  goToView(name, initial = false) {
    const view = VIEWS[name]; if (!view) return;
    this.releasePointer();
    this.camera.position.set(...view.position); this.camera.lookAt(new THREE.Vector3(...view.target));
    if (name === 'river') {
      this.mode = 'overview'; this.orbit.enabled = true; this.orbit.target.set(...view.target); this.orbit.update();
      document.body.classList.remove('walk-on','tour-on');
    } else {
      this.mode = 'walk'; this.orbit.enabled = false; this.syncAngles();
      document.body.classList.add('walk-on'); document.body.classList.remove('tour-on');
    }
    if (!initial) this.hideIntro(); this.onViewChange(name);
  }
  updateTour(dt) {
    this.tourTime += dt;
    const t = (this.tourTime % 48) / 48;
    this.camera.position.copy(this.tourPosition.getPointAt(t));
    this.camera.lookAt(this.tourTarget.getPointAt(t));
    return t;
  }
  update(dt) {
    if (this.mode === 'overview') { this.orbit.update(); return null; }
    if (this.mode === 'tour') return this.updateTour(this.tourPaused ? 0 : dt);
    const f = (this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0) - (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0) - this.joystick.y;
    const s = (this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0) + this.joystick.x;
    if (this.keys.has('ArrowLeft')) this.yaw += dt * 1.35;
    if (this.keys.has('ArrowRight')) this.yaw -= dt * 1.35;
    const speed = this.keys.has('ShiftLeft') ? 7 : 4.1;
    this.forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    this.right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    this.move.copy(this.forward).multiplyScalar(f).addScaledVector(this.right, s);
    if (this.move.lengthSq() > 1) this.move.normalize();
    this.move.multiplyScalar(speed * dt);
    const nextX = this.camera.position.x + this.move.x, nextZ = this.camera.position.z + this.move.z;
    if (walkable(nextX, this.camera.position.z)) this.camera.position.x = nextX;
    if (walkable(this.camera.position.x, nextZ)) this.camera.position.z = nextZ;
    const targetY = groundHeight(this.camera.position.x, this.camera.position.z) + 1.65;
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, targetY, 12, dt);
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
    return null;
  }
  seek(t) { if (this.mode === 'tour') { this.tourTime = t; this.updateTour(0); } }
}
