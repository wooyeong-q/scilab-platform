(function () {
  'use strict';

  var AudioEngine = window.AudioContext || window.webkitAudioContext;
  var STORAGE_KEY = 'scilab-star-escape-sound-muted';
  var audio = null;
  var master = null;
  var music = null;
  var effects = null;
  var returnBed = null;
  var active = false;
  var muted = false;
  var stage = 1;
  var duckTimer = 0;
  var mysteryTimer = 0;
  var duckScale = 1;
  var mysteryLevel = 0;
  var tracks = null;
  var trackFades = {};
  var tracksPrimed = false;
  var stageSwitching = false;
  var stageSwitchTimer = 0;
  var lastPlayError = '';
  var button = null;
  var AUDIO_ROOT = '/labs/star-escape/assets/audio/';
  var EFFECT_ALIASES = {
    item: 'select',
    open: 'mechanicalOpen',
    unlock: 'mechanicalUnlock',
    recording: 'radioStatic',
    restore: 'reveal',
    knock: 'metalStep',
    insert: 'mechanicalLatch',
    scene1_extra_lock: 'mysteryLock',
    scene1_unknown_signal: 'radioStatic',
    scene2_footstep: 'metalStep',
    scene2_recorder: 'radioStatic',
    scene3_screen_glitch: 'interference',
    scene3_shadow_event: 'anomaly',
    scene3_final_record: 'recordCut',
    scene4_reflection_silhouette: 'anomaly',
    scene4_signal_intrusion: 'interference',
    scene4_receiver_five: 'radioStatic',
    scene4_blackout: 'powerCut',
    scene4_corridor_presence: 'breath',
    scene4_panel_knock: 'metalStep',
    scene4_final_record: 'recordCut',
    scene4_cctv_noise: 'radioStaticStrong',
    scene4_exit: 'doorDread',
  };
  // Source files have very different loudness. These gains keep the score present without masking dialogue.
  var TRACK_CONFIG = {
    selpan: { src: AUDIO_ROOT + 'bgm-selpan.mp3', volume: .013 },
    goats: { src: AUDIO_ROOT + 'bgm-goats.mp3', volume: .040 },
    delirium: { src: AUDIO_ROOT + 'bgm-delirium.mp3', volume: .0085 },
  };
  var STAGE_TRACK = {
    1: 'selpan',
    2: 'goats',
    3: 'delirium',
    4: 'returnSignal',
  };
  var SCENE_DREAD = {
    1: .34,
    2: .52,
    3: 0,
    4: .78,
  };
  var DREAD_RATE = {
    1: .82,
    2: .72,
    3: 1,
    4: .58,
  };

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

  function ensureAudio() {
    if (audio || !AudioEngine) return !!audio;
    try {
      audio = new AudioEngine();
      master = makeGain(.0001);
      music = makeGain(.58);
      effects = makeGain(.48);
      music.connect(master);
      effects.connect(master);
      master.connect(audio.destination);
      return true;
    } catch (error) {
      audio = null;
      return false;
    }
  }

  function ensureReturnBed() {
    if (returnBed || !ensureAudio()) return returnBed;
    var output = makeGain(.0001);
    var voices = [
      { frequency: 49, level: .34, type: 'sine', detune: -3 },
      { frequency: 65.41, level: .22, type: 'sine', detune: 4 },
      { frequency: 98, level: .10, type: 'triangle', detune: -7 },
    ];
    var pulseTarget = null;
    output.connect(music);
    voices.forEach(function (voice) {
      var oscillator = audio.createOscillator();
      var gain = makeGain(voice.level);
      oscillator.type = voice.type;
      oscillator.frequency.value = voice.frequency;
      oscillator.detune.value = voice.detune;
      oscillator.connect(gain);
      gain.connect(output);
      oscillator.start();
      if (!pulseTarget) pulseTarget = gain;
    });
    var pulse = audio.createOscillator();
    var pulseDepth = makeGain(.009);
    pulse.type = 'sine';
    pulse.frequency.value = .11;
    pulse.connect(pulseDepth);
    pulseDepth.connect(pulseTarget.gain);
    pulse.start();
    returnBed = output;
    return returnBed;
  }

  function resume() {
    if (audio && audio.state === 'suspended') audio.resume().catch(function () {});
  }

  function ensureTracks() {
    if (tracks) return tracks;
    tracks = {};
    Object.keys(TRACK_CONFIG).forEach(function (name) {
      var element = new Audio(TRACK_CONFIG[name].src);
      element.loop = true;
      element.preload = 'auto';
      element.volume = 0;
      element.preservesPitch = false;
      element.webkitPreservesPitch = false;
      element.setAttribute('aria-hidden', 'true');
      tracks[name] = element;
    });
    return tracks;
  }

  function rememberPlayError(name, error) {
    lastPlayError = name + ': ' + (error && error.name ? error.name : 'play failed');
  }

  function tryPlay(name) {
    if (!tracks || !tracks[name] || !tracks[name].paused) return;
    var attempt = tracks[name].play();
    if (attempt && attempt.catch) attempt.catch(function (error) { rememberPlayError(name, error); });
  }

  function primeTracks() {
    ensureTracks();
    if (tracksPrimed) return;
    tracksPrimed = true;
    Object.keys(tracks).forEach(function (name) {
      var element = tracks[name];
      var attempt = element.play();
      if (!attempt || !attempt.then) return;
      attempt.then(function () {
        var selected = STAGE_TRACK[stage] || STAGE_TRACK[1];
        var needed = name === selected || (name === 'delirium' && (SCENE_DREAD[stage] || 0) > 0);
        if ((!needed || stageSwitching) && element.volume <= .0001) element.pause();
      }).catch(function (error) {
        tracksPrimed = false;
        rememberPlayError(name, error);
      });
    });
  }

  function stopTrack(name, reset) {
    if (!tracks || !tracks[name]) return;
    if (trackFades[name]) window.cancelAnimationFrame(trackFades[name]);
    delete trackFades[name];
    tracks[name].volume = 0;
    tracks[name].pause();
    if (reset) {
      try { tracks[name].currentTime = 0; } catch (error) {}
    }
  }

  function stopAllTracks(reset) {
    if (!tracks) return;
    Object.keys(tracks).forEach(function (name) { stopTrack(name, reset); });
  }

  function startTracks() {
    ensureTracks();
    var current = STAGE_TRACK[stage] || STAGE_TRACK[1];
    tryPlay(current);
  }

  function fadeTrack(name, target, duration) {
    if (!tracks || !tracks[name]) return;
    var element = tracks[name];
    var start = element.volume;
    var finish = Math.max(0, Math.min(1, Number(target) || 0));
    var startedAt = performance.now();
    if (finish > 0 && element.paused) tryPlay(name);
    if (trackFades[name]) window.cancelAnimationFrame(trackFades[name]);
    function step(now) {
      var progress = Math.min(1, (now - startedAt) / Math.max(1, duration || 500));
      var eased = 1 - Math.pow(1 - progress, 3);
      element.volume = Math.max(0, Math.min(1, start + (finish - start) * eased));
      if (progress < 1) trackFades[name] = window.requestAnimationFrame(step);
      else {
        delete trackFades[name];
        if (finish <= .0001) element.pause();
      }
    }
    trackFades[name] = window.requestAnimationFrame(step);
  }

  function applyMix() {
    var audible = active && !muted && !document.hidden && !stageSwitching;
    var current = STAGE_TRACK[stage] || STAGE_TRACK[1];
    var mix = audible ? duckScale : 0;
    var baseScale = 1 - mysteryLevel * .68;
    var dreadLevel = SCENE_DREAD[stage] || 0;
    ensureTracks();
    if (tracks.delirium) tracks.delirium.playbackRate = DREAD_RATE[stage] || 1;
    Object.keys(TRACK_CONFIG).forEach(function (name) {
      var target = name === current ? TRACK_CONFIG[name].volume * mix * baseScale : 0;
      if (name === 'delirium' && current !== 'delirium') {
        target = TRACK_CONFIG.delirium.volume * mix * Math.max(dreadLevel * baseScale, mysteryLevel * .72);
      }
      fadeTrack(name, target, audible ? 520 : 120);
    });
    if (current === 'returnSignal') ensureReturnBed();
    if (returnBed) ramp(returnBed.gain, audible && current === 'returnSignal' ? .085 * mix * baseScale : .0001, audible ? .52 : .12);
    if (audio && master) ramp(master.gain, audible ? .24 : .0001, audible ? .3 : .1);
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

  function sweep(from, to, duration, volume, type, destination) {
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
    gain.connect(destination || effects);
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
    gain.gain.exponentialRampToValueAtTime((volume || .02) * .55, start + .018);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(effects);
    source.start(start);
  }

  function unlock() {
    ensureAudio();
    primeTracks();
    if (!stageSwitching) startTracks();
    resume();
    applyMix();
  }

  function activate(nextStage) {
    stage = Math.max(1, Math.min(4, Number(nextStage) || stage));
    active = true;
    ensureAudio();
    primeTracks();
    startTracks();
    resume();
    applyMix();
    updateButton();
  }

  function deactivate() {
    active = false;
    window.clearTimeout(duckTimer);
    window.clearTimeout(mysteryTimer);
    duckScale = 1;
    mysteryLevel = 0;
    window.clearTimeout(stageSwitchTimer);
    stageSwitching = false;
    applyMix();
  }

  function setStage(nextStage) {
    var next = Math.max(1, Math.min(4, Number(nextStage) || 1));
    if (stage === next) return;
    window.clearTimeout(stageSwitchTimer);
    ensureTracks();
    stopAllTracks(true);
    stage = next;
    window.clearTimeout(mysteryTimer);
    mysteryLevel = 0;
    stageSwitching = true;
    applyMix();
    stageSwitchTimer = window.setTimeout(function () {
      stageSwitching = false;
      if (active && !muted && !document.hidden) startTracks();
      applyMix();
    }, 700);
  }

  function play(name) {
    if (!active || muted || document.hidden || !ensureAudio()) return;
    name = EFFECT_ALIASES[name] || name;
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
    } else if (name === 'lock' || name === 'mechanicalLatch') {
      noiseBurst(.055, .052, 880);
      tone(176, .08, .058, 'square');
      tone(92, .13, .052, 'triangle', .055);
      noiseBurst(.04, .034, 430, .085);
    } else if (name === 'mechanicalUnlock') {
      noiseBurst(.06, .062, 760);
      tone(126, .12, .065, 'square');
      noiseBurst(.05, .050, 520, .12);
      tone(238, .20, .046, 'triangle', .13);
    } else if (name === 'mechanicalOpen') {
      noiseBurst(.075, .056, 620);
      tone(148, .12, .058, 'square');
      sweep(112, 58, .32, .052, 'triangle');
      noiseBurst(.10, .035, 240, .16);
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
      noiseBurst(.07, .058, 640);
      tone(104, .24, .048, 'triangle');
      noiseBurst(.20, .032, 210, .08);
      tone(67, .30, .038, 'sine', .18);
    } else if (name === 'metalStep') {
      noiseBurst(.34, .045, 175);
      tone(62, .34, .048, 'sine', .035);
      tone(214, .12, .026, 'triangle', .04);
      noiseBurst(.12, .028, 390, .06);
    } else if (name === 'interference') {
      noiseBurst(.3, .026, 980);
      tone(730, .05, .014, 'square', .025);
      tone(520, .04, .011, 'square', .12);
      tone(910, .035, .009, 'square', .2);
    } else if (name === 'radioStatic') {
      noiseBurst(.68, .086, 1450);
      noiseBurst(.38, .064, 720, .18);
      tone(960, .04, .034, 'square', .04);
      tone(520, .06, .030, 'square', .29);
      noiseBurst(.09, .050, 2100, .48);
    } else if (name === 'radioStaticStrong') {
      noiseBurst(.92, .12, 1320);
      noiseBurst(.62, .085, 430, .12);
      tone(1020, .05, .042, 'square', .03);
      tone(430, .08, .036, 'square', .35);
      noiseBurst(.16, .072, 2300, .62);
    } else if (name === 'exitUnlock') {
      noiseBurst(.08, .075, 580);
      tone(118, .18, .075, 'square');
      noiseBurst(.075, .060, 420, .16);
      tone(72, .42, .064, 'triangle', .17);
      sweep(260, 92, .38, .038, 'triangle');
    } else if (name === 'powerCut') {
      noiseBurst(.12, .080, 1100);
      tone(86, .16, .060, 'square');
      sweep(132, 43, .62, .062, 'sawtooth');
    } else if (name === 'doorDread') {
      sweep(118, 54, .9, .052, 'sine');
      tone(73.42, .7, .036, 'triangle', .08);
      tone(77.78, .62, .028, 'triangle', .11);
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
    if (!active || muted) return;
    window.clearTimeout(duckTimer);
    duckScale = Math.max(.12, Math.min(.72, (Number(level) || .08) * 3));
    applyMix();
    duckTimer = window.setTimeout(function () {
      duckScale = 1;
      applyMix();
    }, Math.max(120, Number(duration) || 800));
  }

  function mystery(duration, strength) {
    if (!active) return;
    ensureTracks();
    startTracks();
    window.clearTimeout(mysteryTimer);
    if (tracks.delirium && mysteryLevel < .1) {
      try { tracks.delirium.currentTime = 0; } catch (error) {}
    }
    mysteryLevel = Math.max(.35, Math.min(1, Number(strength) || .78));
    applyMix();
    mysteryTimer = window.setTimeout(function () {
      mysteryLevel = 0;
      applyMix();
    }, Math.max(1500, Number(duration) || 8000));
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
    mystery: mystery,
    setStage: setStage,
    toggle: toggle,
    unlock: unlock,
    updateButton: updateButton,
    debugState: function () {
      var state = { stage: stage, track: STAGE_TRACK[stage], switching: stageSwitching, lastPlayError: lastPlayError, tracks: {} };
      if (tracks) Object.keys(tracks).forEach(function (name) {
        state.tracks[name] = { paused: tracks[name].paused, volume: tracks[name].volume, currentTime: tracks[name].currentTime, playbackRate: tracks[name].playbackRate };
      });
      state.tracks.returnSignal = { paused: !returnBed || returnBed.gain.value <= .0001, volume: returnBed ? returnBed.gain.value : 0, currentTime: audio ? audio.currentTime : 0 };
      return state;
    },
  };
})();
