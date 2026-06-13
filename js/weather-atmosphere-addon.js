// ============================================================
// RIFT CRAWLER – Weather Atmosphere Addon
// ============================================================
// Draws a lightweight screen-space weather layer over the playable
// room area. Kept as an addon so it can be enabled/disabled by one
// script tag without touching the core game loop.

import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  ROOM_WIDTH,
  ROOM_HEIGHT,
  ROOM_OFFSET_X,
  ROOM_OFFSET_Y,
} from './config.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas?.getContext('2d');

const WEATHER_ENABLED = true;
const MAX_RAIN_DROPS = 140;
const MAX_CLOUDS = 9;

const WEATHER_PRESETS = {
  crypt: {
    key: 'crypt',
    clouds: 0.42,
    rain: 0.18,
    fog: 0.18,
    lightning: 0.06,
    tint: 'rgba(35, 80, 130, 0.10)',
    rainColor: 'rgba(120, 210, 255, 0.42)',
    cloudColor: 'rgba(50, 70, 110, 0.22)',
  },
  abyss: {
    key: 'abyss',
    clouds: 0.62,
    rain: 0.08,
    fog: 0.28,
    lightning: 0.10,
    tint: 'rgba(80, 35, 130, 0.12)',
    rainColor: 'rgba(190, 120, 255, 0.30)',
    cloudColor: 'rgba(80, 45, 120, 0.25)',
  },
  poison: {
    key: 'poison',
    clouds: 0.36,
    rain: 0.05,
    fog: 0.34,
    lightning: 0.02,
    tint: 'rgba(55, 120, 70, 0.10)',
    rainColor: 'rgba(120, 255, 160, 0.20)',
    cloudColor: 'rgba(45, 95, 70, 0.20)',
  },
  inferno: {
    key: 'inferno',
    clouds: 0.50,
    rain: 0.00,
    fog: 0.16,
    lightning: 0.08,
    tint: 'rgba(180, 70, 25, 0.10)',
    rainColor: 'rgba(255, 120, 60, 0.22)',
    cloudColor: 'rgba(135, 55, 35, 0.22)',
  },
  nexus: {
    key: 'nexus',
    clouds: 0.74,
    rain: 0.28,
    fog: 0.24,
    lightning: 0.16,
    tint: 'rgba(170, 30, 75, 0.12)',
    rainColor: 'rgba(255, 90, 140, 0.38)',
    cloudColor: 'rgba(100, 35, 80, 0.26)',
  },
  bossStorm: {
    key: 'bossStorm',
    clouds: 1.0,
    rain: 0.70,
    fog: 0.34,
    lightning: 0.32,
    tint: 'rgba(255, 55, 85, 0.13)',
    rainColor: 'rgba(170, 230, 255, 0.55)',
    cloudColor: 'rgba(75, 45, 75, 0.34)',
  },
};

const weather = {
  presetKey: null,
  clouds: [],
  rain: [],
  lightningTimer: 2.2,
  lightningFlash: 0,
  lightningBolt: null,
  thunderCooldown: 0,
  time: 0,
};

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function getState() {
  return window.__state || null;
}

function getCurrentRoom() {
  return typeof window.__room_getCurrentRoom === 'function'
    ? window.__room_getCurrentRoom()
    : null;
}

function getPreset(room) {
  if (!room) return WEATHER_PRESETS.crypt;
  if (room.type === 'boss') return WEATHER_PRESETS.bossStorm;

  const floor = Math.max(1, room.floor || getState()?.floor || 1);
  const order = [
    WEATHER_PRESETS.crypt,
    WEATHER_PRESETS.abyss,
    WEATHER_PRESETS.poison,
    WEATHER_PRESETS.inferno,
    WEATHER_PRESETS.nexus,
  ];

  return order[(floor - 1) % order.length];
}

function ensurePreset(preset) {
  if (weather.presetKey === preset.key) return;

  weather.presetKey = preset.key;
  weather.clouds = [];
  weather.rain = [];
  weather.lightningFlash = 0;
  weather.lightningBolt = null;
  weather.lightningTimer = randomBetween(1.8, 5.5) / Math.max(0.3, preset.lightning || 0.05);

  const cloudCount = Math.ceil(MAX_CLOUDS * preset.clouds);
  for (let i = 0; i < cloudCount; i++) {
    weather.clouds.push(createCloud(true));
  }

  const rainCount = Math.ceil(MAX_RAIN_DROPS * preset.rain);
  for (let i = 0; i < rainCount; i++) {
    weather.rain.push(createRainDrop(true));
  }
}

