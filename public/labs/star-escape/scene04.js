(function () {
  'use strict';

  var ROOT = '/labs/star-escape/assets/scene04/';
  var ctx = null;
  var identity = '';
  var introStep = 0;
  var modal = '';
  var selectedItem = '';
  var selectedToken = null;
  var overlayPicks = { pattern: false, film: false };
  var filmPosition = { x: 76, y: 48 };
  var photoPreview = '';
  var photoRestored = false;
  var reflectorScare = false;
  var receptionPhase = 0;
  var uvHits = new Set();
  var panelTaps = 0;
  var horrorVisible = false;
  var recordingLocal = 0;
  var cctvLocal = 0;
  var restoreTimer = 0;
  var receptionTimer = 0;
  var horrorTimer = 0;
  var recordingTimer = 0;
  var cctvTimer = 0;
  var feedback = '';
  var feedbackBad = false;

  var intro = [
    ['루멘', '4번 구획 진입.'],
    ['루멘', '최종 관측 통제실입니다.'],
    ['대원', '여기가 마지막 구역이군.'],
    ['루멘', '귀환 인증 시스템의 마지막 잠금이 이 구역에 있습니다.'],
    ['루멘', '중앙 귀환 장치를 복구해야 합니다.'],
    ['시스템', '현재 목표 · 귀환 인증 시스템을 복구하라.'],
  ];

  var personalRecords = {
    1: { title: 'X의 공간 분포', text: 'X의 별들은 한곳에 빽빽하게 몰려 있지 않고, 비교적 성기고 불규칙하게 퍼져 있다.' },
    2: { title: 'X의 색', text: 'X에서는 푸른빛 또는 흰빛으로 보이는 별들이 비교적 눈에 띠다.' },
    3: { title: 'Y의 공간 분포', text: 'Y의 별들은 둥근 모양으로 모여 있으며, 중심으로 갈수록 매우 촘촘하다.' },
    4: { title: 'Y의 색', text: 'Y에서는 노란빛이나 붉은빛으로 보이는 별들이 많이 보인다.' },
  };

  var nebulaNames = { emission: '방출성운', reflection: '반사성운', dark: '암흑성운' };
  var clusterNames = { open: '산개성단', globular: '구상성단' };
  var chipNames = Object.assign({}, nebulaNames, clusterNames);
  var finalOrder = ['emission', 'open', 'dark', 'globular', 'reflection'];
  var recordingLines = ['분류값까지 바뀌었다.', '이건 센서 오류가 아니야.', '누군가 직접 접근하고 있어.', '…잠깐.', '누구야?'];

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
    });
  }

  function img(name) { return ROOT + name; }

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
    if (!state.patternA || !state.filmB) return '책상과 관측도구 케이스에서 분리된 두 조각을 찾으세요.';
    if (!state.overlayComplete) return '단서 탭에서 패턴 조각 A와 투명 필름 B를 겹쳐 보세요.';
    if (!state.lensAcquired) return '겹친 문구가 가리킨 물체를 조사하세요.';
    if (!state.photosRestored.A || !state.photosRestored.B || !state.photosRestored.C) return '색 복원 렌즈를 선택해 A·B·C 천체사진에 사용하세요.';
    if (!state.nebulaComplete) return '복원한 색과 특징을 비교해 성운 명판을 배치하세요.';
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
    if (kind === 'lens') return img('scene04_item_color_restore_lens.png');
    if (kind === 'uv') return img('scene04_item_uv_light.png');
    if (kind.indexOf('chip:') === 0) return img('scene04_chip_base.png');
    return '';
  }

  function itemCard(kind, title, note, active) {
    var image = itemImage(kind);
    return '<button class="s4-item' + (active ? ' selected' : '') + '" data-s4-item="' + esc(kind) + '">' +
      (image ? '<img src="' + image + '" alt="">' : '<span class="s4-paper-icon" aria-hidden="true">◇</span>') +
      '<b>' + esc(title) + '</b><small>' + esc(note || '') + '</small></button>';
  }

  function inventoryMarkup(state) {
    var items = [];
    if (state.patternA) items.push(itemCard('pattern', '패턴 조각 A', '기록철 아래에서 발견', overlayPicks.pattern));
    if (state.filmB) items.push(itemCard('film', '투명 필름 B', '관측도구 케이스에서 발견', overlayPicks.film));
    if (state.lensAcquired) items.push(itemCard('lens', '색 복원 렌즈', '기록 보정용 도구', selectedItem === 'lens'));
    if (state.dataSent) availableRoles().forEach(function (role) {
      var record = personalRecords[role];
      items.push(itemCard('record:' + role, 'R' + role + ' · ' + record.title, role === Number(ctx.state.player.role) ? '내 개인 자료' : '빈 역할 자료', false));
    });
    if (state.uvAcquired) items.push(itemCard('uv', 'UV 검사등', '숨은 표시 검사용', selectedItem === 'uv'));
    if (state.nebulaComplete) ['emission', 'reflection', 'dark'].forEach(function (kind) { items.push(itemCard('chip:' + kind, chipNames[kind] + ' 인증칩', '성운 분류 인증', false)); });
    if (state.lockerOpen) ['open', 'globular'].forEach(function (kind) { items.push(itemCard('chip:' + kind, chipNames[kind] + ' 인증칩', '성단 분류 인증', false)); });
    var canOverlap = state.patternA && state.filmB && overlayPicks.pattern && overlayPicks.film && !state.overlayComplete;
    return modalShell('단서 탭 · 인벤토리', '<div class="s4-inventory-grid">' + (items.join('') || '<p>아직 획득한 단서가 없습니다.</p>') + '</div>' +
      (state.patternA && state.filmB && !state.overlayComplete ? '<button class="s4-primary" id="s4OverlapOpen" ' + (canOverlap ? '' : 'disabled') + '>선택한 두 조각 겹쳐 보기</button>' : '') +
      '<p class="s4-help">색 복원 렌즈와 UV 검사등은 선택한 뒤 방의 물체에 사용합니다.</p>');
  }

  function modalShell(title, body, className) {
    return '<section class="s4-modal ' + (className || '') + '" role="dialog" aria-modal="true"><div class="s4-modal-card"><header><small>04 · 최종 관측 통제실</small><h2>' + esc(title) + '</h2><button class="s4-close" id="s4Close" aria-label="닫기">×</button></header><div class="s4-modal-body">' + body + '</div></div></section>';
  }

  function roomMarkup(state) {
    var photosReady = state.photosRestored.A && state.photosRestored.B && state.photosRestored.C;
    return '<section class="s4-shell"><div class="s4-room">' +
      '<img class="s4-room-image" src="' + img(roomStateFile(state)) + '" alt="최종 관측 통제실">' +
      '<div class="s4-title"><small>04 — 최종 관측 통제실</small><b>마지막 인증</b></div>' +
      '<div class="s4-objective"><b>현재 목표</b><span>' + esc(objective(state)) + '</span></div>' +
      '<button class="s4-hotspot desk' + (state.patternA ? ' done' : '') + '" data-s4-object="desk" aria-label="기록철과 서류 더미"><span>기록철</span></button>' +
      '<button class="s4-hotspot case' + (state.filmB ? ' done' : '') + '" data-s4-object="case" aria-label="관측도구 케이스"><span>관측도구 케이스</span></button>' +
      ['A', 'B', 'C'].map(function (letter) {
        var file = { A: 'scene04_p02_nebula_a_color.webp', B: 'scene04_p02_nebula_b_color.webp', C: 'scene04_p02_nebula_c_color.webp' }[letter];
        return '<button class="s4-hotspot photo p' + letter.toLowerCase() + (state.photosRestored[letter] ? ' done' : '') + '" data-s4-object="photo" data-letter="' + letter + '" aria-label="' + letter + ' 천체사진">' + (state.photosRestored[letter] && !state.nebulaComplete ? '<img class="s4-photo-overlay" src="' + img(file) + '" alt="">' : '') + '<span>' + letter + ' 천체사진</span></button>';
      }).join('') +
      (photosReady && !state.nebulaComplete ? '<button class="s4-room-action nebula" data-s4-object="nebula-sort">성운 명판 배치</button>' : '') +
      '<button class="s4-hotspot reflector' + (state.overlayComplete ? ' active' : '') + '" data-s4-object="reflector" aria-label="반사판"><span>반사판</span></button>' +
      '<button class="s4-hotspot locker' + (state.lockerActive ? ' active' : '') + (state.lockerOpen ? ' done' : '') + '" data-s4-object="locker" aria-label="성단 관측 보관함"><span>성단 관측 보관함</span></button>' +
      '<button class="s4-hotspot starmap' + (state.uvAcquired ? ' active' : '') + '" data-s4-object="starmap" aria-label="오래된 별지도"><span>오래된 별지도</span></button>' +
      '<button class="s4-hotspot core' + (state.uvRevealed ? ' active' : '') + (state.authComplete ? ' done' : '') + '" data-s4-object="core" aria-label="중앙 귀환 인증 장치"><span>중앙 귀환 장치</span></button>' +
      (state.horrorSeen ? '<button class="s4-hotspot maintenance active" data-s4-object="maintenance" aria-label="작은 정비 패널"><span>작은 정비 패널</span></button>' : '') +
      (state.recordingComplete && !state.logSeen ? '<button class="s4-room-action log" data-s4-object="log">조작 로그 확인</button>' : '') +
      (state.logSeen && !state.cctvComplete ? '<button class="s4-room-action cctv" data-s4-object="cctv">CCTV 감시 기록</button>' : '') +
      (state.exitOpen ? '<button class="s4-room-action exit" data-s4-object="exit">귀환 통로</button>' : '') +
      '<button class="s4-room-hint" id="hintBtn">힌트 · ' + Math.min(Number(ctx.state.progress.hintCount || 0), 3) + '/3</button><div class="s4-room-hintbox" id="hintbox"></div>' +
      '<button class="s4-inventory-button" id="s4Inventory"><span>단서 탭</span><b>' + inventoryCount(state) + '</b></button>' +
      '</div>' + modalMarkup(state) + introMarkup() + horrorMarkup() + '</section>';
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
    var entry = intro[introStep];
    return '<button class="s4-dialogue" id="s4Intro"><span><small>' + esc(entry[0]) + '</small><p>' + esc(entry[1]) + '</p></span><i>터치하여 계속 ▼</i></button>';
  }

  function horrorMarkup() {
    if (!horrorVisible && !reflectorScare) return '';
    return '<div class="s4-horror' + (reflectorScare ? ' reflector-scare' : '') + '" aria-hidden="true"><img src="' + img('scene04_silhouette_master.png') + '" alt=""><i></i></div>';
  }

  function modalMarkup(state) {
    if (!modal) return '';
    if (modal === 'inventory') return inventoryMarkup(state);
    if (modal === 'overlap') return overlapMarkup(state);
    if (modal === 'reflector') return reflectorMarkup(state);
    if (modal.indexOf('photo:') === 0) return photoMarkup(state, modal.split(':')[1]);
    if (modal === 'nebula') return nebulaMarkup(state);
    if (modal === 'nebula-loot') return nebulaLootMarkup();
    if (modal === 'locker' || modal === 'reception' || modal === 'personal' || modal === 'loot') return clusterMarkup(state);
    if (modal === 'uv') return uvMarkup(state);
    if (modal === 'core' || modal === 'auth-success') return coreMarkup(state);
    if (modal === 'horror-dialog') return modalShell('이상 영상 신호', '<div class="s4-dialog-copy"><b>대원</b><p>“방금 그림자가 지나갔다.”</p><b>루멘</b><p>“…영상 이상 신호를 감지했습니다.”<br>“원인을 확인할 수 없습니다.”</p></div>');
    if (modal === 'panel-knock') return modalShell('작은 정비 패널', '<div class="s4-knock"><b>덜컹—</b><p>안쪽에서 작은 소리가 들린다.</p><em>톡. 톡.</em><p>한 번 더 조사해야 할 것 같다.</p></div>');
    if (modal === 'recorder-found' || modal === 'recording') return recorderMarkup(state);
    if (modal === 'log') return logMarkup(state);
    if (modal === 'cctv') return cctvMarkup(state);
    if (modal === 'exit') return exitMarkup();
    if (modal.indexOf('record:') === 0) return personalMarkup(Number(modal.split(':')[1]));
    return '';
  }

  function overlapMarkup(state) {
    var complete = state.overlayComplete;
    return modalShell('조각 두 개를 겹쳐 숨은 문구 찾기', '<div class="s4-overlap-board" id="s4OverlapBoard">' +
      '<div class="s4-pattern-base"><i></i><i></i><i></i><i></i><span>패턴 조각 A · 고정</span></div>' +
      '<div class="s4-film' + (complete ? ' snapped' : '') + '" id="s4Film" style="--film-x:' + filmPosition.x + 'px;--film-y:' + filmPosition.y + 'px"><i></i><i></i><i></i><i></i><span>투명 필름 B · 드래그</span></div>' +
      '<strong class="s4-hidden-phrase' + (complete ? ' revealed' : '') + '">반사판 뒤</strong></div>' +
      '<p class="s4-help">A는 고정되어 있습니다. B를 직접 드래그해 패턴이 이어지도록 맞춰 보세요.</p>' + puzzleFooter('투명 필름 B의 위치를 조금씩 맞춰 보세요.'), 'overlap');
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
    return modalShell(letter + ' 천체사진 · 색 정보 복원', '<div class="s4-photo-view' + (restored ? ' restored' : '') + '"><img src="' + img(file) + '" alt="' + esc(note) + '"><div class="s4-restore-scan"></div></div>' +
      '<p>' + (restored ? esc(note) + '이 관측된다.' : '흑백 관측 기록에서 색상 정보를 복원하고 있습니다…') + '</p>' +
      (restored && !state.photosRestored[letter] ? '<button class="s4-primary" id="s4SavePhoto" data-letter="' + letter + '">복원된 관측 기록 저장</button>' : ''));
  }

  function tokenButton(kind, label, placed) {
    return '<button class="s4-token' + (placed ? ' placed' : '') + (selectedToken && selectedToken.value === kind ? ' selected' : '') + '" data-s4-drag="' + esc(kind) + '" ' + (placed ? 'disabled' : '') + '>' + esc(label) + '</button>';
  }

  function dropSlot(kind, index, label, value, names) {
    return '<div class="s4-drop' + (value ? ' filled' : '') + '" data-s4-drop="' + kind + '" data-slot="' + index + '"><small>' + esc(label) + '</small>' + (value ? '<b>' + esc(names[value]) + '</b>' : '<span>명판을 드래그</span>') + '</div>';
  }

  function puzzleFooter(defaultText) {
    return '<footer class="s4-puzzle-footer"><button class="s4-secondary" data-s4-hint>힌트 · ' + Math.min(Number(ctx.state.progress.hintCount || 0), 3) + '/3 무료</button><p class="s4-feedback' + (feedbackBad ? ' bad' : '') + '" id="feedback">' + esc(feedback || defaultText || '명판을 끌어 관측판 아래 홈에 놓으세요.') + '</p></footer>';
  }

  function nebulaMarkup(state) {
    var files = ['scene04_p02_nebula_a_color.webp', 'scene04_p02_nebula_b_color.webp', 'scene04_p02_nebula_c_color.webp'];
    var placed = new Set(state.nebulaSlots.filter(Boolean));
    var photos = ['A', 'B', 'C'].map(function (letter, index) { return '<div class="s4-observation"><img src="' + img(files[index]) + '" alt="' + letter + ' 복원 사진"><b>' + letter + '</b>' + dropSlot('nebula', index, letter + ' 아래 홈', state.nebulaSlots[index], nebulaNames) + '</div>'; }).join('');
    var bank = Object.keys(nebulaNames).filter(function (kind) { return !placed.has(kind); }).map(function (kind) { return tokenButton(kind, nebulaNames[kind], false); }).join('');
    return modalShell('복원된 천체사진 · 성운 분류', '<div class="s4-sort-layout"><div class="s4-observation-grid nebula-grid">' + photos + '</div><aside><h3>성운 명판</h3><div class="s4-token-bank">' + bank + '</div><p>붉은빛, 푸른빛, 배경을 가리는 어두운 구름을 비교하세요.</p></aside></div>' + puzzleFooter(), 'puzzle');
  }

  function nebulaLootMarkup() {
    return modalShell('인증칩 3개 획득', '<div class="s4-loot"><div>' + itemCard('chip:emission', '방출성운 인증칩', '', false) + '</div><div>' + itemCard('chip:reflection', '반사성운 인증칩', '', false) + '</div><div>' + itemCard('chip:dark', '암흑성운 인증칩', '', false) + '</div></div><div class="s4-system-card"><b>성단 관측 보관함 활성화</b><p>방으로 돌아가 전원이 들어온 보관함을 직접 조사하세요.</p></div>');
  }

  function personalMarkup(role) {
    var record = personalRecords[role];
    return modalShell('R' + role + ' · ' + record.title, '<div class="s4-personal-record"><small>개인 단말 관측 자료</small><p>“' + esc(record.text) + '”</p></div><p class="s4-help">이 자료는 단서 탭에 자동 저장되었습니다.</p>');
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
      ['scene04_p04_uv_symbol_01_emission_nebula.png', '방출성운'],
      ['scene04_p04_uv_symbol_02_open_cluster.png', '산개성단'],
      ['scene04_p04_uv_symbol_03_dark_nebula.png', '암흑성운'],
      ['scene04_p04_uv_symbol_04_globular_cluster.png', '구상성단'],
      ['scene04_p04_uv_symbol_05_reflection_nebula.png', '반사성운'],
    ];
    var positions = [
      { left: '39%', top: '16%' }, { left: '54%', top: '29%' },
      { left: '51%', top: '59%' }, { left: '27%', top: '62%' },
      { left: '20%', top: '31%' },
    ];
    var overlay = '<svg class="s4-uv-route" viewBox="0 0 100 100" aria-hidden="true">' +
      '<path d="M39 9 C45 12 50 19 54 29"/><path class="arrow" d="M54 29 l-5-3 l1 6 z"/>' +
      '<path d="M54 29 C58 38 56 50 51 59"/><path class="arrow" d="M51 59 l-4-5 l6 1 z"/>' +
      '<path d="M51 59 C44 65 35 66 27 62"/><path class="arrow" d="M27 62 l5-4 l-1 6 z"/>' +
      '<path d="M27 62 C20 55 17 42 20 31"/><path class="arrow" d="M20 31 l-4 5 l6-1 z"/>' +
      '<path class="start-line" d="M39 4 L39 12"/><path class="start" d="M39 4 l-3 5 h6 z"/>' +
      '</svg>' + symbols.map(function (entry, index) {
      var pos = positions[index];
      return '<div class="s4-uv-symbol u' + (index + 1) + '" data-uv-hit="' + index + '" style="left:' + pos.left + ';top:' + pos.top + '"><img src="' + img(entry[0]) + '" alt="' + entry[1] + ' 숨은 기호"></div>';
    }).join('');
    return modalShell('UV 검사 · 오래된 별지도', '<div class="s4-uv-board" id="s4UvBoard"><img src="' + img('scene04_p04_starmap_base.webp') + '" alt="오래된 별지도"><div class="s4-uv-overlay" id="s4UvOverlay">' + overlay + '</div><div class="s4-uv-lamp"></div></div><p class="s4-help">UV 검사등을 움직여 별지도 곳곳에 숨은 다섯 개 기호를 찾으세요. <b>▲ 시작점에서 화살표 방향으로</b> 기호의 순서를 읽으면 중앙 귀환장치의 칩 순서가 됩니다.</p>' +
      '<button class="s4-primary" id="s4SaveUv" ' + (uvHits.size >= 5 || state.uvRevealed ? '' : 'disabled') + '>숨은 순서 기록</button>' + puzzleFooter('지도 위에 숨겨진 기호를 모두 찾아 방향을 따라 순서를 읽으세요.'), 'uv');
  }

  function chipButton(kind, placed) {
    return '<button class="s4-chip' + (placed ? ' placed' : '') + (selectedToken && selectedToken.value === kind ? ' selected' : '') + '" data-s4-drag="' + kind + '" ' + (placed ? 'disabled' : '') + '><img src="' + img('scene04_chip_base.png') + '" alt=""><span>' + chipNames[kind] + '</span></button>';
  }

  function coreMarkup(state) {
    if (modal === 'auth-success') return modalShell('귀환 인증 완료', '<div class="s4-auth-success"><b>중앙 귀환 시스템 복구</b><p>루멘: “최종 인증이 완료되었습니다.”<br>“귀환 시스템을 복구합니다.”</p><button class="s4-primary" id="s4AuthReturn">방으로 돌아가기</button></div>');
    var owned = state.nebulaComplete && state.lockerOpen;
    var placed = new Set(state.finalSlots.filter(Boolean));
    var slots = state.finalSlots.map(function (value, index) { return '<div class="s4-core-slot slot-' + (index + 1) + (value ? ' filled' : '') + '" data-s4-drop="final" data-slot="' + index + '"><small>' + (index === 0 ? '▲' : String(index + 1)) + '</small>' + (value ? '<span>' + chipNames[value] + '</span>' : '') + '</div>'; }).join('');
    var chips = owned ? finalOrder.filter(function (kind) { return !placed.has(kind); }).map(function (kind) { return chipButton(kind, false); }).join('') : '';
    return modalShell('중앙 귀환 인증 장치', '<div class="s4-core-layout"><div class="s4-core-device"><img src="' + img('scene04_p04_return_console.webp') + '" alt="원형 슬롯 5개가 있는 귀환 인증 장치">' + slots + '<i class="s4-clockwise">↻</i></div><aside><h3>보유 인증칩</h3><div class="s4-chip-bank">' + (chips || '<p>아직 인증칩 5개가 모두 없습니다.</p>') + '</div><p>시작 표시 ▲부터 시계방향으로 배치하세요.</p></aside></div>' + (owned ? puzzleFooter() : ''), 'puzzle core-modal');
  }

  function recorderMarkup(state) {
    if (!state.recordingStarted && modal === 'recorder-found') return modalShell('비인가 기록 장치', '<div class="s4-recorder"><div class="s4-recorder-unit"><i></i><b>UNAUTHORIZED LOG</b></div><div class="s4-dialog-copy"><b>대원</b><p>“또 같은 형태의 기록 장치다.”</p><b>루멘</b><p>“기존에 발견된 비인가 기록 장치와 동일 계열입니다.”</p></div><button class="s4-primary" id="s4PlayRecording">기록 장치 재생</button></div>');
    var index = state.recordingComplete ? 4 : recordingLocal;
    return modalShell('마지막 기록 재생', '<div class="s4-recording"><small>미확인 음성</small><p class="' + (index === 4 ? 'last' : '') + '">“' + esc(recordingLines[index]) + '”</p><div class="s4-wave"><i></i><i></i><i></i><i></i><i></i></div>' + (state.recordingComplete ? '<b>기록 종료</b>' : '<span>재생 중…</span>') + '</div>', 'recording-modal');
  }

  function logMarkup(state) {
    return modalShell('조작 로그 복원', '<div class="s4-log"><small>RECOVERED MANUAL ACCESS LOG</small><ul><li>기준값 변경 기록 존재</li><li>분류값 변경 기록 존재</li><li>수동 접근 기록 존재</li></ul><p>자동 보정이 아닌 수동 조작이며, 사고 이전에 발생했습니다. 접근자의 신원은 확인되지 않습니다.</p></div>' + (!state.logSeen ? '<button class="s4-primary" id="s4SaveLog">조작 로그 확인</button>' : ''));
  }

  function cctvMarkup(state) {
    var frame = state.cctvComplete ? 6 : cctvLocal;
    var labels = ['빈 방', '검은 사람 실루엣 등장', '중앙 장치 쪽으로 접근', '장치를 조작하는 듯한 자세', 'CCTV 쪽을 돌아보는 순간', '노이즈', '다시 빈 방'];
    return modalShell('CCTV 감시 기록', '<div class="s4-cctv frame-' + frame + '"><img src="' + img('scene04_room_state04_auth_complete.webp') + '" alt="감시 카메라에 기록된 통제실"><img class="s4-cctv-silhouette" src="' + img('scene04_silhouette_master.png') + '" alt="검은 사람 실루엣"><i></i><span>CAM 04 · ' + esc(labels[frame]) + '</span></div>' +
      (state.cctvComplete ? '<div class="s4-cctv-result"><b>퇴실 기록이 존재하지 않습니다.</b><p>루멘: “접근 기록은 있으나, 퇴실 기록은 존재하지 않습니다.”</p></div>' : '<p class="s4-help">감시 기록 복원 중…</p>'), 'cctv-modal');
  }

  function exitMarkup() {
    return modalShell('귀환 통로 개방', '<div class="s4-exit-copy"><b>지구 귀환 절차를 시작할 수 있습니다.</b><p>루멘: “귀환 경로가 확보되었습니다.”<br>“이 구역에서 즉시 이탈하십시오.”</p><button class="s4-primary" id="s4Leave">귀환 통로로 이동</button></div>');
  }

  function openPhoto(letter, state) {
    if (!state.lensAcquired || selectedItem !== 'lens') {
      ctx.toast('흑백 천체사진이다. 이 상태로는 특징을 구분하기 어렵다.', true);
      return;
    }
    modal = 'photo:' + letter;
    photoPreview = letter;
    photoRestored = Boolean(state.photosRestored[letter]);
    draw();
    if (!photoRestored) {
      clearTimeout(restoreTimer);
      restoreTimer = setTimeout(function () { photoRestored = true; play('restore'); draw(); }, 700);
    }
  }

  async function savePhoto(letter) {
    var state = sceneState();
    var restored = Object.assign({}, state.photosRestored);
    restored[letter] = true;
    await sync({ photosRestored: restored });
    ctx.toast(letter + ' 천체사진의 색상 정보를 복원했습니다.');
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
    else { expected = finalOrder; slots = state.finalSlots.slice(); }
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
      if (clusterDone) { play('unlock'); ctx.toast('보관함 잠금 해제 · 손잡이를 당겨 여세요.'); }
    } else {
      var authDone = slots.join(',') === expected.join(',');
      if (authDone) modal = 'auth-success';
      await sync({ finalSlots: slots, authComplete: authDone });
      if (authDone) { play('complete'); draw(); }
    }
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

  async function transmitRecords() {
    await sync({ dataSent: true });
    eventHook('receive-target-5');
    startReception();
  }

  async function openLocker() {
    var state = sceneState();
    if (!state.handleUnlocked || state.lockerOpen) return;
    modal = 'loot';
    await sync({ lockerOpen: true, uvAcquired: true });
    selectedItem = 'uv';
    play('open');
    await ctx.submit('성단분류완료');
  }

  function startHorror() {
    if (horrorVisible) return;
    modal = '';
    horrorVisible = true;
    saveStored('horror-seen', 'yes');
    eventHook('blackout');
    draw();
    clearTimeout(horrorTimer);
    horrorTimer = setTimeout(async function () {
      horrorVisible = false;
      await sync({ horrorSeen: true }, false);
      modal = 'horror-dialog';
      eventHook('silhouette');
      draw();
    }, 900);
  }

  function startRecording() {
    recordingLocal = 0;
    modal = 'recording';
    sync({ recordingStarted: true, recordingLine: 0 }, false);
    play('recording');
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
    cctvLocal = state.cctvComplete ? 6 : 0;
    sync({ cctvStarted: true, cctvFrame: cctvLocal }, false);
    eventHook('cctv-start');
    draw();
    if (state.cctvComplete) return;
    clearInterval(cctvTimer);
    cctvTimer = setInterval(function () {
      if (cctvLocal < 6) {
        cctvLocal += 1;
        setLocalState({ cctvFrame: cctvLocal });
        draw();
      } else {
        clearInterval(cctvTimer);
        sync({ cctvFrame: 6, cctvComplete: true, exitOpen: true });
        eventHook('exit-open');
      }
    }, 700);
  }

  function objectClick(button) {
    var state = sceneState();
    var object = button.dataset.s4Object;
    if (object === 'desk') {
      if (state.patternA) ctx.toast('기록철 아래에는 더 이상 특별한 것이 없다.');
      else sync({ patternA: true }).then(function () { play('item'); ctx.toast('패턴 조각 A 획득'); });
    } else if (object === 'case') {
      if (state.filmB) ctx.toast('관측 보조 도구다. 지금은 직접 쓸 수 없어 보인다.');
      else sync({ filmB: true }).then(function () { play('item'); ctx.toast('투명 필름 B 획득'); });
    } else if (object === 'photo') openPhoto(button.dataset.letter, state);
    else if (object === 'nebula-sort') { modal = 'nebula'; draw(); }
    else if (object === 'reflector') {
      if (!state.overlayComplete) { modal = 'reflector'; draw(); return; }
      if (!state.lensAcquired && stored('reflector-scare') !== 'yes') {
        saveStored('reflector-scare', 'yes'); reflectorScare = true; eventHook('reflector-silhouette'); draw();
        setTimeout(function () { reflectorScare = false; modal = 'reflector'; draw(); }, 520);
      } else { modal = 'reflector'; draw(); }
    } else if (object === 'locker') {
      if (!state.lockerActive) { ctx.toast('잠겨 있다. 다른 단계가 필요하다.', true); return; }
      modal = state.lockerOpen ? 'loot' : 'locker'; draw();
    } else if (object === 'starmap') {
      if (selectedItem !== 'uv' || !state.uvAcquired) { ctx.toast('오래된 별지도다. 겉보기에는 특별한 표시가 없다.', true); return; }
      modal = 'uv'; draw();
    } else if (object === 'core') {
      modal = state.authComplete ? 'auth-success' : 'core'; draw();
    } else if (object === 'maintenance') {
      if (state.maintenanceOpen) { modal = state.recordingComplete ? 'log' : state.recordingStarted ? 'recording' : 'recorder-found'; draw(); return; }
      if (panelTaps === 0) { panelTaps = 1; modal = 'panel-knock'; play('knock'); draw(); }
      else sync({ maintenanceOpen: true }).then(function () { modal = 'recorder-found'; play('open'); draw(); });
    } else if (object === 'log') { modal = 'log'; draw(); }
    else if (object === 'cctv') startCctv();
    else if (object === 'exit') { modal = 'exit'; draw(); }
  }

  function bindOverlayDrag() {
    var film = document.getElementById('s4Film');
    if (!film || sceneState().overlayComplete) return;
    film.onpointerdown = function (event) {
      event.preventDefault();
      var startX = event.clientX;
      var startY = event.clientY;
      var originX = filmPosition.x;
      var originY = filmPosition.y;
      film.setPointerCapture(event.pointerId);
      film.onpointermove = function (move) {
        filmPosition.x = Math.max(-120, Math.min(140, originX + move.clientX - startX));
        filmPosition.y = Math.max(-90, Math.min(110, originY + move.clientY - startY));
        film.style.setProperty('--film-x', filmPosition.x + 'px');
        film.style.setProperty('--film-y', filmPosition.y + 'px');
      };
      film.onpointerup = function () {
        film.onpointermove = null;
        if (Math.hypot(filmPosition.x, filmPosition.y) < 28) finishOverlay();
      };
    };
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
        if (Math.hypot(normalizedX - markerX, normalizedY - markerY) < .105) uvHits.add(Number(marker.getAttribute('data-uv-hit')));
      });
      if (uvHits.size >= 5) {
        var button = document.getElementById('s4SaveUv');
        if (button) button.disabled = false;
      }
    }
    board.onpointerdown = function (event) { board.setPointerCapture(event.pointerId); scan(event); board.onpointermove = scan; };
    board.onpointerup = function () { board.onpointermove = null; };
  }

  function bindModal(state) {
    var close = document.getElementById('s4Close');
    if (close) close.onclick = function () {
      if (modal === 'recording' && !state.recordingComplete) { ctx.toast('기록이 끝날 때까지 확인하세요.', true); return; }
      if (modal === 'cctv' && !state.cctvComplete) { ctx.toast('감시 기록을 끝까지 확인하세요.', true); return; }
      modal = ''; draw();
    };
    var overlap = document.getElementById('s4OverlapOpen');
    if (overlap) overlap.onclick = function () { modal = 'overlap'; draw(); };
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
    var authReturn = document.getElementById('s4AuthReturn'); if (authReturn) authReturn.onclick = startHorror;
    var playRecording = document.getElementById('s4PlayRecording'); if (playRecording) playRecording.onclick = startRecording;
    var saveLog = document.getElementById('s4SaveLog'); if (saveLog) saveLog.onclick = function () { sync({ logSeen: true }).then(function () { modal = ''; ctx.toast('수동 조작 흔적을 확인했습니다.'); draw(); }); };
    var leave = document.getElementById('s4Leave'); if (leave) leave.onclick = function () {
      modal = ''; horrorVisible = true; eventHook('final-silhouette'); draw();
      setTimeout(function () { horrorVisible = false; ctx.submit('RETURN'); }, 400);
    };
    document.querySelectorAll('[data-s4-hint]').forEach(function (hint) { hint.onclick = ctx.hint; });
    bindOverlayDrag();
    bindTokenPlacement();
    bindHandle();
    bindUv();
  }

  function bindRoom(state) {
    var inventory = document.getElementById('s4Inventory');
    if (inventory) inventory.onclick = function () { modal = 'inventory'; draw(); };
    var roomHint = document.getElementById('hintBtn');
    if (roomHint) roomHint.onclick = ctx.hint;
    document.querySelectorAll('[data-s4-object]').forEach(function (button) { button.onclick = function () { objectClick(button); }; });
    var introButton = document.getElementById('s4Intro');
    if (introButton) introButton.onclick = function () { introStep += 1; saveStored('intro-step', introStep); draw(); };
    bindModal(state);
  }

  function maybeStartSharedMoments(state) {
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
    clearTimeout(restoreTimer);
    clearTimeout(receptionTimer);
    clearTimeout(horrorTimer);
    clearInterval(recordingTimer);
    clearInterval(cctvTimer);
    modal = '';
    selectedItem = '';
    selectedToken = null;
    overlayPicks = { pattern: false, film: false };
    filmPosition = { x: 76, y: 48 };
    uvHits = new Set();
    panelTaps = 0;
    horrorVisible = false;
    recordingLocal = 0;
    cctvLocal = 0;
    introStep = Math.max(0, Math.min(intro.length, Number(stored('intro-step') || 0)));
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
