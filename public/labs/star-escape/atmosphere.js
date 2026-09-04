(function () {
  'use strict';

  var game = null;
  var sound = null;
  var getState = null;
  var observer = null;
  var root = null;
  var active = false;
  var scheduled = false;
  var previous = null;
  var timers = [];
  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var silhouetteImages = {
    's1-between-devices': '/labs/star-escape/assets/atmosphere/silhouette-s1-between-devices.webp',
    's1-storage-lean': '/labs/star-escape/assets/atmosphere/silhouette-s1-storage-user.webp',
    's1-door-half': '/labs/star-escape/assets/atmosphere/silhouette-s1-door-half.webp',
    's2-crouched': '/labs/star-escape/assets/atmosphere/silhouette-s2-crouched.webp',
    's2-door-edge': '/labs/star-escape/assets/atmosphere/silhouette-s2-approach-stand.webp',
    's3-desk-peek': '/labs/star-escape/assets/atmosphere/silhouette-s3-desk-peek.webp',
    's3-wall-shadow': '/labs/star-escape/assets/scene04/scene04_silhouette_master.webp',
  };
  var scene2ApproachFrames = [
    '/labs/star-escape/assets/atmosphere/silhouette-s2-approach-stand.webp',
    '/labs/star-escape/assets/atmosphere/silhouette-s2-approach-right.webp',
    '/labs/star-escape/assets/atmosphere/silhouette-s2-approach-left.webp',
  ];

  function later(callback, delay) {
    var timer = window.setTimeout(function () {
      timers = timers.filter(function (value) { return value !== timer; });
      if (active) callback();
    }, delay || 0);
    timers.push(timer);
    return timer;
  }

  function clearTimers() {
    timers.forEach(window.clearTimeout);
    timers = [];
  }

  function stateSnapshot() {
    var value = getState ? getState() : null;
    if (!value || !value.progress || !value.player || !value.session) return null;
    return {
      identity: [value.session.code, value.player.team, value.player.id, value.session.startedAt || 'waiting'].join(':'),
      stage: Number(value.progress.stage || 1),
      question: Number(value.progress.question || 1),
      role: Number(value.player.role || 1),
      sceneState: Object.assign({}, value.progress.sceneState || {}),
    };
  }

  function storageKey(snapshot, name) {
    return 'scilab-star-escape-atmosphere-v6:' + snapshot.identity + ':' + name;
  }

  function once(snapshot, name, callback) {
    if (!snapshot) return false;
    var key = storageKey(snapshot, name);
    try {
      if (window.localStorage.getItem(key) === 'seen') return false;
      window.localStorage.setItem(key, 'seen');
    } catch (error) {
      if (root && root.dataset['seen' + name]) return false;
      if (root) root.dataset['seen' + name] = '1';
    }
    callback();
    return true;
  }

  function markup() {
    return '<div class="scene-atmosphere-vignette"></div>' +
      '<div class="scene-atmosphere-noise"></div>' +
      '<div class="scene-atmosphere-scan"></div>' +
      '<div class="scene-atmosphere-flicker"></div>' +
      '<div class="scene-atmosphere-panel-pulse"></div>' +
      '<div class="scene-atmosphere-silhouette"><img alt=""></div>' +
      '<div class="scene-atmosphere-glitch"></div>' +
      '<div class="scene-atmosphere-note"></div>' +
      '<div class="scene-atmosphere-tear"></div>';
  }

  function ensureRoot(snapshot) {
    if (!game || !active) return null;
    root = game.querySelector(':scope > .scene-atmosphere');
    if (!root) {
      root = document.createElement('div');
      root.className = 'scene-atmosphere';
      root.setAttribute('aria-hidden', 'true');
      root.innerHTML = markup();
      game.appendChild(root);
    }
    root.dataset.stage = String(Math.max(1, Math.min(4, snapshot && snapshot.stage || 1)));
    return root;
  }

  function replayClass(element, className, duration) {
    if (!element || reducedMotion) return;
    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);
    later(function () { if (element.isConnected) element.classList.remove(className); }, duration || 700);
  }

  function play(name) {
    if (sound && typeof sound.play === 'function') sound.play(name);
  }

  function duck(duration, level) {
    if (sound && typeof sound.duck === 'function') sound.duck(duration, level);
  }

  function mystery(duration, strength) {
    if (sound && typeof sound.mystery === 'function') sound.mystery(duration, strength);
  }

  function note(text) {
    ensureRoot(previous || stateSnapshot());
    if (!root) return;
    var element = root.querySelector('.scene-atmosphere-note');
    element.textContent = text;
    replayClass(element, 'show', 2300);
  }

  function flicker(red) {
    ensureRoot(previous || stateSnapshot());
    if (!root) return;
    var element = root.querySelector('.scene-atmosphere-flicker');
    element.classList.toggle('red', !!red);
    replayClass(element, 'show', 2100);
    play('flicker');
  }

  function blackout(duration, red) {
    ensureRoot(previous || stateSnapshot());
    if (!root) return;
    root.classList.toggle('red-blackout', !!red);
    root.classList.add('blackout');
    later(function () {
      if (root) root.classList.remove('blackout', 'red-blackout');
    }, duration || 620);
  }

  function panelPulse() {
    ensureRoot(previous || stateSnapshot());
    if (!root) return;
    replayClass(root.querySelector('.scene-atmosphere-panel-pulse'), 'show', 760);
    play('flicker');
  }

  function roomIsClear() {
    if (!game || !game.querySelector('.s1-room,.s2-room,.s3-room,.scene-transition-to-4')) return false;
    return !game.querySelector('.s1-dialogue,.s1-inspect,.s2-dialogue,.s2-ending-dialogue,.s2-inspect,.s3-dialogue,.s3-result-overlay,.dialog,[role="dialog"]');
  }

  function silhouette(kind, context) {
    var snapshot = stateSnapshot();
    context = context || { stage: snapshot && snapshot.stage, attempts: 0, settled: false, duration: 5200, allowDuringModal: false };
    if (!snapshot || snapshot.stage !== context.stage || reducedMotion) return;
    ensureRoot(snapshot);
    if (!root) return;
    if (!context.allowDuringModal && !roomIsClear()) {
      if (context.attempts < 180) later(function () {
        silhouette(kind, { stage: context.stage, attempts: context.attempts + 1, settled: false, duration: context.duration, mystery: context.mystery, allowDuringModal: context.allowDuringModal });
      }, 400);
      return;
    }
    if (context.attempts > 0 && !context.settled) {
      later(function () {
        silhouette(kind, { stage: context.stage, attempts: context.attempts, settled: true, duration: context.duration, mystery: context.mystery, allowDuringModal: context.allowDuringModal });
      }, 480);
      return;
    }
    var element = root.querySelector('.scene-atmosphere-silhouette');
    var image = element.querySelector('img');
    if (!silhouetteImages[kind]) return;
    image.src = silhouetteImages[kind];
    element.className = 'scene-atmosphere-silhouette ' + kind;
    element.style.setProperty('--silhouette-duration', ((context.duration || 5200) / 1000) + 's');
    if (context.allowDuringModal) {
      root.classList.add('front');
      later(function () { if (root) root.classList.remove('front'); }, (context.duration || 5200) + 80);
    }
    replayClass(element, 'show', context.duration || 5200);
    if (kind === 's2-door-edge') {
      var frameCount = Math.max(1, Math.floor(((context.duration || 6800) - 900) / 500));
      for (var frame = 0; frame < frameCount; frame += 1) {
        (function (frameIndex) {
          later(function () {
            if (!image.isConnected || !element.classList.contains('s2-door-edge')) return;
            image.src = scene2ApproachFrames[1 + (frameIndex % 2)];
          }, 900 + frameIndex * 500);
        })(frame);
      }
    }
    if (context.mystery) mystery(context.mystery.duration, context.mystery.strength);
    play(/door/.test(kind) ? 'doorDread' : 'anomaly');
  }

  function radioInterference(strong) {
    ensureRoot(previous || stateSnapshot());
    if (!root || reducedMotion) return;
    replayClass(root, strong ? 'radio-active-strong' : 'radio-active', strong ? 820 : 620);
    replayClass(root.querySelector('.scene-atmosphere-tear'), 'show', strong ? 650 : 430);
    play(strong ? 'radioStaticStrong' : 'radioStatic');
  }

  function glitch(html, isError) {
    ensureRoot(previous || stateSnapshot());
    if (!root || reducedMotion) return;
    var element = root.querySelector('.scene-atmosphere-glitch');
    element.classList.toggle('error', !!isError);
    element.innerHTML = html;
    replayClass(element, 'show', 560);
    replayClass(root.querySelector('.scene-atmosphere-tear'), 'show', 410);
    play('interference');
  }

  function sceneEntry(snapshot) {
    once(snapshot, 'scene-' + snapshot.stage + '-entry', function () {
      if (snapshot.stage === 1) {
        later(function () { blackout(420, true); play('scene1_extra_lock'); note('비상 전력으로 전환합니다.'); }, 260);
        later(function () { note('주 전력 차단 · 중앙 통로 봉쇄'); }, 820);
      } else if (snapshot.stage === 2) {
        later(function () { play('interference'); note('공식 통신 기록 없음'); }, 1150);
      } else if (snapshot.stage === 3) {
        later(function () { play('scene3_screen_glitch'); glitch('자동 분석 · 가장 밝게 관측되는 별 <strong>A → C → A</strong>', true); }, 1250);
      } else if (snapshot.stage === 4) {
        later(function () { play('mysteryLock'); note('잠금 기록 불일치'); }, 800);
      }
    });
  }

  function stateEvents(snapshot) {
    var before = previous;
    if (!before || before.identity !== snapshot.identity) return;
    if (snapshot.stage === 1 && before.stage === 1 && before.question !== snapshot.question) {
      if (snapshot.question === 2) once(snapshot, 'scene-1-power-restored', function () {
        later(function () { blackout(360, true); play('scene1_unknown_signal'); note('비상 전력 복구'); }, 260);
        later(function () { note('관측 시스템 일부를 사용할 수 있습니다.'); }, 820);
        later(function () { radioInterference(false); note('미등록 음향 신호 · 발생 위치 확인 불가'); }, 1280);
      });
      if (snapshot.question === 3) once(snapshot, 'scene-1-record-restored', function () {
        later(function () { note('관측 자료 복원'); }, 260);
        later(function () { note('사고 발생 시각과 손상 시각 불일치'); }, 860);
      });
    }
    if (snapshot.stage === 2 && before.stage === 2 && before.question !== snapshot.question) {
      if (snapshot.question === 2) once(snapshot, 'scene-2-calibration-step', function () { later(function () { play('scene2_footstep'); note('관측 센서가 정상 범위로 복귀했습니다.'); }, 650); later(function () { note('이동성 음향 신호 · 등록 기록 없음'); }, 1000); });
      if (snapshot.question === 3) once(snapshot, 'scene-2-panel-prelight', function () { later(panelPulse, 500); });
    }
    if (snapshot.stage === 3 && before.stage === 3) {
      var oldState = before.sceneState || {};
      var newState = snapshot.sceneState || {};
      if (!oldState.p1Complete && newState.p1Complete) once(snapshot, 'scene-3-p1-complete', function () { later(function () { play('scene3_screen_glitch'); note('등급 기준 복구 완료'); }, 420); later(function () { note('복구 명령 외 장치 작동 감지'); }, 920); });
      if (!oldState.q2Complete && newState.q2Complete) once(snapshot, 'scene-3-q2-reversal', function () { duck(1150, .04); mystery(7200, .68); later(function () { play('scene3_shadow_event'); note('실제 밝기 판단 불가 · 거리 조건 불일치'); }, 150); later(function () { note('거리 비교 장치를 사용할 수 있습니다.'); }, 900); });
      if (!oldState.p3Aligned && newState.p3Aligned) once(snapshot, 'scene-3-ten-pc-silence', function () { duck(950, .025); mystery(8800, .76); later(function () { play('reveal'); }, 780); });
      if (!oldState.q3Complete && newState.q3Complete) once(snapshot, 'scene-3-reference-read-error', function () { later(function () { play('scene3_screen_glitch'); glitch('기준값 불일치', true); }, 80); later(function () { note('기준 별 C · 실제 밝기 확인 완료'); }, 700); });
      if (!oldState.p4Complete && newState.p4Complete) once(snapshot, 'scene-3-panel-prelight', function () { later(function () { panelPulse(); flicker(true); }, 380); });
      if (!oldState.recordingStarted && newState.recordingStarted) once(snapshot, 'scene-3-recording-breath', function () { duck(900, .08); play('breath'); });
      if (!oldState.recordingComplete && newState.recordingComplete) once(snapshot, 'scene-3-recording-cut', function () { duck(1200, .04); mystery(15000, .98); later(function () { play('scene3_final_record'); }, 520); later(function () { note('기록 종료 · 4번 구획 접근 권한 복구'); }, 1000); });
    }
  }

  function domEvents(snapshot) {
    if (snapshot.stage === 1 && snapshot.question <= 2 && game.querySelector('.s1-puzzle')) {
      once(snapshot, 'scene-1-record-glitch-q' + snapshot.question, function () { later(function () { glitch('기록 수정 · <strong>17분 전</strong>', false); }, 700); });
    }
    if (snapshot.stage === 1 && game.querySelector('.s1-room') && !game.querySelector('.s1-ending,.s1-dialogue,.s1-puzzle,.s1-inspect')) {
      once(snapshot, 'scene-1-free-exploration-silhouette', function () {
        later(function () { silhouette('s1-between-devices', { stage: 1, attempts: 0, settled: false, duration: 700, mystery: { duration: 4200, strength: .42 } }); }, 1150);
      });
    }
    if (game.querySelector('.s1-ending')) {
      once(snapshot, 'scene-1-ending-signal-v3', function () {
        duck(1500, .14); mystery(18000, .96); later(function () { radioInterference(true); note('미확인 신호 수신'); }, 220); later(function () { play('breath'); }, 880);
      });
    }
    var scene2Signal = game.querySelector('.s2-panel-signal-stage .s2-ending-dialogue');
    if (scene2Signal) {
      var scene2Speaker = scene2Signal.querySelector('small');
      var scene2Line = scene2Signal.querySelector('p');
      if (scene2Speaker && scene2Speaker.textContent.trim() === '미확인 음성') {
        var scene2VoiceKey = (scene2Line && scene2Line.textContent || 'unknown').replace(/\s+/g, ' ').trim().slice(0, 36);
        once(snapshot, 'scene-2-transmitter-voice-' + scene2VoiceKey, function () { duck(1750, .16); mystery(9200, .8); later(function () { radioInterference(false); }, 40); });
      }
    }
    if (snapshot.stage === 2 && snapshot.question === 3 && game.querySelector('.s2-room-stage3')) {
      once(snapshot, 'scene-2-distance-crouched-silhouette-v2', function () {
        later(function () { silhouette('s2-crouched', { stage: 2, attempts: 0, settled: false, duration: 6200, mystery: { duration: 9800, strength: .8 } }); }, 900);
      });
    }
    if (game.querySelector('.s2-door-open-notice')) {
      once(snapshot, 'scene-2-open-door-silhouette-v6', function () {
        mystery(15000, .94); later(function () {
          silhouette('s2-door-edge', { stage: snapshot.stage, attempts: 0, settled: true, duration: 6800 });
          later(function () { flicker(true); }, 5800);
        }, 520);
      });
    }
    if (snapshot.stage === 3 && snapshot.question === 1 && game.querySelector('.s3-room-base')) {
      once(snapshot, 'scene-3-desk-peek-silhouette-v3', function () {
        later(function () { silhouette('s3-desk-peek', { stage: 3, attempts: 0, settled: false, duration: 6000, mystery: { duration: 9000, strength: .72 } }); }, 1350);
      });
    }
    if (snapshot.stage === 3 && snapshot.question === 3 && game.querySelector('.s3-puzzle-distance')) {
      once(snapshot, 'scene-3-distance-wall-shadow', function () {
        later(function () { flicker(false); silhouette('s3-wall-shadow', { stage: 3, attempts: 0, settled: true, duration: 700, allowDuringModal: true, mystery: { duration: 2400, strength: .54 } }); }, 900);
      });
    }
    var scene3Recording = game.querySelector('.s3-recording-screen .s3-recording-card');
    if (scene3Recording && !game.querySelector('#s3Proceed')) {
      var scene3Speaker = scene3Recording.querySelector('small');
      var scene3Line = scene3Recording.querySelector('.s3-recording-line');
      var speakerName = scene3Speaker && scene3Speaker.textContent.trim();
      if (speakerName === '미확인 음성' || speakerName === '잡음') {
        var scene3VoiceKey = (scene3Line && scene3Line.textContent || speakerName).replace(/\s+/g, ' ').trim().slice(0, 36);
        once(snapshot, 'scene-3-recorder-voice-' + scene3VoiceKey, function () { duck(speakerName === '잡음' ? 1100 : 1650, .16); mystery(speakerName === '잡음' ? 6200 : 10500, speakerName === '잡음' ? .64 : .86); later(function () { radioInterference(speakerName === '잡음'); }, 35); });
      }
    }
    if (snapshot.stage === 3 && game.querySelector('.s3-result-overlay') && /가장 밝게 보이는 별 A/.test(game.textContent)) {
      once(snapshot, 'scene-3-result-a-anomaly', function () { duck(1150, .04); later(function () { play('interference'); flicker(true); }, 120); });
    }
    if (snapshot.stage >= 4 && game.querySelector('.scene-transition-to-4')) {
      once(snapshot, 'scene-4-connection-noise', function () { duck(700, .12); later(function () { play('metalStep'); }, 300); });
    }
  }

  function sync() {
    scheduled = false;
    if (!active || !game) return;
    var snapshot = stateSnapshot();
    if (!snapshot) return;
    ensureRoot(snapshot);
    sceneEntry(snapshot);
    stateEvents(snapshot);
    domEvents(snapshot);
    previous = snapshot;
  }

  function scheduleSync() {
    if (scheduled || !active) return;
    scheduled = true;
    window.requestAnimationFrame(sync);
  }

  function handleClick(event) {
    if (!active) return;
    var snapshot = stateSnapshot();
    if (!snapshot) return;
    var target = event.target.closest && event.target.closest('button');
    if (!target) return;
    if (snapshot.stage === 2 && snapshot.question === 2 && snapshot.role === 4 && target.matches('[data-s2-clue-open],#s2ClueTab')) {
      once(snapshot, 'scene-2-route-check', function () { later(function () { glitch('전송 경로 확인 불가 · <strong>우회 수신 완료</strong>', true); }, 120); });
    }
    scheduleSync();
  }

  function bind(options) {
    game = options && options.game || document.getElementById('game');
    sound = options && options.sound || null;
    getState = options && options.getState || null;
    if (!game || observer) return;
    observer = new MutationObserver(scheduleSync);
    observer.observe(game, { childList: true, subtree: true });
    document.addEventListener('click', handleClick, true);
  }

  function activate() { active = true; scheduleSync(); }
  function deactivate() { active = false; scheduled = false; previous = null; clearTimers(); if (root && root.isConnected) root.remove(); root = null; }

  window.StarEscapeAtmosphere = { activate: activate, bind: bind, deactivate: deactivate, refresh: scheduleSync };
})();
