// ============================================================
// RIFT CRAWLER – Integrated Weather Atmosphere
// ============================================================
// This module is drawn from main.js inside the normal room render stack:
// room background -> weather -> entities -> vignette -> HUD.

import { ROOM_WIDTH, ROOM_HEIGHT } from './config.js';
import { state } from './state.js';
import { getCurrentRoom } from './room.js';

const MAX_RAIN_DROPS = 90;
const MAX_CLOUDS = 7;

const PRESETS = {
  crypt: {
    key: 'crypt',
    clouds: 0.34,
    rain: 0.10,
    fog: 0.12,
    lightning: 0.025,
    tint: 'rgba(20, 65, 110, 0.055)',
    rainColor: 'rgba(120, 210, 255, 0.24)',
    cloudColor: 'rgba(45, 70, 110, 0.13)',
    fogColor: 'rgba(120, 180, 255, 0.055)',
  },
  abyss: {
    key: 'abyss',
    clouds: 0.48,
    rain: 0.05,
    fog: 0.18,
    lightning: 0.04,
    tint: 'rgba(70, 35, 120, 0.06)',
    rainColor: 'rgba(190, 120, 255, 0.18)',
    cloudColor: 'rgba(80, 45, 120, 0.14)',
    fogColor: 'rgba(170, 120, 255, 0.06)',
  },
  poison: {
    key: 'poison',
    clouds: 0.28,
    rain: 0.03,
    fog: 0.22,
    lightning: 0.01,
    tint: 'rgba(45, 110, 70, 0.055)',
    rainColor: 'rgba(120, 255, 160, 0.14)',
    cloudColor: 'rgba(45, 95, 70, 0.12)',
    fogColor: 'rgba(120, 255, 160, 0.055)',
  },
  inferno: {
    key: 'inferno',
    clouds: 0.42,
    rain: 0.00,
    fog: 0.10,
    lightning: 0.035,
    tint: 'rgba(160, 65, 25, 0.055)',
    rainColor: 'rgba(255, 120, 60, 0.12)',
    cloudColor: 'rgba(135, 55, 35, 0.13)',
    fogColor: 'rgba(255, 130, 70, 0.045)',
  },
  nexus: {
    key: 'nexus',
    clouds: 0.58,
    rain: 0.16,
    fog: 0.18,
    lightning: 0.08,
    tint: 'rgba(155, 30, 80, 0.06)',
    rainColor: 'rgba(255, 90, 140, 0.24)',
    cloudColor: 'rgba(100, 35, 80, 0.15)',
    fogColor: 'rgba(255, 100, 170, 0.055)',
  },
  bossStorm: {
    key: 'bossStorm',
    clouds: 0.86,
    rain: 0.34,
    fog: 0.24,
    lightning: 0.14,
    tint: 'rgba(255, 55, 85, 0.075)',
    rainColor: 'rgba(170, 230, 255, 0.34)',
    cloudColor: 'rgba(75, 45, 75, 0.18)',
    fogColor: 'rgba(255, 110, 150, 0.065)',
  },
};

const weather = {
  presetKey: null,
  clouds: [],
  rain: [],
  lightningTimer: 4,
  lightningFlash: 0,
  lightningBolt: null,
  thunderCooldown: 0,
  time: 0,
};

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function getPreset() {
  const room = getCurrentRoom();
  if (room?.type === 'boss') return PRESETS.bossStorm;

  const floor = Math.max(1, room?.floor || state.floor || 1);
  const order = [PRESETS.crypt, PRESETS.abyss, PRESETS.poison, PRESETS.inferno, PRESETS.nexus];
  return order[(floor - 1) % order.length];
}

function ensurePreset(preset) {
  if (weather.presetKey === preset.key) return;

  weather.presetKey = preset.key;
  weather.clouds = [];
  weather.rain = [];
  weather.lightningFlash = 0;
  weather.lightningBolt = null;
  weather.lightningTimer = rand(5, 11) / Math.max(0.05, preset.lightning || 0.01);

  const cloudCount = Math.ceil(MAX_CLOUDS * preset.clouds);
  for (let i = 0; i < cloudCount; i++) weather.clouds.push(createCloud(true));

  const rainCount = Math.ceil(MAX_RAIN_DROPS * preset.rain);
  for (let i = 0; i < rainCount; i++) weather.rain.push(createRainDrop(true));
}

