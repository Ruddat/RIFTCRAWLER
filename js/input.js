// ============================================================
// RIFT CRAWLER – Input System (Keyboard, Mouse, Touch)
// ============================================================

import { state } from './state.js';

const keys = new Set();
let mouseX = 0, mouseY = 0;
let mouseDown = false;
let mouseRightDown = false;

// Consumable actions (fire once per press)
let _pausePressed = false;
let _fullscreenPressed = false;
let _attackPressed = false;
let _dashPressed = false;
let _shootPressed = false;
let _bombPressed = false;
let _specialPressed = false;
let _interactPressed = false;
let _startPressed = false;

// Touch state
let touchJoystick = { active: false, startX: 0, startY: 0, dx: 0, dy: 0 };
let touchButtons = { attack: false, dash: false, bomb: false, shoot: false };

const isMobile = () => window.matchMedia('(hover: none)').matches;

export function initInput() {
  window.addEventListener('keydown', e => {
    keys.add(e.code);
    if (e.code === 'Escape' || e.code === 'KeyP') _pausePressed = true;
    if (e.code === 'KeyF' || e.code === 'F11') _fullscreenPressed = true;
    if (e.code === 'Space') { _attackPressed = true; e.preventDefault(); }
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') _dashPressed = true;
    if (e.code === 'KeyE') _shootPressed = true;
    if (e.code === 'KeyQ') _bombPressed = true;
    if (e.code === 'KeyR') _specialPressed = true;
    if (e.code === 'Enter') { _startPressed = true; _interactPressed = true; }
    state.lastInputMode = 'keyboard';
  });

  window.addEventListener('keyup', e => {
    keys.delete(e.code);
  });

  const canvas = document.getElementById('gameCanvas');
  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    mouseX = (e.clientX - rect.left) * scaleX;
    mouseY = (e.clientY - rect.top) * scaleY;
    state.lastInputMode = 'mouse';
  });

  canvas.addEventListener('mousedown', e => {
    e.preventDefault();
    if (e.button === 0) { mouseDown = true; _attackPressed = true; }
    if (e.button === 2) { mouseRightDown = true; _dashPressed = true; }
    state.lastInputMode = 'mouse';
  });

  canvas.addEventListener('mouseup', e => {
    if (e.button === 0) mouseDown = false;
    if (e.button === 2) mouseRightDown = false;
  });

  canvas.addEventListener('contextmenu', e => e.preventDefault());

  // Touch input
  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    state.lastInputMode = 'touch';
    for (const t of e.changedTouches) {
      const rect = canvas.getBoundingClientRect();
      const tx = (t.clientX - rect.left) / rect.width;
      const ty = (t.clientY - rect.top) / rect.height;
      if (tx < 0.5) {
        touchJoystick.active = true;
        touchJoystick.startX = t.clientX;
        touchJoystick.startY = t.clientY;
        touchJoystick.dx = 0;
        touchJoystick.dy = 0;
        touchJoystick.id = t.identifier;
      } else {
        if (ty < 0.33) _attackPressed = true;
        else if (ty < 0.66) _dashPressed = true;
        else _bombPressed = true;
      }
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier === touchJoystick.id) {
        touchJoystick.dx = t.clientX - touchJoystick.startX;
        touchJoystick.dy = t.clientY - touchJoystick.startY;
      }
    }
  }, { passive: false });

  canvas.addEventListener('touchend', e => {
    for (const t of e.changedTouches) {
      if (t.identifier === touchJoystick.id) {
        touchJoystick.active = false;
        touchJoystick.dx = 0;
        touchJoystick.dy = 0;
      }
    }
  });
}

// --- Query functions ---

export function getMovement() {
  let mx = 0, my = 0;

  // Keyboard
  if (keys.has('KeyW') || keys.has('ArrowUp')) my -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) my += 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) mx -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) mx += 1;

  // Touch joystick
  if (touchJoystick.active) {
    const len = Math.sqrt(touchJoystick.dx ** 2 + touchJoystick.dy ** 2);
    if (len > 10) {
      mx += touchJoystick.dx / len;
      my += touchJoystick.dy / len;
    }
  }

  // Normalize diagonal
  const len = Math.sqrt(mx * mx + my * my);
  if (len > 1) { mx /= len; my /= len; }

  return { x: mx, y: my };
}

export function getMousePos() {
  return { x: mouseX, y: mouseY };
}

export function consumePause() {
  if (_pausePressed) { _pausePressed = false; return true; }
  return false;
}

export function consumeFullscreen() {
  if (_fullscreenPressed) { _fullscreenPressed = false; return true; }
  return false;
}

export function consumeAttack() {
  if (_attackPressed) { _attackPressed = false; return true; }
  return false;
}

export function consumeDash() {
  if (_dashPressed) { _dashPressed = false; return true; }
  return false;
}

export function consumeShoot() {
  if (_shootPressed) { _shootPressed = false; return true; }
  return false;
}

export function consumeBomb() {
  if (_bombPressed) { _bombPressed = false; return true; }
  return false;
}

export function consumeSpecial() {
  if (_specialPressed) { _specialPressed = false; return true; }
  return false;
}

export function consumeInteract() {
  if (_interactPressed) { _interactPressed = false; return true; }
  return false;
}

export function consumeStart() {
  if (_startPressed) { _startPressed = false; return true; }
  return false;
}

export function isKeyDown(code) {
  return keys.has(code);
}

export function getTouchJoystick() {
  return touchJoystick;
}
