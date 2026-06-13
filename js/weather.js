// ============================================================
// RIFT CRAWLER – Integrated Weather Atmosphere
// ============================================================
// Render ownership stays in main.js. This module only updates/draws the
// atmosphere layer between room/background and gameplay entities.

import { ROOM_WIDTH, ROOM_HEIGHT } from './config.js';
import { state } from './state.js';
import { getCurrentRoom } from './room.js';

const WEATHER_ENABLED = true;
const MAX_RAIN_DROPS = 120;
const MAX_CLOUDS = 8;
const MAX_DUST = 42;

const PRESETS = {
  crypt: {
    key: 'crypt',
    clouds: 0.38,
    rain: 0.14,
    fog: 0.14,
    dust: 0.32,
    lightning: 0.035,
    tint: 'rgba(20, 70, 120, 0.045)',
    rainColor: 'rgba(120, 215, 255, 0.28)',
    cloudColor: 'rgba(42, 72, 115, 0.15)',
    fogColor: 'rgba(120, 180, 255, 0.060)',
    dustColor: 'rgba(95, 190, 255, 0.22)',
  },
  abyss: {
    key: 'abyss',
    clouds: 0.50,
    rain: 0.06,
    fog: 0.22,
    dust: 0.38,
    lightning: 0.055,
    tint: 'rgba(80, 35, 130, 0.052)',
    rainColor: 'rgba(190, 120, 255, 0.20)',
    cloudColor: 'rgba(85, 45, 130, 0.16)',
    fogColor: 'rgba(175, 120, 255, 0.062)',
    dustColor: 'rgba(190, 110, 255, 0.24)',
  },
  poison: {
    key: 'poison',
    clouds: 0.30,
    rain: 0.04,
    fog: 0.24,
    dust: 0.46,
    lightning: 0.015,
    tint: 'rgba(45, 115, 70, 0.048)',
    rainColor: 'rgba(120, 255, 160, 0.16)',
    cloudColor: 'rgba(45, 95, 70, 0.13)',
    fogColor: 'rgba(120, 255, 160, 0.060)',
    dustColor: 'rgba(105, 255, 145, 0.24)',
  },
  inferno: {
    key: 'inferno',
    clouds: 0.42,
    rain: 0.00,
    fog: 0.13,
    dust: 0.58,
    lightning: 0.045,
    tint: 'rgba(170, 70, 25, 0.050)',
    rainColor: 'rgba(255, 120, 60, 0.10)',
    cloudColor: 'rgba(145, 60, 35, 0.16)',
    fogColor: 'rgba(255, 130, 70, 0.052)',
    dustColor: 'rgba(255, 135, 65, 0.24)',
  },
  nexus: {
    key: 'nexus',
    clouds: 0.62,
    rain: 0.20,
    fog: 0.22,
    dust: 0.44,
    lightning: 0.10,
    tint: 'rgba(160, 30, 85, 0.056)',
    rainColor: 'rgba(255, 90, 145, 0.26)',
    cloudColor: 'rgba(105, 35, 85, 0.17)',
    fogColor: 'rgba(255, 100, 170, 0.062)',
    dustColor: 'rgba(255, 95, 160, 0.24)',
  },
  bossStorm: {
    key: 'bossStorm',
    clouds: 0.92,
    rain: 0.42,
    fog: 0.28,
    dust: 0.58,
    lightning: 0.18,
    tint: 'rgba(255, 55, 85, 0.070)',
    rainColor: 'rgba(175, 235, 255, 0.36)',
    cloudColor: 'rgba(80, 45, 78, 0.20)',
    fogColor: 'rgba(255, 110, 150, 0.070)',
    dustColor: 'rgba(255, 120, 170, 0.26)',
  },
};

const weather = {
  presetKey: null,
  clouds: [],
  rain: [],
  dust: [],
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
  weather.dust = [];
  weather.lightningFlash = 0;
  weather.lightningBolt = null;
  weather.lightningTimer = rand(7, 14) / Math.max(0.05, preset.lightning || 0.01);

  for (let i = 0; i < Math.ceil(MAX_CLOUDS * preset.clouds); i++) weather.clouds.push(createCloud(true));
  for (let i = 0; i < Math.ceil(MAX_RAIN_DROPS * preset.rain); i++) weather.rain.push(createRainDrop(true));
  for (let i = 0; i < Math.ceil(MAX_DUST * preset.dust); i++) weather.dust.push(createDust(true));
}

function createCloud(randomizeX = false) {
  return {
    x: randomizeX ? rand(-180, ROOM_WIDTH + 180) : ROOM_WIDTH + rand(20, 220),
    y: rand(18, ROOM_HEIGHT * 0.38),
    w: rand(150, 350),
    h: rand(38, 90),
    speed: rand(5, 16),
    alpha: rand(0.12, 0.30),
    phase: rand(0, Math.PI * 2),
  };
}

