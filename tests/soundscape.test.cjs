const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../public/labs/star-escape/soundscape.js'), 'utf8');

function soundHarness(muted = false) {
  let now = 0, next = 1;
  const frames = new Map(), timers = new Map(), plays = [], fetches = [];
  class Audio {
    constructor() { this.paused = true; this.volume = 0; this.currentTime = 0; }
    set src(value) { this._src = value; this.paused = true; this.currentTime = 0; }
    get src() { return this._src; }
    setAttribute() {}
    play() { plays.push(this.src); this.paused = false; return Promise.resolve(); }
    pause() { this.paused = true; }
  }
  const parameter = () => ({ value: 0, cancelScheduledValues() {}, setValueAtTime(v) { this.value = v; }, exponentialRampToValueAtTime(v) { this.value = v; }, linearRampToValueAtTime(v) { this.value = v; } });
  const node = () => ({ gain: parameter(), frequency: parameter(), detune: parameter(), Q: parameter(), connect() {}, start() {}, stop() {} });
  class AudioContext {
    constructor() { this.currentTime = 0; this.destination = {}; this.sampleRate = 8000; this.state = 'running'; }
    createGain() { return node(); } createOscillator() { return node(); } createBiquadFilter() { return node(); }
    createBufferSource() { return node(); } createBuffer(c, n) { return { getChannelData: () => new Float32Array(n) }; }
    decodeAudioData() { return Promise.resolve({}); } resume() { return Promise.resolve(); }
  }
  const document = { hidden: false, getElementById: () => null, addEventListener() {} };
  const window = {
    AudioContext, localStorage: { getItem: () => muted ? '1' : '0', setItem() {} },
    fetch: async url => { fetches.push(url); return { ok: true, arrayBuffer: async () => new ArrayBuffer(0) }; },
    requestAnimationFrame: fn => { const id = next++; frames.set(id, fn); return id; }, cancelAnimationFrame: id => frames.delete(id),
    setTimeout: (fn, delay) => { const id = next++; timers.set(id, { fn, at: now + delay }); return id; }, clearTimeout: id => timers.delete(id),
  };
  vm.runInNewContext(source, { window, document, Audio, performance: { now: () => now }, console });
  async function advance(ms) {
    now += ms;
    for (const [id, timer] of [...timers]) if (timer.at <= now) { timers.delete(id); timer.fn(); }
    for (const [id, frame] of [...frames]) { frames.delete(id); frame(now); }
    await Promise.resolve(); await Promise.resolve();
  }
  return { sound: window.StarEscapeSound, document, plays, fetches, advance, remote: () => [...new Set(plays.filter(x => x && !x.startsWith('data:')).map(x => path.basename(x)))] };
}

test('lobby downloads no BGM; scene 1 keeps its dread layer and never fetches goats', async () => {
  const h = soundHarness(); h.sound.bindControls();
  assert.deepEqual(h.remote(), []);
  h.sound.activate(1); await h.advance(600);
  assert.deepEqual(h.remote().sort(), ['bgm-delirium.mp3', 'bgm-selpan.mp3']);
  assert.equal(h.fetches.length, 4);
  const state = h.sound.debugState();
  assert.equal(state.tracks.selpan.volume, .013);
  assert.equal(state.tracks.delirium.volume, .0085 * .34);
  assert.equal(state.tracks.delirium.playbackRate, .82);
  assert.equal(state.tracks.goats.paused, true);
});

test('scene transition retains 700ms gap, existing mixes and all four sound stages', async () => {
  const h = soundHarness(); h.sound.activate(1); await h.advance(600);
  h.sound.setStage(2); await h.advance(699);
  assert.ok(!h.remote().includes('bgm-goats.mp3'));
  await h.advance(1); await h.advance(600);
  assert.ok(h.remote().includes('bgm-goats.mp3'));
  assert.equal(h.sound.debugState().tracks.goats.volume, .040);
  assert.equal(h.sound.debugState().tracks.delirium.playbackRate, .72);
  h.sound.setStage(3); await h.advance(700); await h.advance(600);
  assert.equal(h.sound.debugState().tracks.delirium.volume, .0085);
  assert.equal(h.sound.debugState().tracks.delirium.playbackRate, 1);
  h.sound.setStage(4); await h.advance(700); await h.advance(600);
  assert.equal(h.sound.debugState().track, 'returnSignal');
  assert.equal(h.sound.debugState().tracks.returnSignal.paused, false);
  assert.equal(h.sound.debugState().tracks.delirium.playbackRate, .58);
  for (const name of ['cardInsert', 'cabinetOpen12', 'storageOpen34', 'doorOpen', 'scene4_blackout', 'scene3_screen_glitch']) h.sound.play(name);
});

test('muted activation does not start remote BGM; unmute, background and resume retain sound controls', async () => {
  const h = soundHarness(true); h.sound.activate(2); await h.advance(600);
  assert.deepEqual(h.remote(), []);
  h.sound.toggle(); await h.advance(600);
  assert.deepEqual(h.remote().sort(), ['bgm-delirium.mp3', 'bgm-goats.mp3']);
  h.sound.deactivate(); await h.advance(600);
  assert.ok(Object.values(h.sound.debugState().tracks).every(x => x.paused));
  h.sound.activate(2); await h.advance(600);
  assert.equal(h.sound.debugState().tracks.goats.paused, false);
});
