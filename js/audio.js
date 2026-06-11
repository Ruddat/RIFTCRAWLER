// ============================================================
// RIFT CRAWLER – Audio System (Web Audio API)
// ============================================================
// Procedural sound effects using oscillators (no audio files needed).
// Background music generated with simple patterns.

let audioCtx = null;
let musicGain = null;
let sfxGain = null;
let musicPlaying = false;
let musicOscillators = [];

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    musicGain = audioCtx.createGain();
    musicGain.gain.value = 0.15;
    musicGain.connect(audioCtx.destination);
    sfxGain = audioCtx.createGain();
    sfxGain.gain.value = 0.3;
    sfxGain.connect(audioCtx.destination);
  }
  return audioCtx;
}

export function initAudio() {
  getCtx();
}

// ============================================================
// Sound Effects (procedural)
// ============================================================

export function playSfx(type) {
  const ctx = getCtx();
  if (ctx.state === 'suspended') ctx.resume();

  switch (type) {
    case 'hit':
      playTone(ctx, 200, 0.08, 'square', 0.2);
      break;
    case 'slash':
      playSweep(ctx, 300, 600, 0.1, 'sawtooth', 0.15);
      break;
    case 'shoot':
      playTone(ctx, 500, 0.06, 'square', 0.1);
      break;
    case 'explosion':
      playNoise(ctx, 0.2, 0.25);
      playTone(ctx, 80, 0.15, 'sawtooth', 0.2);
      break;
    case 'powerup':
      playSweep(ctx, 400, 800, 0.15, 'sine', 0.15);
      setTimeout(() => playTone(ctx, 600, 0.1, 'sine', 0.1), 100);
      break;
    case 'bomb':
      playNoise(ctx, 0.4, 0.3);
      playTone(ctx, 50, 0.3, 'sawtooth', 0.25);
      break;
    case 'door':
      playSweep(ctx, 200, 400, 0.2, 'sine', 0.1);
      break;
    case 'damage':
      playTone(ctx, 150, 0.15, 'sawtooth', 0.2);
      break;
    case 'death':
      playSweep(ctx, 400, 80, 0.5, 'sawtooth', 0.25);
      break;
    case 'bosswarn':
      playTone(ctx, 100, 0.3, 'square', 0.15);
      setTimeout(() => playTone(ctx, 100, 0.3, 'square', 0.15), 400);
      setTimeout(() => playTone(ctx, 100, 0.5, 'square', 0.15), 800);
      break;
    case 'clear':
      playSweep(ctx, 300, 600, 0.15, 'sine', 0.15);
      setTimeout(() => playSweep(ctx, 500, 800, 0.15, 'sine', 0.15), 150);
      setTimeout(() => playTone(ctx, 700, 0.2, 'sine', 0.15), 300);
      break;
    case 'laser':
      playSweep(ctx, 800, 200, 0.3, 'sawtooth', 0.2);
      playTone(ctx, 1200, 0.15, 'square', 0.1);
      break;
    case 'rocket':
      playSweep(ctx, 150, 400, 0.15, 'sawtooth', 0.15);
      setTimeout(() => { playNoise(ctx, 0.3, 0.25); playTone(ctx, 60, 0.25, 'sawtooth', 0.2); }, 200);
      break;
    case 'flame':
      playNoise(ctx, 0.15, 0.15);
      playTone(ctx, 100, 0.1, 'sawtooth', 0.1);
      break;
    case 'lightning':
      playTone(ctx, 2000, 0.05, 'square', 0.2);
      setTimeout(() => playSweep(ctx, 1500, 200, 0.2, 'sawtooth', 0.2), 30);
      setTimeout(() => playTone(ctx, 100, 0.1, 'square', 0.1), 100);
      break;
  }
}

function playTone(ctx, freq, duration, type, vol) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = vol;
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(sfxGain);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration + 0.01);
}

function playSweep(ctx, startFreq, endFreq, duration, type, vol) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = startFreq;
  osc.frequency.exponentialRampToValueAtTime(Math.max(endFreq, 20), ctx.currentTime + duration);
  gain.gain.value = vol;
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(sfxGain);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration + 0.01);
}

function playNoise(ctx, duration, vol) {
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.value = vol;
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  source.connect(gain);
  gain.connect(sfxGain);
  source.start(ctx.currentTime);
}

// ============================================================
// Background Music (simple procedural ambient loop)
// ============================================================

export function startMusic() {
  if (musicPlaying) return;
  const ctx = getCtx();
  if (ctx.state === 'suspended') ctx.resume();

  // Simple ambient drone
  const baseFreq = 55; // A1

  for (let i = 0; i < 3; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = i === 0 ? 'sine' : i === 1 ? 'triangle' : 'sine';
    osc.frequency.value = baseFreq * (i + 1);
    gain.gain.value = 0.05 / (i + 1);

    // Slow LFO modulation
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.1 + i * 0.05;
    lfoGain.gain.value = 2 + i;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfo.start();

    osc.connect(gain);
    gain.connect(musicGain);
    osc.start();

    musicOscillators.push({ osc, lfo, gain });
  }

  musicPlaying = true;
}

export function stopMusic() {
  for (const m of musicOscillators) {
    try {
      m.osc.stop();
      m.lfo.stop();
    } catch (e) { /* already stopped */ }
  }
  musicOscillators = [];
  musicPlaying = false;
}

export function toggleMusic() {
  if (musicPlaying) stopMusic();
  else startMusic();
}
