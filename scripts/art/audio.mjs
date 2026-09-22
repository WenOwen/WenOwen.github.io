/**
 * audio.mjs — synthesise the ambience and SFX as original 16-bit WAV.
 *
 * The upstream sound design is the original author's asset, so it is replaced
 * here with procedural audio built from noise, filters and envelopes. No
 * samples, no third-party material, no attribution burden.
 *
 *   node scripts/art/audio.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

const SR = 22050;
const OUT = join(process.cwd(), 'public', 'sounds');

/* ---------------- WAV container ---------------- */
function toWav(samples, sr = SR) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);        // PCM
  buf.writeUInt16LE(1, 22);        // mono
  buf.writeUInt32LE(sr, 24);
  buf.writeUInt32LE(sr * 2, 28);   // byte rate
  buf.writeUInt16LE(2, 32);        // block align
  buf.writeUInt16LE(16, 34);       // bits per sample
  buf.write('data', 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  return buf;
}

/* ---------------- DSP primitives ---------------- */
function noise(len, seed = 1) {
  const out = new Float32Array(len);
  let s = seed >>> 0;
  for (let i = 0; i < len; i++) {
    s = (s * 1664525 + 1013904223) >>> 0;
    out[i] = (s / 4294967296) * 2 - 1;
  }
  return out;
}

/** One-pole lowpass. */
function lowpass(x, cutoff) {
  const out = new Float32Array(x.length);
  const a = Math.exp((-2 * Math.PI * cutoff) / SR);
  let y = 0;
  for (let i = 0; i < x.length; i++) {
    y = (1 - a) * x[i] + a * y;
    out[i] = y;
  }
  return out;
}

/** One-pole highpass. */
function highpass(x, cutoff) {
  const out = new Float32Array(x.length);
  const a = Math.exp((-2 * Math.PI * cutoff) / SR);
  let y = 0;
  let prev = 0;
  for (let i = 0; i < x.length; i++) {
    y = a * (y + x[i] - prev);
    prev = x[i];
    out[i] = y;
  }
  return out;
}

/** Lowpass whose cutoff moves with the `mod` signal (0..1) between lo..hi Hz. */
function sweepLowpass(x, mod, lo, hi) {
  const out = new Float32Array(x.length);
  let y = 0;
  for (let i = 0; i < x.length; i++) {
    const fc = lo + (hi - lo) * Math.max(0, Math.min(1, mod[i]));
    const a = Math.exp((-2 * Math.PI * fc) / SR);
    y = (1 - a) * x[i] + a * y;
    out[i] = y;
  }
  return out;
}

const sine = (len, hz, phase = 0) => {
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) out[i] = Math.sin((2 * Math.PI * hz * i) / SR + phase);
  return out;
};

/** Slow random-ish LFO built from summed sines — organic, not periodic-sounding. */
function lfo(len, rates, seed = 5) {
  const out = new Float32Array(len);
  const nz = noise(len, seed);
  const smooth = lowpass(nz, 0.6);
  for (let i = 0; i < len; i++) {
    let v = 0;
    for (const r of rates) v += Math.sin((2 * Math.PI * r * i) / SR);
    out[i] = (v / rates.length) * 0.5 + 0.5 + smooth[i] * 0.6;
  }
  return out;
}

function applyGain(x, g) {
  const out = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) out[i] = x[i] * (typeof g === 'function' ? g(i / x.length) : g);
  return out;
}

function mix(...tracks) {
  const len = Math.max(...tracks.map((t) => t.length));
  const out = new Float32Array(len);
  for (const t of tracks) for (let i = 0; i < t.length; i++) out[i] += t[i];
  return out;
}

/** Fade the first/last `ms` so loops and one-shots don't click. */
function fade(x, ms = 25) {
  const k = Math.floor((ms / 1000) * SR);
  for (let i = 0; i < k && i < x.length; i++) {
    const g = i / k;
    x[i] *= g;
    x[x.length - 1 - i] *= g;
  }
  return x;
}

const adsr = (len, a, d, s, r) => (t) => {
  if (t < a) return t / a;
  if (t < a + d) return 1 - (1 - s) * ((t - a) / d);
  if (t < 1 - r) return s;
  return s * ((1 - t) / r);
};

/* ---------------- The sounds ---------------- */

const sounds = {};

// Wind: broadband noise pushed through a slowly wandering lowpass.
{
  const len = SR * 6;
  const n = noise(len, 11);
  const mod = lfo(len, [0.07, 0.13, 0.31], 11);
  const wind = sweepLowpass(n, mod, 220, 1400);
  sounds['szumwiatru'] = fade(applyGain(highpass(wind, 90), 0.5));
}

// City: low rumble + a thin mid band, with occasional swells.
{
  const len = SR * 6;
  const rumble = lowpass(noise(len, 21), 160);
  const mid = highpass(lowpass(noise(len, 22), 1800), 400);
  const mod = lfo(len, [0.05, 0.11], 21);
  const swell = applyGain(mid, (t) => 0.25 + 0.75 * mod[Math.floor(t * (len - 1))]);
  sounds['szummiasta'] = fade(applyGain(mix(applyGain(rumble, 0.9), applyGain(swell, 0.25)), 0.55));
}

