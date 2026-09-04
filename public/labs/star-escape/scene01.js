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
  var wireResizeBound = false;
  var nextGuideOpen = false;
  var nextGuideSeen = false;
  var introStep = 0;
  var banner = '';
  var lastQuestion = 0;
  var endingStep = 0;
  var endingIdentity = '';

  var intro = [
    ['시스템', '쾅—'],
    ['루멘', '비상 전력으로 전환합니다.'],
    ['시스템', '주 전력 차단.'],
    ['루멘', '지구 귀환 절차 중단.'],
    ['루멘', '현재 위치는 관측실 01입니다.'],
    ['시스템', '중앙 통로 잠금.'],
    ['루멘', '중앙 통로가 자동 봉쇄되었습니다.'],
    ['대원', '통로를 열 방법은?'],
    ['루멘', '관측 시스템 복구가 필요합니다.'],
    ['시스템', '추가 잠금 신호 감지.'],
    ['루멘', '해당 작동 기록이 없습니다.'],
    ['시스템', '현재 목표 · 관측실을 조사하라.'],
    ['루멘', '각 대원의 수신 자료가 서로 다릅니다. 찾은 단서를 반드시 공유하세요.'],
  ];

  var objects = [
    { id: 'window', name: '우주정거장 창문', box: [6, 8, 29, 36] },
    { id: 'monitor', name: '별 관측 화면', box: [9, 48, 25, 26] },
    { id: 'terminal', name: '비상 기록 단말', box: [31, 47, 11, 26] },
    { id: 'door', name: '중앙 통로', box: [44.5, 14, 16, 55] },
    { id: 'communicator', name: '통신기', box: [61.5, 27, 8, 22] },
    { id: 'navigation', name: '고장 난 항법장치', box: [69, 45, 25, 28] },
    { id: 'storage', name: '수납함', box: [89, 28, 9, 47] },
    { id: 'tools', name: '정비 도구', box: [4, 78, 19, 15] },
    { id: 'trash', name: '우주식량 포장지', box: [27, 84, 10, 10] },
    { id: 'warning', name: '경고등', box: [83, 2, 8, 13] },
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
      { id: 'window', mode: 'instant', title: '관측창 하단 자동 센서', intro: '', action: '', text: '센서가 대원 카드를 인식하자 푸른빛 별 사진과 ‘관측 표본 A’가 자동으로 열린다. 하단 복구 숫자는 7이다.', image: 'stars/star_observation_blue.webp' },
      { id: 'monitor', mode: 'zoom', title: '관측 모니터의 잔상', intro: '꺼진 줄 알았던 모니터 한쪽에 희미한 별 영상이 반복해서 번쩍인다. 화면을 확대하면 기록을 읽을 수 있을 것 같다.', action: '영상 확대하기', text: '영상을 확대하자 흰빛 별 옆에 ‘관측 표본 B’가 표시된다. 손상되지 않은 하단 기록에는 ‘복구 숫자 1’이라고 적혀 있다.', image: 'stars/star_observation_white.webp' },
      { id: 'tools', mode: 'press', title: '정비 도구함의 점검 카드', intro: '렌치 아래에 노란색 관측 카드가 끼워져 있다. 고정 클립을 누르면 카드를 꺼낼 수 있다.', action: '고정 클립 열기', text: '카드를 꺼내자 노란빛 별 사진과 ‘관측 표본 C’가 나타난다. 마지막 줄의 복구 숫자는 3이다.', image: 'stars/star_observation_yellow.webp' },
      { id: 'warning', mode: 'hold', title: '경고등 점멸 기록', intro: '붉은 경고등 옆의 보조 기록기가 짧은 신호를 반복하고 있다. 신호를 끝까지 수신해야 기록이 열린다.', action: '점멸 신호 수신', text: '신호 수신이 끝나자 붉은빛 별 사진과 ‘관측 표본 D’가 표시된다. 모서리에 복구 숫자 9가 선명하게 나타난다.', image: 'stars/star_observation_red.webp' },
    ],
    2: [
      { id: 'door', mode: 'press', title: '중앙 통로의 자석 태그', intro: '잠긴 중앙 통로 옆에 작은 자석 태그가 거꾸로 붙어 있다. 앞면에는 아무것도 없지만 뒤쪽에 기록이 있는 듯하다.', action: '자석 태그 뒤집기', text: '태그를 뒤집자 “R1의 별은 R3의 별보다 표면 온도가 높다.”라는 문장이 나타난다.', image: 'memos/memo_fragment_01.webp' },
      { id: 'terminal', mode: 'instant', title: '복구 단말의 자동 백업', intro: '', action: '', text: '복구 단말이 전력을 되찾으며 백업 문장을 자동으로 띄운다. “R2는 네 별 중 표면 온도가 가장 높은 별이 아니다.”', image: 'memos/memo_fragment_02.webp' },
      { id: 'communicator', mode: 'hold', title: '통신기의 R3 음성 기록', intro: '통신기 수신함에 R3가 남긴 짧은 음성 기록이 있다. 잡음이 많아 끝까지 수신해야 한다.', action: '음성 기록 수신', text: '음성 기록이 재생된다. “R3에서 관측한 별은 노란색이다.”', image: 'memos/memo_fragment_03.webp' },
      { id: 'trash', mode: 'unfold', title: '우주식량 포장지 안쪽', intro: '구겨진 포장지 안쪽에 누군가 급히 적은 문장이 비친다. 포장지를 펴면 읽을 수 있을 것 같다.', action: '포장지 펼치기', text: '포장지를 펼치자 “R4의 별은 R2의 별보다 표면 온도가 낮다.”라는 문장이 온전히 보인다.', image: 'memos/memo_fragment_04.webp' },
    ],
    3: [
      { id: 'storage', mode: 'press', title: '열린 수납함의 검증 카드 C1', intro: '방금 열린 수납함 안쪽에 C1 카드가 자석으로 고정되어 있다.', action: 'C1 카드 꺼내기', text: 'C1은 푸른색 별이며 “네 표본 중 표면 온도가 가장 높다.”라고 기록되어 있다.', image: 'stars/star_observation_blue.webp' },
      { id: 'tools', mode: 'instant', title: '정비 태블릿 검증 기록 C2', intro: '', action: '', text: '정비 태블릿이 C2를 바로 표시한다. C2는 붉은색 별이며 “C1보다 표면 온도가 높다.”라고 기록되어 있다.', image: 'stars/star_observation_red.webp' },
      { id: 'window', mode: 'zoom', title: '관측창 투영 기록 C3', intro: '관측창에 C3 검증표가 작게 투영되어 있다. 확대하면 남은 정보를 확인할 수 있다.', action: '투영 기록 확대', text: 'C3은 노란색 별이지만 표면 온도 자료가 없어 기록의 참·거짓을 판단할 수 없다.', image: 'stars/star_observation_yellow.webp' },
      { id: 'communicator', mode: 'hold', title: '통신기 검증 로그 C4', intro: '통신기가 C4 로그를 수신하고 있다. 전송이 끝날 때까지 신호를 유지해야 한다.', action: 'C4 로그 수신', text: 'C4는 흰색 별이며 “노란색 별 C3보다 표면 온도가 높다.”라고 기록되어 있다.', image: 'stars/star_observation_white.webp' },
    ],
  };

  var locks = {
    1: { id: 'terminal', title: '비상 전력 제어 단말', length: 4, label: '4자리 복구 암호' },
    2: { id: 'storage', title: '관측 자료 수납함', length: 4, label: '4자리 수납함 암호' },
    3: { id: 'navigation', title: '항법장치 안전 검증', length: 2, label: '2자리 검증 암호' },
  };

  var verificationRecords = [
    { code: '1', label: 'C1', color: '푸른색 별', statement: '네 표본 중 표면 온도가 가장 높다.', image: 'stars/star_observation_blue.webp' },
    { code: '2', label: 'C2', color: '붉은색 별', statement: 'C1보다 표면 온도가 높다.', image: 'stars/star_observation_red.webp' },
    { code: '3', label: 'C3', color: '노란색 별', statement: '[대상 기록 손상]보다 표면 온도가 높다.', image: 'stars/star_observation_yellow.webp' },
    { code: '4', label: 'C4', color: '흰색 별', statement: '노란색 별 C3보다 표면 온도가 높다.', image: 'stars/star_observation_white.webp' },
  ];

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }

  function storageKey(suffix) {
    return 'scilab-star-escape-scene01-v5:' + identity + ':' + suffix;
  }

  function restoreLocal() {
    try {
      visited = new Set(JSON.parse(localStorage.getItem(storageKey('visited')) || '[]'));
      introStep = localStorage.getItem(storageKey('intro-v2')) === 'done' ? intro.length : 0;
      nextGuideSeen = localStorage.getItem(storageKey('q3-guide')) === 'seen';
    } catch (_error) {
      visited = new Set();
      introStep = 0;
      nextGuideSeen = false;
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
      navigation: question < 3 ? '항법장치는 전력이 부족해 잠들어 있다.' : '화면에 “과학적으로 참인 기록 두 개의 번호를 작은 수부터 입력하라.”라는 최종 검증 지시가 떠 있다.',
      storage: question === 1 ? '전자 잠금장치에 전력이 들어오지 않는다.' : question === 2 ? '별 색 배선을 맞춰야 열리는 관측 자료 수납함이다.' : '수납함이 열리면서 검증 기록 네 개가 방 안의 관측 장치로 전송되었다.',
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
    var clueRole = question < 3 ? availableRoles().find(function (role) { return roleClue(question, role).id === id; }) : null;
    var clue = clueRole ? roleClue(question, clueRole) : null;
    var foundClue = Boolean(clue);
    var revealed = foundClue && (clue.mode === 'instant' || visited.has(key));
    if (foundClue && clue.mode === 'instant' && !visited.has(key)) {
      visited.add(key);
      saveVisited();
    }
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
      action: foundClue ? clue.action : '',
      mode: foundClue ? clue.mode : '',
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
    return '노란색으로 빛나는 <b>항법장치</b>를 눌러 최종 검증을 시작하세요.';
  }

  function roomMarkup(question) {
    var hotspots = objects.map(function (item) {
      var key = 'q' + question + ':' + item.id;
      var classes = ['s1-hotspot'];
      if (visited.has(key)) classes.push('visited');
      if (question === 3 && item.id === 'navigation') classes.push('required');
      return '<button class="' + classes.join(' ') + '" data-object="' + item.id + '" data-label="' + esc(item.name) + '" aria-label="' + esc(item.name) + '" style="left:' + item.box[0] + '%;top:' + item.box[1] + '%;width:' + item.box[2] + '%;height:' + item.box[3] + '%"></button>';
    }).join('');
    return '<div class="s1-shell"><div class="s1-room ' + roomState(question) + '" data-power="' + roomState(question) + '">' +
      '<div class="s1-title"><small>OBSERVATION ROOM 01</small><b>뒤바뀐 별 기록</b></div>' +
      '<div class="s1-objective">현재 목표 · ' + objective(question) + '</div>' +
      hotspots +
      (banner ? '<div class="s1-system">' + esc(banner) + '</div>' : '') +
      (inspect ? inspectMarkup() : '') +
      (nextGuideOpen ? nextGuideMarkup() : '') +
      (introStep < intro.length ? dialogueMarkup() : '') +
      (puzzleOpen ? puzzleMarkup(question) : '') +
      '</div></div>';
  }

  function dialogueMarkup() {
    var item = arguments[0] || intro[Math.min(introStep, intro.length - 1)];
    var id = arguments[1] || 's1Dialogue';
    var isAi = /루멘|시스템/.test(item[0]);
    var isUnknown = /미확인/.test(item[0]);
    var role = Math.max(1, Math.min(4, Number(context.state.player.role || 1)));
    var portrait = isAi ? 'ui_lumen_ai_icon.webp' : isUnknown ? '../scene04/scene04_silhouette_master.webp' : 'char_student_0' + role + '_' + ['female_bob', 'male_tablet', 'female_ponytail', 'male_glasses'][role - 1] + '.webp';
    var speakerClass = isAi ? 'speaker-ai' : isUnknown ? 'speaker-device' : 'speaker-crew';
    return '<button class="s1-dialogue ' + speakerClass + '" id="' + id + '">' +
      '<img class="portrait" src="' + image('characters/' + portrait) + '" alt="' + esc(item[0]) + '">' +
      '<span><small>' + esc(item[0]) + '</small><p>' + esc(item[1]) + '</p></span>' +
      '<span class="advance">터치하여 계속 ▼</span></button>';
  }

  function inspectMarkup() {
    return '<section class="s1-inspect ' + (inspect.clue ? 'clue' : '') + '">' +
      '<img src="' + image(inspect.image) + '" alt="">' +
      '<div><small>' + (inspect.clue ? (inspect.revealed ? '대원 ' + inspect.role + ' 전용 단서' : '이상한 흔적 발견') : 'INVESTIGATION') + '</small><b>' + esc(inspect.name) + '</b><p>' + esc(inspect.text) + '</p>' +
      (inspect.clue && !inspect.revealed ? inspectTaskMarkup() : '') + '</div>' +
      '<button id="inspectClose" aria-label="닫기">×</button></section>';
  }

  function inspectTaskType(action, mode) {
    if (mode) return mode;
    if (/불러오기/.test(action)) return 'hold';
    if (/펼치/.test(action)) return 'unfold';
    if (/확대/.test(action)) return 'zoom';
    if (/노이즈|신호|복원/.test(action)) return 'tune';
    return 'wipe';
  }

  function inspectTaskMarkup() {
    var type = inspectTaskType(inspect.action || '', inspect.mode);
    if (type === 'press') {
      return '<button class="s1-direct-task reveal" id="inspectReveal"><span aria-hidden="true">＋</span><b>' + esc(inspect.action || '기록 확인하기') + '</b><small>눌러서 단서를 확인하세요</small></button>';
    }
    if (type === 'wipe') {
      return '<div class="s1-direct-task wipe" id="inspectWipe" role="application" aria-label="' + esc(inspect.action) + '"><span class="s1-task-mask" id="inspectTaskVisual"></span><span class="s1-task-copy">손가락이나 마우스로 문질러 주세요 <b id="inspectTaskValue">0%</b></span></div>';
    }
    if (type === 'hold') {
      return '<button class="s1-direct-task hold" id="inspectHold"><span class="s1-hold-ring" id="inspectTaskVisual"></span><span><b>길게 눌러 로그 불러오기</b><small>손을 떼지 말고 기다리세요 · <em id="inspectTaskValue">0%</em></small></span></button>';
    }
    var instructions = type === 'unfold' ? '오른쪽으로 밀어 종이를 펼치세요' : type === 'zoom' ? '오른쪽으로 밀어 화면을 확대하세요' : '오른쪽으로 밀어 신호를 선명하게 하세요';
    return '<div class="s1-direct-task slider ' + type + '"><span class="s1-task-symbol" id="inspectTaskVisual"></span><label><b>' + instructions + '</b><input id="inspectSlider" type="range" min="0" max="100" value="0" aria-label="' + esc(inspect.action) + '"></label><output id="inspectTaskValue">0%</output></div>';
  }

  function updateInspectTask(value) {
    var progress = Math.max(0, Math.min(100, Math.round(value)));
    var visual = document.getElementById('inspectTaskVisual');
    var output = document.getElementById('inspectTaskValue');
    if (visual) {
      visual.style.setProperty('--progress', progress);
      if (visual.classList.contains('s1-task-mask')) visual.style.opacity = String(1 - progress / 100);
      if (visual.classList.contains('s1-task-symbol')) {
        var task = visual.closest('.s1-direct-task');
        if (task && task.classList.contains('zoom')) visual.style.transform = 'scale(' + (1 + progress * 0.003) + ')';
        if (task && task.classList.contains('unfold')) visual.style.transform = 'skewX(' + ((100 - progress) * -0.08) + 'deg)';
        if (task && task.classList.contains('tune')) visual.style.filter = 'blur(' + ((100 - progress) * 0.015) + 'px)';
      }
      if (visual.classList.contains('s1-hold-ring')) visual.style.background = 'conic-gradient(var(--cyan) ' + progress + '%, #263453 0)';
    }
    if (output) output.textContent = progress + '%';
    return progress;
  }

  function completeInspectTask() {
    if (!inspect || !inspect.clue || inspect.revealed) return;
    visited.add(inspect.key);
    saveVisited();
    inspect.revealed = true;
    inspect.text = inspect.detail;
    inspect.image = inspect.detailImage;
    draw();
  }

  function nextGuideMarkup() {
    return '<section class="s1-next-guide" role="dialog" aria-modal="true" aria-labelledby="s1NextGuideTitle"><div class="s1-next-guide-card">' +
      '<small>SYSTEM UPDATE · LOCK 2/3 COMPLETE</small><h2 id="s1NextGuideTitle">수납함이 열렸습니다</h2>' +
      '<p>수납함의 검증 기록이 관측실 장치 네 곳으로 전송되었습니다. 기록을 비교해 항법장치의 마지막 검증을 완료하세요.</p>' +
      '<ol><li><b>1</b><span>파란 조사 지점에서<br>검증 기록 찾기</span></li><li><b>2</b><span>별 색과 문장을 비교해<br>참인 기록 고르기</span></li><li><b>3</b><span>노란 항법장치에<br>기록 번호 입력하기</span></li></ol>' +
      '<button class="primary" id="s1NextGuideClose">검증 기록 조사 시작</button></div></section>';
  }

  function puzzleMarkup(question) {
    var lock = locks[question];
    return '<section class="s1-puzzle"><header class="s1-puzzle-head"><div><small>SCENE 01 · LOCK ' + question + '/3</small><h2>' + lock.title + '</h2></div><button class="s1-close" id="s1PuzzleClose" aria-label="닫기">×</button></header>' +
      '<div class="s1-puzzle-body">' + activityMarkup(question) + '<div class="s1-hintbox" id="hintbox"></div></div>' +
      '<footer class="s1-footer"><p class="s1-feedback" id="feedback" aria-live="polite"></p><button class="secondary" id="hintBtn">힌트 · ' + Math.min(context.state.progress.hintCount, 3) + '/3 무료</button><button class="primary" id="s1Submit">' + (question === 2 ? '연결 확인' : question === 3 ? '검증 완료' : '입력') + '</button></footer></section>';
  }

  function activityMarkup(question) {
    if (question === 2) return wireActivityMarkup();
    if (question === 3) return verificationActivityMarkup();
    var lock = locks[question];
    return '<div class="s1-lock-panel"><p>비밀번호를 입력하시오.</p><input class="s1-code-input" id="s1CodeInput" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="' + lock.length + '" value="' + esc(codeValue) + '" placeholder="' + Array(lock.length + 1).join('•') + '" aria-label="비밀번호 입력"></div>';
  }

  function verificationActivityMarkup() {
    var selected = codeValue.split('');
    var records = verificationRecords.map(function (record) {
      var active = selected.indexOf(record.code) >= 0;
      return '<button type="button" class="s1-record ' + (active ? 'selected' : '') + '" data-record-code="' + record.code + '" aria-pressed="' + active + '">' +
        '<span class="s1-record-image"><img src="' + image(record.image) + '" alt="' + esc(record.color) + '"></span>' +
        '<span class="s1-record-copy"><strong>' + record.label + '</strong><b>' + esc(record.color) + '</b><span>“' + esc(record.statement) + '”</span></span>' +
        '<i>' + (active ? '선택됨' : '선택') + '</i></button>';
    }).join('');
    return '<div class="s1-verification-panel"><div class="s1-verification-guide"><small>FINAL RECORD CHECK</small><b>참이라고 확인할 수 있는 기록 두 개를 선택하세요.</b><p>별의 표면 온도는 <em>푸른색 → 흰색 → 노란색 → 붉은색</em> 순으로 낮아집니다. 자료가 부족한 기록은 참으로 확정할 수 없습니다.</p></div><div class="s1-records">' + records + '</div><p class="s1-selection-count">선택한 기록 <b>' + selected.length + ' / 2</b></p></div>';
  }

  function wireActivityMarkup() {
    var roles = ['R1', 'R2', 'R3', 'R4'];
    var colors = [
      { id: 'Y', label: '노란색 별', image: 'stars/star_observation_yellow.webp', wire: '#ffd44f' },
      { id: 'R', label: '붉은색 별', image: 'stars/star_observation_red.webp', wire: '#ff6471' },
      { id: 'B', label: '푸른색 별', image: 'stars/star_observation_blue.webp', wire: '#4ea5ff' },
      { id: 'W', label: '흰색 별', image: 'stars/star_observation_white.webp', wire: '#f3f6ff' },
    ];
    var roleButtons = roles.map(function (role) {
      var connected = wireMapping[role];
      var label = connected ? colors.find(function (item) { return item.id === connected; }).label : '연결 안 됨';
      return '<button class="s1-wire-node role ' + (activeWire === role ? 'active' : '') + ' ' + (connected ? 'connected' : '') + '" data-wire-role="' + role + '" aria-pressed="' + (activeWire === role) + '"><span class="s1-wire-plug"></span><b>' + role + '</b><small>' + label + '</small></button>';
    }).join('');
    var colorButtons = colors.map(function (color) {
      var assigned = roles.find(function (role) { return wireMapping[role] === color.id; });
      return '<button class="s1-wire-node color ' + (assigned ? 'connected' : '') + '" data-wire-color="' + color.id + '" aria-label="' + color.label + ' 단자" style="--wire:' + color.wire + '"><i class="s1-wire-plug"></i><span class="s1-star-visual"><img src="' + image(color.image) + '" alt="' + color.label + '"></span><span class="s1-star-copy"><b>' + color.label + '</b><small>' + (assigned ? assigned + ' 연결됨' : '별 단자') + '</small></span></button>';
    }).join('');
    var lines = roles.map(function (role) {
      var colorId = wireMapping[role];
      if (!colorId) return '';
      var color = colors.find(function (item) { return item.id === colorId; });
      return '<path class="s1-wire-shadow" data-wire-path="' + role + '"></path><path class="s1-wire-line" data-wire-path="' + role + '" style="--wire:' + color.wire + '"></path>';
    }).join('');
    var connectedCount = Object.keys(wireMapping).length;
    return '<div class="s1-wire-panel"><div class="s1-wire-guide"><small>RESTORE WIRING</small><b>대원별 관측 전선 연결</b><p>위쪽 R 단자에서 아래쪽 별 단자로 전선을 끌거나, 두 단자를 차례로 선택하세요.</p><div class="s1-wire-actions"><button type="button" id="s1WireReset" ' + (connectedCount ? '' : 'disabled') + '>초기화</button><span>' + connectedCount + ' / 4 연결</span></div></div>' +
      '<div class="s1-wire-board"><div class="s1-wire-bank roles">' + roleButtons + '</div><svg class="s1-wire-canvas" aria-hidden="true">' + lines + '<path class="s1-wire-preview" id="s1WirePreview"></path></svg><div class="s1-wire-bank colors">' + colorButtons + '</div></div></div>';
  }

  function wireCurve(x1, y1, x2, y2, index) {
    var board = document.querySelector('.s1-wire-board');
    var width = board ? board.getBoundingClientRect().width : Math.abs(x2 - x1) || 320;
    var vertical = Math.max(80, y2 - y1);
    var sway = width * [-0.11, 0.09, -0.07, 0.12][index % 4];
    var middleX = (x1 + x2) / 2 + sway;
    var middleY = y1 + vertical * 0.52;
    return 'M ' + x1 + ' ' + y1 +
      ' C ' + x1 + ' ' + (y1 + vertical * 0.2) + ', ' + middleX + ' ' + (middleY - vertical * 0.12) + ', ' + middleX + ' ' + middleY +
      ' C ' + middleX + ' ' + (middleY + vertical * 0.15) + ', ' + x2 + ' ' + (y2 - vertical * 0.22) + ', ' + x2 + ' ' + y2;
  }

  function updateWirePaths() {
    var board = document.querySelector('.s1-wire-board');
    var svg = document.querySelector('.s1-wire-canvas');
    if (!board || !svg) return;
    var boardRect = board.getBoundingClientRect();
    if (!boardRect.width || !boardRect.height) return;
    svg.setAttribute('viewBox', '0 0 ' + boardRect.width + ' ' + boardRect.height);
    ['R1', 'R2', 'R3', 'R4'].forEach(function (role, index) {
      var colorId = wireMapping[role];
      if (!colorId) return;
      var source = document.querySelector('[data-wire-role="' + role + '"] .s1-wire-plug');
      var target = document.querySelector('[data-wire-color="' + colorId + '"] .s1-wire-plug');
      if (!source || !target) return;
      var sourceRect = source.getBoundingClientRect();
      var targetRect = target.getBoundingClientRect();
      var x1 = sourceRect.left + sourceRect.width / 2 - boardRect.left;
      var y1 = sourceRect.top + sourceRect.height / 2 - boardRect.top;
      var x2 = targetRect.left + targetRect.width / 2 - boardRect.left;
      var y2 = targetRect.top + targetRect.height / 2 - boardRect.top;
      var d = wireCurve(x1, y1, x2, y2, index);
      document.querySelectorAll('[data-wire-path="' + role + '"]').forEach(function (path) { path.setAttribute('d', d); });
    });
  }

  function connectWire(role, colorId) {
    Object.keys(wireMapping).forEach(function (mappedRole) {
      if (wireMapping[mappedRole] === colorId) delete wireMapping[mappedRole];
    });
    wireMapping[role] = colorId;
    activeWire = ['R1', 'R2', 'R3', 'R4'].find(function (item) { return !wireMapping[item]; }) || null;
    draw();
  }

  function beginWireDrag(role, event) {
    var board = document.querySelector('.s1-wire-board');
    var preview = document.getElementById('s1WirePreview');
    var source = document.querySelector('[data-wire-role="' + role + '"] .s1-wire-plug');
    if (!board || !preview || !source) return;
    activeWire = role;
    var boardRect = board.getBoundingClientRect();
    var sourceRect = source.getBoundingClientRect();
    var x1 = sourceRect.left + sourceRect.width / 2 - boardRect.left;
    var y1 = sourceRect.top + sourceRect.height / 2 - boardRect.top;
    var roleIndex = ['R1', 'R2', 'R3', 'R4'].indexOf(role);
    function move(pointer) {
      var x2 = Math.max(0, Math.min(boardRect.width, pointer.clientX - boardRect.left));
      var y2 = Math.max(y1 + 8, Math.min(boardRect.height, pointer.clientY - boardRect.top));
      preview.setAttribute('d', wireCurve(x1, y1, x2, y2, roleIndex));
    }
    function finish(pointer) {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', cancel);
      var target = document.elementFromPoint(pointer.clientX, pointer.clientY);
      var color = target && target.closest ? target.closest('[data-wire-color]') : null;
      if (color) connectWire(role, color.dataset.wireColor);
      else {
        preview.removeAttribute('d');
        draw();
      }
    }
    function cancel() {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', cancel);
      preview.removeAttribute('d');
    }
    move(event);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', cancel);
    event.preventDefault();
  }

  function bindRoom() {
    document.querySelectorAll('[data-object]').forEach(function (button) {
      button.addEventListener('click', function () { inspectObject(button.dataset.object); });
    });
    var dialogue = document.getElementById('s1Dialogue');
    if (dialogue) dialogue.addEventListener('click', function () {
      introStep += 1;
      if (introStep >= intro.length) {
        try { localStorage.setItem(storageKey('intro-v2'), 'done'); } catch (_error) {}
      }
      draw();
    });
    var inspectClose = document.getElementById('inspectClose');
    if (inspectClose) inspectClose.addEventListener('click', function () { inspect = null; draw(); });
    var nextGuideClose = document.getElementById('s1NextGuideClose');
    if (nextGuideClose) nextGuideClose.addEventListener('click', function () {
      nextGuideOpen = false;
      nextGuideSeen = true;
      try { localStorage.setItem(storageKey('q3-guide'), 'seen'); } catch (_error) {}
      draw();
    });
    bindInspectTask();
  }

  function bindInspectTask() {
    var reveal = document.getElementById('inspectReveal');
    if (reveal) reveal.addEventListener('click', completeInspectTask);
    var wipe = document.getElementById('inspectWipe');
    if (wipe) {
      var wiping = false;
      var wipeProgress = 0;
      var lastX = 0;
      var lastY = 0;
      wipe.addEventListener('pointerdown', function (event) {
        wiping = true;
        lastX = event.clientX;
        lastY = event.clientY;
        wipe.setPointerCapture(event.pointerId);
        event.preventDefault();
      });
      wipe.addEventListener('pointermove', function (event) {
        if (!wiping) return;
        var distance = Math.hypot(event.clientX - lastX, event.clientY - lastY);
        lastX = event.clientX;
        lastY = event.clientY;
        wipeProgress = updateInspectTask(wipeProgress + distance * 0.85);
        if (wipeProgress >= 100) completeInspectTask();
        event.preventDefault();
      });
      wipe.addEventListener('pointerup', function () { wiping = false; });
      wipe.addEventListener('pointercancel', function () { wiping = false; });
    }
    var slider = document.getElementById('inspectSlider');
    if (slider) slider.addEventListener('input', function () {
      var progress = updateInspectTask(Number(slider.value));
      if (progress >= 96) completeInspectTask();
    });
    var hold = document.getElementById('inspectHold');
    if (hold) {
      var holdFrame = 0;
      var holdStarted = 0;
      var holding = false;
      function stopHold(reset) {
        holding = false;
        if (holdFrame) cancelAnimationFrame(holdFrame);
        holdFrame = 0;
        if (reset) updateInspectTask(0);
      }
      function advanceHold(time) {
        if (!holding) return;
        var progress = updateInspectTask((time - holdStarted) / 12);
        if (progress >= 100) {
          stopHold(false);
          completeInspectTask();
          return;
        }
        holdFrame = requestAnimationFrame(advanceHold);
      }
      hold.addEventListener('pointerdown', function (event) {
        holding = true;
        holdStarted = performance.now();
        hold.setPointerCapture(event.pointerId);
        holdFrame = requestAnimationFrame(advanceHold);
        event.preventDefault();
      });
      hold.addEventListener('pointerup', function () { stopHold(true); });
      hold.addEventListener('pointercancel', function () { stopHold(true); });
      hold.addEventListener('contextmenu', function (event) { event.preventDefault(); });
    }
  }

  function bindPuzzle(question) {
    var close = document.getElementById('s1PuzzleClose');
    if (close) close.addEventListener('click', function () { puzzleOpen = false; draw(); });
    if (question === 2) {
      requestAnimationFrame(updateWirePaths);
      document.querySelectorAll('.s1-wire-node.color img').forEach(function (star) {
        star.addEventListener('load', updateWirePaths, { once: true });
      });
      if (!wireResizeBound) {
        window.addEventListener('resize', updateWirePaths);
        wireResizeBound = true;
      }
    }
    var input = document.getElementById('s1CodeInput');
    if (input) input.addEventListener('input', function () {
      codeValue = input.value.replace(/\D/g, '').slice(0, locks[question].length);
      input.value = codeValue;
    });
    document.querySelectorAll('[data-record-code]').forEach(function (button) {
      button.addEventListener('click', function () {
        var code = button.dataset.recordCode;
        var selected = codeValue.split('').filter(Boolean);
        var index = selected.indexOf(code);
        if (index >= 0) selected.splice(index, 1);
        else if (selected.length < 2) selected.push(code);
        else {
          var feedback = document.getElementById('feedback');
          feedback.textContent = '기록은 두 개까지만 선택할 수 있습니다. 선택한 기록을 한 번 더 누르면 해제됩니다.';
          feedback.className = 's1-feedback bad';
          return;
        }
        codeValue = selected.sort().join('');
        draw();
      });
    });
    document.querySelectorAll('[data-wire-role]').forEach(function (button) {
      button.addEventListener('click', function () {
        activeWire = button.dataset.wireRole;
        draw();
      });
      var plug = button.querySelector('.s1-wire-plug');
      if (plug) plug.addEventListener('pointerdown', function (event) {
        beginWireDrag(button.dataset.wireRole, event);
      });
    });
    document.querySelectorAll('[data-wire-color]').forEach(function (button) {
      button.addEventListener('click', function () {
        if (!activeWire) activeWire = ['R1', 'R2', 'R3', 'R4'].find(function (role) { return !wireMapping[role]; }) || 'R1';
        connectWire(activeWire, button.dataset.wireColor);
      });
    });
    var reset = document.getElementById('s1WireReset');
    if (reset) reset.addEventListener('click', function () {
      wireMapping = {};
      activeWire = 'R1';
      draw();
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
    }, 6000);
  }

  function render(options) {
    context = options;
    var nextIdentity = options.state.session.code + ':' + options.state.player.team + ':' + options.state.player.role + ':' + (options.state.session.startedAt || 'waiting');
    if (identity !== nextIdentity) {
      identity = nextIdentity;
      restoreLocal();
      codeValue = '';
      activeWire = 'R1';
      wireMapping = {};
      nextGuideOpen = false;
      inspect = null;
      puzzleOpen = false;
      lastQuestion = 0;
      endingStep = 0;
      endingIdentity = '';
    }
    var question = currentQuestion();
    if (lastQuestion && question !== lastQuestion) {
      inspect = null;
      puzzleOpen = false;
      codeValue = '';
      activeWire = question === 2 ? 'R1' : null;
      wireMapping = {};
      nextGuideOpen = false;
      banner = question === 2 ? '비상 전력 복구' : '관측 자료 복원 · 검증 기록 4개 전송';
    }
    lastQuestion = question;
    draw();
  }

  function renderEnding(game, onContinue) {
    if (endingIdentity !== identity) {
      endingIdentity = identity;
      endingStep = 0;
    }
    var endingLines = [
      ['시스템', '관측 기록 검증 완료.'],
      ['시스템', '중앙 통로 잠금 해제.'],
      ['루멘', '손상되었던 수정 시각을 복원했습니다.'],
      ['시스템', '기록 변경 시각 · 사고 발생 17분 전'],
      ['대원', '사고가 발생하기 전에 기록이 변경됐다.'],
      ['루멘', '그렇습니다.'],
      ['대원', '그럼 단순한 사고로 생긴 오류가 아니군.'],
      ['루멘', '…현재 자료는 그 가능성을 지지합니다.'],
      ['미확인 음성', '…들린다면…'],
      ['미확인 음성', '…관측 기록을…'],
      ['미확인 음성', '관측 기록을 믿지 마.'],
      ['시스템', '송신 위치 · 2번 구획'],
      ['루멘', '2번 구획으로 이동할 수 있습니다.'],
      ['루멘', '…주의하십시오.'],
    ];
    var line = endingLines[Math.min(endingStep, endingLines.length - 1)];
    game.innerHTML = '<div class="s1-shell"><div class="s1-room opened"><div class="s1-ending"><div class="s1-ending-card"><small>OBSERVATION ROOM 01 · COMPLETE</small><h2>전력 복구 · 중앙 통로 개방</h2><p>사고 발생 전 기록 변경 흔적이 확인되었습니다.</p></div>' + dialogueMarkup(line, 's1EndingDialogue') + '</div></div></div>';
    document.getElementById('s1EndingDialogue').addEventListener('click', function () {
      if (endingStep < endingLines.length - 1) {
        endingStep += 1;
        renderEnding(game, onContinue);
      } else {
        onContinue();
      }
    });
  }

  window.StarEscapeScene01 = { render: render, renderEnding: renderEnding };
})();
