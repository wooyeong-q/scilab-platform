(function () {
  'use strict';

  var ROOT = '/labs/star-escape/assets/scene03/';
  var ctx = null;
  var identity = '';
  var introStep = 0;
  var lastQuestion = 0;
  var puzzle = '';
  var inspect = null;
  var clueOpen = false;
  var personalPopup = false;
  var viewRole = 1;
  var selectedKind = '';
  var selectedValue = '';
  var feedback = '';
  var feedbackBad = false;
  var resultMode = '';
  var transmitting = false;
  var transmissionTimer = 0;
  var recordingVisible = false;
  var distanceDraft = null;
  var endingDoorPlayed = false;

  var intro = [
    ['루멘', '3번 구획 진입.'],
    ['루멘', '별빛 분석 구획입니다.'],
    ['시스템', '가장 밝게 관측되는 별 A'],
    ['대원', '분석 결과를 직접 확인해야겠다.'],
    ['미확인 음성', '…별이 얼마나 밝게 보이는지만 믿지 마.'],
    ['루멘', '직접 검증을 권장합니다.'],
  ];

  var personalRecords = {
    1: { title: '관측 기록 A', star: 'A', magnitude: -1 },
    2: { title: '관측 기록 B', star: 'B', magnitude: 3 },
    3: { title: '관측 기록 C', star: 'C', magnitude: 1 },
    4: { title: '관측 기록 D', star: 'D', magnitude: 5 },
  };

  var absoluteMagnitudes = { A: 2, B: 4, C: -2, D: 5 };
  var distanceDefaults = { A: 22, B: 37, C: 82, D: 68 };
  var distanceAngles = { A: -135, B: -45, C: 45, D: 135 };
  var recordingLines = [
    { speaker: '미확인 음성', text: '여기까지 왔다면 알겠지.' },
    { speaker: '미확인 음성', text: '보이는 값과 실제 값은 같지 않아.' },
    { speaker: '잡음', text: '치직—' },
    { speaker: '미확인 음성', text: '처음엔 센서 고장이라고 생각했다.' },
    { speaker: '미확인 음성', text: '하지만 아니야.' },
    { speaker: '미확인 음성', text: '누군가 기준값을 바꿨어.' },
  ];

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
    });
  }

  function img(name) {
    return ROOT + name;
  }

  function playDistanceSound(kind) {
    if (ctx && ctx.sound && typeof ctx.sound.play === 'function') ctx.sound.play(kind);
  }

  function question() {
    return Number(ctx && ctx.state && ctx.state.progress.question || 1);
  }

  function baseSceneState() {
    return {
      p1Slots: ['', '', '', '', '', ''],
      p1Complete: false,
      dataSent: false,
      q2Selected: '',
      q2Complete: false,
      p3Positions: Object.assign({}, distanceDefaults),
      p3Aligned: false,
      p3ResultConfirmed: false,
      referenceCard: '',
      q3Complete: false,
      p4Slots: ['', '', ''],
      p4Complete: false,
      maintenanceOpen: false,
      maintenanceDialogue: -1,
      recordingStarted: false,
      recordingLine: 0,
      recordingComplete: false,
    };
  }

  function sceneState() {
    var source = ctx && ctx.state && ctx.state.progress.sceneState || {};
    var state = Object.assign(baseSceneState(), source);
    state.p1Slots = Array.isArray(source.p1Slots) && source.p1Slots.length === 6 ? source.p1Slots.slice() : ['', '', '', '', '', ''];
    state.p3Positions = Object.assign({}, distanceDefaults, source.p3Positions || {});
    state.p4Slots = Array.isArray(source.p4Slots) && source.p4Slots.length === 3 ? source.p4Slots.slice() : ['', '', ''];
    return state;
  }

  function setLocalSceneState(patch) {
    var current = Object.assign(baseSceneState(), ctx.state.progress.sceneState || {});
    Object.keys(patch).forEach(function (key) {
      current[key] = patch[key];
    });
    ctx.state.progress.sceneState = current;
    ctx.state.progress.sceneStateUpdatedAt = new Date().toISOString();
  }

  async function syncScene(patch, redraw) {
    setLocalSceneState(patch);
    if (redraw !== false) draw();
    try {
      var sync = ctx.sync || ctx.syncState;
      if (typeof sync !== 'function') throw new Error('모둠 동기화 기능을 찾을 수 없습니다.');
      await sync(Object.assign({}, ctx.state.progress.sceneState || {}));
    } catch (error) {
      ctx.toast(error.message || '모둠 상태를 저장하지 못했습니다.', true);
    }
  }

  function storeKey(suffix) {
    return 'scilab-star-escape-scene03-v1:' + identity + ':' + suffix;
  }

  function getStored(key, fallback) {
    try {
      var value = localStorage.getItem(storeKey(key));
      return value == null ? fallback : value;
    } catch (error) {
      return fallback;
    }
  }

  function setStored(key, value) {
    try {
      localStorage.setItem(storeKey(key), String(value));
    } catch (error) {}
  }

  function resultSeen(name) {
    return getStored('result-' + name, '') === 'seen';
  }

  function markResultSeen(name) {
    setStored('result-' + name, 'seen');
  }

  function savedClueRoles() {
    try {
      return new Set(JSON.parse(getStored('clue-roles', '[]')));
    } catch (error) {
      return new Set();
    }
  }

  function saveClueRole(role) {
    var saved = savedClueRoles();
    if (saved.has(role)) return false;
    saved.add(role);
    setStored('clue-roles', JSON.stringify(Array.from(saved)));
    return true;
  }

  function availableRoles() {
    var occupied = new Set((ctx.state.members || []).map(function (member) { return Number(member.role); }));
    return [1, 2, 3, 4].filter(function (role) {
      return role === Number(ctx.state.player.role) || !occupied.has(role);
    });
  }

  function ensurePersonalClues(state) {
    if (!state.dataSent) return;
    var ownRole = Number(ctx.state.player.role || 1);
    var ownWasNew = saveClueRole(ownRole);
    availableRoles().forEach(saveClueRole);
    if (ownWasNew && getStored('personal-popup-seen', '') !== 'yes') personalPopup = true;
  }

  function speakerPortrait(name) {
    if (name.indexOf('루멘') === 0 || name.indexOf('시스템') === 0) return '/labs/star-escape/assets/scene01/characters/ui_lumen_ai_icon.webp';
    if (name.indexOf('미확인') === 0 || name.indexOf('자동 분석') === 0) return img('scene03_obj_manual_recorder.png');
    var role = Math.max(1, Math.min(4, Number(ctx && ctx.state.player.role || 1)));
    return '/labs/star-escape/assets/scene01/characters/char_student_0' + role + '_' + ['female_bob', 'male_tablet', 'female_ponytail', 'male_glasses'][role - 1] + '.webp';
  }

  function dialogueMarkup(entry, id) {
    var name = entry[0];
    var speakerClass = name === '대원' ? 'speaker-crew' : name.indexOf('루멘') === 0 || name.indexOf('시스템') === 0 ? 'speaker-ai' : 'speaker-device';
    return '<button class="s3-dialogue ' + speakerClass + '" id="' + id + '">' +
      '<img src="' + speakerPortrait(name) + '" alt="' + esc(name) + '">' +
      '<span><small>' + esc(name) + '</small><p>' + esc(entry[1]) + '</p></span>' +
      '<i>터치하여 계속 ▼</i></button>';
  }

  function roomClass(state, q) {
    if (state.p4Complete) return 's3-room-complete';
    if (q >= 4 || state.q3Complete) return 's3-room-reference';
    if (q >= 3 || state.q2Complete) return 's3-room-distance';
    if (q >= 2 || state.p1Complete) return 's3-room-magnitude';
    return 's3-room-base';
  }

  function objective(state, q) {
    if (q === 1) return '루멘 · 왼쪽 등급 측정 장치의 깨진 표시를 복구하세요.';
    if (q === 2) return '루멘 · 중앙 분석 장치에서 네 별의 겉보기등급을 비교하세요.';
    if (q === 3 && !state.p3ResultConfirmed) return '루멘 · 아래 거리 장치에서 네 별을 10 pc에 맞추세요.';
    if (q === 3) return '루멘 · 오른쪽 삽입 장치에 실제로 가장 밝은 별을 넣으세요.';
    if (!state.p4Complete) return '루멘 · 중앙 분석 화면의 마지막 거리 판정을 완료하세요.';
    if (!state.maintenanceOpen) return '루멘 · 오른쪽 작은 정비 패널에서 신호가 감지됩니다.';
    if (!state.recordingStarted) return '루멘 · 패널 안의 수동 기록을 재생하세요.';
    if (!state.recordingComplete) return '루멘 · 남은 기록을 끝까지 확인하세요.';
    return '루멘 · 다음 구획 연결을 준비합니다.';
  }

  function clueTabButton(inside) {
    return '<button class="s3-clue-button' + (inside ? ' inside' : ' s3-room-clue') + '" data-s3-clue-open><span>단서 탭</span><b>1/1</b></button>';
  }

  function roomMarkup(state, q) {
    var magnitudeActive = q === 1 ? ' active' : ' done';
    var analysisClass = q === 2 || q === 4 && !state.p4Complete ? ' active' : q < 2 ? ' locked' : ' done';
    var distanceClass = q === 3 && !state.p3ResultConfirmed ? ' active' : q < 3 ? ' locked' : ' done';
    var referenceClass = q === 3 && state.p3ResultConfirmed && !state.q3Complete ? ' active' : q < 3 || !state.p3ResultConfirmed ? ' locked' : ' done';
    var maintenanceClass = state.p4Complete ? ' active' : ' locked';
    var clueButton = state.dataSent ? clueTabButton(false) : '';
    var maintenanceOpen = state.maintenanceOpen ? '<div class="s3-maintenance-room-open"><img src="' + img('scene03_obj_manual_recorder.png') + '" alt="비인가 수동 기록 장치"></div>' : '';
    var screenIdentity = q >= 3 || state.q2Complete
      ? '<span class="s3-screen-label a">A</span><span class="s3-screen-label b">B</span><span class="s3-screen-label c">C</span><span class="s3-screen-label d">D</span><div class="s3-auto-result">분석 완료 · 가장 밝게 관측되는 별 <b>A</b></div>'
      : '<div class="s3-screen-locked">관측 채널 식별 코드 잠김</div>';
    return '<div class="s3-room ' + roomClass(state, q) + '">' +
      '<div class="s3-title"><small>03 — 별빛 분석 구획</small><b>가장 밝은 별은 누구인가?</b></div>' +
      '<div class="s3-objective">' + objective(state, q) + '</div>' +
      screenIdentity +
      '<button class="s3-hotspot s3-hotspot-magnitude' + magnitudeActive + '" data-s3-object="magnitude" data-label="' + (q === 1 ? '고장 난 별의 등급 측정 장치' : '복구된 별의 등급 측정 장치') + '" aria-label="별의 등급 측정 장치"></button>' +
      '<button class="s3-hotspot s3-hotspot-analysis' + analysisClass + '" data-s3-object="analysis" data-label="' + (q === 4 && !state.p4Complete ? '최종 거리 판정 화면' : '중앙 별빛 분석 장치') + '" aria-label="' + (q === 4 && !state.p4Complete ? '최종 거리 판정 화면' : '중앙 별빛 분석 장치') + '"></button>' +
      '<button class="s3-hotspot s3-hotspot-distance' + distanceClass + '" data-s3-object="distance" data-label="거리 비교 장치" aria-label="거리 비교 장치"></button>' +
      '<button class="s3-hotspot s3-hotspot-reference' + referenceClass + '" data-s3-object="reference" data-label="기준 별 삽입 장치" aria-label="기준 별 삽입 장치"></button>' +
      '<button class="s3-hotspot s3-hotspot-maintenance' + maintenanceClass + '" data-s3-object="maintenance" data-label="작은 정비 패널" aria-label="작은 정비 패널"></button>' +
      maintenanceOpen + clueButton +
      '</div>';
  }

  function inspectMarkup() {
    if (!inspect) return '';
    return '<section class="s3-inspect" role="dialog" aria-modal="true">' +
      '<div class="s3-inspect-media' + (inspect.focus ? ' focus-' + esc(inspect.focus) : '') + '"><img src="' + esc(inspect.image || img('scene03_room_base.webp')) + '" alt=""></div>' +
      '<div><small>장치 조사</small><b>' + esc(inspect.title) + '</b><p>' + esc(inspect.text) + '</p>' + (inspect.state ? '<span>' + esc(inspect.state) + '</span>' : '') + '</div>' +
      '<button class="s3-close" id="s3InspectClose" aria-label="조사 화면 닫기">×</button></section>';
  }

  function numberTile(value, placed) {
    return '<button class="s3-number-tile' + (placed ? ' placed' : '') + (selectedKind === 'p1' && selectedValue === value ? ' selected' : '') + '" data-s3-draggable="p1" data-value="' + value + '" aria-label="숫자판 ' + value + '">' +
      '<img src="' + img('scene03_p01_tile_0' + value + '.png') + '" alt="' + value + '"></button>';
  }

  function p1Markup(state) {
    var slots = state.p1Slots.map(function (value, index) {
      return '<div class="s3-p1-slot' + (value ? ' filled' : '') + '" data-s3-drop="p1" data-slot="' + index + '">' + (value ? numberTile(value, true) : '') + '</div>';
    }).join('');
    var bank = ['1', '2', '3', '4', '5', '6'].filter(function (value) { return state.p1Slots.indexOf(value) < 0; }).map(function (value) { return numberTile(value, false); }).join('');
    return '<section class="s3-puzzle" role="dialog" aria-modal="true">' + puzzleHeader(1, '고장 난 별의 등급 측정 장치') +
      '<div class="s3-puzzle-body"><div class="s3-device-grid">' +
      '<div class="s3-device-viewport s3-p1-base">' + slots + '</div>' +
      '<aside class="s3-p1-bank"><div><h3>빠진 숫자판 1~6</h3><p>빛의 밝기를 비교해 실제 기계 부품을 각 슬롯에 끼우세요.</p></div>' +
      '<div class="s3-tile-bank" data-s3-drop="p1" data-slot="bank">' + bank + '</div>' + selectionHelp('p1', '숫자판을 끌어 빛 아래 슬롯에 놓으세요.') + '</aside>' +
      '</div></div>' + puzzleFooter('빛의 밝기와 등급 표시를 맞춘 뒤 확인하세요.', true, '확인', state.p1Slots.some(function (value) { return !value; })) + '</section>';
  }

  function starCard(letter, kind, placed) {
    var face = kind === 'q2'
      ? '<span class="s3-choice-letter" aria-hidden="true">' + letter + '</span>'
      : '<img src="' + img('scene03_obj_star_card_' + letter.toLowerCase() + '.png') + '" alt="별 ' + letter + '">';
    return '<button class="s3-star-card' + (kind === 'q2' ? ' q2-choice' : '') + (placed ? ' placed' : '') + (selectedKind === kind && selectedValue === letter ? ' selected' : '') + '" data-s3-draggable="' + kind + '" data-value="' + letter + '" aria-label="별 ' + letter + ' 카드">' +
      face + '</button>';
  }

  function starMonitor() {
    return '<div class="s3-star-monitor" aria-label="식별 코드가 잠긴 네 개의 별빛 관측 화면">' + ['A', 'B', 'C', 'D'].map(function (letter) {
      return '<div class="s3-monitor-star ' + letter.toLowerCase() + '"><i aria-hidden="true">✦</i></div>';
    }).join('') + '<span class="s3-monitor-lock">어느 화면이 A·B·C·D인지는 표시되지 않습니다.</span></div>';
  }

  function transmitMarkup() {
    return '<section class="s3-puzzle" role="dialog" aria-modal="true">' + puzzleHeader(2, '관측 자료 확인') +
      '<div class="s3-puzzle-body s3-transmit"><div class="s3-transmit-panel"><small>개인 단말 자료 연결</small><h3>관측 자료 확인</h3>' +
      '<p>관측 자료가 각 대원의 단말기에 나누어 저장되어 있습니다.<br><strong>개인 관측 자료를 전송합니다.</strong></p>' +
      '<div class="s3-transfer-track"><i></i></div><p>관측 자료를 전송했습니다.</p></div></div>' +
      '<footer class="s3-puzzle-footer"><p class="s3-feedback">자료 전송 중입니다.</p></footer></section>';
  }

  function q2Markup(state) {
    var selected = state.q2Selected || '';
    var cards = ['A', 'B', 'C', 'D'].filter(function (letter) { return letter !== selected; }).map(function (letter) { return starCard(letter, 'q2', false); }).join('');
    return '<section class="s3-puzzle" role="dialog" aria-modal="true">' + puzzleHeader(2, '네 별의 겉보기등급 비교') +
      '<div class="s3-puzzle-body"><div class="s3-analysis-layout">' +
      '<div class="s3-analysis-console"><div class="s3-console-brief"><b>루멘</b><span>식별 코드는 잠겨 있습니다. 각자 받은 A–D 등급을 공유해 가장 작은 등급의 문자를 선택하세요.</span></div><div><h3>식별 코드가 잠긴 공용 관측 화면</h3><p>네 화면의 밝기는 보이지만 어느 화면이 A·B·C·D인지는 알 수 없습니다.</p></div>' + starMonitor() + '<p><strong>겉보기등급 숫자가 작을수록 밝게 보입니다.</strong></p></div>' +
      '<aside class="s3-analysis-side"><h3>가장 밝은 별 선택</h3><div class="s3-analysis-slot' + (selected ? ' filled' : '') + '" id="s3AnalysisSlot" data-s3-drop="q2" data-slot="analysis">' + (selected ? starCard(selected, 'q2', true) : 'A–D 중 한 문자를 이곳에 넣으세요.') + '</div>' +
      '<div><div class="s3-card-bank" data-s3-drop="q2" data-slot="bank">' + cards + '</div>' + selectionHelp('q2', '문자 카드를 끌어 선택 슬롯에 넣으세요.') + '</div></aside>' +
      '</div></div>' + puzzleFooter('전송된 관측 자료와 등급 기준을 비교하세요.', false, '') + '</section>';
  }

  function distanceFromPosition(position) {
    return 5 + (Number(position) - 10) / 80 * 10;
  }

  function distanceLabel(position) {
    return distanceFromPosition(position).toFixed(1) + ' pc';
  }

  function distancePoint(letter, position) {
    var angle = distanceAngles[letter] * Math.PI / 180;
    // Keep 10 pc at the target ring while giving each star a much longer,
    // easier-to-control radial travel path (roughly twice the old range).
    var radius = 5 + Number(position) * .22;
    return {
      x: (50 + Math.cos(angle) * radius).toFixed(2),
      y: (49 + Math.sin(angle) * radius * 21 / 10).toFixed(2),
    };
  }

  function brightness(letter, position) {
    var base = { A: 1.08, B: .86, C: 1.42, D: .72 }[letter];
    var distance = distanceFromPosition(position);
    return Math.max(.42, Math.min(1.75, base * Math.pow(10 / distance, .72))).toFixed(2);
  }

  function p3Markup(state) {
    var positions = distanceDraft || state.p3Positions;
    var alignedCount = ['A', 'B', 'C', 'D'].filter(function (letter) { return Math.abs(Number(positions[letter]) - 50) < .01; }).length;
    var spokes = ['A', 'B', 'C', 'D'].map(function (letter) {
      return '<i class="s3-distance-spoke" style="--angle:' + distanceAngles[letter] + 'deg" aria-hidden="true"></i>';
    }).join('');
    var stars = ['A', 'B', 'C', 'D'].map(function (letter) {
      var position = Number(positions[letter]);
      var point = distancePoint(letter, position);
      var snapped = Math.abs(position - 50) < .01;
      var selected = selectedKind === 'p3' && selectedValue === letter;
      return '<button class="s3-distance-star' + (snapped ? ' snapped' : '') + (selected ? ' selected' : '') + '" data-s3-distance-star="' + letter + '" style="--sx:' + point.x + '%;--sy:' + point.y + '%;--bright:' + brightness(letter, position) + '" aria-label="별 ' + letter + ', 현재 거리 ' + distanceLabel(position) + ', 10 pc 기준 고리로 이동">' +
        '<img src="' + img('scene03_p03_star_' + letter.toLowerCase() + '.png') + '" alt="별 ' + letter + '"><small>' + letter + ' · ' + distanceLabel(position) + '</small></button>';
    }).join('');
    var readouts = ['A', 'B', 'C', 'D'].map(function (letter) {
      var done = Math.abs(Number(positions[letter]) - 50) < .01;
      return '<span class="' + (done ? 'done' : '') + '"><b>' + letter + '</b>' + distanceLabel(positions[letter]) + '</span>';
    }).join('');
    return '<section class="s3-puzzle s3-puzzle-distance" role="dialog" aria-modal="true">' + puzzleHeader(3, '같은 거리에서 실제 밝기 비교') +
      '<div class="s3-puzzle-body"><div class="s3-distance-layout"><div class="s3-distance-surface" id="s3DistanceSurface">' + spokes + '<button class="s3-tenpc-ring' + (selectedKind === 'p3' && selectedValue ? ' ready' : '') + '" id="s3TenPc" aria-label="선택한 별을 기준 거리 10 pc로 이동"></button><i class="s3-distance-center" aria-hidden="true"></i>' + stars + '<div class="s3-distance-progress" aria-live="polite"><b>' + alignedCount + '/4</b><span>10 pc 고정</span></div><div class="s3-distance-readouts" aria-live="polite">' + readouts + '</div></div></div></div>' +
      puzzleFooter(state.p3Aligned ? '완료 · 네 별이 모두 10 pc 기준 고리에 고정되었습니다.' : '각 별을 드래그하거나, 별 선택 후 10 pc 기준 고리를 누르세요.', false, '') +
      (state.p3Aligned ? absoluteResultMarkup() : '') + '</section>';
  }

  function absoluteResultMarkup() {
    return '<div class="s3-result-overlay"><article class="s3-result-card"><header><small>기준 거리 분석 완료</small><h2>모든 별의 거리를 10 pc로 맞췄습니다.</h2></header><div class="s3-result-body"><p>같은 거리에서 나타난 등급을 비교하세요.</p>' +
      '<div class="s3-absolute-table">' + ['A', 'B', 'C', 'D'].map(function (letter) { return '<div><b>' + letter + '</b><small>절대등급</small><span>' + absoluteMagnitudes[letter] + '</span></div>'; }).join('') + '</div>' +
      '<div class="s3-absolute-conclusion">등급 숫자가 가장 작은 별이 실제로 가장 밝습니다.</div></div>' +
      '<button class="primary" id="s3AbsoluteConfirm">결과 확인 완료</button></article></div>';
  }

  function referenceMarkup(state) {
    var selected = state.referenceCard || '';
    var cards = ['A', 'B', 'C', 'D'].filter(function (letter) { return letter !== selected; }).map(function (letter) { return starCard(letter, 'reference', false); }).join('');
    return '<section class="s3-puzzle" role="dialog" aria-modal="true">' + puzzleHeader(3, '기준 별 삽입 장치') +
      '<div class="s3-puzzle-body"><div class="s3-reference-layout"><div class="s3-reference-device"><img src="' + img('scene03_obj_reference_slot.webp') + '" alt="기준 별 삽입 장치">' +
      '<div class="s3-reference-drop' + (selected ? ' filled' : '') + '" data-s3-drop="reference" data-slot="reference">' + (selected ? starCard(selected, 'reference', true) : '기준 별 카드 삽입 슬롯') + '</div></div>' +
      '<aside class="s3-reference-bank"><h3>기준 별 카드</h3><p>10 pc에서 비교한 절대등급을 이용해 실제로 가장 밝은 별을 넣으세요.</p><div class="s3-card-bank" data-s3-drop="reference" data-slot="bank">' + cards + '</div>' + selectionHelp('reference', '카드를 끌어 실제 장치의 슬롯에 넣으세요.') + '</aside></div></div>' +
      puzzleFooter(state.q3Complete ? '기준 별 C · 실제 밝기 확인 완료' : '별 카드를 장치에 넣으면 즉시 분석합니다.', false, '') + '</section>';
  }

  function lockCard(letter, placed) {
    var values = { X: [1, 3], Y: [2, 2], Z: [5, 1] }[letter];
    return '<button class="s3-lock-card' + (placed ? ' placed' : '') + (selectedKind === 'p4' && selectedValue === letter ? ' selected' : '') + '" data-s3-draggable="p4" data-value="' + letter + '" aria-label="' + letter + ' 카드, 겉보기등급 ' + values[0] + ', 절대등급 ' + values[1] + '">' +
      '<img src="' + img('scene03_p04_card_' + letter.toLowerCase() + '.png') + '" alt="' + letter + ' 카드"><span class="s3-card-values"><span><em>겉보기등급</em><b>' + values[0] + '</b></span><span><em>절대등급</em><b>' + values[1] + '</b></span></span></button>';
  }

  function p4Markup(state) {
    var classes = ['near', 'ten', 'far'];
    var slots = state.p4Slots.map(function (value, index) {
      var labels = ['가까움 슬롯', '10 pc 슬롯', '멀어짐 슬롯'];
      return '<div class="s3-lock-slot ' + classes[index] + (value ? ' filled' : '') + '" data-s3-drop="p4" data-slot="' + index + '" aria-label="' + labels[index] + '">' + (value ? lockCard(value, true) : '') + '</div>';
    }).join('');
    var cards = ['X', 'Y', 'Z'].filter(function (letter) { return state.p4Slots.indexOf(letter) < 0; }).map(function (letter) { return lockCard(letter, false); }).join('');
    return '<section class="s3-puzzle" role="dialog" aria-modal="true">' + puzzleHeader(4, '마지막 거리 판정 잠금') +
      '<div class="s3-puzzle-body"><div class="s3-lock-layout"><div class="s3-lock-device' + (state.p4Complete ? ' complete' : '') + '">' + slots + '</div>' +
      '<aside class="s3-lock-bank"><div><h3>X · Y · Z 거리 판정 카드</h3><p>두 등급을 비교해 사진 속 세 슬롯에 카드를 넣으세요.</p></div><div class="s3-distance-rule"><b>카드 판정 기준</b><span>겉보기 &lt; 절대</span><span>겉보기 = 절대</span><span>겉보기 &gt; 절대</span></div>' +
      '<div class="s3-card-bank" data-s3-drop="p4" data-slot="bank">' + cards + '</div>' + selectionHelp('p4', '카드를 끌어 알맞은 거리 슬롯에 넣으세요.') + '</aside></div></div>' +
      puzzleFooter('세 카드를 모두 배치한 뒤 확인하세요.', true, '확인', state.p4Slots.some(function (value) { return !value; })) + '</section>';
  }

  function maintenanceMarkup(state) {
    return '<section class="s3-maintenance" role="dialog" aria-modal="true"><div class="s3-maintenance-bay"><button class="s3-recorder-button" id="s3Recorder" aria-label="비인가 수동 기록 장치 재생"><img src="' + img('scene03_obj_manual_recorder.png') + '" alt="비인가 수동 기록 장치"><span><i aria-hidden="true">▶</i> 녹음 재생</span></button></div>' +
      '<div class="s3-maintenance-copy"><small>비인가 장비 발견</small><h2>작은 정비 패널 내부</h2><p><strong>대원:</strong> “또 이 장치야.”</p><p><strong>루멘:</strong> “동일한 형태의 비인가 기록 장치입니다.”</p><p>장면 2에서 발견한 장치와 같은 계열입니다. 장치를 직접 눌러 저장된 녹음을 재생하세요.</p>' +
      '<button class="secondary" id="s3MaintenanceClose">방으로 돌아가기</button></div></section>';
  }

  function puzzleHeader(number, title) {
    return '<header class="s3-puzzle-head"><div><small>장면 03 · 문제 ' + number + '/4</small><h2>' + esc(title) + '</h2></div><div class="s3-puzzle-actions">' +
      (sceneState().dataSent ? clueTabButton(true) : '') +
      '<button class="s3-close" id="s3PuzzleClose" aria-label="장치 확대 화면 닫기">×</button></div></header>';
  }

  function puzzleFooter(message, submit, label, disabled) {
    return '<footer class="s3-puzzle-footer"><div class="s3-hintbox" id="hintbox"></div><p class="s3-feedback' + (feedbackBad ? ' bad' : feedback ? ' good' : '') + '" id="feedback">' + esc(feedback || message) + '</p>' +
      '<button class="secondary" id="hintBtn">힌트 · ' + Math.min(Number(ctx.state.progress.hintCount || 0), 3) + '/3 무료</button>' +
      (submit ? '<button class="primary" id="s3Submit"' + (disabled ? ' disabled' : '') + '>' + esc(label) + '</button>' : '') + '</footer>';
  }

  function selectionHelp(kind, text) {
    return '<div class="s3-selection-help">' + (selectedKind === kind && selectedValue ? '<b>' + esc(selectedValue) + ' 선택됨</b> · 넣을 슬롯을 누르세요.' : esc(text) + '<br>터치에서는 카드 선택 → 슬롯 선택도 가능합니다.') + '</div>';
  }

  function personalPopupMarkup() {
    var role = Number(ctx.state.player.role || 1);
    var record = personalRecords[role];
    return '<section class="s3-personal-popup" role="dialog" aria-modal="true"><article class="s3-personal-card"><header><small>개인 관측 자료 도착</small><b>관측 자료를 전송했습니다.</b></header>' +
      '<div class="s3-personal-data"><span>대원 R' + role + ' 전용</span><strong>' + esc(record.title) + '</strong><span>겉보기등급</span><b>' + record.magnitude + '</b></div>' +
      '<button class="primary" id="s3PersonalClose">단서 탭에 저장하고 닫기</button></article></section>';
  }

  function clueDrawerMarkup() {
    var roles = availableRoles();
    if (roles.indexOf(viewRole) < 0) viewRole = Number(ctx.state.player.role || 1);
    var record = personalRecords[viewRole];
    var tabs = roles.length > 1 ? '<div class="s3-role-tabs">' + roles.map(function (role) {
      return '<button class="' + (role === viewRole ? 'on' : '') + '" data-s3-role="' + role + '">R' + role + (role !== Number(ctx.state.player.role) ? ' · 빈 역할' : '') + '</button>';
    }).join('') + '</div>' : '';
    return '<section class="s3-clue-drawer" role="dialog" aria-modal="true"><header><div><small>단서 탭</small><h2>개인 관측 자료</h2></div><button class="s3-close" id="s3ClueClose" aria-label="단서 탭 닫기">×</button></header>' +
      '<div class="s3-clue-body">' + tabs + '<article class="s3-clue-record"><small>대원 R' + viewRole + ' 자동 저장 자료</small><h3>' + esc(record.title) + '</h3><p>겉보기등급</p><b>' + record.magnitude + '</b></article>' +
      '<p class="s3-clue-note">4인 정상 플레이에서는 자신의 자료만 보입니다. 현재 참가자가 없는 역할의 자료는 기존 결원 처리 방식에 따라 열람할 수 있습니다.</p></div></section>';
  }

  function resultMarkup(mode) {
    if (mode === 'p1') {
      return '<div class="s3-result-overlay"><article class="s3-result-card"><header><small>찰칵 · 전원 신호 감지</small><h2>별의 등급 표시 복구 완료</h2></header><div class="s3-result-body"><p><strong>등급 숫자가 작을수록 밝다.</strong></p><p>여섯 표시가 제자리를 찾자 중앙 분석 장치에 전원이 들어옵니다.</p></div><button class="primary" id="s3ResultContinue">방의 변화 확인</button></article></div>';
    }
    if (mode === 'q2') {
      return '<div class="s3-result-overlay"><article class="s3-result-card"><header><small>관측 결과 확인</small><h2>가장 밝게 보이는 별 A</h2></header><div class="s3-result-body"><div class="s3-result-alert"><b>실제 밝기는 아직 판단할 수 없습니다.</b><span>별들의 거리가 서로 다릅니다.</span></div><p>대원: “가장 밝게 보이는 별은 맞지만 실제 밝기는 아직 알 수 없다.”</p><p>루멘: “거리 비교 장치를 사용할 수 있습니다.”</p><p class="s3-unknown-line">미확인 음성: “…보이는 것만 믿지 마.”</p></div><button class="primary" id="s3ResultContinue">방의 변화 확인</button></article></div>';
    }
    if (mode === 'q3') {
      return '<div class="s3-result-overlay"><article class="s3-result-card"><header><small>기준 별 삽입 완료</small><h2>실제로 가장 밝은 별 C</h2></header><div class="s3-result-body"><p>기준 별이 고정되자 중앙 분석 화면이 마지막 거리 판정 모드로 전환됩니다.</p></div><button class="primary" id="s3ResultContinue">방의 변화 확인</button></article></div>';
    }
    return '<div class="s3-result-overlay"><article class="s3-result-card"><header><small>철컥 · 세 슬롯 잠김</small><h2>별빛 분석 시스템 복구 완료</h2></header><div class="s3-result-body"><p>장치의 조명이 정상으로 돌아오고, 오른쪽 작은 정비 패널에서 낯선 신호가 깜박입니다.</p></div><button class="primary" id="s3ResultContinue">복구된 방 보기</button></article></div>';
  }

  function recordingMarkup(state) {
    if (!state.recordingComplete) {
      var index = Math.max(0, Math.min(recordingLines.length - 1, Number(state.recordingLine || 0)));
      var line = recordingLines[index];
      return '<section class="s3-recording-screen" role="dialog" aria-modal="true"><article class="s3-recording-card"><div class="s3-wave"></div><small>' + esc(line.speaker) + '</small><h2>비인가 수동 기록</h2><p class="s3-recording-line' + (line.speaker === '잡음' ? ' s3-static-noise' : '') + '">“' + esc(line.text) + '”</p>' +
        '<button class="primary" id="s3RecordingNext">' + (index === recordingLines.length - 1 ? '통신 종료 확인' : '다음 기록 듣기') + '</button></article></section>';
    }
    return '<section class="s3-recording-screen" role="dialog" aria-modal="true"><article class="s3-recording-card"><div class="s3-wave"></div><small>통신 종료</small><h2>장면 3 완료</h2><p class="s3-recording-line">“누군가 기준값을 바꿨어.”</p><div class="s3-recording-followup"><p><b>루멘</b> “…기록 종료.”</p><p><b>대원</b> “기준값을 바꾼 존재가 따로 있다는 뜻이다.”</p><p><b>루멘</b> “현재까지 확보한 기록은 그 가능성을 나타냅니다.”<br>“4번 구획 접근 권한이 복구되었습니다.”</p><p><b>대원</b> “남은 기록을 확인하자.”</p><p><b>루멘</b> “…진행하십시오.”</p></div><div class="s3-scene-complete"><b>03 — 별빛 분석 구획 완료</b><span>장면 4 연결 상태가 준비되었습니다.</span></div><button class="primary" id="s3Proceed">다음 구획으로 이동</button></article></section>';
  }

  function puzzleMarkup(state, q) {
    if (puzzle === 'p1') return p1Markup(state);
    if (puzzle === 'q2') return transmitting && !state.dataSent ? transmitMarkup() : q2Markup(state);
    if (puzzle === 'p3') return p3Markup(state);
    if (puzzle === 'reference') return referenceMarkup(state);
    if (puzzle === 'p4') return p4Markup(state);
    if (puzzle === 'maintenance') return maintenanceMarkup(state);
    return '';
  }

  function clearSelection() {
    selectedKind = '';
    selectedValue = '';
  }

  function setFeedback(message, bad) {
    feedback = message;
    feedbackBad = !!bad;
    var element = document.getElementById('feedback');
    if (element) {
      element.textContent = message;
      element.className = 's3-feedback' + (bad ? ' bad' : ' good');
    }
  }

  function selectItem(kind, value) {
    if (selectedKind === kind && selectedValue === value) clearSelection();
    else {
      selectedKind = kind;
      selectedValue = value;
    }
    draw();
  }

  function bindPointerPlacement(kind, onDrop) {
    var draggables = document.querySelectorAll('[data-s3-draggable="' + kind + '"]');
    draggables.forEach(function (element) {
      element.addEventListener('pointerdown', function (event) {
        if (event.button != null && event.button !== 0) return;
        event.stopPropagation();
        var startX = event.clientX;
        var startY = event.clientY;
        var value = element.dataset.value;
        var moving = false;
        var ghost = null;
        var hover = null;
        try { element.setPointerCapture(event.pointerId); } catch (error) {}

        function moveGhost(moveEvent) {
          if (!moving && Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) > 7) {
            moving = true;
            ghost = element.cloneNode(true);
            ghost.removeAttribute('id');
            ghost.classList.add('s3-drag-ghost');
            document.body.appendChild(ghost);
            element.classList.add('ghosted');
          }
          if (!moving) return;
          moveEvent.preventDefault();
          ghost.style.left = moveEvent.clientX + 'px';
          ghost.style.top = moveEvent.clientY + 'px';
          var target = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
          var nextHover = target && target.closest('[data-s3-drop="' + kind + '"]');
          if (hover && hover !== nextHover) hover.classList.remove('s3-drop-hover');
          hover = nextHover;
          if (hover) hover.classList.add('s3-drop-hover');
        }

        function finish(endEvent) {
          element.removeEventListener('pointermove', moveGhost);
          element.removeEventListener('pointerup', finish);
          element.removeEventListener('pointercancel', cancel);
          if (hover) hover.classList.remove('s3-drop-hover');
          if (ghost) ghost.remove();
          element.classList.remove('ghosted');
          if (moving) {
            var target = document.elementFromPoint(endEvent.clientX, endEvent.clientY);
            var drop = target && target.closest('[data-s3-drop="' + kind + '"]');
            if (drop) onDrop(value, drop.dataset.slot);
          } else selectItem(kind, value);
        }

        function cancel() {
          element.removeEventListener('pointermove', moveGhost);
          element.removeEventListener('pointerup', finish);
          element.removeEventListener('pointercancel', cancel);
          if (hover) hover.classList.remove('s3-drop-hover');
          if (ghost) ghost.remove();
          element.classList.remove('ghosted');
        }

        element.addEventListener('pointermove', moveGhost);
        element.addEventListener('pointerup', finish);
        element.addEventListener('pointercancel', cancel);
      });
    });

    document.querySelectorAll('[data-s3-drop="' + kind + '"]').forEach(function (drop) {
      drop.addEventListener('click', function (event) {
        if (event.target.closest('[data-s3-draggable]')) return;
        if (selectedKind !== kind || !selectedValue) return;
        onDrop(selectedValue, drop.dataset.slot);
      });
    });
  }

  function placeInSlots(key, kind, value, slot, count) {
    var state = sceneState();
    var slots = state[key].slice();
    slots = slots.map(function (entry) { return entry === value ? '' : entry; });
    if (slot !== 'bank') {
      var index = Number(slot);
      if (index >= 0 && index < count) {
        slots[index] = value;
        playDistanceSound('insert');
      }
    }
    clearSelection();
    feedback = '';
    syncScene((function () { var patch = {}; patch[key] = slots; return patch; })());
  }

  async function submitP1(button) {
    var state = sceneState();
    if (state.p1Slots.some(function (value) { return !value; })) return setFeedback('숫자판 1~6을 여섯 슬롯에 모두 배치하세요.', true);
    if (state.p1Slots.join('') !== '123456') return setFeedback('빛의 밝기와 등급 표시가 맞지 않습니다.', true);
    button.disabled = true;
    await syncScene({ p1Slots: ['1', '2', '3', '4', '5', '6'], p1Complete: true }, false);
    await ctx.submit('123456', button);
  }

  function beginTransmission() {
    if (transmissionTimer || sceneState().dataSent) return;
    transmitting = true;
    draw();
    transmissionTimer = setTimeout(async function () {
      transmissionTimer = 0;
      await syncScene({ dataSent: true });
      transmitting = false;
      ensurePersonalClues(sceneState());
      draw();
    }, 1000);
  }

  async function placeQ2(value, slot) {
    clearSelection();
    if (slot === 'bank') {
      await syncScene({ q2Selected: '' });
      return;
    }
    await syncScene({ q2Selected: value });
    if (value !== 'A') {
      setFeedback('전송된 관측 자료와 등급 기준을 다시 확인하세요.', true);
      setTimeout(function () { syncScene({ q2Selected: '' }); }, 700);
      return;
    }
    var button = document.querySelector('[data-s3-draggable="q2"][data-value="A"]') || document.getElementById('s3AnalysisSlot');
    await syncScene({ q2Selected: 'A', q2Complete: true }, false);
    await ctx.submit('A', button);
  }

  function bindDistanceDrag() {
    var surface = document.getElementById('s3DistanceSurface');
    if (!surface) return;
    document.querySelectorAll('[data-s3-distance-star]').forEach(function (element) {
      element.addEventListener('pointerdown', function (event) {
        if (event.button != null && event.button !== 0) return;
        var letter = element.dataset.s3DistanceStar;
        var state = sceneState();
        if (state.p3Aligned || Math.abs(Number(state.p3Positions[letter]) - 50) < .01) return;
        event.preventDefault();
        var moved = false;
        distanceDraft = Object.assign({}, state.p3Positions);
        element.classList.add('dragging');
        try { element.setPointerCapture(event.pointerId); } catch (error) {}

        function update(moveEvent) {
          moved = true;
          var rect = surface.getBoundingClientRect();
          var angle = distanceAngles[letter] * Math.PI / 180;
          var centerX = rect.left + rect.width * .5;
          var centerY = rect.top + rect.height * .49;
          var projection = (moveEvent.clientX - centerX) * Math.cos(angle) + (moveEvent.clientY - centerY) * Math.sin(angle);
          var position = (projection / rect.width - .05) / .0022;
          distanceDraft[letter] = Math.round(Math.max(10, Math.min(90, position)) * 10) / 10;
          var point = distancePoint(letter, distanceDraft[letter]);
          element.style.setProperty('--sx', point.x + '%');
          element.style.setProperty('--sy', point.y + '%');
          element.style.setProperty('--bright', brightness(letter, distanceDraft[letter]));
          var label = element.querySelector('small');
          if (label) label.textContent = letter + ' · ' + distanceLabel(distanceDraft[letter]);
        }

        async function finish() {
          element.removeEventListener('pointermove', update);
          element.removeEventListener('pointerup', finish);
          element.removeEventListener('pointercancel', cancel);
          element.classList.remove('dragging');
          if (!moved) {
            selectedKind = 'p3';
            selectedValue = letter;
            distanceDraft = null;
            draw();
            return;
          }
          var snapped = Math.abs(Number(distanceDraft[letter]) - 50) <= 6;
          if (snapped) distanceDraft[letter] = 50;
          var aligned = ['A', 'B', 'C', 'D'].every(function (name) { return Math.abs(Number(distanceDraft[name]) - 50) < .01; });
          var positions = Object.assign({}, distanceDraft);
          distanceDraft = null;
          if (snapped) playDistanceSound(aligned ? 'complete' : 'lock');
          await syncScene({ p3Positions: positions, p3Aligned: aligned });
        }

        function cancel() {
          element.removeEventListener('pointermove', update);
          element.removeEventListener('pointerup', finish);
          element.removeEventListener('pointercancel', cancel);
          element.classList.remove('dragging');
          distanceDraft = null;
          draw();
        }

        element.addEventListener('pointermove', update);
        element.addEventListener('pointerup', finish);
        element.addEventListener('pointercancel', cancel);
      });
    });
    var line = document.getElementById('s3TenPc');
    if (line) line.onclick = async function () {
      if (selectedKind !== 'p3' || !selectedValue) return setFeedback('먼저 이동할 별 A~D 중 하나를 선택하세요.', true);
      var state = sceneState();
      var positions = Object.assign({}, state.p3Positions);
      positions[selectedValue] = 50;
      clearSelection();
      var aligned = ['A', 'B', 'C', 'D'].every(function (letter) { return Math.abs(Number(positions[letter]) - 50) < .01; });
      playDistanceSound(aligned ? 'complete' : 'lock');
      await syncScene({ p3Positions: positions, p3Aligned: aligned });
    };
  }

  async function placeReference(value, slot) {
    clearSelection();
    if (slot === 'bank') {
      await syncScene({ referenceCard: '' });
      return;
    }
    await syncScene({ referenceCard: value });
    playDistanceSound('insert');
    if (value !== 'C') {
      setFeedback('기준 거리에서 비교한 실제 밝기를 다시 확인하세요.', true);
      return;
    }
    var button = document.querySelector('[data-s3-draggable="reference"][data-value="C"]') || { disabled: false };
    await syncScene({ referenceCard: 'C', q3Complete: true }, false);
    await ctx.submit('C', button);
  }

  async function submitP4(button) {
    var state = sceneState();
    if (state.p4Slots.some(function (value) { return !value; })) return setFeedback('X, Y, Z 카드를 세 슬롯에 모두 배치하세요.', true);
    if (state.p4Slots.join('') !== 'XYZ') return setFeedback('겉보기등급과 절대등급을 다시 비교하세요.', true);
    button.disabled = true;
    await syncScene({ p4Slots: ['X', 'Y', 'Z'], p4Complete: true });
    resultMode = 'p4';
    draw();
  }

  function inspectObject(id) {
    var state = sceneState();
    var q = question();
    feedback = '';
    feedbackBad = false;
    if (id === 'magnitude') {
      if (q === 1) {
        puzzle = 'p1';
        inspect = null;
      } else {
        inspect = { title: '복구된 별의 등급 측정 장치', text: '숫자판이 밝은 빛부터 1, 2, 3, 4, 5, 6 순서로 고정되어 있습니다.', state: '별의 등급 표시 복구 완료', image: img('scene03_p01_magnitude_device_complete.webp') };
      }
      draw();
      return;
    }
    if (id === 'analysis') {
      if (q < 2) inspect = { title: '중앙 별빛 분석 장치', text: '등급 기준과 전원이 부족합니다. 왼쪽의 고장 난 등급 측정 장치를 먼저 복구해야 합니다.', state: '부분 작동 · 분석 기능 잠김', image: img('scene03_room_base.webp'), focus: 'analysis' };
      else if (q === 2) {
        inspect = null;
        puzzle = 'q2';
        if (!state.dataSent) beginTransmission();
      } else if (q === 4 && !state.p4Complete) {
        inspect = null;
        puzzle = 'p4';
      } else if (state.p4Complete) inspect = { title: '복구된 중앙 별빛 분석 장치', text: '세 별의 겉보기등급과 절대등급을 비교한 거리 판정이 완료되었습니다.', state: '별빛 분석 시스템 복구 완료', image: img('scene03_room_complete.webp'), focus: 'analysis' };
      else inspect = { title: '중앙 별빛 분석 장치', text: '가장 밝게 보이는 별 A는 확인했지만, 별들의 거리가 달라 실제 밝기는 바로 판단할 수 없습니다.', state: '거리 비교 자료 필요', image: img('scene03_room_state02_distance_unlocked.webp'), focus: 'analysis' };
      draw();
      return;
    }
    if (id === 'distance') {
      if (q < 3) inspect = { title: '거리 비교 장치', text: q === 1 ? '전원이 꺼져 있습니다.' : '전원은 들어왔지만 실제 거리 비교 기능은 아직 사용할 수 없습니다.', state: q === 1 ? '닫힘 · 꺼짐' : '대기 전원 · 사용 불가', image: img('scene03_p03_distance_device.webp') };
      else {
        inspect = null;
        puzzle = 'p3';
      }
      draw();
      return;
    }
    if (id === 'reference') {
      if (q === 3 && state.p3ResultConfirmed) {
        inspect = null;
        puzzle = 'reference';
      } else if (q >= 4 || state.q3Complete) inspect = { title: '기준 별 C', text: '기준 거리 10 pc에서 절대등급이 가장 작은 C가 기준 별로 설정되어 있습니다.', state: '실제 밝기 확인 완료', image: img('scene03_obj_reference_slot.webp') };
      else inspect = { title: '기준 별 삽입 장치', text: '거리 비교 장치의 절대등급 결과를 먼저 확인해야 합니다.', state: '잠김', image: img('scene03_obj_reference_slot.webp') };
      draw();
      return;
    }
    if (id === 'maintenance') {
      if (!state.p4Complete) {
        inspect = { title: '작은 정비 패널', text: '별빛 분석 시스템의 최종 거리 판정 잠금과 연결되어 있습니다.', state: '잠김', image: img('scene03_room_base.webp'), focus: 'maintenance' };
        draw();
        return;
      }
      if (!state.maintenanceOpen) {
        playDistanceSound('storageOpen34');
        syncScene({ maintenanceOpen: true, maintenanceDialogue: 0 });
        return;
      }
      if (Number(state.maintenanceDialogue) < 2) return;
      puzzle = 'maintenance';
      inspect = null;
      draw();
    }
  }

  function bindRoom(state) {
    document.querySelectorAll('[data-s3-object]').forEach(function (button) {
      button.onclick = function () { inspectObject(button.dataset.s3Object); };
    });
    var inspectClose = document.getElementById('s3InspectClose');
    if (inspectClose) inspectClose.onclick = function () { inspect = null; draw(); };
    document.querySelectorAll('[data-s3-clue-open]').forEach(function (clue) {
      clue.onclick = function () { clueOpen = true; viewRole = Number(ctx.state.player.role || 1); draw(); };
    });
    var introButton = document.getElementById('s3Intro');
    if (introButton) introButton.onclick = function () {
      introStep += 1;
      if (introStep >= intro.length) setStored('intro-v2', 'done');
      draw();
    };
    var maintenanceDialogue = document.getElementById('s3MaintenanceDialogue');
    if (maintenanceDialogue) maintenanceDialogue.onclick = async function () {
      var next = Math.min(2, Number(sceneState().maintenanceDialogue) + 1);
      await syncScene({ maintenanceDialogue: next });
      if (next >= 2) puzzle = 'maintenance';
      draw();
    };
  }

  function bindPuzzle(state, q) {
    var close = document.getElementById('s3PuzzleClose');
    if (close) close.onclick = function () { puzzle = ''; clearSelection(); feedback = ''; draw(); };
    var hint = document.getElementById('hintBtn');
    if (hint) hint.onclick = ctx.hint;
    document.querySelectorAll('[data-s3-clue-open]').forEach(function (clue) {
      clue.onclick = function () { clueOpen = true; viewRole = Number(ctx.state.player.role || 1); draw(); };
    });
    if (puzzle === 'p1') {
      bindPointerPlacement('p1', function (value, slot) { placeInSlots('p1Slots', 'p1', value, slot, 6); });
      var p1Submit = document.getElementById('s3Submit');
      if (p1Submit) p1Submit.onclick = function () { submitP1(p1Submit); };
    }
    if (puzzle === 'q2' && state.dataSent) bindPointerPlacement('q2', placeQ2);
    if (puzzle === 'p3') {
      bindDistanceDrag();
      var absoluteConfirm = document.getElementById('s3AbsoluteConfirm');
      if (absoluteConfirm) absoluteConfirm.onclick = async function () {
        await syncScene({ p3ResultConfirmed: true });
        puzzle = '';
        draw();
      };
    }
    if (puzzle === 'reference') {
      bindPointerPlacement('reference', placeReference);
    }
    if (puzzle === 'p4') {
      bindPointerPlacement('p4', function (value, slot) { placeInSlots('p4Slots', 'p4', value, slot, 3); });
      var p4Submit = document.getElementById('s3Submit');
      if (p4Submit) p4Submit.onclick = function () { submitP4(p4Submit); };
    }
    if (puzzle === 'maintenance') {
      var maintenanceClose = document.getElementById('s3MaintenanceClose');
      if (maintenanceClose) maintenanceClose.onclick = function () { puzzle = ''; draw(); };
      var recorder = document.getElementById('s3Recorder');
      if (recorder) recorder.onclick = async function () {
        recordingVisible = true;
        await syncScene({ recordingStarted: true, recordingLine: Number(sceneState().recordingLine || 0) });
        draw();
      };
    }
  }

  function bindOverlays(state) {
    if (personalPopup) {
      var personalClose = document.getElementById('s3PersonalClose');
      if (personalClose) personalClose.onclick = function () {
        personalPopup = false;
        setStored('personal-popup-seen', 'yes');
        draw();
      };
    }
    if (clueOpen) {
      var clueClose = document.getElementById('s3ClueClose');
      if (clueClose) clueClose.onclick = function () { clueOpen = false; draw(); };
      document.querySelectorAll('[data-s3-role]').forEach(function (button) {
        button.onclick = function () { viewRole = Number(button.dataset.s3Role); draw(); };
      });
    }
    if (resultMode) {
      var resultContinue = document.getElementById('s3ResultContinue');
      if (resultContinue) resultContinue.onclick = function () {
        var mode = resultMode;
        markResultSeen(mode);
        resultMode = '';
        puzzle = '';
        inspect = null;
        draw();
      };
    }
    var recordingNext = document.getElementById('s3RecordingNext');
    if (recordingNext) recordingNext.onclick = async function () {
      var current = Number(sceneState().recordingLine || 0);
      if (current >= recordingLines.length - 1) await syncScene({ recordingComplete: true, recordingLine: recordingLines.length - 1 });
      else await syncScene({ recordingLine: current + 1 });
      recordingVisible = true;
      draw();
    };
    var proceed = document.getElementById('s3Proceed');
    if (proceed) proceed.onclick = async function () {
      proceed.disabled = true;
      await ctx.submit('XYZ', proceed);
    };
  }

  function draw() {
    if (!ctx || !ctx.game) return;
    var state = sceneState();
    var q = question();
    var extra = '';
    if (q === 1 && introStep < intro.length) extra += dialogueMarkup(intro[introStep], 's3Intro');
    else if (state.maintenanceOpen && Number(state.maintenanceDialogue) < 2) {
      var maintenanceEntries = [
        ['대원', '또 같은 형태의 기록 장치다.'],
        ['루멘', '장면 2에서 발견한 장치와 동일한 계열입니다.'],
      ];
      extra += dialogueMarkup(maintenanceEntries[Math.max(0, Number(state.maintenanceDialogue))], 's3MaintenanceDialogue');
    }
    extra += inspectMarkup();
    extra += puzzleMarkup(state, q);
    if (resultMode) extra += resultMarkup(resultMode);
    if (clueOpen) extra += clueDrawerMarkup();
    if (personalPopup) extra += personalPopupMarkup();
    if ((recordingVisible || state.recordingStarted) && !resultMode) extra += recordingMarkup(state);
    ctx.game.innerHTML = '<div class="s3-shell">' + roomMarkup(state, q) + extra + '</div>';
    bindRoom(state);
    if (puzzle) bindPuzzle(state, q);
    bindOverlays(state);
  }

  function render(options) {
    ctx = options;
    var nextIdentity = options.state.session.code + ':' + options.state.player.team + ':' + options.state.player.role + ':' + (options.state.session.startedAt || 'waiting');
    if (identity !== nextIdentity) {
      identity = nextIdentity;
      introStep = getStored('intro-v2', '') === 'done' ? intro.length : 0;
      lastQuestion = 0;
      puzzle = '';
      inspect = null;
      clueOpen = false;
      personalPopup = false;
      viewRole = Number(options.state.player.role || 1);
      clearSelection();
      feedback = '';
      feedbackBad = false;
      resultMode = '';
      transmitting = false;
      clearTimeout(transmissionTimer);
      transmissionTimer = 0;
      recordingVisible = false;
      distanceDraft = null;
      endingDoorPlayed = false;
    }
    var state = sceneState();
    ensurePersonalClues(state);
    var q = question();
    if (lastQuestion && lastQuestion !== q) {
      puzzle = '';
      inspect = null;
      clearSelection();
      feedback = '';
      feedbackBad = false;
    }
    if (q === 2 && !resultSeen('p1')) resultMode = 'p1';
    if (q === 3 && !resultSeen('q2')) resultMode = 'q2';
    if (q === 4 && !state.p4Complete && !resultSeen('q3')) resultMode = 'q3';
    if (q === 4 && state.p4Complete && !resultSeen('p4')) resultMode = 'p4';
    if (state.recordingStarted) recordingVisible = true;
    lastQuestion = q;
    draw();
  }

  function renderEnding(game, onContinue) {
    if (!endingDoorPlayed) {
      endingDoorPlayed = true;
      playDistanceSound('doorOpen');
    }
    game.innerHTML = '<div class="s3-shell"><div class="s3-room s3-room-complete"><div class="s3-title"><small>03 — 별빛 분석 구획</small><b>장면 완료</b></div><div class="s3-status"><b>다음 구획 연결 준비 완료</b><span>기준값 변경 기록을 보존하고 있습니다.</span></div></div></div>';
    setTimeout(onContinue, 120);
  }

  window.StarEscapeScene03 = {
    render: render,
    renderEnding: renderEnding,
    data: {
      observations: personalRecords,
      absoluteMagnitudes: absoluteMagnitudes,
      answers: ['123456', 'A', 'C', 'XYZ'],
      recording: recordingLines.map(function (line) { return line.text; }),
    },
  };
})();
