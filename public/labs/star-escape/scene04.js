(function () {
  'use strict';

  var ROOT = '/labs/star-escape/assets/scene04/';
  var ctx = null;
  var identity = '';
  var introStep = 0;
  var modal = '';
  var inspect = null;
  var selectedItem = '';
  var selectedToken = null;
  var overlayPicks = { pattern: false, film: false };
  var patternPosition = { x: -76, y: -48 };
  var filmPosition = { x: 76, y: 48 };
  var lastAcquired = '';
  var photoPreview = '';
  var photoRestored = false;
  var photoScanHits = new Set();
  var photoLensPosition = { x: 50, y: 50 };
  var reflectorScare = false;
  var receptionPhase = 0;
  var uvHits = new Set();
  var panelTaps = 0;
  var horrorVisible = false;
  var signalIntrusionVisible = false;
  var recordingLocal = 0;
  var cctvLocal = 0;
  var receptionTimer = 0;
  var horrorTimer = 0;
  var signalIntrusionTimer = 0;
  var recordingTimer = 0;
  var cctvTimer = 0;
  var feedback = '';
  var feedbackBad = false;
  var clueCardImages = null;

  var intro = [
    ['루멘', '4번 구획 진입.'],
    ['루멘', '최종 관측 통제실입니다.'],
    ['대원', '여기가 마지막 구역이군.'],
    ['루멘', '귀환 인증 시스템의 마지막 잠금이 이 구역에 있습니다.'],
    ['루멘', '중앙 귀환 장치를 복구해야 합니다.'],
    ['시스템', '현재 목표 · 귀환 인증 시스템을 복구하라.'],
  ];

  var personalRecords = {
    1: { title: 'X의 공간 분포', text: 'X의 별들은 한곳에 빽빽하게 몰려 있지 않고, 비교적 성기고 불규칙하게 퍼져 있다.', image: 'scene04_p03_cluster_x_master.webp' },
    2: { title: 'X의 색', text: 'X에서는 푸른빛 또는 흰빛으로 보이는 별들이 비교적 눈에 띤다.', image: 'scene04_personal_x_color.svg' },
    3: { title: 'Y의 공간 분포', text: 'Y의 별들은 둥근 모양으로 모여 있으며, 중심으로 갈수록 매우 촘촘하다.', image: 'scene04_p03_cluster_y_master.webp' },
    4: { title: 'Y의 색', text: 'Y에서는 노란빛이나 붉은빛으로 보이는 별들이 많이 보인다.', image: 'scene04_personal_y_color.svg' },
  };

  var nebulaNames = { emission: '방출성운', reflection: '반사성운', dark: '암흑성운' };
  var nebulaPlacards = {
    emission: 'scene04_nebula_placard_set.svg',
    reflection: 'scene04_nebula_placard_set.svg',
    dark: 'scene04_nebula_placard_set.svg',
  };
  var clusterNames = { open: '산개성단', globular: '구상성단' };
  var chipNames = Object.assign({}, nebulaNames, clusterNames);
  var finalOrder = ['emission', 'open', 'dark', 'globular', 'reflection'];
  var chipBankOrder = ['reflection', 'globular', 'emission', 'dark', 'open'];
  var recordingLines = ['분류값까지 바뀌었다.', '이건 센서 오류가 아니야.', '누군가 직접 접근하고 있어.', '…잠깐.', '누구야?'];

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
    });
  }

  function img(name) {
    return ROOT + name;
  }

  function drawCardFrame(drawing, film) {
    var gradient = drawing.createLinearGradient(0, 0, 900, 520);
    gradient.addColorStop(0, film ? 'rgba(114,234,255,.08)' : '#17293a');
    gradient.addColorStop(1, film ? 'rgba(255,216,102,.06)' : '#07111d');
    drawing.fillStyle = gradient;
    drawing.fillRect(8, 8, 884, 504);
    drawing.strokeStyle = film ? '#ffdc75' : '#8beaff';
    drawing.lineWidth = 4;
    drawing.strokeRect(10, 10, 880, 500);
    drawing.strokeStyle = film ? 'rgba(255,223,121,.18)' : 'rgba(140,236,255,.16)';
    drawing.lineWidth = 1;
    for (var x = 42; x <= 858; x += 24) {
      drawing.beginPath(); drawing.moveTo(x, 42); drawing.lineTo(x, 430); drawing.stroke();
    }
    for (var y = 42; y <= 430; y += 24) {
      drawing.beginPath(); drawing.moveTo(42, y); drawing.lineTo(858, y); drawing.stroke();
    }
  }

  function buildClueCardImages() {
    if (clueCardImages) return clueCardImages;
    var width = 900;
    var height = 520;
    var cell = 8;
    var patternCanvas = document.createElement('canvas');
    var filmCanvas = document.createElement('canvas');
    var maskCanvas = document.createElement('canvas');
    [patternCanvas, filmCanvas, maskCanvas].forEach(function (canvas) { canvas.width = width; canvas.height = height; });
    var patternDrawing = patternCanvas.getContext('2d');
    var filmDrawing = filmCanvas.getContext('2d');
    var maskDrawing = maskCanvas.getContext('2d');
    drawCardFrame(patternDrawing, false);
    drawCardFrame(filmDrawing, true);
    maskDrawing.fillStyle = '#fff';
    maskDrawing.font = '900 126px "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';
    maskDrawing.textAlign = 'center';
    maskDrawing.textBaseline = 'alphabetic';
    maskDrawing.fillText('반사판 뒤', 450, 315);
    var mask = maskDrawing.getImageData(0, 0, width, height).data;
    var seed = 0x4d595df4;
    function randomBit() {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return (seed >>> 31) === 1;
    }
    patternDrawing.fillStyle = 'rgba(140,236,255,.52)';
    filmDrawing.fillStyle = 'rgba(255,223,121,.48)';
    for (var y = 42; y < 430; y += cell) {
      for (var x = 42; x < 858; x += cell) {
        var patternOn = randomBit();
        var sampleX = Math.min(width - 1, x + Math.floor(cell / 2));
        var sampleY = Math.min(height - 1, y + Math.floor(cell / 2));
        var inPhrase = mask[(sampleY * width + sampleX) * 4 + 3] > 40;
        var filmOn = inPhrase ? !patternOn : patternOn;
        if (patternOn) patternDrawing.fillRect(x, y, cell - 1, cell - 1);
        if (filmOn) filmDrawing.fillRect(x, y, cell - 1, cell - 1);
      }
    }
    patternDrawing.strokeStyle = 'rgba(140,236,255,.3)';
    filmDrawing.strokeStyle = 'rgba(255,223,121,.3)';
    patternDrawing.beginPath(); patternDrawing.moveTo(52, 444); patternDrawing.lineTo(848, 444); patternDrawing.stroke();
    filmDrawing.beginPath(); filmDrawing.moveTo(52, 444); filmDrawing.lineTo(848, 444); filmDrawing.stroke();
    clueCardImages = { pattern: patternCanvas.toDataURL('image/png'), film: filmCanvas.toDataURL('image/png') };
    return clueCardImages;
  }

  function clueCardImage(kind) {
    return buildClueCardImages()[kind];
  }

  function speakerPortrait(name) {
    if (/루멘|시스템/.test(name)) return '/labs/star-escape/assets/scene01/characters/ui_lumen_ai_icon.webp';
    if (/미확인/.test(name)) return img('scene04_silhouette_master.webp');
    var role = Math.max(1, Math.min(4, Number(ctx && ctx.state.player.role || 1)));
    return '/labs/star-escape/assets/scene01/characters/char_student_0' + role + '_' + ['female_bob', 'male_tablet', 'female_ponytail', 'male_glasses'][role - 1] + '.webp';
  }

  function dialogueMarkup(entry, id) {
    var name = entry[0];
    var speakerClass = name === '대원' ? 'speaker-crew' : /루멘|시스템/.test(name) ? 'speaker-ai' : 'speaker-device';
    return '<button class="s4-dialogue ' + speakerClass + '" id="' + id + '">' +
      '<img src="' + speakerPortrait(name) + '" alt="' + esc(name) + '">' +
      '<span><small>' + esc(name) + '</small><p>' + esc(entry[1]) + '</p></span>' +
      '<i>터치하여 계속 ▼</i></button>';
  }

  function baseState() {
    return {
      patternA: false,
      filmB: false,
      overlayComplete: false,
      lensAcquired: false,
      photosRestored: { A: false, B: false, C: false },
      nebulaSlots: ['', '', ''],
      nebulaComplete: false,
      lockerActive: false,
      dataSent: false,
      clusterSlots: ['', ''],
      clusterComplete: false,
      handleUnlocked: false,
      lockerOpen: false,
      uvAcquired: false,
      uvRevealed: false,
      finalSlots: ['', '', '', '', ''],
      authComplete: false,
      horrorSeen: false,
      maintenanceOpen: false,
      recordingStarted: false,
      recordingLine: 0,
      recordingComplete: false,
      logSeen: false,
      cctvStarted: false,
      cctvFrame: 0,
      cctvComplete: false,
      exitOpen: false,
    };
  }

  function sceneState() {
    var source = ctx && ctx.state && ctx.state.progress.sceneState || {};
    var state = Object.assign(baseState(), source);
    state.photosRestored = Object.assign({ A: false, B: false, C: false }, source.photosRestored || {});
    state.nebulaSlots = Array.isArray(source.nebulaSlots) && source.nebulaSlots.length === 3 ? source.nebulaSlots.slice() : ['', '', ''];
    state.clusterSlots = Array.isArray(source.clusterSlots) && source.clusterSlots.length === 2 ? source.clusterSlots.slice() : ['', ''];
    state.finalSlots = Array.isArray(source.finalSlots) && source.finalSlots.length === 5 ? source.finalSlots.slice() : ['', '', '', '', ''];
    return state;
  }

  function setLocalState(patch) {
    var state = sceneState();
    Object.keys(patch).forEach(function (key) { state[key] = patch[key]; });
    ctx.state.progress.sceneState = state;
  }

  async function sync(patch, redraw) {
    setLocalState(patch);
    if (redraw !== false) draw();
    try {
      var callback = ctx.sync || ctx.syncState;
      if (typeof callback !== 'function') throw new Error('모둠 동기화 기능을 찾을 수 없습니다.');
      await callback(Object.assign({}, ctx.state.progress.sceneState));
    } catch (error) {
      ctx.toast(error.message || '모둠 상태를 저장하지 못했습니다.', true);
    }
  }

  function storeKey(suffix) {
    return 'scilab-star-escape-scene04-v1:' + identity + ':' + suffix;
  }

  function stored(key) {
    try { return localStorage.getItem(storeKey(key)) || ''; } catch (error) { return ''; }
  }

  function saveStored(key, value) {
    try { localStorage.setItem(storeKey(key), String(value)); } catch (error) {}
  }

  function eventHook(name, detail) {
    try { window.dispatchEvent(new CustomEvent('star-escape:scene04', { detail: Object.assign({ event: name }, detail || {}) })); } catch (error) {}
  }

  function play(kind) {
    eventHook(kind);
    if (ctx.sound && typeof ctx.sound.play === 'function') ctx.sound.play(kind);
  }

  function availableRoles() {
    if (ctx.solo) return [1, 2, 3, 4];
    var own = Number(ctx.state.player.role || 1);
    var occupied = new Set((ctx.state.members || []).map(function (member) { return Number(member.role); }));
    return [1, 2, 3, 4].filter(function (role) { return role === own || !occupied.has(role); });
  }

  function roomStateFile(state) {
    if (state.exitOpen) return 'scene04_room_state07_exit_open.webp';
    if (state.maintenanceOpen) return 'scene04_room_state06_final_panel_open.webp';
    if (state.horrorSeen) return 'scene04_room_state05_blackout.webp';
    if (state.authComplete) return 'scene04_room_state04_auth_complete.webp';
    if (state.lockerOpen) return 'scene04_room_state03_cluster_box_open.webp';
    if (state.nebulaComplete) return 'scene04_room_state02_nebula_complete.webp';
    if (state.lensAcquired) return 'scene04_room_state01_reflector_open.webp';
    return 'scene04_room_state00_base.webp';
  }

  function objective(state) {
    if (!state.patternA || !state.filmB) return '책상과 관측도구 케이스에서 단서를 찾아보세요.';
    if (!state.overlayComplete) return '획득한 두 도트카드의 무늬를 자유롭게 관찰하세요.';
    if (!state.lensAcquired) return '겹친 문구가 가리킨 물체를 조사하세요.';
    if (!state.photosRestored.A || !state.photosRestored.B || !state.photosRestored.C) return '색 복원 렌즈를 선택해 A·B·C 천체사진에 사용하세요.';
    if (!state.nebulaComplete) return '복원된 성운 사진과 빈 명찰판을 살펴보세요.';
    if (!state.dataSent) return '활성화된 성단 관측 보관함을 조사하세요.';
    if (!state.clusterComplete) return '각 대원의 자료를 공유해 X와 Y 성단을 분류하세요.';
    if (!state.lockerOpen) return '잠금 해제된 보관함의 손잡이를 아래로 당기세요.';
    if (!state.uvRevealed) return 'UV 검사등을 선택해 오래된 별지도를 조사하세요.';
    if (!state.authComplete) return '▲ 표시부터 시계방향으로 인증칩 5개를 삽입하세요.';
    if (!state.horrorSeen) return '복구 중인 통제실의 이상 신호를 확인하세요.';
    if (!state.maintenanceOpen) return '암흑성운 관측판 주변의 작은 정비 패널을 조사하세요.';
    if (!state.recordingComplete) return '패널 안의 비인가 기록 장치를 직접 재생하세요.';
    if (!state.logSeen) return '중앙 장치의 조작 로그를 확인하세요.';
    if (!state.cctvComplete) return '활성화된 CCTV 감시 기록을 확인하세요.';
    return '열린 귀환 통로로 즉시 이동하세요.';
  }

  function itemImage(kind) {
    if (kind === 'pattern' || kind === 'film') return clueCardImage(kind);
    if (kind === 'lens') return img('scene04_item_color_restore_lens.webp');
    if (kind === 'uv') return img('scene04_item_uv_light.webp');
    if (kind.indexOf('chip:') === 0) return img('scene04_chip_base.webp');
    if (kind.indexOf('record:') === 0) {
      var role = Number(kind.split(':')[1]);
      return personalRecords[role] && personalRecords[role].image ? img(personalRecords[role].image) : '';
    }
    return '';
  }

  function itemCard(kind, title, note, active, isNew) {
    var image = itemImage(kind);
    return '<button class="s4-item' + (active ? ' selected' : '') + (isNew ? ' new' : '') + '" data-s4-item="' + esc(kind) + '">' +
      '<span class="s4-item-visual">' + (image ? '<img src="' + image + '" alt="' + esc(title) + '">' : '<span class="s4-paper-icon" aria-hidden="true">◇</span>') + (isNew ? '<em>새 단서</em>' : '') + '</span>' +
      '<b>' + esc(title) + '</b><small>' + esc(note || '') + '</small></button>';
  }

  function inventoryMarkup(state) {
    var items = [];
    if (state.patternA) items.push(itemCard('pattern', '패턴 조각 A', '기록철 아래에서 발견', overlayPicks.pattern, lastAcquired === 'pattern'));
    if (state.filmB) items.push(itemCard('film', '투명 필름 B', '관측도구 케이스에서 발견', overlayPicks.film, lastAcquired === 'film'));
    if (state.lensAcquired) items.push(itemCard('lens', '색 복원 렌즈', '기록 보정용 도구', selectedItem === 'lens'));
    if (state.dataSent) availableRoles().forEach(function (role) {
      var record = personalRecords[role];
      items.push(itemCard('record:' + role, 'R' + role + ' · ' + record.title, role === Number(ctx.state.player.role) ? '내 개인 자료' : '빈 역할 자료', false));
    });
    if (state.uvAcquired) items.push(itemCard('uv', 'UV 검사등', '숨은 표시 검사용', selectedItem === 'uv'));
    if (state.nebulaComplete) ['emission', 'reflection', 'dark'].forEach(function (kind) { items.push(itemCard('chip:' + kind, chipNames[kind] + ' 인증칩', '성운 분류 인증', false)); });
    if (state.lockerOpen) ['open', 'globular'].forEach(function (kind) { items.push(itemCard('chip:' + kind, chipNames[kind] + ' 인증칩', '성단 분류 인증', false)); });
    var canOverlap = state.patternA && state.filmB && !state.overlayComplete;
    return modalShell('단서 탭 · 인벤토리', '<div class="s4-inventory-grid">' + (items.join('') || '<p>아직 획득한 단서가 없습니다.</p>') + '</div>' +
      (state.patternA && state.filmB && !state.overlayComplete ? '<button class="s4-primary" id="s4OverlapOpen" ' + (canOverlap ? '' : 'disabled') + '>두 도트카드 관찰하기</button>' : '') +
      '<p class="s4-help">획득한 도트카드를 눌러 확인하세요. 색 복원 렌즈와 UV 검사등은 선택한 뒤 방의 물체에 사용합니다.</p>');
  }

  function modalShell(title, body, className) {
    return '<section class="s4-modal ' + (className || '') + '" role="dialog" aria-modal="true"><div class="s4-modal-card"><header><small>04 · 최종 관측 통제실</small><h2>' + esc(title) + '</h2><button class="s4-close" id="s4Close" aria-label="닫기">×</button></header><div class="s4-modal-body">' + body + '</div></div></section>';
  }

  function inspectMarkup(state) {
    if (!inspect) return '';
    var image = inspect.image || img(roomStateFile(state));
    return '<section class="s4-inspect" role="dialog" aria-modal="true">' +
      '<div class="s4-inspect-media' + (inspect.focus ? ' focus-' + esc(inspect.focus) : '') + '"><img src="' + esc(image) + '" alt=""></div>' +
      '<div><small>장치 조사</small><b>' + esc(inspect.title) + '</b><p>' + esc(inspect.text) + '</p>' + (inspect.state ? '<span>' + esc(inspect.state) + '</span>' : '') + '</div>' +
      '<button class="s4-close" id="s4InspectClose" aria-label="조사 화면 닫기">×</button></section>';
  }

  function roomMarkup(state) {
    var photosReady = state.photosRestored.A && state.photosRestored.B && state.photosRestored.C;
    return '<section class="s4-shell"><div class="s4-room">' +
      '<img class="s4-room-image" src="' + img(roomStateFile(state)) + '" alt="최종 관측 통제실">' +
      '<div class="s4-title"><small>04 — 최종 관측 통제실</small><b>마지막 인증</b></div>' +
      '<div class="s4-objective"><b>현재 목표</b><span>' + esc(objective(state)) + '</span></div>' +
      '<button class="s4-hotspot desk' + (state.patternA ? ' done' : '') + '" data-s4-object="desk" data-label="기록철" aria-label="기록철과 서류 더미"></button>' +
      '<button class="s4-hotspot case' + (state.filmB ? ' done' : '') + '" data-s4-object="case" data-label="관측도구 케이스" aria-label="관측도구 케이스"></button>' +
      ['A', 'B', 'C'].map(function (letter) {
        var file = { A: 'scene04_p02_nebula_a_color.webp', B: 'scene04_p02_nebula_b_color.webp', C: 'scene04_p02_nebula_c_color.webp' }[letter];
        return '<button class="s4-hotspot photo p' + letter.toLowerCase() + (state.photosRestored[letter] ? ' done' : '') + '" data-s4-object="photo" data-letter="' + letter + '" data-label="' + letter + ' 천체사진" aria-label="' + letter + ' 천체사진">' + (state.photosRestored[letter] && !state.nebulaComplete ? '<img class="s4-photo-overlay" src="' + img(file) + '" alt="">' : '') + '</button>';
      }).join('') +
      (photosReady && !state.nebulaComplete ? '<button class="s4-room-action nebula" data-s4-object="nebula-sort">성운 관측판 조사</button>' : '') +
      '<button class="s4-hotspot reflector' + (state.overlayComplete ? ' active' : '') + '" data-s4-object="reflector" data-label="반사판" aria-label="반사판"></button>' +
      '<button class="s4-hotspot locker' + (state.lockerActive ? ' active' : '') + (state.lockerOpen ? ' done' : '') + '" data-s4-object="locker" data-label="성단 관측 보관함" aria-label="성단 관측 보관함"></button>' +
      '<button class="s4-hotspot starmap' + (state.uvAcquired ? ' active' : '') + '" data-s4-object="starmap" data-label="오래된 별지도" aria-label="오래된 별지도"></button>' +
      '<button class="s4-hotspot core' + (state.uvRevealed ? ' active' : '') + (state.authComplete ? ' done' : '') + '" data-s4-object="core" data-label="중앙 귀환 장치" aria-label="중앙 귀환 인증 장치"></button>' +
      (state.horrorSeen ? '<button class="s4-hotspot maintenance active" data-s4-object="maintenance" data-label="작은 정비 패널" aria-label="작은 정비 패널"></button>' : '') +
      (state.recordingComplete && !state.logSeen ? '<button class="s4-room-action log" data-s4-object="log">조작 로그 확인</button>' : '') +
      (state.logSeen && !state.cctvComplete ? '<button class="s4-room-action cctv" data-s4-object="cctv">CCTV 감시 기록</button>' : '') +
      (state.exitOpen ? '<button class="s4-room-action exit" data-s4-object="exit">귀환 통로</button>' : '') +
      '<button class="s4-room-hint" id="hintBtn">힌트 · ' + Math.min(Number(ctx.state.progress.hintCount || 0), 3) + '/3</button><div class="s4-room-hintbox" id="hintbox"></div>' +
      '<button class="s4-inventory-button" id="s4Inventory"><span>단서 탭</span><b>' + inventoryCount(state) + '</b></button>' +
      '</div>' + inspectMarkup(state) + modalMarkup(state) + introMarkup() + horrorMarkup() + '</section>';
  }

  function inventoryCount(state) {
    var count = Number(state.patternA) + Number(state.filmB) + Number(state.lensAcquired) + Number(state.uvAcquired);
    if (state.nebulaComplete) count += 3;
    if (state.lockerOpen) count += 2;
    if (state.dataSent) count += availableRoles().length;
    return count;
  }

  function introMarkup() {
    if (introStep >= intro.length) return '';
    return dialogueMarkup(intro[introStep], 's4Intro');
  }

  function horrorMarkup() {
    if (signalIntrusionVisible) return '<div class="s4-horror signal-intrusion" aria-hidden="true"><div class="s4-signal-feed"><img src="/labs/star-escape/assets/scene02/scene2_corridor3_inside.png" alt="복도 CCTV 화면"><img class="s4-signal-silhouette" src="' + img('scene04_silhouette_master.webp') + '" alt="복도 끝 사람 실루엣"><b>수신 신호 불명</b><span>CAM 04 · 복도 끝</span></div></div>';
    if (!horrorVisible && !reflectorScare) return '';
    return '<div class="s4-horror' + (reflectorScare ? ' reflector-scare' : '') + '" aria-hidden="true"><img src="' + img('scene04_silhouette_master.webp') + '" alt=""><i></i></div>';
  }

  function modalMarkup(state) {
    if (!modal) return '';
    if (modal === 'inventory') return inventoryMarkup(state);
    if (modal === 'overlap') return overlapMarkup(state);
    if (modal === 'desk' || modal === 'case') return clueMarkup(modal, state);
    if (modal === 'reflector') return reflectorMarkup(state);
    if (modal.indexOf('photo:') === 0) return photoMarkup(state, modal.split(':')[1]);
    if (modal === 'nebula') return nebulaMarkup(state);
    if (modal === 'nebula-loot') return nebulaLootMarkup();
    if (modal === 'locker' || modal === 'reception' || modal === 'personal' || modal === 'loot') return clusterMarkup(state);
    if (modal === 'uv') return uvMarkup(state);
    if (modal === 'core' || modal === 'auth-success') return coreMarkup(state);
    if (modal === 'horror-dialog') return modalShell('이상 영상 신호', '<div class="s4-dialog-copy"><b>루멘</b><p>“…움직임을 감지했습니다.”</p></div>');
    if (modal === 'panel-knock') return modalShell('작은 정비 패널', '<div class="s4-knock"><b>덜컹—</b><p>안쪽에서 작은 소리가 들린다.</p><em>톡. 톡.</em><p>한 번 더 조사해야 할 것 같다.</p></div>');
    if (modal === 'recorder-found' || modal === 'recording') return recorderMarkup(state);
    if (modal === 'log') return logMarkup(state);
    if (modal === 'cctv') return cctvMarkup(state);
    if (modal === 'exit') return exitMarkup();
    if (modal.indexOf('record:') === 0) return personalMarkup(Number(modal.split(':')[1]));
    return '';
  }

  function clueMarkup(kind, state) {
    var isDesk = kind === 'desk';
    var found = isDesk ? state.patternA : state.filmB;
    var itemKind = isDesk ? 'pattern' : 'film';
    var title = isDesk ? '기록철 조사' : '관측도구 케이스';
    var itemTitle = isDesk ? '패턴 조각 A' : '투명 필름 B';
    var file = isDesk ? 'scene04_p00_record_folder_open.webp' : 'scene04_p00_observation_case_open.webp';
    var description = isDesk
      ? '노트 아래에서 사각 도트 무늬가 인쇄된 종이 조각을 발견했다.'
      : '케이스 안쪽에서 사각 도트 무늬가 있는 투명 필름을 발견했다.';
    var body = '<div class="s4-clue-inspect"><div class="s4-clue-image"><img src="' + img(file) + '" alt="' + esc(title) + ' 확대 이미지"></div><div class="s4-clue-copy"><small>발견한 물체</small><h3>' + esc(itemTitle) + '</h3><p>' + esc(description) + '</p>' +
      (found
        ? '<div class="s4-acquisition-card"><b>' + esc(itemTitle) + ' 획득</b><p>단서 탭에 실제 이미지로 저장되어 있다.</p></div>'
        : '<button class="s4-primary" id="s4AcquireClue" data-clue-kind="' + esc(itemKind) + '">' + esc(itemTitle) + ' 획득</button>') +
      '</div></div>';
    return modalShell(title, body, 'clue-modal');
  }

  function overlapMarkup(state) {
    var complete = state.overlayComplete;
    return modalShell('두 격자 카드의 숨은 신호', '<div class="s4-overlap-board" id="s4OverlapBoard">' +
      '<img class="s4-overlay-piece pattern" id="s4PatternA" src="' + clueCardImage('pattern') + '" alt="패턴 조각 A" style="--piece-x:' + patternPosition.x + 'px;--piece-y:' + patternPosition.y + 'px">' +
      '<img class="s4-overlay-piece film' + (complete ? ' snapped' : '') + '" id="s4Film" src="' + clueCardImage('film') + '" alt="투명 필름 B" style="--piece-x:' + filmPosition.x + 'px;--piece-y:' + filmPosition.y + 'px"></div>' +
      '<p class="s4-help">두 카드에는 서로 다른 격자 무늬가 남아 있습니다. 자유롭게 움직이며 변화를 관찰하세요.</p>' + puzzleFooter('카드의 위치를 바꾸며 격자 무늬의 변화를 살펴보세요.'), 'overlap');
  }

  function reflectorMarkup(state) {
    var acquired = state.lensAcquired;
    return modalShell('반사판 조사', '<div class="s4-media"><img src="' + img(acquired ? 'scene04_p01_reflector_open.webp' : 'scene04_p01_reflector_closed.webp') + '" alt="' + (acquired ? '열린 반사판 뒤 공간' : '닫힌 반사판') + '"></div>' +
      (!state.overlayComplete ? '<p>투명한 반사판이다. 지금은 특별한 단서를 찾지 못했다.</p>' : !acquired ? '<button class="s4-primary" id="s4AcquireLens">반사판 뒤쪽 확인</button>' : '<div class="s4-system-card"><b>색 복원 렌즈 획득</b><p>루멘: “기록 보정용 색 복원 렌즈입니다.”<br>“흑백 사진에 남아 있는 색상 정보를 복원할 수 있습니다.”</p></div>'));
  }

  function photoMarkup(state, letter) {
    var restored = state.photosRestored[letter] || photoRestored;
    var file = { A: 'scene04_p02_nebula_a_color.webp', B: 'scene04_p02_nebula_b_color.webp', C: 'scene04_p02_nebula_c_color.webp' }[letter];
    var note = { A: '붉은빛이 도는 성운', B: '푸른빛이 도는 성운', C: '배경을 가리는 어두운 구름 모양' }[letter];
    var zones = [
      { x: 26, y: 33 }, { x: 69, y: 38 }, { x: 50, y: 72 },
    ].map(function (zone, index) {
      return '<i class="s4-scan-zone' + (photoScanHits.has(index) ? ' done' : '') + '" data-scan-zone="' + index + '" style="left:' + zone.x + '%;top:' + zone.y + '%"></i>';
    }).join('');
    return modalShell(letter + ' 천체사진 · 색 정보 복원', '<div class="s4-photo-view' + (restored ? ' restored' : '') + '" id="s4PhotoView" style="--lens-x:' + photoLensPosition.x + '%;--lens-y:' + photoLensPosition.y + '%">' +
      '<img class="s4-photo-gray" src="' + img(file) + '" alt="' + esc(note) + '">' +
      '<img class="s4-photo-color" src="' + img(file) + '" alt="" aria-hidden="true">' +
      (!restored ? zones + '<div class="s4-lens-cursor"><img src="' + img('scene04_item_color_restore_lens.webp') + '" alt=""></div>' : '') + '</div>' +
      '<div class="s4-scan-progress"><b>' + (restored ? '색 정보 복원 완료' : '렌즈 조사 지점 · ' + photoScanHits.size + '/3') + '</b><span>' + (restored ? esc(note) + '이 관측된다.' : '사진 위에서 렌즈를 누른 채 움직여 세 지점을 조사하세요.') + '</span></div>' +
      (!state.photosRestored[letter] ? '<button class="s4-primary" id="s4SavePhoto" data-letter="' + letter + '" ' + (photoScanHits.size >= 3 ? '' : 'disabled') + '>복원된 관측 기록 저장</button>' : ''));
  }

  function tokenButton(kind, label, placed) {
    return '<button class="s4-token' + (placed ? ' placed' : '') + (selectedToken && selectedToken.value === kind ? ' selected' : '') + '" data-s4-drag="' + esc(kind) + '" ' + (placed ? 'disabled' : '') + '>' + esc(label) + '</button>';
  }

  function dropSlot(kind, index, label, value, names) {
    return '<div class="s4-drop' + (value ? ' filled' : '') + '" data-s4-drop="' + kind + '" data-slot="' + index + '"><small>' + esc(label) + '</small>' + (value ? '<b>' + esc(names[value]) + '</b>' : '<span>빈 판</span>') + '</div>';
  }

  function puzzleFooter(defaultText) {
    return '<footer class="s4-puzzle-footer"><button class="s4-secondary" data-s4-hint>힌트 · ' + Math.min(Number(ctx.state.progress.hintCount || 0), 3) + '/3 무료</button><p class="s4-feedback' + (feedbackBad ? ' bad' : '') + '" id="feedback">' + esc(feedback || defaultText || '명판을 끌어 관측판 아래 홈에 놓으세요.') + '</p></footer>';
  }

  function nebulaMarkup(state) {
    var files = ['scene04_p02_nebula_a_color.webp', 'scene04_p02_nebula_b_color.webp', 'scene04_p02_nebula_c_color.webp'];
    var placed = new Set(state.nebulaSlots.filter(Boolean));
    var photos = ['A', 'B', 'C'].map(function (letter, index) { return '<div class="s4-observation"><div class="s4-observation-image"><img src="' + img(files[index]) + '" alt="' + letter + ' 복원 사진"></div><b>' + letter + '</b>' + dropSlot('nebula', index, letter + ' 아래 명찰판', state.nebulaSlots[index], nebulaNames) + '</div>'; }).join('');
    var bank = Object.keys(nebulaNames).filter(function (kind) { return !placed.has(kind); }).map(function (kind) { return tokenButton(kind, nebulaNames[kind], false); }).join('');
    var notice = '<div class="s4-nebula-acquisition"><div><b>성운 명찰을 획득했다.</b><p>성운 아래의 명찰판이 비어 있다.</p></div><img src="' + img(nebulaPlacards.emission) + '" alt="방출성운·반사성운·암흑성운 명찰"></div>';
    return modalShell('복원된 천체사진 · 성운 분류', notice + '<div class="s4-sort-layout"><div class="s4-observation-grid nebula-grid">' + photos + '</div><aside><h3>획득한 성운 명찰</h3><div class="s4-token-bank">' + bank + '</div><p>복원된 사진의 특징과 명찰을 비교해 보세요.</p></aside></div>' + puzzleFooter(), 'puzzle');
  }

  function nebulaLootMarkup() {
    return modalShell('인증칩 3개 획득', '<div class="s4-loot"><div>' + itemCard('chip:emission', '방출성운 인증칩', '', false) + '</div><div>' + itemCard('chip:reflection', '반사성운 인증칩', '', false) + '</div><div>' + itemCard('chip:dark', '암흑성운 인증칩', '', false) + '</div></div><div class="s4-system-card"><b>성단 관측 보관함 활성화</b><p>방으로 돌아가 전원이 들어온 보관함을 직접 조사하세요.</p></div>');
  }

  function personalMarkup(role) {
    var record = personalRecords[role];
    var recordImage = record.image ? '<div class="s4-record-image"><img src="' + img(record.image) + '" alt="' + esc(record.title) + '"></div>' : '';
    return modalShell('R' + role + ' · ' + record.title, '<div class="s4-personal-record">' + recordImage + '<div><small>개인 단말 관측 자료</small><p>“' + esc(record.text) + '”</p></div></div><p class="s4-help">이 자료는 단서 탭에 실제 이미지로 자동 저장되었습니다.</p>');
  }

  function clusterMarkup(state) {
    if (modal === 'reception') return modalShell('관측 기록 복구', '<div class="s4-reception"><small>개인 자료 전송</small><b>' + (receptionPhase === 5 ? '수신 대상 5 확인' : '수신 대상 4') + '</b><div><i></i><i></i><i></i><i></i><i class="ghost' + (receptionPhase === 4 ? ' gone' : '') + '"></i></div>' + (receptionPhase === 4 ? '<p>루멘: “현재 연결된 단말기는 네 대입니다.”</p>' : '') + '</div>', 'signal');
    if (modal === 'personal') return personalMarkup(Number(ctx.state.player.role || 1));
    if (modal === 'loot') return modalShell('아이템 획득', '<img class="s4-loot-cabinet" src="' + img('scene04_p03_cluster_box_open.webp') + '" alt="손잡이를 당겨 열린 성단 관측 보관함"><div class="s4-loot"><div>' + itemCard('chip:open', '산개성단 인증칩', '', false) + '</div><div>' + itemCard('chip:globular', '구상성단 인증칩', '', false) + '</div><div>' + itemCard('uv', 'UV 검사등', '', false) + '</div></div><p>이제 인증칩 5개가 모두 갖춰졌습니다.</p>');
    var placed = new Set(state.clusterSlots.filter(Boolean));
    var observations = ['X', 'Y'].map(function (letter, index) {
      var file = index === 0 ? 'scene04_p03_cluster_x_master.webp' : 'scene04_p03_cluster_y_master.webp';
      return '<div class="s4-observation"><img src="' + img(file) + '" alt="' + letter + ' 성단 관측판"><b>' + letter + '</b>' + dropSlot('cluster', index, letter + ' 관측판', state.clusterSlots[index], clusterNames) + '</div>';
    }).join('');
    var bank = Object.keys(clusterNames).filter(function (kind) { return !placed.has(kind); }).map(function (kind) { return tokenButton(kind, clusterNames[kind], false); }).join('');
    var handle = state.handleUnlocked && !state.lockerOpen ? '<div class="s4-handle-track"><p>보관함 잠금 해제<br><b>손잡이를 아래로 당기세요.</b></p><button class="s4-handle" id="s4Handle" aria-label="보관함 손잡이를 아래로 당기기">≡</button></div>' : '';
    var transmission = !state.dataSent ? '<div class="s4-transmit"><img src="' + img('scene04_p03_cluster_box_closed.webp') + '" alt="잠긴 성단 관측 보관함"><p>개인 자료를 각 대원 단말기로 전송합니다.</p><button class="s4-primary" id="s4Transmit">개인 자료 전송</button></div>' : '<div class="s4-sort-layout"><div class="s4-observation-grid">' + observations + '</div><aside><h3>성단 명판</h3><div class="s4-token-bank">' + bank + '</div><button class="s4-secondary" id="s4Personal">내 개인 자료 확인</button><p>공간 분포와 색 정보를 대원들과 말로 공유하세요.</p></aside></div>' + handle + puzzleFooter();
    return modalShell('성단 관측 보관함', transmission, 'puzzle');
  }

  function uvMarkup(state) {
    var symbols = [
      ['scene04_p04_uv_symbol_01_emission_nebula.webp', '방출성운'],
      ['scene04_p04_uv_symbol_02_open_cluster.webp', '산개성단'],
      ['scene04_p04_uv_symbol_03_dark_nebula.webp', '암흑성운'],
      ['scene04_p04_uv_symbol_04_globular_cluster.webp', '구상성단'],
      ['scene04_p04_uv_symbol_05_reflection_nebula.webp', '반사성운'],
    ];
    var positions = [
      { left: '17%', top: '30%' }, { left: '37%', top: '20%' },
      { left: '57%', top: '34%' }, { left: '46%', top: '68%' },
      { left: '76%', top: '68%' },
    ];
    var complete = state.uvRevealed || uvHits.size >= 5;
    var overlay = '<svg class="s4-uv-route" viewBox="0 0 100 100" aria-hidden="true"><defs><marker id="s4ArrowHead" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><path d="M0 0 L7 3.5 L0 7 Z"/></marker></defs>' +
      '<path class="s4-route-segment" d="M7 30 L10 30" marker-end="url(#s4ArrowHead)"/>' +
      '<path class="s4-route-segment" d="M24 27 C28 24 31 22 32 22" marker-end="url(#s4ArrowHead)"/>' +
      '<path class="s4-route-segment" d="M43 22 C48 24 50 27 52 30" marker-end="url(#s4ArrowHead)"/>' +
      '<path class="s4-route-segment" d="M55 42 C53 50 50 57 48 60" marker-end="url(#s4ArrowHead)"/>' +
      '<path class="s4-route-segment" d="M53 68 C60 68 66 68 69 68" marker-end="url(#s4ArrowHead)"/>' +
      '<path class="s4-route-start" d="M4 24 L8 30 L0 30 Z"/>' +
      '</svg>' + symbols.map(function (entry, index) {
      var pos = positions[index];
      var found = complete || uvHits.has(index);
      return '<div class="s4-uv-symbol u' + (index + 1) + (found ? ' found' : '') + '" data-uv-hit="' + index + '" style="left:' + pos.left + ';top:' + pos.top + '"><span><img src="' + img(entry[0]) + '" alt="' + entry[1] + ' 숨은 기호"></span><b>' + entry[1] + '</b></div>';
    }).join('');
    return modalShell('UV 검사 · 오래된 별지도', '<div class="s4-uv-board' + (complete ? ' complete' : '') + '" id="s4UvBoard"><img src="' + img('scene04_p04_starmap_base.webp') + '" alt="오래된 별지도"><div class="s4-uv-overlay" id="s4UvOverlay">' + overlay + '</div><div class="s4-uv-lamp"><img src="' + img('scene04_item_uv_light.webp') + '" alt=""></div></div><div class="s4-uv-progress"><b>숨은 기호 · ' + (complete ? 5 : uvHits.size) + '/5</b><span>▲에서 시작해 굵은 보라색 화살표를 따라 읽으세요.</span></div><p class="s4-help">다섯 기호는 각각 앞에서 분류한 천체를 뜻합니다. 화살표가 연결하는 순서가 중앙 귀환장치에 넣을 인증칩 순서입니다.</p>' +
      '<button class="s4-primary" id="s4SaveUv" ' + (uvHits.size >= 5 || state.uvRevealed ? '' : 'disabled') + '>숨은 순서 기록</button>' + puzzleFooter('지도 위에 숨겨진 기호를 모두 찾아 방향을 따라 순서를 읽으세요.'), 'uv');
  }

  function chipButton(kind, placed) {
    return '<button class="s4-chip chip-' + kind + (placed ? ' placed' : '') + (selectedToken && selectedToken.value === kind ? ' selected' : '') + '" data-s4-drag="' + kind + '" ' + (placed ? 'disabled' : '') + '><img src="' + img('scene04_chip_base.webp') + '" alt=""><span>' + chipNames[kind] + '</span></button>';
  }

  function coreMarkup(state) {
    if (modal === 'auth-success') return modalShell('귀환 인증 완료', '<div class="s4-auth-success"><b>중앙 귀환 시스템 복구</b><p>루멘: “최종 인증이 완료되었습니다.”<br>“귀환 시스템을 복구합니다.”</p><button class="s4-primary" id="s4AuthReturn">방으로 돌아가기</button></div>');
    var owned = state.nebulaComplete && state.lockerOpen;
    var unlocked = owned && state.uvRevealed;
    var placed = new Set(state.finalSlots.filter(Boolean));
    var slots = state.finalSlots.map(function (value, index) {
      return '<button class="s4-core-slot slot-' + (index + 1) + (value ? ' filled' : '') + '" data-s4-drop="final" data-slot="' + index + '" data-value="' + esc(value) + '" ' + (unlocked ? '' : 'disabled') + '>' +
        (value ? '<img src="' + img('scene04_chip_base.webp') + '" alt=""><span>' + chipNames[value] + '</span>' : '<i></i>') + '</button>';
    }).join('');
    var chips = unlocked ? chipBankOrder.filter(function (kind) { return !placed.has(kind); }).map(function (kind) { return chipButton(kind, false); }).join('') : '';
    var bankMessage = !owned ? '아직 인증칩 5개가 모두 없습니다.' : !state.uvRevealed ? 'UV로 별지도의 숨은 순서를 먼저 확인해야 합니다.' : !chips ? '칩 5개가 모두 장치에 들어갔습니다.' : '';
    var filled = state.finalSlots.filter(Boolean).length;
    var controls = unlocked ? '<div class="s4-auth-controls"><button class="s4-secondary" id="s4AuthReset" ' + (filled ? '' : 'disabled') + '>칩 모두 빼기</button><button class="s4-primary" id="s4AuthSubmit" ' + (filled === 5 ? '' : 'disabled') + '>귀환 인증 확인</button></div>' + puzzleFooter('칩을 모두 배치한 뒤 한 번에 인증합니다. 개별 슬롯은 정답 여부를 알려주지 않습니다.') : '';
    return modalShell('중앙 귀환 인증 장치', '<div class="s4-core-layout"><div class="s4-core-device">' + slots + '</div><aside><h3>보유 인증칩</h3><div class="s4-chip-bank">' + chips + (bankMessage ? '<p>' + bankMessage + '</p>' : '') + '</div><p>별지도에서 읽은 순서를 ▲부터 시계방향으로 배치하세요. 넣은 칩은 다시 눌러 뺄 수 있습니다.</p></aside></div>' + controls, 'puzzle core-modal');
  }

  function recorderMarkup(state) {
    if (!state.recordingStarted && modal === 'recorder-found') return modalShell('비인가 기록 장치', '<div class="s4-recorder"><div class="s4-recorder-unit"><i></i><b>UNAUTHORIZED LOG</b></div><div class="s4-dialog-copy"><b>대원</b><p>“또 같은 형태의 기록 장치다.”</p><b>루멘</b><p>“기존에 발견된 비인가 기록 장치와 동일 계열입니다.”</p></div><button class="s4-primary" id="s4PlayRecording">기록 장치 재생</button></div>');
    var index = state.recordingComplete ? 4 : recordingLocal;
    return modalShell('마지막 기록 재생', '<div class="s4-recording"><small>미확인 음성</small><p class="' + (index === 4 ? 'last' : '') + '">“' + esc(recordingLines[index]) + '”</p><div class="s4-wave"><i></i><i></i><i></i><i></i><i></i></div>' + (state.recordingComplete ? '<b>기록 종료</b>' : '<span>재생 중…</span>') + '</div>', 'recording-modal');
  }

  function logMarkup(state) {
    return modalShell('조작 로그 복원', '<div class="s4-log"><small>관측 자료 변경 기록</small><ul><li><b>변경 방식</b><span>수동</span></li><li><b>자동 수정</b><span>없음</span></li><li><b>변경 시각</b><span>사고 발생 전</span></li><li><b>접근자 정보</b><span>확인 불가</span></li></ul><p>루멘: “장면 3에서 발견한 기준값 변경과 동일한 시간대입니다.”<br>“관측 시스템은 고장 난 것이 아닙니다.”<br><strong>“누군가 직접 변경했습니다.”</strong></p></div>' + (!state.logSeen ? '<button class="s4-primary" id="s4SaveLog">조작 로그 확인</button>' : ''));
  }

  function cctvMarkup(state) {
    var frame = state.cctvComplete ? 10 : Math.max(0, Math.min(10, cctvLocal));
    var labels = ['사고 전 장면 4 방', '빈 방', '사람 형체 입장', '중앙 관측 장치로 이동', '장치 조작', '움직임 정지', 'CCTV 쪽으로 천천히 고개 회전', '얼굴 부분 노이즈', '영상 끊김', '한 프레임 복원', '다시 빈 방'];
    return modalShell('CCTV 감시 기록', '<div class="s4-cctv frame-' + frame + '"><img src="' + img('scene04_room_state04_auth_complete.webp') + '" alt="감시 카메라에 기록된 통제실"><img class="s4-cctv-silhouette" src="' + img('scene04_silhouette_master.webp') + '" alt="검은 사람 실루엣"><i></i><span>CAM 04 · ' + esc(labels[frame]) + '</span></div>' +
      (state.cctvComplete ? '<div class="s4-cctv-result"><b>퇴실 기록이 존재하지 않습니다.</b><p>루멘: “접근 기록은 있으나, 퇴실 기록은 존재하지 않습니다.”</p></div>' : '<p class="s4-help">감시 기록 복원 중…</p>'), 'cctv-modal');
  }

  function exitMarkup() {
    return modalShell('귀환 통로 개방', '<div class="s4-exit-copy"><b>귀환 통로 개방</b><p>루멘: “귀환 경로가 확보되었습니다.”<br>“…이 구획을 떠나는 것을 권장합니다.”</p><button class="s4-primary" id="s4Leave">귀환 통로로 이동</button></div>');
  }

  function openPhoto(letter, state) {
    if (!state.photosRestored[letter] && (!state.lensAcquired || selectedItem !== 'lens')) {
      inspect = {
        title: letter + ' 천체사진',
        text: '흑백 관측 기록이다. 이 상태로는 성운의 색과 특징을 구분하기 어렵다.',
        state: state.lensAcquired ? '단서 탭에서 색 복원 렌즈를 선택한 뒤 다시 조사하세요.' : '색 정보를 복원할 수 있는 도구가 필요합니다.',
        image: img({ A: 'scene04_p02_nebula_a_color.webp', B: 'scene04_p02_nebula_b_color.webp', C: 'scene04_p02_nebula_c_color.webp' }[letter]),
        focus: 'photo-gray',
      };
      modal = '';
      draw();
      return;
    }
    inspect = null;
    modal = 'photo:' + letter;
    photoPreview = letter;
    photoRestored = Boolean(state.photosRestored[letter]);
    photoScanHits = new Set();
    photoLensPosition = { x: 50, y: 50 };
    draw();
  }

  async function savePhoto(letter) {
    if (!sceneState().photosRestored[letter] && photoScanHits.size < 3) return;
    var state = sceneState();
    var restored = Object.assign({}, state.photosRestored);
    restored[letter] = true;
    photoRestored = true;
    await sync({ photosRestored: restored });
    ctx.toast(letter + ' 천체사진의 색상 정보를 복원했습니다.');
  }

  async function acquireClue(kind) {
    var patch = kind === 'pattern' ? { patternA: true } : { filmB: true };
    await sync(patch, false);
    lastAcquired = kind;
    play('item');
    modal = kind === 'pattern' ? 'desk' : 'case';
    draw();
  }

  async function acquireLens() {
    await sync({ lensAcquired: true });
    selectedItem = 'lens';
    modal = 'reflector';
    play('item');
    draw();
  }

  async function finishOverlay() {
    var state = sceneState();
    if (state.overlayComplete) return;
    patternPosition = { x: 0, y: 0 };
    filmPosition = { x: 0, y: 0 };
    await sync({ overlayComplete: true });
    play('reveal');
    await ctx.submit('반사판뒤');
  }

  async function placeToken(kind, value, slotIndex) {
    var state = sceneState();
    var expected;
    var slots;
    if (kind === 'nebula') { expected = ['emission', 'reflection', 'dark']; slots = state.nebulaSlots.slice(); }
    else if (kind === 'cluster') { expected = ['open', 'globular']; slots = state.clusterSlots.slice(); }
    else {
      if (!state.uvRevealed) {
        feedback = 'UV로 별지도의 숨은 순서를 먼저 확인하세요.';
        feedbackBad = true;
        play('error');
        draw();
        return;
      }
      slots = state.finalSlots.slice();
      if (slots[slotIndex] || slots.indexOf(value) >= 0) return;
      slots[slotIndex] = value;
      selectedToken = null;
      feedback = '';
      feedbackBad = false;
      await sync({ finalSlots: slots, authComplete: false });
      play('insert');
      return;
    }
    if (expected[slotIndex] !== value) {
      feedback = kind === 'nebula' ? '복원된 색과 특징을 다시 확인하세요.' : kind === 'cluster' ? '성단의 분포와 색을 다시 비교하세요.' : '별지도에 드러난 순서를 다시 확인하세요.';
      feedbackBad = true;
      play('error');
      draw();
      return;
    }
    slots[slotIndex] = value;
    feedback = '';
    feedbackBad = false;
    selectedToken = null;
    play('insert');
    if (kind === 'nebula') {
      var nebulaDone = slots.join(',') === expected.join(',');
      await sync({ nebulaSlots: slots, nebulaComplete: nebulaDone, lockerActive: nebulaDone });
      if (nebulaDone) {
        play('complete');
        ctx.toast('성단 관측 보관함 활성화');
        modal = 'nebula-loot';
        await ctx.submit('성운분류완료');
      }
    } else if (kind === 'cluster') {
      var clusterDone = slots.join(',') === expected.join(',');
      await sync({ clusterSlots: slots, clusterComplete: clusterDone, handleUnlocked: clusterDone });
      if (clusterDone) ctx.toast('보관함 잠금 해제 · 손잡이를 당겨 여세요.');
    }
  }

  async function removeFinalToken(slotIndex) {
    var state = sceneState();
    var slots = state.finalSlots.slice();
    if (!slots[slotIndex] || state.authComplete) return;
    slots[slotIndex] = '';
    selectedToken = null;
    feedback = '';
    feedbackBad = false;
    await sync({ finalSlots: slots, authComplete: false });
  }

  async function resetFinalTokens() {
    selectedToken = null;
    feedback = '';
    feedbackBad = false;
    await sync({ finalSlots: ['', '', '', '', ''], authComplete: false });
  }

  async function verifyFinalOrder() {
    var state = sceneState();
    if (!state.uvRevealed || state.finalSlots.some(function (value) { return !value; })) return;
    selectedToken = null;
    if (state.finalSlots.join(',') !== finalOrder.join(',')) {
      feedback = '인증 불일치 · 다섯 칩이 함께 튕겨 나왔습니다. 별지도의 전체 화살표 순서를 다시 확인하세요.';
      feedbackBad = true;
      play('error');
      await sync({ finalSlots: ['', '', '', '', ''], authComplete: false }, false);
      modal = 'core';
      draw();
      return;
    }
    feedback = '';
    feedbackBad = false;
    await sync({ finalSlots: finalOrder.slice(), authComplete: true }, false);
    modal = 'auth-success';
    play('complete');
    draw();
  }

  function startReception() {
    if (stored('reception-seen') === 'yes') return;
    saveStored('reception-seen', 'yes');
    modal = 'reception';
    receptionPhase = 5;
    draw();
    clearTimeout(receptionTimer);
    receptionTimer = setTimeout(function () {
      receptionPhase = 4;
      draw();
      receptionTimer = setTimeout(function () {
        saveStored('personal-delivered', 'yes');
        modal = 'personal';
        draw();
      }, 950);
    }, 650);
  }

  function startSignalIntrusion() {
    if (signalIntrusionVisible || stored('signal-intrusion-seen') === 'yes') return;
    saveStored('signal-intrusion-seen', 'yes');
    signalIntrusionVisible = true;
    play('scene4_signal_intrusion');
    draw();
    clearTimeout(signalIntrusionTimer);
    signalIntrusionTimer = setTimeout(function () {
      signalIntrusionVisible = false;
      draw();
    }, 850);
  }

  async function transmitRecords() {
    await sync({ dataSent: true });
    play('scene4_receiver_five');
    startReception();
  }

  async function openLocker() {
    var state = sceneState();
    if (!state.handleUnlocked || state.lockerOpen) return;
    modal = 'loot';
    await sync({ lockerOpen: true, uvAcquired: true });
    selectedItem = 'uv';
    play('storageOpen34');
    await ctx.submit('성단분류완료');
  }

  function startHorror() {
    if (horrorVisible) return;
    modal = '';
    horrorVisible = true;
    saveStored('horror-seen', 'yes');
    play('scene4_blackout');
    draw();
    clearTimeout(horrorTimer);
    horrorTimer = setTimeout(async function () {
      horrorVisible = false;
      await sync({ horrorSeen: true }, false);
      modal = 'horror-dialog';
      play('scene4_corridor_presence');
      draw();
    }, 1150);
  }

  function startRecording() {
    recordingLocal = 0;
    modal = 'recording';
    sync({ recordingStarted: true, recordingLine: 0 }, false);
    play('scene4_final_record');
    draw();
    clearInterval(recordingTimer);
    recordingTimer = setInterval(function () {
      if (recordingLocal < 4) {
        recordingLocal += 1;
        setLocalState({ recordingLine: recordingLocal });
        draw();
      } else {
        clearInterval(recordingTimer);
        sync({ recordingLine: 4, recordingComplete: true });
      }
    }, 1200);
  }

  function startCctv() {
    var state = sceneState();
    modal = 'cctv';
    cctvLocal = state.cctvComplete ? 10 : 0;
    sync({ cctvStarted: true, cctvFrame: cctvLocal }, false);
    eventHook('cctv-start');
    draw();
    if (state.cctvComplete) return;
    clearInterval(cctvTimer);
    cctvTimer = setInterval(function () {
      if (cctvLocal < 10) {
        cctvLocal += 1;
        if (cctvLocal === 8) play('scene4_cctv_noise');
        setLocalState({ cctvFrame: cctvLocal });
        draw();
      } else {
        clearInterval(cctvTimer);
        sync({ cctvFrame: 10, cctvComplete: true, exitOpen: true });
        eventHook('exit-open');
        play('doorOpen');
      }
    }, 700);
  }

  function showInspect(title, text, stateText, image, focus) {
    modal = '';
    inspect = { title: title, text: text, state: stateText || '', image: image || '', focus: focus || '' };
    draw();
  }

  function objectClick(button) {
    var state = sceneState();
    var object = button.dataset.s4Object;
    if (object === 'desk') {
      inspect = null;
      modal = 'desk'; draw();
    } else if (object === 'case') {
      inspect = null;
      modal = 'case'; draw();
    } else if (object === 'photo') openPhoto(button.dataset.letter, state);
    else if (object === 'nebula-sort') { inspect = null; modal = 'nebula'; draw(); }
    else if (object === 'reflector') {
      if (!state.overlayComplete) { showInspect('반사판', '투명한 반사판이다. 겉보기에는 특별한 장치가 보이지 않는다.', '숨은 위치 단서가 필요합니다.', img('scene04_p01_reflector_closed.webp')); return; }
      inspect = null;
      if (!state.lensAcquired && stored('reflector-scare') !== 'yes') {
        saveStored('reflector-scare', 'yes'); reflectorScare = true; play('scene4_reflection_silhouette'); draw();
        setTimeout(function () { reflectorScare = false; modal = 'reflector'; draw(); }, 520);
      } else { modal = 'reflector'; draw(); }
    } else if (object === 'locker') {
      if (!state.lockerActive) { showInspect('성단 관측 보관함', '전원이 들어오지 않은 채 단단히 잠겨 있다.', '성운 분류 인증이 먼저 필요합니다.', img('scene04_p03_cluster_box_closed.webp')); return; }
      inspect = null;
      modal = state.lockerOpen ? 'loot' : 'locker'; draw();
    } else if (object === 'starmap') {
      if (selectedItem !== 'uv' || !state.uvAcquired) { showInspect('오래된 별지도', '오래된 별지도다. 겉보기에는 특별한 표시가 없다.', state.uvAcquired ? '단서 탭에서 UV 검사등을 선택한 뒤 다시 조사하세요.' : '숨은 표시를 확인할 검사 도구가 필요합니다.', img('scene04_p04_starmap_base.webp')); return; }
      inspect = null;
      modal = 'uv'; draw();
    } else if (object === 'core') {
      inspect = null;
      modal = state.authComplete ? 'auth-success' : 'core'; draw();
    } else if (object === 'maintenance') {
      inspect = null;
      if (state.maintenanceOpen) { modal = state.recordingComplete ? 'log' : state.recordingStarted ? 'recording' : 'recorder-found'; draw(); return; }
      if (panelTaps === 0) { panelTaps = 1; modal = 'panel-knock'; play('scene4_panel_knock'); draw(); }
      else sync({ maintenanceOpen: true }).then(function () { modal = 'recorder-found'; play('storageOpen34'); draw(); });
    } else if (object === 'log') { inspect = null; modal = 'log'; draw(); }
    else if (object === 'cctv') { inspect = null; startCctv(); }
    else if (object === 'exit') { inspect = null; modal = 'exit'; draw(); }
  }

  function bindOverlayDrag() {
    var board = document.getElementById('s4OverlapBoard');
    if (!board || sceneState().overlayComplete) return;
    var pieces = [
      { element: document.getElementById('s4PatternA'), position: patternPosition },
      { element: document.getElementById('s4Film'), position: filmPosition },
    ];
    function aligned() {
      return Math.hypot(patternPosition.x - filmPosition.x, patternPosition.y - filmPosition.y) < 28;
    }
    pieces.forEach(function (piece) {
      if (!piece.element) return;
      piece.element.onpointerdown = function (event) {
        event.preventDefault();
        var startX = event.clientX;
        var startY = event.clientY;
        var originX = piece.position.x;
        var originY = piece.position.y;
        var rect = board.getBoundingClientRect();
        var limitX = Math.max(90, rect.width * .28);
        var limitY = Math.max(70, rect.height * .28);
        piece.element.setPointerCapture(event.pointerId);
        piece.element.onpointermove = function (move) {
          event.preventDefault();
          piece.position.x = Math.max(-limitX, Math.min(limitX, originX + move.clientX - startX));
          piece.position.y = Math.max(-limitY, Math.min(limitY, originY + move.clientY - startY));
          piece.element.style.setProperty('--piece-x', piece.position.x + 'px');
          piece.element.style.setProperty('--piece-y', piece.position.y + 'px');
        };
        piece.element.onpointerup = function () {
          piece.element.onpointermove = null;
          if (aligned()) finishOverlay();
        };
        piece.element.onpointercancel = function () { piece.element.onpointermove = null; };
      };
    });
  }

  function bindTokenPlacement() {
    Array.from(document.querySelectorAll('[data-s4-drag]')).forEach(function (token) {
      token.onclick = function () {
        selectedToken = { value: token.dataset.s4Drag };
        document.querySelectorAll('[data-s4-drag]').forEach(function (node) { node.classList.toggle('selected', node === token); });
      };
      token.onpointerdown = function (event) {
        if (token.disabled) return;
        var startX = event.clientX;
        var startY = event.clientY;
        var moved = false;
        token.setPointerCapture(event.pointerId);
        token.classList.add('dragging');
        token.onpointermove = function (move) {
          var dx = move.clientX - startX;
          var dy = move.clientY - startY;
          moved = moved || Math.hypot(dx, dy) > 7;
          token.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(1.06)';
        };
        token.onpointerup = function (up) {
          token.onpointermove = null;
          token.classList.remove('dragging');
          token.style.transform = '';
          if (!moved) return;
          var drop = document.elementsFromPoint(up.clientX, up.clientY).find(function (node) { return node.dataset && node.dataset.s4Drop; });
          if (drop) placeToken(drop.dataset.s4Drop, token.dataset.s4Drag, Number(drop.dataset.slot));
        };
      };
    });
    Array.from(document.querySelectorAll('[data-s4-drop]')).forEach(function (drop) {
      drop.onclick = function () {
        if (drop.dataset.s4Drop === 'final' && drop.dataset.value && !selectedToken) {
          removeFinalToken(Number(drop.dataset.slot));
          return;
        }
        if (selectedToken) placeToken(drop.dataset.s4Drop, selectedToken.value, Number(drop.dataset.slot));
      };
    });
  }

  function bindHandle() {
    var handle = document.getElementById('s4Handle');
    if (!handle) return;
    handle.onpointerdown = function (event) {
      event.preventDefault();
      var startY = event.clientY;
      handle.setPointerCapture(event.pointerId);
      handle.onpointermove = function (move) { handle.style.transform = 'translateY(' + Math.max(0, Math.min(100, move.clientY - startY)) + 'px)'; };
      handle.onpointerup = function (up) {
        handle.onpointermove = null;
        if (up.clientY - startY >= 68) openLocker();
        else handle.style.transform = '';
      };
    };
  }

  function bindPhotoScan() {
    var view = document.getElementById('s4PhotoView');
    if (!view || view.classList.contains('restored')) return;
    function scan(event) {
      var rect = view.getBoundingClientRect();
      var x = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
      var y = Math.max(0, Math.min(rect.height, event.clientY - rect.top));
      var percentX = x / rect.width * 100;
      var percentY = y / rect.height * 100;
      photoLensPosition = { x: percentX, y: percentY };
      view.style.setProperty('--lens-x', percentX + '%');
      view.style.setProperty('--lens-y', percentY + '%');
      var before = photoScanHits.size;
      view.querySelectorAll('[data-scan-zone]').forEach(function (zone) {
        var zoneX = parseFloat(zone.style.left);
        var zoneY = parseFloat(zone.style.top);
        if (Math.hypot(percentX - zoneX, percentY - zoneY) < 13) {
          var index = Number(zone.getAttribute('data-scan-zone'));
          photoScanHits.add(index);
          zone.classList.add('done');
        }
      });
      var progress = document.querySelector('.s4-scan-progress b');
      if (progress) progress.textContent = '렌즈 조사 지점 · ' + photoScanHits.size + '/3';
      if (photoScanHits.size >= 3) {
        var button = document.getElementById('s4SavePhoto');
        if (button) button.disabled = false;
        if (before < 3) play('restore');
      }
    }
    view.onpointerdown = function (event) {
      event.preventDefault();
      view.setPointerCapture(event.pointerId);
      scan(event);
      view.onpointermove = scan;
    };
    view.onpointerup = function () { view.onpointermove = null; };
    view.onpointercancel = function () { view.onpointermove = null; };
  }

  function bindUv() {
    var board = document.getElementById('s4UvBoard');
    if (!board) return;
    function scan(event) {
      var rect = board.getBoundingClientRect();
      var x = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
      var y = Math.max(0, Math.min(rect.height, event.clientY - rect.top));
      board.style.setProperty('--uv-x', x + 'px');
      board.style.setProperty('--uv-y', y + 'px');
      var normalizedX = x / rect.width;
      var normalizedY = y / rect.height;
      board.querySelectorAll('[data-uv-hit]').forEach(function (marker) {
        var markerRect = marker.getBoundingClientRect();
        var markerX = (markerRect.left + markerRect.width / 2 - rect.left) / rect.width;
        var markerY = (markerRect.top + markerRect.height / 2 - rect.top) / rect.height;
        if (Math.hypot(normalizedX - markerX, normalizedY - markerY) < .105) {
          uvHits.add(Number(marker.getAttribute('data-uv-hit')));
          marker.classList.add('found');
        }
      });
      var progress = document.querySelector('.s4-uv-progress b');
      if (progress) progress.textContent = '숨은 기호 · ' + uvHits.size + '/5';
      if (uvHits.size >= 5) {
        board.classList.add('complete');
        var button = document.getElementById('s4SaveUv');
        if (button) button.disabled = false;
      }
    }
    board.onpointerdown = function (event) { board.setPointerCapture(event.pointerId); scan(event); board.onpointermove = scan; };
    board.onpointerup = function () { board.onpointermove = null; };
    board.onpointercancel = function () { board.onpointermove = null; };
  }

  function bindModal(state) {
    var inspectClose = document.getElementById('s4InspectClose');
    if (inspectClose) inspectClose.onclick = function () { inspect = null; draw(); };
    var close = document.getElementById('s4Close');
    if (close) close.onclick = function () {
      if (modal === 'recording' && !state.recordingComplete) { ctx.toast('기록이 끝날 때까지 확인하세요.', true); return; }
      if (modal === 'cctv' && !state.cctvComplete) { ctx.toast('감시 기록을 끝까지 확인하세요.', true); return; }
      modal = ''; draw();
    };
    var overlap = document.getElementById('s4OverlapOpen');
    if (overlap) overlap.onclick = function () { modal = 'overlap'; draw(); };
    var acquireClueButton = document.getElementById('s4AcquireClue');
    if (acquireClueButton) acquireClueButton.onclick = function () { acquireClue(acquireClueButton.dataset.clueKind); };
    document.querySelectorAll('[data-s4-item]').forEach(function (item) {
      item.onclick = function () {
        var kind = item.dataset.s4Item;
        if (kind === 'pattern' || kind === 'film') { overlayPicks[kind] = !overlayPicks[kind]; modal = 'inventory'; draw(); return; }
        if (kind.indexOf('record:') === 0) { modal = kind; draw(); return; }
        if (kind === 'lens' || kind === 'uv') { selectedItem = selectedItem === kind ? '' : kind; modal = ''; ctx.toast(selectedItem ? (kind === 'lens' ? '색 복원 렌즈 선택' : 'UV 검사등 선택') : '도구 선택 해제'); draw(); }
      };
    });
    var acquire = document.getElementById('s4AcquireLens'); if (acquire) acquire.onclick = acquireLens;
    var savePhotoButton = document.getElementById('s4SavePhoto'); if (savePhotoButton) savePhotoButton.onclick = function () { savePhoto(savePhotoButton.dataset.letter); };
    var transmit = document.getElementById('s4Transmit'); if (transmit) transmit.onclick = transmitRecords;
    var personal = document.getElementById('s4Personal'); if (personal) personal.onclick = function () { modal = 'personal'; draw(); };
    var saveUv = document.getElementById('s4SaveUv'); if (saveUv) saveUv.onclick = function () { sync({ uvRevealed: true }).then(function () { modal = ''; ctx.toast('별지도의 숨은 분류 순서를 확인했습니다.'); draw(); }); };
    var authReset = document.getElementById('s4AuthReset'); if (authReset) authReset.onclick = resetFinalTokens;
    var authSubmit = document.getElementById('s4AuthSubmit'); if (authSubmit) authSubmit.onclick = verifyFinalOrder;
    var authReturn = document.getElementById('s4AuthReturn'); if (authReturn) authReturn.onclick = startHorror;
    var playRecording = document.getElementById('s4PlayRecording'); if (playRecording) playRecording.onclick = startRecording;
    var saveLog = document.getElementById('s4SaveLog'); if (saveLog) saveLog.onclick = function () { sync({ logSeen: true }).then(function () { modal = ''; ctx.toast('수동 조작 흔적을 확인했습니다.'); draw(); }); };
    var leave = document.getElementById('s4Leave'); if (leave) leave.onclick = function () {
      modal = ''; horrorVisible = true; play('scene4_exit'); draw();
      setTimeout(function () { horrorVisible = false; ctx.submit('RETURN'); }, 400);
    };
    document.querySelectorAll('[data-s4-hint]').forEach(function (hint) { hint.onclick = ctx.hint; });
    bindOverlayDrag();
    bindTokenPlacement();
    bindHandle();
    bindPhotoScan();
    bindUv();
  }

  function bindRoom(state) {
    var inventory = document.getElementById('s4Inventory');
    if (inventory) inventory.onclick = function () { inspect = null; modal = 'inventory'; draw(); };
    var roomHint = document.getElementById('hintBtn');
    if (roomHint) roomHint.onclick = ctx.hint;
    document.querySelectorAll('[data-s4-object]').forEach(function (button) { button.onclick = function () { objectClick(button); }; });
    var introButton = document.getElementById('s4Intro');
    if (introButton) introButton.onclick = function () { introStep += 1; saveStored('intro-step-v2', introStep); draw(); };
    bindModal(state);
  }

  function maybeStartSharedMoments(state) {
    if (state.photosRestored.A && state.photosRestored.B && state.photosRestored.C && !state.nebulaComplete) startSignalIntrusion();
    if (state.dataSent && stored('reception-seen') !== 'yes' && introStep >= intro.length && !modal) startReception();
    if (state.authComplete && stored('horror-seen') !== 'yes' && modal !== 'auth-success' && !horrorVisible) startHorror();
  }

  function draw() {
    if (!ctx || !ctx.game) return;
    var state = sceneState();
    ctx.game.innerHTML = roomMarkup(state);
    bindRoom(state);
    setTimeout(function () { maybeStartSharedMoments(sceneState()); }, 0);
  }

  function resetForIdentity(nextIdentity) {
    if (identity === nextIdentity) return;
    identity = nextIdentity;
    clearTimeout(receptionTimer);
    clearTimeout(horrorTimer);
    clearTimeout(signalIntrusionTimer);
    clearInterval(recordingTimer);
    clearInterval(cctvTimer);
    modal = '';
    inspect = null;
    selectedItem = '';
    selectedToken = null;
    overlayPicks = { pattern: false, film: false };
    patternPosition = { x: -76, y: -48 };
    filmPosition = { x: 76, y: 48 };
    photoScanHits = new Set();
    photoLensPosition = { x: 50, y: 50 };
    lastAcquired = '';
    uvHits = new Set();
    panelTaps = 0;
    horrorVisible = false;
    signalIntrusionVisible = false;
    recordingLocal = 0;
    cctvLocal = 0;
    introStep = Math.max(0, Math.min(intro.length, Number(stored('intro-step-v2') || 0)));
  }

  function render(options) {
    ctx = options;
    var session = ctx.state.session || {};
    var player = ctx.state.player || {};
    var nextIdentity = [session.code || 'SOLO', player.team || '', player.id || '', session.startedAt || 'waiting'].join(':');
    resetForIdentity(nextIdentity);
    draw();
  }

  window.StarEscapeScene04 = { render: render };
})();
