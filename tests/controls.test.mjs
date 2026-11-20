import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { ExperienceControls } from '../src/controls.js';

function classes() {
  const values = new Set();
  return {
    add: (...names) => names.forEach(name => values.add(name)),
    remove: (...names) => names.forEach(name => values.delete(name)),
    toggle(name, force = !values.has(name)) { if (force) values.add(name); else values.delete(name); },
    contains: name => values.has(name),
  };
}

function setup() {
  const events = new EventTarget();
  const doc = new EventTarget();
  const intro = { classList: classes(), inert: false };
  doc.body = { classList: classes() };
  doc.getElementById = () => intro;
  doc.pointerLockElement = null;
  doc.exits = 0;
  doc.exitPointerLock = () => { doc.exits++; doc.pointerLockElement = null; };
  globalThis.document = doc;
  globalThis.addEventListener = events.addEventListener.bind(events);
  const dom = new EventTarget();
  dom.style = {};
  dom.classList = classes();
  dom.clientWidth = 1280; dom.clientHeight = 720;
  dom.getRootNode = () => doc;
  const captured = new Set();
  dom.setPointerCapture = id => captured.add(id);
  dom.hasPointerCapture = id => captured.has(id);
  dom.releasePointerCapture = id => captured.delete(id);
  dom.lockRequests = 0;
  dom.requestPointerLock = () => { dom.lockRequests++; };
  const pointerStates = [];
  const controls = new ExperienceControls(new THREE.PerspectiveCamera(48, 16 / 9, .08, 500), dom, () => {}, state => pointerStates.push(state));
  function emit(target, type, values = {}) {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, values);
    target.dispatchEvent(event);
  }
  function down() { emit(dom, 'pointerdown', { button: 0, pointerId: 1, clientX: 600, clientY: 350 }); }
  return { controls, dom, doc, events, intro, pointerStates, emit, down };
}

test('a click in walk mode keeps the mouse cursor available', () => {
  const s = setup(); s.controls.goToView('bridge');
  s.down(); s.emit(s.dom, 'pointerup', { pointerId: 1 });
  assert.equal(s.dom.lockRequests, 0);
  assert.equal(s.controls.dragging, false);
  assert.equal(s.dom.hasPointerCapture(1), false);
});

test('returning to the panorama releases an existing pointer lock', () => {
  const s = setup(); s.controls.goToView('bridge');
  s.doc.pointerLockElement = s.dom;
  s.controls.goToView('river');
  assert.equal(s.doc.exits, 1);
  assert.equal(s.doc.pointerLockElement, null);
  assert.equal(s.controls.orbit.enabled, true);
});

for (const type of ['pointercancel', 'lostpointercapture']) {
  test(`${type} stops looking around until the next deliberate drag`, () => {
    const s = setup(); s.controls.goToView('bridge'); s.down();
    s.emit(s.dom, type, { pointerId: 1 });
    const yaw = s.controls.yaw;
    s.emit(s.dom, 'pointermove', { pointerId: 1, clientX: 700, clientY: 350 });
    assert.equal(s.controls.dragging, false);
    assert.equal(s.controls.yaw, yaw);
    assert.equal(s.dom.hasPointerCapture(1), false);
  });
}

test('losing window focus clears movement and dragging', () => {
  const s = setup(); s.controls.goToView('bridge'); s.down();
  s.controls.keys.add('KeyW'); s.controls.joystick.set(1, 1);
  s.emit(s.events, 'blur');
  assert.equal(s.controls.keys.size, 0);
  assert.equal(s.controls.dragging, false);
  assert.equal(s.controls.joystick.lengthSq(), 0);
});

test('hidden welcome buttons are removed from keyboard interaction', () => {
  const s = setup(); s.controls.goToView('bridge');
  assert.equal(s.intro.inert, true);
  assert.equal(s.intro.classList.contains('hidden'), true);
});

test('a browser that rejects pointer lock leaves drag controls available', async () => {
  const s = setup(); s.controls.goToView('bridge');
  s.dom.requestPointerLock = async () => { throw new Error('Pointer lock blocked'); };
  await s.controls.lockPointer();
  assert.deepEqual(s.pointerStates, ['unavailable']);
  s.down();
  const yaw = s.controls.yaw;
  s.emit(s.dom, 'pointermove', { pointerId: 1, clientX: 700, clientY: 350 });
  assert.notEqual(s.controls.yaw, yaw);
  assert.equal(s.controls.mode, 'walk');
});
