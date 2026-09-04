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
  var mirroredBannerKey = '';
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

  function installVisualFixes() {
    if (document.getElementById('star-escape-visual-fixes')) return;
    var style = document.createElement('style');
    style.id = 'star-escape-visual-fixes';
    style.textContent = [
      '.scene-atmosphere-note{top:6%!important;max-width:min(760px,88%)!important;padding:14px 20px!important;border:1px solid #ff718899!important;border-radius:14px!important;background:#15050df5!important;color:#fff1f4!important;font-size:clamp(14px,1.7vw,20px)!important;font-weight:850!important;line-height:1.45!important;box-shadow:0 12px 38px #000d,0 0 24px #ff718833!important}',
      '.scene-atmosphere-note::before{font-size:.82em!important;font-weight:950!important}',
      '.scene-atmosphere-note.show{animation:atmosphereNote 6.4s ease both!important}',
      '.s1-system,.s2-system,.s3-system,.s4-system{font-size:clamp(14px,1.55vw,19px)!important;line-height:1.45!important;padding:12px 18px!important;border-radius:13px!important;max-width:min(760px,88%)!important;box-shadow:0 10px 32px #000c!important}',
      '.toast{min-width:min(420px,88vw)!important;font-size:16px!important;line-height:1.5!important;padding:14px 20px!important;border-radius:14px!important;max-width:min(760px,92vw)!important;text-align:center!important;box-shadow:0 12px 38px #000d,0 0 22px #ff71882d!important}',
      '.s1-title small,.s2-title small,.s3-title small,.s4-title small{font-size:10px!important}',
      '.s1-title b,.s2-title b,.s3-title b,.s4-title b{font-size:clamp(15px,1.7vw,20px)!important}',
      '.s1-objective,.s2-objective,.s3-objective,.s4-objective{font-size:clamp(12px,1.25vw,16px)!important;line-height:1.5!important}',
      '.s1-dialogue p,.s2-dialogue p,.s3-dialogue p,.s4-dialogue p{font-size:clamp(16px,1.8vw,21px)!important;line-height:1.6!important}',
      '.s1-dialogue small,.s2-dialogue small,.s3-dialogue small,.s4-dialogue small{font-size:14px!important}',
      '.s1-dialogue .advance,.s2-dialogue .advance,.s3-dialogue i,.s4-dialogue i{font-size:11px!important}',
      '.s1-inspect small,.s2-inspect small,.s3-inspect small,.s4-inspect small{font-size:11px!important}',
      '.s1-inspect b,.s2-inspect b,.s3-inspect b,.s4-inspect b{font-size:clamp(16px,1.8vw,21px)!important}',
      '.s1-inspect p,.s2-inspect p,.s3-inspect p,.s4-inspect p,.s4-modal-body>p,.s4-help{font-size:clamp(13px,1.3vw,16px)!important;line-height:1.6!important}',
      '.s1-puzzle-head small,.s2-puzzle-head small,.s3-puzzle-head small{font-size:10px!important}.s1-puzzle-head h2,.s2-puzzle-head h2,.s3-puzzle-head h2{font-size:clamp(20px,2.2vw,27px)!important}',
      '.s1-lock-panel p,.s1-wire-guide p,.s1-record p,.s1-feedback,.s1-hintbox{font-size:clamp(13px,1.25vw,16px)!important;line-height:1.55!important}',
      '.s1-wire-guide b,.s1-record b,.s1-star-card b{font-size:clamp(14px,1.4vw,17px)!important}',
      '.s2-guide small,.s2-inspect small,.s2-role-tabs button{font-size:10px!important}.s2-guide>b,.s2-inspect>b{font-size:clamp(17px,1.8vw,21px)!important}',
      '.s2-guide p,.s2-coop-note,.s2-selection-note,.s2-feedback,.s2-clue-help,.s2-clue-empty,.s2-inspect p{font-size:clamp(13px,1.3vw,16px)!important;line-height:1.55!important}',
      '.s2-device-state,.s2-observation-card header,.s2-observation-card footer,.s2-card b,.s2-slot-label{font-size:clamp(11px,1.15vw,14px)!important}',
      '.s3-puzzle-head small,.s3-inspect small,.s3-clue-record small{font-size:11px!important}.s3-puzzle-head h2,.s3-inspect b,.s3-clue-record h3{font-size:clamp(19px,2vw,25px)!important}',
      '.s3-feedback,.s3-hintbox,.s3-selection-help,.s3-console-brief,.s3-clue-record p,.s3-clue-note{font-size:clamp(13px,1.3vw,16px)!important;line-height:1.55!important}',
      '.s4-modal-card>header small{font-size:11px!important}.s4-modal-card>header h2{font-size:clamp(20px,2.4vw,29px)!important}',
      '.s4-primary,.s4-secondary,.s4-room-action,.s4-room-hint,.s4-inventory-button{font-size:13px!important}',
      '.s4-item b{font-size:12px!important}.s4-item small{font-size:10px!important;line-height:1.35!important}',
      '.s4-sort-layout h3{font-size:17px!important}.s4-sort-layout aside>p,.s4-core-layout aside>p,.s4-personal-record p,.s4-scan-progress span{font-size:clamp(13px,1.3vw,16px)!important;line-height:1.55!important}',
      '.s4-token,.s4-feedback,.s4-drop span,.s4-drop.filled b{font-size:clamp(12px,1.2vw,15px)!important}.s4-drop small{font-size:10px!important}',
      '.prompt{font-size:16px!important}.intel b{font-size:12px!important}.intel p,.choice{font-size:15px!important}.hintbox,.feedback{font-size:14px!important}',
      '.s4-loot-cabinet{width:min(520px,82%)!important;max-height:27vh!important}',
      '.s4-loot{grid-template-columns:repeat(3,minmax(0,1fr))!important;align-items:stretch!important;gap:12px!important}',
      '.s4-loot .s4-item{min-height:145px!important;grid-template-rows:92px auto auto!important;padding:10px!important;overflow:hidden!important}',
      '.s4-loot .s4-item-visual{height:92px!important}',
      '.s4-loot .s4-item-visual>img{width:100%!important;height:100%!important;max-width:125px!important;max-height:90px!important;object-fit:contain!important}',
      '.s4-hotspot.maintenance{left:20.5%!important;top:24%!important;width:4.4%!important;height:26%!important}',
      '.s1-hotspot[data-object="window"]{left:6%!important;top:8%!important;width:29%!important;height:36%!important}',
      '.s1-hotspot[data-object="monitor"]{left:9%!important;top:48%!important;width:25%!important;height:26%!important}',
      '.s1-hotspot[data-object="door"]{left:44.5%!important;top:14%!important;width:16%!important;height:55%!important}',
      '.s1-hotspot[data-object="communicator"]{left:61.5%!important;top:27%!important;width:8%!important;height:22%!important}',
      '.s1-hotspot[data-object="navigation"]{left:69%!important;top:45%!important;width:25%!important;height:28%!important}',
      '.s1-hotspot[data-object="storage"]{left:89%!important;top:28%!important;width:9%!important;height:47%!important}',
      '.s1-hotspot[data-object="warning"]{left:83%!important;top:2%!important;width:8%!important;height:13%!important}',
      '.s1-dialogue.speaker-crew .portrait,.s1-dialogue.speaker-crew>img{content:url("/labs/star-escape/assets/scene01/characters/char_student_01_female_bob.webp")!important}',
      '.s2-dialogue.speaker-crew>img{content:url("/labs/star-escape/assets/scene01/characters/char_student_02_male_tablet.webp")!important}',
      '.s3-dialogue.speaker-crew>img{content:url("/labs/star-escape/assets/scene01/characters/char_student_03_female_ponytail.webp")!important}',
      '.s4-dialogue.speaker-crew>img{content:url("/labs/star-escape/assets/scene01/characters/char_student_04_male_glasses.webp")!important}',
      '.s4-hidden-phrase{display:none!important}',
      '.s4-overlay-piece.film{mix-blend-mode:screen!important;opacity:.96!important}',
      '@media(max-width:650px){.scene-atmosphere-note{font-size:15px!important;padding:12px 15px!important;max-width:94%!important}.toast{min-width:88vw!important;font-size:15px!important}.s1-title small,.s2-title small,.s3-title small,.s4-title small{font-size:8px!important}.s1-title b,.s2-title b,.s3-title b,.s4-title b{font-size:14px!important}.s1-objective,.s2-objective,.s3-objective,.s4-objective{font-size:12px!important}.s1-dialogue p,.s2-dialogue p,.s3-dialogue p,.s4-dialogue p{font-size:15px!important}.s1-inspect p,.s2-inspect p,.s3-inspect p,.s4-inspect p,.s4-modal-body>p,.s4-help{font-size:13px!important}.s2-guide p,.s2-coop-note,.s2-selection-note,.s2-feedback,.s2-clue-help,.s3-feedback,.s3-selection-help,.s4-feedback{font-size:13px!important}.s4-token,.s4-drop span,.s4-drop.filled b{font-size:12px!important}.s4-loot .s4-item{min-height:118px!important;grid-template-rows:72px auto auto!important}.s4-loot .s4-item-visual{height:72px!important}.s4-loot .s4-item-visual>img{max-height:70px!important}}'
    ].join('');
    document.head.appendChild(style);
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
    replayClass(element, 'show', 6500);
  }

  function mirrorActionBanner() {
    if (!game) return;
    var element = game.querySelector('.s1-system,.s2-system,.s3-system,.s4-system');
    if (!element) {
      mirroredBannerKey = '';
      return;
    }
    var text = (element.textContent || '').replace(/\s+/g, ' ').trim();
    if (text && text !== mirroredBannerKey) {
      mirroredBannerKey = text;
      note(text);
    }
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
        later(function () { silhouette('s1-between-devices', { stage: 1, attempts: 0, settled: false, duration: 6500, mystery: { duration: 8200, strength: .5 } }); }, 1150);
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
    mirrorActionBanner();
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
    installVisualFixes();
    if (!game || observer) return;
    observer = new MutationObserver(scheduleSync);
    observer.observe(game, { childList: true, subtree: true });
    document.addEventListener('click', handleClick, true);
  }

  function activate() { active = true; scheduleSync(); }
  function deactivate() { active = false; scheduled = false; previous = null; mirroredBannerKey = ''; clearTimers(); if (root && root.isConnected) root.remove(); root = null; }

  window.StarEscapeAtmosphere = { activate: activate, bind: bind, deactivate: deactivate, refresh: scheduleSync };
})();
