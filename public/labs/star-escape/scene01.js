(function () {
  'use strict';

  var ROOT = '/labs/star-escape/assets/scene01/';
  var context = null;
  var identity = '';
  var visited = new Set();
  var inspect = null;
  var puzzleOpen = false;
  var codeValue = '';
  var introStep = 0;
  var banner = '';
  var lastQuestion = 0;

  var intro = [
    ['루멘', '…대원 여러분, 응답할 수 있습니까?'],
    ['대원', '응답 가능. 상황을 보고해.'],
    ['루멘', '주 전력이 완전히 차단됐습니다. 중앙 통로도 봉쇄되었습니다.'],
    ['루멘', '관측실 어딘가에 수동 복구 장치가 있지만 위치와 암호 기록이 손상됐습니다.'],
    ['대원', '방 안을 조사해서 장치와 암호를 모두 찾아야겠군.'],
    ['루멘', '각 대원의 수신 자료가 서로 다릅니다. 찾은 단서를 반드시 공유하세요.'],
    ['루멘', '파란 조사 지점을 눌러 비상 전력을 복구해 주세요.'],
  ];

  var objects = [
    { id: 'window', name: '우주정거장 창문', box: [4, 8, 29, 36] },
    { id: 'monitor', name: '별 관측 화면', box: [7, 49, 24, 27] },
    { id: 'terminal', name: '비상 기록 단말', box: [31, 47, 11, 26] },
    { id: 'door', name: '중앙 통로', box: [43, 14, 16, 55] },
    { id: 'communicator', name: '통신기', box: [60, 27, 8, 22] },
    { id: 'navigation', name: '고장 난 항법장치', box: [68, 45, 25, 28] },
    { id: 'storage', name: '수납함', box: [88, 28, 10, 47] },
    { id: 'tools', name: '정비 도구', box: [4, 78, 19, 15] },
    { id: 'trash', name: '우주식량 포장지', box: [27, 84, 10, 10] },
    { id: 'warning', name: '경고등', box: [82, 3, 8, 13] },
    { id: 'torn', name: '찢어진 기록지', box: [76, 80, 20, 15] },
  ];

  var objectImages = {
    communicator: 'objects/obj_communicator_base.webp',
    navigation: 'objects/obj_navigation_console_off.webp',
    monitor: 'objects/obj_observation_monitor_on.webp',
    storage: 'objects/obj_storage_open.webp',
    torn: 'objects/obj_observation_record_torn.webp',
    terminal: 'objects/obj_observation_monitor_off.webp',
    window: 'stars/star_observation_blue.webp',
    tools: 'characters/ui_lumen_ai_icon.webp',
    trash: 'characters/ui_lumen_ai_icon.webp',
    warning: 'characters/ui_lumen_ai_icon.webp',
    door: 'characters/ui_lumen_ai_icon.webp',
  };

  var roleClues = {
    1: [
      { id: 'window', title: '관측창 센서 A', text: '푸른색 별 A · 보안 숫자 7', image: 'stars/star_observation_blue.webp' },
      { id: 'monitor', title: '관측 화면 센서 B', text: '흰색 별 B · 보안 숫자 1', image: 'stars/star_observation_white.webp' },
      { id: 'torn', title: '찢어진 센서 C 기록', text: '노란색 별 C · 보안 숫자 3', image: 'stars/star_observation_yellow.webp' },
      { id: 'warning', title: '경고등 센서 D', text: '붉은색 별 D · 보안 숫자 9', image: 'stars/star_observation_red.webp' },
    ],
    2: [
      { id: 'torn', title: '메모 조각 1', text: 'R1의 별은 R3의 별보다 표면 온도가 높다.', image: 'memos/memo_fragment_01.webp' },
      { id: 'terminal', title: '단말 잔여 기록 2', text: 'R2는 네 별 중 표면 온도가 가장 높은 별이 아니다.', image: 'memos/memo_fragment_02.webp' },
      { id: 'monitor', title: '관측 화면 기록 3', text: 'R3에서 관측한 별은 노란색이다.', image: 'memos/memo_fragment_03.webp' },
      { id: 'window', title: '관측창 메모 4', text: 'R4의 별은 R2의 별보다 표면 온도가 낮다.', image: 'memos/memo_fragment_04.webp' },
    ],
    3: [
      { id: 'monitor', title: '검증 기록 C1', text: 'C1은 푸른색 별이다. 기록: 네 표본 중 표면 온도가 가장 높다.', image: 'stars/star_observation_blue.webp' },
      { id: 'terminal', title: '검증 기록 C2', text: 'C2는 붉은색 별이다. 기록: C1보다 표면 온도가 높다.', image: 'stars/star_observation_red.webp' },
      { id: 'torn', title: '검증 기록 C3', text: 'C3은 노란색 별이다. 표면 온도 자료가 지워져 판단할 수 없다.', image: 'stars/star_observation_yellow.webp' },
      { id: 'window', title: '검증 기록 C4', text: 'C4는 흰색 별이다. 기록: 노란색 별 C3보다 표면 온도가 높다.', image: 'stars/star_observation_white.webp' },
    ],
  };

  var locks = {
    1: { id: 'terminal', title: '비상 전력 제어 단말', length: 4, label: '4자리 복구 암호' },
    2: { id: 'storage', title: '관측 자료 수납함', length: 4, label: '4자리 수납함 암호' },
    3: { id: 'navigation', title: '항법장치 안전 검증', length: 2, label: '2자리 검증 암호' },
  };

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }

  function storageKey(suffix) {
    return 'scilab-star-escape-scene01-v2:' + identity + ':' + suffix;
  }

  function restoreLocal() {
    try {
      visited = new Set(JSON.parse(localStorage.getItem(storageKey('visited')) || '[]'));
      introStep = localStorage.getItem(storageKey('intro')) === 'done' ? intro.length : 0;
    } catch (_error) {
      visited = new Set();
      introStep = 0;
    }
  }

  function saveVisited() {
    try { localStorage.setItem(storageKey('visited'), JSON.stringify(Array.from(visited))); } catch (_error) {}
  }

  function image(path) {
    return ROOT + path;
  }

  function currentQuestion() {
    return Number(context.state.progress.question || 1);
  }

  function roleClue(question, role) {
    return roleClues[question][role - 1];
  }

  function availableRoles() {
    var occupied = new Set((context.state.members || []).map(function (member) { return member.role; }));
    return [1, 2, 3, 4].filter(function (role) {
      return role === context.state.player.role || !occupied.has(role);
    });
  }

  function objectText(id, question) {
    var powered = question > 1;
    var common = {
      door: question < 3 ? '중앙 통로는 단단히 잠겨 있다. 다른 장치에서 잠금 해제 신호를 보내야 한다.' : '항법장치의 최종 검증이 끝나면 열릴 것 같다.',
      communicator: question === 1 ? '복구 프로토콜: 별의 표면 온도가 높은 순서부터 각 대원의 보안 숫자를 입력한다.' : question === 2 ? '수납함 규칙: R1부터 R4 순서. 푸른색 4 · 흰색 8 · 노란색 2 · 붉은색 6.' : '검증 규칙: 과학적으로 참인 기록 두 개의 번호를 작은 수부터 입력한다.',
      navigation: question < 3 ? '항법장치는 전력이 부족해 잠들어 있다.' : '안전 검증 암호를 요구하는 항법장치다.',
      storage: question === 1 ? '전자 잠금장치에 전력이 들어오지 않는다.' : question === 2 ? '네 자리 암호로 잠긴 관측 자료 수납함이다.' : '수납함이 열려 있다. 내부 자료는 모두 꺼낸 상태다.',
      monitor: question === 1 ? '전원이 부족하지만 일부 별 영상은 남아 있다.' : '관측 데이터 화면이 다시 켜졌다.',
      terminal: question === 1 ? '수동 전력 복구 기능이 있는 단말이다. 네 자리 암호를 요구한다.' : '비상 전력이 정상적으로 공급되고 있다.',
      window: powered ? '전력이 돌아오자 창밖의 별빛이 더 선명하게 보인다.' : '창밖으로 색이 서로 다른 별들이 보인다.',
      tools: powered ? '직접 뜯어볼 문제는 아닌 것 같다.' : '렌치와 드라이버가 정리되어 있다. 장치 자체가 부서진 건 아닌 것 같다.',
      trash: '빈 우주식량 포장지다. 지금은 쓸모가 없어 보인다.',
      warning: powered ? '붉은빛이 주황빛으로 바뀌었다. 보조 전력이 안정됐다.' : '붉은 등이 반복해서 깜빡인다. 보조 전력만 작동 중이다.',
      torn: '찢어진 관측 기록지다. 일부 정보만 읽을 수 있다.',
    };
    return common[id] || '특별한 점은 보이지 않는다.';
  }

  function inspectObject(id) {
    var question = currentQuestion();
    if (locks[question].id === id) {
      visited.add('q' + question + ':' + id);
      saveVisited();
      inspect = null;
      puzzleOpen = true;
      draw();
      return;
    }
    visited.add('q' + question + ':' + id);
    saveVisited();
    var target = objects.find(function (item) { return item.id === id; });
    var clueRole = availableRoles().find(function (role) { return roleClue(question, role).id === id; });
    var clue = clueRole ? roleClue(question, clueRole) : null;
    var foundClue = Boolean(clue);
    inspect = {
      id: id,
      name: foundClue ? clue.title : (target ? target.name : '조사 대상'),
      text: foundClue ? clue.text : objectText(id, question),
      image: foundClue ? clue.image : (objectImages[id] || 'characters/ui_lumen_ai_icon.webp'),
      clue: foundClue,
      role: clueRole,
    };
    draw();
  }

  function roomState(question) {
    return question === 1 ? 'damaged' : 'restored';
  }

  function objective(question) {
    if (question === 1) return '방 안의 장치를 조사해 <b>비상 전력</b>을 복구하세요.';
    if (question === 2) return '새로 작동한 장치를 조사해 <b>관측 수납함</b>을 여세요.';
    return '관측 자료를 비교해 <b>항법장치</b>를 안전 검증하세요.';
  }

  function roomMarkup(question) {
    var hotspots = objects.map(function (item) {
      var key = 'q' + question + ':' + item.id;
      var classes = ['s1-hotspot'];
      if (visited.has(key)) classes.push('visited');
      return '<button class="' + classes.join(' ') + '" data-object="' + item.id + '" aria-label="' + esc(item.name) + '" style="left:' + item.box[0] + '%;top:' + item.box[1] + '%;width:' + item.box[2] + '%;height:' + item.box[3] + '%"></button>';
    }).join('');
    return '<div class="s1-shell"><div class="s1-room ' + roomState(question) + '" data-power="' + roomState(question) + '">' +
      '<div class="s1-title"><small>OBSERVATION ROOM 01</small><b>뒤바뀐 별 기록</b></div>' +
      '<div class="s1-objective">현재 목표 · ' + objective(question) + '</div>' +
      hotspots +
      (banner ? '<div class="s1-system">' + esc(banner) + '</div>' : '') +
      (inspect ? inspectMarkup() : '') +
      (introStep < intro.length ? dialogueMarkup() : '') +
      (puzzleOpen ? puzzleMarkup(question) : '') +
      '</div></div>';
  }

  function dialogueMarkup() {
    var item = intro[Math.min(introStep, intro.length - 1)];
    return '<button class="s1-dialogue" id="s1Dialogue">' +
      '<img class="portrait" src="' + image('characters/ui_lumen_ai_icon.webp') + '" alt="루멘">' +
      '<span><small>' + esc(item[0]) + '</small><p>' + esc(item[1]) + '</p></span>' +
      '<span class="advance">터치하여 계속 ▼</span></button>';
  }

  function inspectMarkup() {
    return '<section class="s1-inspect ' + (inspect.clue ? 'clue' : '') + '">' +
      '<img src="' + image(inspect.image) + '" alt="">' +
      '<div><small>' + (inspect.clue ? '대원 ' + inspect.role + ' 전용 단서' : 'INVESTIGATION') + '</small><b>' + esc(inspect.name) + '</b><p>' + esc(inspect.text) + '</p></div>' +
      '<button id="inspectClose" aria-label="닫기">×</button></section>';
  }

  function puzzleMarkup(question) {
    var lock = locks[question];
    return '<section class="s1-puzzle"><header class="s1-puzzle-head"><div><small>SCENE 01 · LOCK ' + question + '/3</small><h2>' + lock.title + '</h2></div><button class="s1-close" id="s1PuzzleClose" aria-label="닫기">×</button></header>' +
      '<div class="s1-puzzle-body">' + activityMarkup(question) + '<div class="s1-hintbox" id="hintbox"></div></div>' +
      '<footer class="s1-footer"><p class="s1-feedback" id="feedback" aria-live="polite"></p><button class="secondary" id="hintBtn">힌트 · ' + Math.min(context.state.progress.hintCount, 3) + '/3 무료</button><button class="primary" id="s1Submit">입력</button></footer></section>';
  }

  function activityMarkup(question) {
    var lock = locks[question];
    return '<div class="s1-lock-panel"><p>비밀번호를 입력하시오.</p><input class="s1-code-input" id="s1CodeInput" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="' + lock.length + '" value="' + esc(codeValue) + '" placeholder="' + Array(lock.length + 1).join('•') + '" aria-label="비밀번호 입력"></div>';
  }

  function bindRoom() {
    document.querySelectorAll('[data-object]').forEach(function (button) {
      button.addEventListener('click', function () { inspectObject(button.dataset.object); });
    });
    var dialogue = document.getElementById('s1Dialogue');
    if (dialogue) dialogue.addEventListener('click', function () {
      introStep += 1;
      if (introStep >= intro.length) {
        try { localStorage.setItem(storageKey('intro'), 'done'); } catch (_error) {}
      }
      draw();
    });
    var inspectClose = document.getElementById('inspectClose');
    if (inspectClose) inspectClose.addEventListener('click', function () { inspect = null; draw(); });
  }

  function bindPuzzle(question) {
    var close = document.getElementById('s1PuzzleClose');
    if (!close) return;
    close.addEventListener('click', function () { puzzleOpen = false; draw(); });
    var input = document.getElementById('s1CodeInput');
    if (input) input.addEventListener('input', function () {
      codeValue = input.value.replace(/\D/g, '').slice(0, locks[question].length);
      input.value = codeValue;
    });
    var hint = document.getElementById('hintBtn');
    if (hint) hint.addEventListener('click', context.hint);
    document.getElementById('s1Submit').addEventListener('click', async function () {
      var answer = codeValue;
      var feedback = document.getElementById('feedback');
      if (answer.length !== locks[question].length) {
        feedback.textContent = locks[question].length + '자리 암호를 모두 입력하세요.';
        feedback.className = 's1-feedback bad';
        return;
      }
      await context.submit(answer, this);
    });
  }

  function draw() {
    if (!context || !context.game) return;
    var question = currentQuestion();
    context.game.innerHTML = roomMarkup(question);
    bindRoom();
    if (puzzleOpen) bindPuzzle(question);
    if (banner) setTimeout(function () {
      var element = document.querySelector('.s1-system');
      if (element) element.remove();
      banner = '';
    }, 2600);
  }

  function render(options) {
    context = options;
    var nextIdentity = options.state.session.code + ':' + options.state.player.team + ':' + options.state.player.role;
    if (identity !== nextIdentity) {
      identity = nextIdentity;
      restoreLocal();
      codeValue = '';
      inspect = null;
      puzzleOpen = false;
      lastQuestion = 0;
    }
    var question = currentQuestion();
    if (lastQuestion && question !== lastQuestion) {
      inspect = null;
      puzzleOpen = false;
      codeValue = '';
      banner = question === 2 ? '비상 전력 복구 완료 · 관측 수납함 전자 잠금 활성화' : '관측 수납함 개방 · 항법장치 안전 검증 활성화';
    }
    lastQuestion = question;
    draw();
  }

  function renderEnding(game, onContinue) {
    game.innerHTML = '<div class="s1-shell"><div class="s1-room opened"><div class="s1-ending"><div class="s1-ending-card"><small>OBSERVATION ROOM 01 · COMPLETE</small><h2>전력 복구 · 중앙 통로 개방</h2><p>세 개의 잠금장치가 해제되고 항법장치가 다시 작동합니다.</p><div class="signal">치직— “관측 기록을 믿지 마.”<br><br>송신 위치 · 2번 구획</div><p>정체불명의 신호가 열린 통로 너머에서 반복되고 있습니다.</p><button class="primary action" id="s1Continue">2번 구획으로 이동</button></div></div></div></div>';
    document.getElementById('s1Continue').addEventListener('click', onContinue);
  }

  window.StarEscapeScene01 = { render: render, renderEnding: renderEnding };
})();
