// ============================================================
// RIFT CRAWLER – Camera System
// ============================================================

import { CANVAS_WIDTH, CANVAS_HEIGHT, ROOM_OFFSET_X, ROOM_OFFSET_Y, CAMERA_LERP, TRANSITION_TIME } from './config.js';
import { state } from './state.js';
import { lerp } from './utils.js';

/**
 * Update camera position – follows player within room bounds.
 * During transitions, slides smoothly to the new room.
 */
export function updateCamera(dt) {
  const cam = state.camera;

  if (state.transitioning) {
    // Smooth slide to new room center
    state.transitionTimer += dt;
    const t = Math.min(state.transitionTimer / TRANSITION_TIME, 1);
    const eased = 1 - Math.pow(1 - t, 3); // ease out cubic

    const targetX = -state.transitionOffset.x;
    const targetY = -state.transitionOffset.y;
    cam.x = lerp(cam.x, targetX, eased * 0.3);
    cam.y = lerp(cam.y, targetY, eased * 0.3);

    if (t >= 1) {
      state.transitioning = false;
      cam.x = -state.transitionOffset.x;
      cam.y = -state.transitionOffset.y;
    }
  } else {
    // Camera offset: center the room on screen
    cam.x = -state.transitionOffset.x;
    cam.y = -state.transitionOffset.y;
  }

  // Screen shake decay
  if (cam.shake > 0) {
    cam.shake *= Math.pow(0.05, dt);
    if (cam.shake < 0.5) cam.shake = 0;
    cam.shakeX = (Math.random() - 0.5) * cam.shake * 2;
    cam.shakeY = (Math.random() - 0.5) * cam.shake * 2;
  } else {
    cam.shakeX = 0;
    cam.shakeY = 0;
  }
}

/** Apply camera transform to canvas context */
export function applyCamera(ctx) {
  ctx.translate(
    ROOM_OFFSET_X + state.camera.shakeX + state.camera.x,
    ROOM_OFFSET_Y + state.camera.shakeY + state.camera.y
  );
}

/** Trigger screen shake */
export function shakeCamera(intensity) {
  state.camera.shake = Math.max(state.camera.shake, intensity);
}

/**
 * Start a room transition in the given direction.
 * Calculates the offset so the camera slides to the new room position.
 */
export function startTransition(dir) {
  // The transition offset is always 0 for same-room view
  // (rooms are rendered at ROOM_OFFSET, so no scrolling needed)
  state.transitioning = true;
  state.transitionDir = dir;
  state.transitionTimer = 0;
  state.transitionOffset = { x: 0, y: 0 };
}
