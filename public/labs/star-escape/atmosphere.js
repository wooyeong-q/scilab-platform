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
  var silhouetteImage = '/labs/star-escape/assets/atmosphere/silhouette-uncanny.webp';

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
    return 'scilab-star-escape-atmosphere-v2:' + snapshot.identity + ':' + name;
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
      '<div class="scene-atmosphere-silhouette"><img src="' + silhouetteImage + '" alt=""></div>' +
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
    replayClass(element, 'show', 1250);
    play('flicker');
  }

  function panelPulse() {
    ensureRoot(previous || stateSnapshot());
    if (!root) return;
    replayClass(root.querySelector('.scene-atmosphere-panel-pulse'), 'show', 760);
    play('flicker');
  }

  function silhouette(position) {
    ensureRoot(previous || stateSnapshot());
    if (!root || reducedMotion) return;
    var element = root.querySelector('.scene-atmosphere-silhouette');
    element.className = 'scene-atmosphere-silhouette ' + (position || 'right');
    replayClass(element, 'show', 520);
    play('anomaly');
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
        later(function () {
          play('mysteryLock');
          note('추가 잠금 기록은 없습니다.');
        }, 950);
        later(function () { silhouette('right'); }, 4200);
      } else if (snapshot.stage === 2) {
        later(function () {
          play('interference');
          note('공식 통신 장비 · 송신 기록 없음');
        }, 1150);
        later(function () { silhouette('left'); }, 4600);
      } else if (snapshot.stage === 3) {
        later(function () {
          glitch('자동 분석 · 가장 밝게 관측되는 별 <strong>A → C → A</strong>', true);
        }, 1250);
        later(function () { silhouette('panel'); }, 4500);
      } else if (snapshot.stage === 4) {
        later(function () {
          play('mysteryLock');
          note('잠금 기록이 일치하지 않습니다.');
        }, 800);
        later(function () { silhouette('center'); }, 4200);
      }
    });
  }

  function stateEvents(snapshot) {
    var before = previous;
    if (!before || before.identity !== snapshot.identity) return;

    if (snapshot.stage === 2 && before.stage === 2 && before.question !== snapshot.question) {
      if (snapshot.question === 2) once(snapshot, 'scene-2-calibration-step', function () {
        later(function () { play('metalStep'); note('감지된 금속 진동 · 기록 없음'); }, 650);
      });
      if (snapshot.question === 3) once(snapshot, 'scene-2-panel-prelight', function () {
        later(panelPulse, 500);
      });
    }

    if (snapshot.stage === 3 && before.stage === 3) {
      var oldState = before.sceneState || {};
      var newState = snapshot.sceneState || {};
      if (!oldState.p1Complete && newState.p1Complete) once(snapshot, 'scene-3-p1-complete', function () {
        later(function () { play('metalStep'); note('복구 명령 외 장치 반응 감지'); }, 420);
      });
      if (!oldState.dataSent && newState.dataSent && snapshot.role === 3) once(snapshot, 'scene-3-transfer-shadow', function () {
        later(function () { silhouette('center'); }, 180);
      });
      if (!oldState.q2Complete && newState.q2Complete) once(snapshot, 'scene-3-q2-reversal', function () {
        duck(1150, .06);
        later(function () { flicker(false); play('breath'); }, 150);
      });
      var oldPositions = oldState.p3Positions || {};
      var newPositions = newState.p3Positions || {};
      var crossedRing = ['A', 'B', 'C', 'D'].some(function (letter) {
        return Math.abs(Number(oldPositions[letter]) - 50) > 8 && Math.abs(Number(newPositions[letter]) - 50) <= 8;
      });
      if (crossedRing) once(snapshot, 'scene-3-distance-shadow', function () {
        later(function () { flicker(false); silhouette('left'); }, 120);
      });
      if (!oldState.p3Aligned && newState.p3Aligned) once(snapshot, 'scene-3-ten-pc-silence', function () {
        duck(950, .025);
        later(function () { play('reveal'); }, 780);
      });
      if (!oldState.q3Complete && newState.q3Complete) once(snapshot, 'scene-3-reference-read-error', function () {
        later(function () { glitch('기준 별 C · <strong>읽기 오류</strong> · 재인식 완료', true); }, 80);
      });
      if (!oldState.p4Complete && newState.p4Complete) once(snapshot, 'scene-3-panel-prelight', function () {
        later(function () { panelPulse(); flicker(true); }, 380);
      });
      if (!oldState.recordingStarted && newState.recordingStarted) once(snapshot, 'scene-3-recording-breath', function () {
        duck(900, .08);
        play('breath');
      });
      if (!oldState.recordingComplete && newState.recordingComplete) once(snapshot, 'scene-3-recording-cut', function () {
        duck(1200, .04);
        later(function () { play('recordCut'); }, 520);
      });
    }
  }

  function domEvents(snapshot) {
    if (snapshot.stage === 1 && snapshot.question <= 2 && game.querySelector('.s1-puzzle')) {
      once(snapshot, 'scene-1-record-glitch-q' + snapshot.question, function () {
        later(function () { glitch('기록 수정 · <strong>17분 전</strong>', false); }, 700);
      });
    }
    if (snapshot.stage === 1 && game.querySelector('.s1-ending')) {
      once(snapshot, 'scene-1-ending-signal', function () {
        duck(1100, .08);
        later(function () { play('interference'); }, 220);
        later(function () { play('breath'); }, 760);
      });
    }
    if (snapshot.stage === 2 && game.querySelector('.s2-panel-open-notice')) {
      once(snapshot, 'scene-2-transmitter-open', function () {
        duck(900, .07);
        play('interference');
      });
    }
    if (snapshot.stage === 2 && game.querySelector('.s2-panel-signal-stage')) {
      once(snapshot, 'scene-2-transmitter-play', function () {
        duck(1300, .035);
        play('breath');
      });
    }
    if (snapshot.stage === 3 && game.querySelector('.s3-result-overlay') && /가장 밝게 보이는 별 A/.test(game.textContent)) {
      once(snapshot, 'scene-3-result-a-anomaly', function () {
        duck(1150, .04);
        later(function () { play('interference'); flicker(false); }, 120);
      });
    }
    if (snapshot.stage >= 4 && game.querySelector('.scene-transition-to-4')) {
      once(snapshot, 'scene-4-connection-noise', function () {
        duck(700, .12);
        later(function () { play('metalStep'); }, 300);
      });
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

    if (snapshot.stage === 1 && target.matches('.s1-hotspot[data-object="window"],.s1-hotspot[data-object="monitor"]')) {
      once(snapshot, 'scene-1-reflection-shadow', function () { later(function () { silhouette('right'); }, 90); });
    }
    if (snapshot.stage === 2 && snapshot.question === 1 && snapshot.role === 2 && target.matches('.s2-hotspot[data-s2-object="window"],.s2-hotspot[data-s2-object="camera"]')) {
      once(snapshot, 'scene-2-role-shadow', function () { later(function () { silhouette('left'); }, 100); });
    }
    if (snapshot.stage === 2 && snapshot.question === 2 && target.matches('.s2-hotspot[data-s2-object="orbit"]')) {
      once(snapshot, 'scene-2-parallax-edge-shadow', function () { later(function () { silhouette('right'); }, 260); });
    }
    if (snapshot.stage === 2 && snapshot.question === 2 && snapshot.role === 4 && target.matches('[data-s2-clue-open],#s2ClueTab')) {
      once(snapshot, 'scene-2-route-check', function () {
        later(function () { glitch('전송 경로 확인 불가 · <strong>우회 수신 완료</strong>', true); }, 120);
      });
    }
    if (snapshot.stage === 3 && target.matches('.s3-hotspot[data-s3-object="analysis"],.s3-hotspot[data-s3-object="maintenance"]')) {
      once(snapshot, 'scene-3-room-shadow', function () { later(function () { silhouette('panel'); }, 160); });
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

  function activate() {
    active = true;
    scheduleSync();
  }

  function deactivate() {
    active = false;
    scheduled = false;
    previous = null;
    clearTimers();
    if (root && root.isConnected) root.remove();
    root = null;
  }

  window.StarEscapeAtmosphere = {
    activate: activate,
    bind: bind,
    deactivate: deactivate,
    refresh: scheduleSync,
  };
})();