function createCloud(randomizeX = false) {
  return {
    x: randomizeX ? rand(-160, ROOM_WIDTH + 160) : ROOM_WIDTH + rand(20, 180),
    y: rand(22, ROOM_HEIGHT * 0.38),
    w: rand(150, 330),
    h: rand(38, 88),
    speed: rand(6, 18),
    alpha: rand(0.14, 0.34),
    phase: rand(0, Math.PI * 2),
  };
}

function createRainDrop(randomizeY = false) {
  return {
    x: rand(-80, ROOM_WIDTH + 80),
    y: randomizeY ? rand(-80, ROOM_HEIGHT + 80) : rand(-120, -20),
    len: rand(9, 22),
    speed: rand(300, 520),
    drift: rand(-64, -28),
    alpha: rand(0.12, 0.42),
  };
}

export function updateWeatherAtmosphere(dt) {
  const preset = getPreset();
  ensurePreset(preset);

  weather.time += dt;

  const wantedClouds = Math.ceil(MAX_CLOUDS * preset.clouds);
  while (weather.clouds.length < wantedClouds) weather.clouds.push(createCloud());
  while (weather.clouds.length > wantedClouds) weather.clouds.pop();

  for (const cloud of weather.clouds) {
    cloud.x -= cloud.speed * dt;
    cloud.y += Math.sin(weather.time * 0.4 + cloud.phase) * 0.035;
    if (cloud.x + cloud.w < -180) Object.assign(cloud, createCloud(false));
  }

  const wantedRain = Math.ceil(MAX_RAIN_DROPS * preset.rain);
  while (weather.rain.length < wantedRain) weather.rain.push(createRainDrop());
  while (weather.rain.length > wantedRain) weather.rain.pop();

  for (const drop of weather.rain) {
    drop.x += drop.drift * dt;
    drop.y += drop.speed * dt;
    if (drop.y > ROOM_HEIGHT + 50 || drop.x < -120) {
      Object.assign(drop, createRainDrop(false));
      drop.x = rand(-20, ROOM_WIDTH + 120);
    }
  }

  weather.thunderCooldown = Math.max(0, weather.thunderCooldown - dt);
  weather.lightningFlash = Math.max(0, weather.lightningFlash - dt * 3.8);

  if (weather.lightningBolt) {
    weather.lightningBolt.life -= dt;
    if (weather.lightningBolt.life <= 0) weather.lightningBolt = null;
  }

  if (preset.lightning > 0) {
    weather.lightningTimer -= dt;
    if (weather.lightningTimer <= 0) triggerLightning(preset);
  }
}

function triggerLightning(preset) {
  weather.lightningFlash = preset.key === 'bossStorm' ? 0.42 : 0.26;
  weather.lightningBolt = createLightningBolt();
  weather.lightningTimer = rand(7, 15) / Math.max(0.05, preset.lightning);

  if (weather.thunderCooldown <= 0 && window.__audio?.playSfx) {
    window.__audio.playSfx('lightning');
    weather.thunderCooldown = 1.2;
  }

  if (preset.key === 'bossStorm' && window.__camera?.shakeCamera) {
    window.__camera.shakeCamera(3);
  }
}

function createLightningBolt() {
  const startX = rand(ROOM_WIDTH * 0.18, ROOM_WIDTH * 0.82);
  const points = [{ x: startX, y: 0 }];
  const segments = 6 + Math.floor(Math.random() * 4);
  let x = startX;

  for (let i = 1; i <= segments; i++) {
    const y = (ROOM_HEIGHT * 0.48) * (i / segments);
    x += rand(-34, 34);
    points.push({ x, y });
  }

  return { points, life: 0.13, maxLife: 0.13 };
}

