(function () {
  'use strict';

  var AudioEngine = window.AudioContext || window.webkitAudioContext;
  var STORAGE_KEY = 'scilab-star-escape-sound-muted';
  var audio = null;
  var master = null;
  var music = null;
  var effects = null;
  var atmosphere = null;
  var drones = [];
  var active = false;
  var muted = false;
  var stage = 1;
  var ambientTimer = 0;
  var duckTimer = 0;
  var button = null;

  try {
    muted = window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch (error) {}

  function makeGain(value) {
    var node = audio.createGain();
    node.gain.value = value;
    return node;
  }

  function ramp(parameter, value, duration) {
    if (!audio || !parameter) return;
    var now = audio.currentTime;
    parameter.cancelScheduledValues(now);
    parameter.setValueAtTime(Math.max(.0001, parameter.value), now);
    parameter.exponentialRampToValueAtTime(Math.max(.0001, value), now + (duration || .08));
  }

  function createNoise() {
    var length = audio.sampleRate * 2;
    var buffer = audio.createBuffer(1, length, audio.sampleRate);
    var data = buffer.getChannelData(0);
    for (var index = 0; index < length; index += 1) data[index] = Math.random() * 2 - 1;

    var source = audio.createBufferSource();
    var filter = audio.createBiquadFilter();
    var gain = makeGain(.0001);
    source.buffer = buffer;
    source.loop = true;
    filter.type = 'bandpass';
    filter.frequency.value = 330;
    filter.Q.value = 1.1;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(music);
    source.start();
    atmosphere = { source: source, filter: filter, gain: gain };
  }

  function createDrone(frequency, type) {
    var oscillator = audio.createOscillator();
    var filter = audio.createBiquadFilter();
    var gain = makeGain(.0001);
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    filter.type = 'lowpass';
    filter.frequency.value = 240;
    filter.Q.value = 2.4;
    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(music);
    oscillator.start();
    drones.push({ oscillator: oscillator, filter: filter, gain: gain });
  }

  function ensureAudio() {
    if (audio || !AudioEngine) return !!audio;
    try {
      audio = new AudioEngine();
      master = makeGain(.0001);
      music = makeGain(.82);
      effects = makeGain(.72);
      music.connect(master);
      effects.connect(master);
      master.connect(audio.destination);
      createDrone(55, 'sine');
      createDrone(82.41, 'triangle');
      createDrone(116.54, 'sine');
      createNoise();
      return true;
    } catch (error) {
      audio = null;
      return false;
    }
  }

  function resume() {
    if (audio && audio.state === 'suspended') audio.resume().catch(function () {});
  }

  function applyMix() {
    if (!audio) return;
    var audible = active && !muted && !document.hidden;
    ramp(master.gain, audible ? .72 : .0001, audible ? .45 : .16);
    ramp(drones[0].gain.gain, audible ? .042 : .0001, .55);
    ramp(drones[1].gain.gain, audible ? (.009 + stage * .004) : .0001, .55);
    ramp(drones[2].gain.gain, audible ? (stage === 1 ? .002 : stage === 2 ? .005 : stage === 3 ? .009 : .012) : .0001, .55);
    ramp(atmosphere.gain.gain, audible ? (.003 + stage * .002) : .0001, .55);
    atmosphere.filter.frequency.setTargetAtTime(260 + stage * 85, audio.currentTime, .5);
  }

  function tone(frequency, duration, volume, type, delay, destination) {
    if (!audio) return;
    var start = audio.currentTime + (delay || 0);
    var oscillator = audio.createOscillator();
    var gain = audio.createGain();
    oscillator.type = type || 'sine';
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume || .04, start + .012);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(destination || effects);
    oscillator.start(start);
    oscillator.stop(start + duration + .03);
  }

  function sweep(from, to, duration, volume, type) {
    if (!audio) return;
    var start = audio.currentTime;
    var oscillator = audio.createOscillator();
    var gain = audio.createGain();
    oscillator.type = type || 'sine';
    oscillator.frequency.setValueAtTime(from, start);
    oscillator.frequency.exponentialRampToValueAtTime(to, start + duration);
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume || .04, start + .012);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(effects);
    oscillator.start(start);
    oscillator.stop(start + duration + .03);
  }

  function noiseBurst(duration, volume, centerFrequency, delay) {
    if (!audio) return;
    var length = Math.max(1, Math.floor(audio.sampleRate * duration));
    var buffer = audio.createBuffer(1, length, audio.sampleRate);
    var data = buffer.getChannelData(0);
    for (var index = 0; index < length; index += 1) data[index] = (Math.random() * 2 - 1) * (1 - index / length);
    var source = audio.createBufferSource();
    var filter = audio.createBiquadFilter();
    var gain = audio.createGain();
    var start = audio.currentTime + (delay || 0);
    source.buffer = buffer;
    filter.type = 'bandpass';
    filter.frequency.value = centerFrequency || 620;
    filter.Q.value = .8;
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume || .02, start + .018);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(effects);
    source.start(start);
  }

  function scheduleAmbient() {
    window.clearTimeout(ambientTimer);
    if (!active) return;
    ambientTimer = window.setTimeout(function () {
      if (active && !muted && !document.hidden && audio) {
        var notes = stage === 1 ? [174.61, 196] : stage === 2 ? [174.61, 207.65, 233.08] : stage === 3 ? [164.81, 207.65, 246.94] : [146.83, 185, 233.08];
        var note = notes[Math.floor(Math.random() * notes.length)];
        tone(note, 1.7, .012 + stage * .002, 'sine', 0, music);
        tone(note * 1.5, 1.05, .005, 'sine', .12, music);
      }
      scheduleAmbient();
    }, 5200 + Math.random() * 5200 - stage * 450);
  }

  function unlock() {
    if (!ensureAudio()) return;
    resume();
  }

  function activate(nextStage) {
    stage = Math.max(1, Math.min(4, Number(nextStage) || stage));
    active = true;
    if (!ensureAudio()) return;
    resume();
    applyMix();
    scheduleAmbient();
    updateButton();
  }

  function deactivate() {
    active = false;
    window.clearTimeout(ambientTimer);
    window.clearTimeout(duckTimer);
    applyMix();
  }

  function setStage(nextStage) {
    var next = Math.max(1, Math.min(4, Number(nextStage) || 1));
    if (stage === next) return;
    stage = next;
    applyMix();
    scheduleAmbient();
  }

  function play(name) {
    if (!active || muted || document.hidden || !ensureAudio()) return;
    resume();
    if (name === 'ui') {
      tone(620, .055, .018, 'sine');
    } else if (name === 'scan') {
      sweep(330, 880, .18, .027, 'sine');
      tone(1100, .07, .012, 'sine', .15);
    } else if (name === 'comm') {
      tone(760, .07, .02, 'square');
      tone(570, .1, .014, 'square', .085);
    } else if (name === 'select') {
      tone(440, .09, .025, 'sine');
    } else if (name === 'lock') {
      tone(392, .13, .038, 'triangle');
      tone(659.25, .16, .04, 'triangle', .035);
    } else if (name === 'success') {
      tone(392, .15, .034, 'triangle');
      tone(523.25, .18, .042, 'triangle', .08);
      tone(659.25, .22, .045, 'triangle', .16);
    } else if (name === 'complete') {
      tone(392, .25, .035, 'triangle');
      tone(523.25, .32, .045, 'triangle', .1);
      tone(659.25, .38, .05, 'triangle', .2);
      tone(783.99, .52, .04, 'sine', .32);
    } else if (name === 'error') {
      sweep(190, 92, .28, .045, 'sawtooth');
      tone(75, .22, .025, 'square', .08);
    } else if (name === 'hint' || name === 'message') {
      tone(880, .1, .026, 'sine');
      tone(name === 'message' ? 1174.66 : 1046.5, .2, .032, 'sine', .12);
    } else if (name === 'transition') {
      sweep(90, 360, .65, .035, 'sine');
      tone(523.25, .5, .028, 'sine', .34);
    } else if (name === 'mysteryLock') {
      tone(96, .24, .028, 'triangle');
      noiseBurst(.18, .018, 210, .08);
      tone(71, .18, .022, 'sine', .22);
    } else if (name === 'metalStep') {
      noiseBurst(.3, .025, 175);
      tone(68, .28, .029, 'sine', .035);
      tone(214, .09, .012, 'triangle', .04);
    } else if (name === 'interference') {
      noiseBurst(.3, .026, 980);
      tone(730, .05, .014, 'square', .025);
      tone(520, .04, .011, 'square', .12);
      tone(910, .035, .009, 'square', .2);
    } else if (name === 'flicker') {
      noiseBurst(.14, .018, 1500);
      tone(54, .12, .016, 'square');
    } else if (name === 'breath') {
      noiseBurst(.48, .013, 420);
      sweep(118, 84, .5, .009, 'sine');
    } else if (name === 'recordCut') {
      noiseBurst(.08, .024, 1200);
      tone(82, .1, .02, 'square', .035);
    } else if (name === 'anomaly') {
      tone(155.56, .34, .012, 'sine');
      tone(164.81, .32, .011, 'sine', .025);
      noiseBurst(.2, .008, 760, .08);
    } else if (name === 'reveal') {
      sweep(82, 246.94, .48, .025, 'sine');
      tone(369.99, .34, .017, 'sine', .3);
    }
  }

  function duck(duration, level) {
    if (!active || muted || !ensureAudio()) return;
    window.clearTimeout(duckTimer);
    ramp(music.gain, Math.max(.03, Number(level) || .08), .08);
    duckTimer = window.setTimeout(function () {
      if (music) ramp(music.gain, .82, .48);
    }, Math.max(120, Number(duration) || 800));
  }

  function updateButton() {
    if (!button) button = document.getElementById('soundBtn');
    if (!button) return;
    button.classList.toggle('muted', muted);
    button.setAttribute('aria-pressed', String(!muted));
    button.setAttribute('aria-label', muted ? '소리 켜기' : '소리 끄기');
    button.setAttribute('title', muted ? '배경음과 효과음 켜기' : '배경음과 효과음 끄기');
    button.innerHTML = '<span aria-hidden="true">' + (muted ? '🔇' : '🔊') + '</span>';
  }

  function toggle() {
    muted = !muted;
    try {
      window.localStorage.setItem(STORAGE_KEY, muted ? '1' : '0');
    } catch (error) {}
    unlock();
    applyMix();
    if (!muted) play('ui');
    updateButton();
    return !muted;
  }

  function bindControls() {
    button = document.getElementById('soundBtn');
    updateButton();
    if (button) button.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      toggle();
    });

    document.addEventListener('pointerdown', function (event) {
      if (active) unlock();
      var target = event.target.closest('[data-s1-draggable],[data-s2-draggable],[data-s3-draggable],[data-s3-distance-star]');
      if (target) play('select');
    }, true);

    document.addEventListener('click', function (event) {
      var target = event.target.closest('button');
      if (!target || target.id === 'soundBtn' || target.id === 'hintBtn' || target.disabled) return;
      if (target.matches('.s1-dialogue,.s2-dialogue,.s3-dialogue,.dialog')) play('comm');
      else if (target.matches('.s1-hotspot,.s2-hotspot,.s3-hotspot,.hot')) play('scan');
      else if (!target.matches('[data-s1-draggable],[data-s2-draggable],[data-s3-draggable],[data-s3-distance-star]')) play('ui');
    }, true);

    document.addEventListener('keydown', function () {
      if (active) unlock();
    }, true);

    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && active) resume();
      applyMix();
    });
  }

  window.StarEscapeSound = {
    activate: activate,
    bindControls: bindControls,
    deactivate: deactivate,
    duck: duck,
    isMuted: function () { return muted; },
    play: play,
    setStage: setStage,
    toggle: toggle,
    unlock: unlock,
    updateButton: updateButton,
  };
})();