function createRainDrop(randomizeY = false) {
  return {
    x: rand(-90, ROOM_WIDTH + 90),
    y: randomizeY ? rand(-90, ROOM_HEIGHT + 90) : rand(-140, -20),
    len: rand(10, 24),
    speed: rand(320, 560),
    drift: rand(-70, -32),
    alpha: rand(0.14, 0.46),
  };
}

function createDust(randomizeY = false) {
  return {
    x: rand(24, ROOM_WIDTH - 24),
    y: randomizeY ? rand(24, ROOM_HEIGHT - 24) : ROOM_HEIGHT + rand(10, 80),
    size: rand(1.0, 2.4),
    speed: rand(8, 26),
    drift: rand(-8, 10),
    alpha: rand(0.10, 0.28),
    phase: rand(0, Math.PI * 2),
  };
}

export function updateWeatherAtmosphere(dt) {
  if (!WEATHER_ENABLED) return;

  const preset = getPreset();
  ensurePreset(preset);

  weather.time += dt;

  const wantedClouds = Math.ceil(MAX_CLOUDS * preset.clouds);
  while (weather.clouds.length < wantedClouds) weather.clouds.push(createCloud());
  while (weather.clouds.length > wantedClouds) weather.clouds.pop();

  for (const cloud of weather.clouds) {
    cloud.x -= cloud.speed * dt;
    cloud.y += Math.sin(weather.time * 0.4 + cloud.phase) * 0.035;
    if (cloud.x + cloud.w < -190) Object.assign(cloud, createCloud(false));
  }

  const wantedRain = Math.ceil(MAX_RAIN_DROPS * preset.rain);
  while (weather.rain.length < wantedRain) weather.rain.push(createRainDrop());
  while (weather.rain.length > wantedRain) weather.rain.pop();

  for (const drop of weather.rain) {
    drop.x += drop.drift * dt;
    drop.y += drop.speed * dt;
    if (drop.y > ROOM_HEIGHT + 60 || drop.x < -130) {
      Object.assign(drop, createRainDrop(false));
      drop.x = rand(-20, ROOM_WIDTH + 130);
    }
  }

  const wantedDust = Math.ceil(MAX_DUST * preset.dust);
  while (weather.dust.length < wantedDust) weather.dust.push(createDust());
  while (weather.dust.length > wantedDust) weather.dust.pop();

  for (const mote of weather.dust) {
    mote.x += (mote.drift + Math.sin(weather.time + mote.phase) * 5) * dt;
    mote.y -= mote.speed * dt;
    if (mote.y < -20 || mote.x < -30 || mote.x > ROOM_WIDTH + 30) {
      Object.assign(mote, createDust(false));
      mote.x = rand(24, ROOM_WIDTH - 24);
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
  weather.lightningFlash = preset.key === 'bossStorm' ? 0.48 : 0.30;
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
  const startX = rand(ROOM_WIDTH * 0.15, ROOM_WIDTH * 0.85);
  const points = [{ x: startX, y: 0 }];
  const segments = 6 + Math.floor(Math.random() * 5);
  let x = startX;

  for (let i = 1; i <= segments; i++) {
    const y = (ROOM_HEIGHT * 0.50) * (i / segments);
    x += rand(-38, 38);
    points.push({ x, y });
  }

  return { points, life: 0.13, maxLife: 0.13 };
}

export function drawWeatherAtmosphere(ctx) {
  if (!WEATHER_ENABLED) return;

  const preset = getPreset();
  ensurePreset(preset);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, ROOM_WIDTH, ROOM_HEIGHT);
  ctx.clip();

  drawTint(ctx, preset);
  drawClouds(ctx, preset);
  drawFog(ctx, preset);
  drawDust(ctx, preset);
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
    const breathe = 0.76 + Math.sin(weather.time * 0.7 + cloud.phase) * 0.14;
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

  const fogAlpha = Math.min(0.12, preset.fog * 0.34);
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

function drawDust(ctx, preset) {
  if (!weather.dust.length) return;

  ctx.save();
  ctx.fillStyle = preset.dustColor;
  ctx.shadowColor = preset.dustColor;
  ctx.shadowBlur = 4;

  for (const mote of weather.dust) {
    const pulse = 0.75 + Math.sin(weather.time * 2 + mote.phase) * 0.25;
    ctx.globalAlpha = mote.alpha * pulse;
    ctx.beginPath();
    ctx.arc(mote.x, mote.y, mote.size, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
  ctx.globalAlpha = 1;
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
    ctx.globalAlpha = alpha * 0.78;
    ctx.strokeStyle = preset.key === 'bossStorm' ? 'rgba(255, 80, 140, 0.90)' : 'rgba(160, 230, 255, 0.82)';
    ctx.lineWidth = 2;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 14;
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
    ctx.globalAlpha = weather.lightningFlash * 0.18;
    ctx.fillStyle = preset.key === 'bossStorm' ? 'rgba(255,60,110,1)' : 'rgba(180,230,255,1)';
    ctx.fillRect(0, 0, ROOM_WIDTH, ROOM_HEIGHT);
    ctx.restore();
  }
}
