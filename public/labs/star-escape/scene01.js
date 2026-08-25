(function () {
  'use strict';

  var ROOT = '/labs/star-escape/assets/scene01/';
  var context = null;
  var identity = '';
  var visited = new Set();
  var inspect = null;
  var puzzleOpen = false;
  var codeValue = '';
  var activeWire = 'R1';
  var wireMapping = {};
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
    window: 'objects/obj_observation_monitor_off.webp',
    tools: 'characters/ui_lumen_ai_icon.webp',
    trash: 'characters/ui_lumen_ai_icon.webp',
    warning: 'ui/ui_navigation_error.webp',
    door: 'characters/ui_lumen_ai_icon.webp',
  };

  var roleClues = {
    1: [
      { id: 'window', title: '관측창 하단 센서', intro: '관측창 아래쪽에 성에와 먼지로 덮인 소형 센서가 붙어 있다. 희미한 표시등이 아직 깜빡인다.', text: '센서 표면을 닦아 내자 푸른빛 별 사진과 함께 ‘관측 표본 A’가 나타난다. 아래에는 ‘복구 숫자 7’이 희미하게 새겨져 있다.', image: 'stars/star_observation_blue.webp' },
      { id: 'monitor', title: '관측 모니터의 잔상', intro: '꺼진 줄 알았던 모니터 한쪽에 희미한 별 영상이 반복해서 번쩍인다. 화면을 확대하면 기록을 읽을 수 있을 것 같다.', text: '영상을 확대하자 흰빛 별 옆에 ‘관측 표본 B’가 표시된다. 손상되지 않은 하단 기록에는 ‘복구 숫자 1’이라고 적혀 있다.', image: 'stars/star_observation_white.webp' },
      { id: 'torn', title: '바닥에 떨어진 관측 기록지', intro: '바닥의 포장지 아래에서 반쯤 찢어진 관측 기록지가 보인다. 접힌 부분 안쪽에 글씨가 남아 있다.', text: '종이를 조심스럽게 펼치자 노란빛 별 사진과 ‘관측 표본 C’가 드러난다. 마지막 줄에는 ‘복구 숫자 3’이 적혀 있다.', image: 'stars/star_observation_yellow.webp' },
      { id: 'warning', title: '경고등 보조 센서', intro: '붉은 경고등 아래의 작은 센서가 그을음에 덮여 있다. 표면에 긁힌 글자가 보이지만 바로 읽히지 않는다.', text: '그을음을 닦고 자세히 보니 붉은빛 별 사진 옆에 ‘관측 표본 D’가 표시된다. 모서리에는 ‘복구 숫자 9’가 새겨져 있다.', image: 'stars/star_observation_red.webp' },
    ],
    2: [
      { id: 'torn', title: '찢어진 메모 조각', intro: '찢어진 기록지 뒷면에 연필로 급하게 쓴 문장이 있다. 종이가 접혀 있어 끝부분이 보이지 않는다.', text: '접힌 부분을 펴자 “R1의 별은 R3의 별보다 표면 온도가 높다.”라는 문장이 온전히 드러난다.', image: 'memos/memo_fragment_01.webp' },
      { id: 'terminal', title: '복구 단말의 임시 기록', intro: '복구된 단말 구석에 삭제되지 않은 임시 기록 하나가 남아 있다. 글자가 심하게 깨져 있다.', text: '깨진 문장을 복원하자 “R2는 네 별 중 표면 온도가 가장 높은 별이 아니다.”라고 표시된다.', image: 'memos/memo_fragment_02.webp' },
      { id: 'monitor', title: '손상된 R3 관측 화면', intro: '관측 모니터의 R3 화면만 색상 정보가 흐릿하다. 노이즈를 줄이면 원래 색을 확인할 수 있을 것 같다.', text: '노이즈를 제거하자 R3 화면이 노란빛으로 선명해진다. 하단에는 “R3에서 관측한 별은 노란색”이라고 적혀 있다.', image: 'memos/memo_fragment_03.webp' },
      { id: 'window', title: '관측창 프레임의 낙서', intro: '관측창 프레임 안쪽에 손가락으로 긁어 쓴 듯한 짧은 기록이 있다. 먼지 때문에 일부만 보인다.', text: '먼지를 닦자 “R4의 별은 R2의 별보다 표면 온도가 낮다.”라는 문장이 나타난다.', image: 'memos/memo_fragment_04.webp' },
    ],
    3: [
      { id: 'monitor', title: '관측 모니터 검증 카드 C1', intro: '모니터 안쪽에 C1 검증 카드가 겹쳐 떠 있다. 별 사진 아래의 판정 문장은 확대해야 읽을 수 있다.', text: '확대해 보니 C1은 푸른색 별이며 “네 표본 중 표면 온도가 가장 높다.”라고 기록되어 있다.', image: 'stars/star_observation_blue.webp' },
      { id: 'terminal', title: '전력 단말 검증 기록 C2', intro: '전력 단말에 항법장치가 전송한 C2 임시 기록이 남아 있다. 화면 일부가 깜빡거린다.', text: '화면을 고정하자 C2는 붉은색 별이며 “C1보다 표면 온도가 높다.”라고 기록되어 있다.', image: 'stars/star_observation_red.webp' },
      { id: 'torn', title: '찢어진 검증 기록 C3', intro: '찢어진 종이 사이에 C3 검증표가 끼어 있다. 표면 온도 칸이 얼룩으로 가려져 있다.', text: '얼룩 주변을 살펴보니 C3은 노란색 별이지만 표면 온도 자료는 지워져 있어 기록의 참·거짓을 판단할 수 없다.', image: 'stars/star_observation_yellow.webp' },
      { id: 'window', title: '관측창 센서 로그 C4', intro: '관측창 센서에 C4라는 오래된 로그가 남아 있다. 세부 기록을 불러오려면 화면을 더 자세히 봐야 한다.', text: '로그를 펼치자 C4는 흰색 별이며 “노란색 별 C3보다 표면 온도가 높다.”라고 기록되어 있다.', image: 'stars/star_observation_white.webp' },
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
    return 'scilab-star-escape-scene01-v3:' + identity + ':' + suffix;
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
      communicator: question === 1 ? '통신기 측면에 낡은 복구 설명서가 끼워져 있다. 펼쳐 보니 “별의 표면 온도가 높은 순서부터 각 대원의 복구 숫자를 입력한다.”라고 적혀 있다.' : question === 2 ? '통신기 뒷면의 배선 설명서가 켜졌다. “각 대원이 확인한 별의 색과 같은 단자에 R1~R4 전선을 연결한다.”라고 적혀 있다.' : '통신기에서 짧은 검증 음성이 반복된다. “과학적으로 참인 기록 두 개의 번호를 작은 수부터 입력하라.”',
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
    var key = 'q' + question + ':' + id;
    if (locks[question].id === id) {
      visited.add(key);
      saveVisited();
      inspect = null;
      puzzleOpen = true;
      draw();
      return;
    }
    var target = objects.find(function (item) { return item.id === id; });
    var clueRole = availableRoles().find(function (role) { return roleClue(question, role).id === id; });
    var clue = clueRole ? roleClue(question, clueRole) : null;
    var foundClue = Boolean(clue);
    var revealed = foundClue && visited.has(key);
    if (!foundClue) {
      visited.add(key);
      saveVisited();
    }
    inspect = {
      id: id,
      key: key,
      name: foundClue ? clue.title : (target ? target.name : '조사 대상'),
      text: foundClue ? (revealed ? clue.text : clue.intro) : objectText(id, question),
      detail: foundClue ? clue.text : '',
      image: foundClue && revealed ? clue.image : (objectImages[id] || 'characters/ui_lumen_ai_icon.webp'),
      detailImage: foundClue ? clue.image : '',
      clue: foundClue,
      role: clueRole,
      revealed: revealed,
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
      '<div><small>' + (inspect.clue ? (inspect.revealed ? '대원 ' + inspect.role + ' 전용 단서' : '이상한 흔적 발견') : 'INVESTIGATION') + '</small><b>' + esc(inspect.name) + '</b><p>' + esc(inspect.text) + '</p>' +
      (inspect.clue && !inspect.revealed ? '<button class="s1-inspect-action" id="inspectReveal">자세히 보기</button>' : '') + '</div>' +
      '<button id="inspectClose" aria-label="닫기">×</button></section>';
  }

  function puzzleMarkup(question) {
    var lock = locks[question];
    return '<section class="s1-puzzle"><header class="s1-puzzle-head"><div><small>SCENE 01 · LOCK ' + question + '/3</small><h2>' + lock.title + '</h2></div><button class="s1-close" id="s1PuzzleClose" aria-label="닫기">×</button></header>' +
      '<div class="s1-puzzle-body">' + activityMarkup(question) + '<div class="s1-hintbox" id="hintbox"></div></div>' +
      '<footer class="s1-footer"><p class="s1-feedback" id="feedback" aria-live="polite"></p><button class="secondary" id="hintBtn">힌트 · ' + Math.min(context.state.progress.hintCount, 3) + '/3 무료</button><button class="primary" id="s1Submit">' + (question === 2 ? '연결 확인' : '입력') + '</button></footer></section>';
  }

  function activityMarkup(question) {
    if (question === 2) return wireActivityMarkup();
    var lock = locks[question];
    return '<div class="s1-lock-panel"><p>비밀번호를 입력하시오.</p><input class="s1-code-input" id="s1CodeInput" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="' + lock.length + '" value="' + esc(codeValue) + '" placeholder="' + Array(lock.length + 1).join('•') + '" aria-label="비밀번호 입력"></div>';
  }

  function wireActivityMarkup() {
    var roles = ['R1', 'R2', 'R3', 'R4'];
    var colors = [
      { id: 'B', label: '푸른색 별', image: 'stars/star_observation_blue.webp', wire: '#4ea5ff' },
      { id: 'W', label: '흰색 별', image: 'stars/star_observation_white.webp', wire: '#f3f6ff' },
      { id: 'Y', label: '노란색 별', image: 'stars/star_observation_yellow.webp', wire: '#ffd44f' },
      { id: 'R', label: '붉은색 별', image: 'stars/star_observation_red.webp', wire: '#ff6471' },
    ];
    var roleButtons = roles.map(function (role) {
      var connected = wireMapping[role];
      var label = connected ? colors.find(function (item) { return item.id === connected; }).label : '연결 안 됨';
      return '<button class="s1-wire-node role ' + (activeWire === role ? 'active' : '') + ' ' + (connected ? 'connected' : '') + '" data-wire-role="' + role + '" aria-pressed="' + (activeWire === role) + '"><span class="s1-wire-plug"></span><b>' + role + '</b><small>' + label + '</small></button>';
    }).join('');
    var colorButtons = colors.map(function (color) {
      var assigned = roles.find(function (role) { return wireMapping[role] === color.id; });
      return '<button class="s1-wire-node color ' + (assigned ? 'connected' : '') + '" data-wire-color="' + color.id + '" aria-label="' + color.label + ' 단자"><img src="' + image(color.image) + '" alt=""><span><b>' + color.label + '</b><small>' + (assigned ? assigned + ' 연결됨' : '선택하여 연결') + '</small></span><i class="s1-wire-plug" style="--wire:' + color.wire + '"></i></button>';
    }).join('');
    var lines = roles.map(function (role, roleIndex) {
      var colorId = wireMapping[role];
      if (!colorId) return '';
      var colorIndex = colors.findIndex(function (item) { return item.id === colorId; });
      var color = colors[colorIndex];
      var y1 = 12.5 + roleIndex * 25;
      var y2 = 12.5 + colorIndex * 25;
      return '<path class="s1-wire-shadow" d="M 0 ' + y1 + ' C 38 ' + y1 + ', 62 ' + y2 + ', 100 ' + y2 + '"></path><path class="s1-wire-line" style="--wire:' + color.wire + '" d="M 0 ' + y1 + ' C 38 ' + y1 + ', 62 ' + y2 + ', 100 ' + y2 + '"></path>';
    }).join('');
    var connectedCount = Object.keys(wireMapping).length;
    return '<div class="s1-wire-panel"><div class="s1-wire-guide"><small>RESTORE WIRING</small><b>대원별 관측 전선 연결</b><p>' + (activeWire ? activeWire + ' 전선과 연결할 별 색을 선택하세요.' : '연결을 바꾸려면 R 단자를 다시 선택하세요.') + '</p><span>' + connectedCount + ' / 4 연결</span></div>' +
      '<div class="s1-wire-board"><div class="s1-wire-bank roles">' + roleButtons + '</div><svg class="s1-wire-canvas" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' + lines + '</svg><div class="s1-wire-bank colors">' + colorButtons + '</div></div></div>';
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
    var inspectReveal = document.getElementById('inspectReveal');
    if (inspectReveal) inspectReveal.addEventListener('click', function () {
      visited.add(inspect.key);
      saveVisited();
      inspect.revealed = true;
      inspect.text = inspect.detail;
      inspect.image = inspect.detailImage;
      draw();
    });
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
    document.querySelectorAll('[data-wire-role]').forEach(function (button) {
      button.addEventListener('click', function () {
        activeWire = button.dataset.wireRole;
        draw();
      });
    });
    document.querySelectorAll('[data-wire-color]').forEach(function (button) {
      button.addEventListener('click', function () {
        if (!activeWire) activeWire = ['R1', 'R2', 'R3', 'R4'].find(function (role) { return !wireMapping[role]; }) || 'R1';
        Object.keys(wireMapping).forEach(function (role) {
          if (wireMapping[role] === button.dataset.wireColor) delete wireMapping[role];
        });
        wireMapping[activeWire] = button.dataset.wireColor;
        activeWire = ['R1', 'R2', 'R3', 'R4'].find(function (role) { return !wireMapping[role]; }) || null;
        draw();
      });
    });
    var hint = document.getElementById('hintBtn');
    if (hint) hint.addEventListener('click', context.hint);
    document.getElementById('s1Submit').addEventListener('click', async function () {
      var answer = codeValue;
      var feedback = document.getElementById('feedback');
      if (question === 2) {
        if (Object.keys(wireMapping).length !== 4) {
          feedback.textContent = 'R1부터 R4까지 네 전선을 모두 연결하세요.';
          feedback.className = 's1-feedback bad';
          return;
        }
        var colorCodes = { B: '4', W: '8', Y: '2', R: '6' };
        answer = ['R1', 'R2', 'R3', 'R4'].map(function (role) { return colorCodes[wireMapping[role]]; }).join('');
      } else if (answer.length !== locks[question].length) {
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
      activeWire = 'R1';
      wireMapping = {};
      inspect = null;
      puzzleOpen = false;
      lastQuestion = 0;
    }
    var question = currentQuestion();
    if (lastQuestion && question !== lastQuestion) {
      inspect = null;
      puzzleOpen = false;
      codeValue = '';
      activeWire = question === 2 ? 'R1' : null;
      wireMapping = {};
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