function createCloud(randomizeX = false) {
  return {
    x: randomizeX ? randomBetween(-180, ROOM_WIDTH + 180) : ROOM_WIDTH + randomBetween(20, 220),
    y: randomBetween(26, ROOM_HEIGHT * 0.42),
    w: randomBetween(180, 380),
    h: randomBetween(44, 105),
    speed: randomBetween(8, 24),
    alpha: randomBetween(0.20, 0.55),
    phase: randomBetween(0, Math.PI * 2),
  };
}

function createRainDrop(randomizeY = false) {
  return {
    x: randomBetween(-80, ROOM_WIDTH + 80),
    y: randomizeY ? randomBetween(-80, ROOM_HEIGHT + 80) : randomBetween(-120, -20),
    len: randomBetween(12, 28),
    speed: randomBetween(360, 620),
    drift: randomBetween(-80, -35),
    alpha: randomBetween(0.20, 0.72),
  };
}

function updateWeather(dt, preset) {
  weather.time += dt;

  const wantedClouds = Math.ceil(MAX_CLOUDS * preset.clouds);
  while (weather.clouds.length < wantedClouds) weather.clouds.push(createCloud());
  while (weather.clouds.length > wantedClouds) weather.clouds.pop();

  for (const cloud of weather.clouds) {
    cloud.x -= cloud.speed * dt;
    cloud.y += Math.sin(weather.time * 0.4 + cloud.phase) * 0.05;
    if (cloud.x + cloud.w < -220) {
      Object.assign(cloud, createCloud(false));
    }
  }

  const wantedRain = Math.ceil(MAX_RAIN_DROPS * preset.rain);
  while (weather.rain.length < wantedRain) weather.rain.push(createRainDrop());
  while (weather.rain.length > wantedRain) weather.rain.pop();

  for (const drop of weather.rain) {
    drop.x += drop.drift * dt;
    drop.y += drop.speed * dt;
    if (drop.y > ROOM_HEIGHT + 60 || drop.x < -120) {
      Object.assign(drop, createRainDrop(false));
      drop.x = randomBetween(-20, ROOM_WIDTH + 120);
    }
  }

  weather.thunderCooldown = Math.max(0, weather.thunderCooldown - dt);
  weather.lightningFlash = Math.max(0, weather.lightningFlash - dt * 3.6);

  if (preset.lightning > 0) {
    weather.lightningTimer -= dt;
    if (weather.lightningTimer <= 0) {
      triggerLightning(preset);
    }
  }
}

function triggerLightning(preset) {
  weather.lightningFlash = preset.key === 'bossStorm' ? 0.75 : 0.45;
  weather.lightningBolt = createLightningBolt();
  weather.lightningTimer = randomBetween(4.0, 10.0) / Math.max(0.08, preset.lightning);

  if (weather.thunderCooldown <= 0 && window.__audio?.playSfx) {
    window.__audio.playSfx('lightning');
    weather.thunderCooldown = 1.0;
  }

  if (preset.key === 'bossStorm' && window.__camera?.shakeCamera) {
    window.__camera.shakeCamera(5, 0.18);
  }
}

function createLightningBolt() {
  const startX = randomBetween(ROOM_WIDTH * 0.18, ROOM_WIDTH * 0.82);
  const points = [{ x: startX, y: 0 }];
  const segments = 7 + Math.floor(Math.random() * 5);
  let x = startX;

  for (let i = 1; i <= segments; i++) {
    const y = (ROOM_HEIGHT * 0.62) * (i / segments);
    x += randomBetween(-42, 42);
    points.push({ x, y });
  }

  return { points, life: 0.16 };
}

function drawWeather(preset) {
  if (!ctx) return;

  ctx.save();
  ctx.beginPath();
  ctx.rect(ROOM_OFFSET_X, ROOM_OFFSET_Y, ROOM_WIDTH, ROOM_HEIGHT);
  ctx.clip();
  ctx.translate(ROOM_OFFSET_X, ROOM_OFFSET_Y);

  drawTint(preset);
  drawClouds(preset);
  drawFog(preset);
  drawRain(preset);
  drawLightning(preset);

  ctx.restore();
}