export function drawWeatherAtmosphere(ctx) {
  const preset = getPreset();
  ensurePreset(preset);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, ROOM_WIDTH, ROOM_HEIGHT);
  ctx.clip();

  drawTint(ctx, preset);
  drawClouds(ctx, preset);
  drawFog(ctx, preset);
  drawRain(ctx, preset);
  drawLightning(ctx, preset);

  ctx.restore();
}

function drawTint(ctx, preset) {
  ctx.fillStyle = preset.tint;
  ctx.fillRect(0, 0, ROOM_WIDTH, ROOM_HEIGHT);
}

function drawClouds(ctx, preset) {
  for (const cloud of weather.clouds) {
    const breathe = 0.74 + Math.sin(weather.time * 0.7 + cloud.phase) * 0.14;
    ctx.save();
    ctx.globalAlpha = cloud.alpha * breathe;

    const grad = ctx.createRadialGradient(
      cloud.x + cloud.w * 0.5,
      cloud.y + cloud.h * 0.5,
      4,
      cloud.x + cloud.w * 0.5,
      cloud.y + cloud.h * 0.5,
      cloud.w * 0.56
    );
    grad.addColorStop(0, preset.cloudColor);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.ellipse(cloud.x, cloud.y, cloud.w * 0.32, cloud.h * 0.40, 0, 0, Math.PI * 2);
    ctx.ellipse(cloud.x + cloud.w * 0.28, cloud.y + cloud.h * 0.06, cloud.w * 0.36, cloud.h * 0.52, 0, 0, Math.PI * 2);
    ctx.ellipse(cloud.x + cloud.w * 0.58, cloud.y - cloud.h * 0.02, cloud.w * 0.34, cloud.h * 0.44, 0, 0, Math.PI * 2);
    ctx.ellipse(cloud.x + cloud.w * 0.80, cloud.y + cloud.h * 0.12, cloud.w * 0.26, cloud.h * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawFog(ctx, preset) {
  if (preset.fog <= 0) return;

  const fogAlpha = Math.min(0.10, preset.fog * 0.30);
  for (let i = 0; i < 3; i++) {
    const y = ROOM_HEIGHT * (0.36 + i * 0.19);
    const x = ((weather.time * (8 + i * 5)) + i * 280) % (ROOM_WIDTH + 320) - 160;

    const grad = ctx.createRadialGradient(x, y, 0, x, y, 230 + i * 55);
    grad.addColorStop(0, preset.fogColor.replace(/[^,]+\)$/g, `${fogAlpha})`));
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(x - 310, y - 125, 620, 250);
  }
}

function drawRain(ctx, preset) {
  if (!weather.rain.length) return;

  ctx.save();
  ctx.strokeStyle = preset.rainColor;
  ctx.lineWidth = 1;
  ctx.lineCap = 'round';

  for (const drop of weather.rain) {
    ctx.globalAlpha = drop.alpha;
    ctx.beginPath();
    ctx.moveTo(drop.x, drop.y);
    ctx.lineTo(drop.x + drop.drift * 0.048, drop.y + drop.len);
    ctx.stroke();
  }

  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawLightning(ctx, preset) {
  if (weather.lightningBolt) {
    const alpha = Math.max(0, weather.lightningBolt.life / weather.lightningBolt.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha * 0.72;
    ctx.strokeStyle = preset.key === 'bossStorm' ? 'rgba(255, 80, 140, 0.85)' : 'rgba(160, 230, 255, 0.75)';
    ctx.lineWidth = 2;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    weather.lightningBolt.points.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
    ctx.restore();
  }

  if (weather.lightningFlash > 0) {
    ctx.save();
    ctx.globalAlpha = weather.lightningFlash * 0.20;
    ctx.fillStyle = preset.key === 'bossStorm' ? 'rgba(255,60,110,1)' : 'rgba(180,230,255,1)';
    ctx.fillRect(0, 0, ROOM_WIDTH, ROOM_HEIGHT);
    ctx.restore();
  }
}