// Sea: broadband noise with a slow tidal amplitude envelope.
{
  const len = SR * 6;
  const n = lowpass(noise(len, 31), 2000);
  const hp = highpass(n, 150);
  const tide = lfo(len, [0.09, 0.17, 0.23], 31);
  sounds['szummorza'] = fade(applyGain(hp, (t) => 0.15 + 0.85 * tide[Math.floor(t * (len - 1))]));
}

// Monitor hum: mains-ish tone stack plus a whisper of noise.
{
  const len = SR * 4;
  const hum = mix(
    applyGain(sine(len, 60), 0.5),
    applyGain(sine(len, 120), 0.22),
    applyGain(sine(len, 180), 0.1),
    applyGain(lowpass(noise(len, 41), 900), 0.06),
  );
  sounds['szummonitorow'] = fade(applyGain(hum, 0.5), 60);
}

// Paper: a short filtered noise burst.
{
  const len = Math.floor(SR * 0.4);
  const n = highpass(lowpass(noise(len, 51), 6000), 1200);
  const env = adsr(len, 0.005, 0.08, 0.25, 0.6);
  sounds['papersound'] = fade(applyGain(n, (t) => env(t) * 0.8), 5);
}

// Balloon pop: click transient plus a fast downward blip.
{
  const len = Math.floor(SR * 0.3);
  const click = applyGain(noise(len, 61), (t) => Math.exp(-t * 90) * 0.9);
  const blip = applyGain(sine(len, 420), (t) => Math.exp(-t * 26) * 0.5);
  sounds['baloonpoop'] = fade(mix(click, blip), 4);
}

/** A creak: a narrow resonant tone whose pitch drifts, gated by a slow envelope. */
function creak(len, seed, f0, f1, rate) {
  const n = noise(len, seed);
  const out = new Float32Array(len);
  let phase = 0;
  for (let i = 0; i < len; i++) {
    const t = i / len;
    const hz = f0 + (f1 - f0) * t;
    phase += (2 * Math.PI * hz) / SR;
    // stick-slip: amplitude stutters as the "hinge" moves
    const stick = 0.55 + 0.45 * Math.sin(2 * Math.PI * rate * t * 9);
    out[i] = (Math.sin(phase) * 0.6 + n[i] * 0.25) * stick;
  }
  // resonant band around the moving pitch
  const mod = new Float32Array(len);
  for (let i = 0; i < len; i++) mod[i] = (f0 + (f1 - f0) * (i / len) - 120) / 900;
  return sweepLowpass(out, mod, 300, 2400);
}

// Door ajar: short soft creak.
{
  const len = Math.floor(SR * 1.3);
  const c = creak(len, 71, 260, 330, 1.1);
  const env = adsr(len, 0.05, 0.25, 0.4, 0.5);
  sounds['uchyleniedrzwi'] = fade(applyGain(highpass(c, 150), (t) => env(t) * 0.55), 12);
}

// Door open: longer creak sweeping upward.
{
  const len = Math.floor(SR * 1.9);
  const c = creak(len, 81, 200, 480, 0.8);
  const env = adsr(len, 0.08, 0.3, 0.5, 0.45);
  sounds['otwarciedrzwi'] = fade(applyGain(highpass(c, 130), (t) => env(t) * 0.6), 12);
}

// Door close: low thud + a hint of latch.
{
  const len = Math.floor(SR * 0.7);
  const thud = applyGain(sine(len, 70), (t) => Math.exp(-t * 16) * 0.9);
  const latch = applyGain(noise(len, 91), (t) => Math.exp(-t * 70) * 0.4);
  sounds['zamknieciedrzwi'] = fade(mix(thud, latch), 8);
}

// Page turn: a soft noise swell with a papery top end.
{
  const len = SR * 2;
  const n = highpass(lowpass(noise(len, 101), 5200), 700);
  const env = adsr(len, 0.15, 0.2, 0.45, 0.5);
  sounds['cfl_turningpages-belem-breeze-487596'] = fade(applyGain(n, (t) => env(t) * 0.45), 30);
}

/* ---------------- Write ---------------- */
mkdirSync(OUT, { recursive: true });
let bytes = 0;
for (const [name, samples] of Object.entries(sounds)) {
  const file = join(OUT, `${name}.wav`);
  mkdirSync(dirname(file), { recursive: true });
  const buf = toWav(samples);
  writeFileSync(file, buf);
  bytes += buf.length;
  console.log(`  ${name}.wav  ${(buf.length / 1024).toFixed(0)} KB  ${(samples.length / SR).toFixed(2)}s`);
}
console.log(`\nwrote ${Object.keys(sounds).length} sounds, ${(bytes / 1024 / 1024).toFixed(2)} MB total`);