function drawTint(preset) {
  ctx.fillStyle = preset.tint;
  ctx.fillRect(0, 0, ROOM_WIDTH, ROOM_HEIGHT);
}

function drawClouds(preset) {
  for (const cloud of weather.clouds) {
    const breathe = 0.75 + Math.sin(weather.time * 0.7 + cloud.phase) * 0.18;
    ctx.save();
    ctx.globalAlpha = cloud.alpha * breathe;
    ctx.fillStyle = preset.cloudColor;

    const grad = ctx.createRadialGradient(
      cloud.x + cloud.w * 0.5,
      cloud.y + cloud.h * 0.5,
      4,
      cloud.x + cloud.w * 0.5,
      cloud.y + cloud.h * 0.5,
      cloud.w * 0.55
    );
    grad.addColorStop(0, preset.cloudColor);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.ellipse(cloud.x, cloud.y, cloud.w * 0.34, cloud.h * 0.44, 0, 0, Math.PI * 2);
    ctx.ellipse(cloud.x + cloud.w * 0.25, cloud.y + cloud.h * 0.06, cloud.w * 0.38, cloud.h * 0.56, 0, 0, Math.PI * 2);
    ctx.ellipse(cloud.x + cloud.w * 0.56, cloud.y - cloud.h * 0.02, cloud.w * 0.36, cloud.h * 0.48, 0, 0, Math.PI * 2);
    ctx.ellipse(cloud.x + cloud.w * 0.78, cloud.y + cloud.h * 0.12, cloud.w * 0.28, cloud.h * 0.40, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawFog(preset) {
  if (preset.fog <= 0) return;

  const fogAlpha = Math.min(0.26, preset.fog * 0.55);
  for (let i = 0; i < 3; i++) {
    const y = ROOM_HEIGHT * (0.34 + i * 0.20);
    const x = ((weather.time * (10 + i * 7)) + i * 280) % (ROOM_WIDTH + 360) - 180;

    const grad = ctx.createRadialGradient(x, y, 0, x, y, 280 + i * 70);
    grad.addColorStop(0, `rgba(180, 210, 255, ${fogAlpha})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(x - 360, y - 150, 720, 300);
  }
}

function drawRain(preset) {
  if (!weather.rain.length) return;

  ctx.save();
  ctx.strokeStyle = preset.rainColor;
  ctx.lineWidth = 1.2;
  ctx.lineCap = 'round';

  for (const drop of weather.rain) {
    ctx.globalAlpha = drop.alpha;
    ctx.beginPath();
    ctx.moveTo(drop.x, drop.y);
    ctx.lineTo(drop.x + drop.drift * 0.055, drop.y + drop.len);
    ctx.stroke();
  }

  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawLightning(preset) {
  if (weather.lightningBolt) {
    weather.lightningBolt.life -= 0.016;
    const alpha = Math.max(0, weather.lightningBolt.life / 0.16);

    if (alpha <= 0) {
      weather.lightningBolt = null;
    } else {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = preset.key === 'bossStorm' ? 'rgba(255, 80, 140, 0.95)' : 'rgba(160, 230, 255, 0.92)';
      ctx.lineWidth = 3;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 18;
      ctx.beginPath();
      weather.lightningBolt.points.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();

      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.restore();
    }
  }

  if (weather.lightningFlash > 0) {
    ctx.save();
    ctx.globalAlpha = weather.lightningFlash * 0.34;
    ctx.fillStyle = preset.key === 'bossStorm' ? 'rgba(255,60,110,1)' : 'rgba(180,230,255,1)';
    ctx.fillRect(0, 0, ROOM_WIDTH, ROOM_HEIGHT);
    ctx.restore();
  }
}

function frame(time) {
  requestAnimationFrame(frame);

  if (!WEATHER_ENABLED || !ctx) return;

  const state = getState();
  if (!state || state.screen !== 'playing' || state.floorTransition) return;

  const dt = Math.min(((time - (weather.lastFrame || time)) / 1000), 0.033);
  weather.lastFrame = time;

  const room = getCurrentRoom();
  const preset = getPreset(room);
  ensurePreset(preset);

  if (!state.paused) updateWeather(dt, preset);
  drawWeather(preset);
}

requestAnimationFrame(frame);
