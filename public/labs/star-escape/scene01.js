(function () {
  'use strict';

  var ROOT = '/labs/star-escape/assets/scene01/';
  var context = null;
  var identity = '';
  var visited = new Set();
  var inspect = null;
  var puzzleOpen = false;
  var activeRole = 1;
  var selected = '';
  var activeRecord = 'R1';
  var mapping = {};
  var chosen = [];
  var introStep = 0;
  var banner = '';
  var lastQuestion = 0;

  var roleNames = ['항성 분석관', '성운 관측관', '성단 기록관', '항법 통신관'];
  var intro = [
    ['루멘', '…비상 전력 전환. 대원 여러분, 응답할 수 있습니까?'],
    ['대원', '상황 보고.'],
    ['루멘', '주 전력 차단. 귀환 절차도 중단되었습니다.'],
    ['루멘', '현재 위치는 관측실. 중앙 통로는 자동 봉쇄 상태입니다.'],
    ['대원', '문을 열 방법은?'],
    ['루멘', '먼저 관측 시스템을 복구해야 합니다.'],
    ['루멘', '…잠깐. 사고 직전 관측 기록들이 서로 맞지 않습니다.'],
    ['루멘', '방 안에 남아 있는 기록을 확인해 주세요.'],
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

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }

  function storageKey(suffix) {
    return 'scilab-star-escape-scene01:' + identity + ':' + suffix;
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

  function requiredIds(question) {
    if (question === 1) return ['torn', 'terminal'];
    if (question === 2) return ['storage', 'monitor'];
    return ['navigation'];
  }

  function requirementsMet(question) {
    return requiredIds(question).every(function (id) { return visited.has('q' + question + ':' + id); });
  }

  function isRequired(objectId, question) {
    return requiredIds(question).indexOf(objectId) >= 0;
  }

  function availableRoles() {
    var occupied = new Set((context.state.members || []).map(function (member) { return member.role; }));
    return [1, 2, 3, 4].filter(function (role) {
      return role === context.state.player.role || !occupied.has(role);
    });
  }

  function objectText(id, question) {
    var powered = question > 1;
    var texts = {
      window: powered ? '푸른빛, 흰빛, 노란빛, 붉은빛이 눈에 들어온다. 별의 색이 관측 기록을 확인할 단서일지도 모른다.' : '창밖으로 색이 서로 다른 별들이 보인다.',
      monitor: question === 1 ? '전원이 부족하다. 일부 영상만 흔들리며 나타난다.' : question === 2 ? '네 개의 별 영상이 나타났지만 기록 번호가 지워져 있다.' : '관측 데이터가 정상적으로 복원되어 있다.',
      terminal: question === 1 ? (visited.has('q1:torn') ? '기록 네 개가 분산되어 있다. 각 대원의 화면을 비교하면 오류 기록을 검증할 수 있다.' : '기록 네 개가 분산되어 있다. 오류 위치를 알려 줄 다른 기록이 필요하다.') : '검증 완료 기록이 표시되어 있다.',
      door: question < 3 ? '중앙 통로는 잠겨 있다. 관측 시스템 검증이 끝나야 열린다.' : '잠금 해제 신호를 기다리고 있다.',
      communicator: question < 3 ? '잡음뿐이다. 외부 통신은 끊긴 것 같다.' : '잡음 사이에서 일정한 신호가 반복된다.',
      navigation: question < 3 ? '화면이 꺼져 있다. 비상 표시등만 깜빡인다.' : '관측 데이터 확인 완료. 정상 기록 두 개를 골라 최종 검증해야 한다.',
      storage: question === 1 ? '잠겨 있다. 전자 잠금장치에는 전력이 들어오지 않는다.' : '잠금이 풀렸다. 안에 손상된 관측 자료와 네 조각의 메모가 있다.',
      tools: powered ? '직접 뜯어볼 문제는 아닌 것 같다.' : '렌치와 드라이버가 정리되어 있다. 장치 자체가 부서진 건 아닌 것 같다.',
      trash: '빈 우주식량 포장지다. 지금은 쓸모가 없어 보인다.',
      warning: powered ? '붉은빛이 주황빛으로 바뀌었다. 보조 전력이 안정됐다.' : '붉은 등이 반복해서 깜빡인다. 보조 전력만 작동 중이다.',
      torn: question === 1 ? '‘관측 기록 중 1건 불일치’라는 글자가 보인다. 수정 시각 부분은 찢겨 나갔다.' : '오류 기록은 확인했다. 하지만 수정 시각 부분은 아직 읽을 수 없다.',
    };
    return texts[id] || '특별한 점은 보이지 않는다.';
  }

  function inspectObject(id) {
    var question = currentQuestion();
    visited.add('q' + question + ':' + id);
    saveVisited();
    var target = objects.find(function (item) { return item.id === id; });
    inspect = {
      id: id,
      name: target ? target.name : '조사 대상',
      text: objectText(id, question),
      action: requirementsMet(question) && isRequired(id, question),
    };
    if (question === 3 && id === 'navigation') {
      inspect = null;
      puzzleOpen = true;
    }
    draw();
  }

  function roomState(question) {
    return question === 1 ? 'damaged' : 'restored';
  }

  function objective(question) {
    if (question === 1) return '관측실을 조사하고 <b>불일치 기록</b>을 찾으세요.';
    if (question === 2) return '열린 수납함과 관측 화면에서 <b>기록을 복원</b>하세요.';
    return '항법장치에서 <b>신뢰할 기록 두 개</b>를 검증하세요.';
  }

  function roomMarkup(question) {
    var hotspots = objects.map(function (item) {
      var key = 'q' + question + ':' + item.id;
      var classes = ['s1-hotspot'];
      if (visited.has(key)) classes.push('visited');
      if (isRequired(item.id, question) && !visited.has(key)) classes.push('required');
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
    return '<section class="s1-inspect">' +
      '<img src="' + image(objectImages[inspect.id] || 'characters/ui_lumen_ai_icon.webp') + '" alt="">' +
      '<div><small>INVESTIGATION</small><b>' + esc(inspect.name) + '</b><p>' + esc(inspect.text) + '</p>' +
      (inspect.action ? '<button class="primary s1-inspect-action" id="inspectAction">' + (currentQuestion() === 1 ? '기록 검증 시작' : '기록 복원 시작') + '</button>' : '') + '</div>' +
      '<button id="inspectClose" aria-label="닫기">×</button></section>';
  }

  function roleTabs() {
    var roles = availableRoles();
    if (roles.indexOf(activeRole) < 0) activeRole = context.state.player.role;
    return '<div class="s1-role-tabs">' + roles.map(function (role) {
      return '<button data-role="' + role + '" class="' + (role === activeRole ? 'on' : '') + '">대원 ' + role + (role === context.state.player.role ? ' · 내 자료' : ' · 빈 역할') + '</button>';
    }).join('') + '</div>';
  }

  function intelMarkup(question) {
    var clues = {
      1: [
        ['센서 A · 푸른색', '기록 A: A의 표면 온도 < B의 표면 온도', 'stars/star_observation_blue.webp'],
        ['센서 B · 흰색', '기록 B: B의 표면 온도 > C의 표면 온도', 'stars/star_observation_white.webp'],
        ['센서 C · 노란색', '기록 C: C의 표면 온도 > D의 표면 온도', 'stars/star_observation_yellow.webp'],
        ['센서 D · 붉은색', '기록 D: D의 표면 온도 < A의 표면 온도', 'stars/star_observation_red.webp'],
      ],
      2: [
        ['메모 조각 1', 'R1의 별은 R3보다 표면 온도가 높다.', 'memos/memo_fragment_01.webp'],
        ['메모 조각 2', 'R2는 네 별 중 표면 온도가 가장 높은 별이 아니다.', 'memos/memo_fragment_02.webp'],
        ['메모 조각 3', 'R4의 별은 R2보다 표면 온도가 낮다.', 'memos/memo_fragment_03.webp'],
        ['메모 조각 4', 'R3은 노란색 별이다.', 'memos/memo_fragment_04.webp'],
      ],
      3: [
        ['C1 추가 정보', 'C1의 별은 푸른색이다.', 'stars/star_observation_blue.webp'],
        ['C2 추가 정보', 'C2의 별은 붉은색이다.', 'stars/star_observation_red.webp'],
        ['C3 추가 정보', 'C3의 별은 노란색이다.', 'stars/star_observation_yellow.webp'],
        ['C4 추가 정보', 'C4의 별은 흰색이다.', 'stars/star_observation_white.webp'],
      ],
    };
    var item = clues[question][activeRole - 1];
    return '<div class="s1-intel"><img src="' + image(item[2]) + '" alt=""><div><small>대원 ' + activeRole + ' 전용 단서 · ' + esc(roleNames[activeRole - 1]) + '</small><b>' + esc(item[0]) + '</b><p>' + esc(item[1]) + '</p></div></div>';
  }

  function puzzleMarkup(question) {
    var titles = ['관측 기록 불일치', '손상된 관측 기록 복원', '최종 기록 검증'];
    var prompts = [
      '각 대원의 별 색과 비교 기록을 공유하세요. 과학적으로 맞지 않는 기록 하나를 선택합니다.',
      '네 대원의 메모를 모두 비교하여 R1~R4를 알맞은 별 영상에 연결하세요.',
      '틀린 정보와 판단할 정보가 부족한 것은 다릅니다. 신뢰할 수 있는 기록 두 개를 선택하세요.',
    ];
    return '<section class="s1-puzzle"><header class="s1-puzzle-head"><div><small>SCENE 01 · VERIFICATION ' + question + '/3</small><h2>' + titles[question - 1] + '</h2></div><button class="s1-close" id="s1PuzzleClose" aria-label="닫기">×</button></header>' +
      '<div class="s1-puzzle-body"><p class="s1-prompt">' + prompts[question - 1] + '</p>' + roleTabs() + intelMarkup(question) + activityMarkup(question) + '<div class="s1-hintbox" id="hintbox"></div></div>' +
      '<footer class="s1-footer"><p class="s1-feedback" id="feedback">오답 감점은 없습니다. 한 명이 제출하면 모둠 전체에 반영됩니다.</p><button class="secondary" id="hintBtn">힌트 · ' + Math.min(context.state.progress.hintCount, 3) + '/3 무료</button><button class="primary" id="s1Submit">검증 요청</button></footer></section>';
  }

  function activityMarkup(question) {
    if (question === 1) {
      var records = [
        ['A', 'A의 표면 온도 < B의 표면 온도'],
        ['B', 'B의 표면 온도 > C의 표면 온도'],
        ['C', 'C의 표면 온도 > D의 표면 온도'],
        ['D', 'D의 표면 온도 < A의 표면 온도'],
      ];
      return '<div class="s1-records">' + records.map(function (record) {
        return '<button class="s1-record ' + (selected === record[0] ? 'selected' : '') + '" data-select-record="' + record[0] + '"><strong>기록 ' + record[0] + '</strong><span>' + record[1] + '</span></button>';
      }).join('') + '</div>';
    }
    if (question === 2) {
      var stars = [
        ['B', '푸른색', 'star_observation_blue.webp'],
        ['W', '흰색', 'star_observation_white.webp'],
        ['Y', '노란색', 'star_observation_yellow.webp'],
        ['R', '붉은색', 'star_observation_red.webp'],
      ];
      return '<div class="s1-record-bank">' + [1, 2, 3, 4].map(function (n) {
        var record = 'R' + n;
        return '<button data-map-record="' + record + '" class="' + (activeRecord === record ? 'on' : '') + '">' + record + '</button>';
      }).join('') + '</div><div class="s1-stars">' + stars.map(function (star) {
        var assigned = Object.keys(mapping).find(function (record) { return mapping[record] === star[0]; });
        return '<button class="s1-star-card ' + (mapping[activeRecord] === star[0] ? 'pick' : '') + '" data-star="' + star[0] + '"><img src="' + image('stars/' + star[2]) + '" alt="' + star[1] + ' 별"><b>' + star[1] + '</b>' + (assigned ? '<span class="assigned">' + assigned + '</span>' : '') + '</button>';
      }).join('') + '</div>';
    }
    var cards = [
      ['C1', '네 표본 중 표면 온도가 가장 높음'],
      ['C2', '표면 온도가 C1보다 높음'],
      ['C3', '표면 온도 데이터 없음 · 관측 시각 02:16'],
      ['C4', '표면 온도가 C3보다 높음'],
    ];
    return '<div class="s1-records">' + cards.map(function (card) {
      return '<button class="s1-record ' + (chosen.indexOf(card[0]) >= 0 ? 'selected' : '') + '" data-trust="' + card[0] + '"><strong>' + card[0] + '</strong><span>' + card[1] + '</span></button>';
    }).join('') + '</div>';
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
    var inspectAction = document.getElementById('inspectAction');
    if (inspectAction) inspectAction.addEventListener('click', function () { inspect = null; puzzleOpen = true; draw(); });
  }

  function bindPuzzle(question) {
    var close = document.getElementById('s1PuzzleClose');
    if (!close) return;
    close.addEventListener('click', function () { puzzleOpen = false; draw(); });
    document.querySelectorAll('[data-role]').forEach(function (button) {
      button.addEventListener('click', function () { activeRole = Number(button.dataset.role); draw(); });
    });
    document.querySelectorAll('[data-select-record]').forEach(function (button) {
      button.addEventListener('click', function () { selected = button.dataset.selectRecord; draw(); });
    });
    document.querySelectorAll('[data-map-record]').forEach(function (button) {
      button.addEventListener('click', function () { activeRecord = button.dataset.mapRecord; draw(); });
    });
    document.querySelectorAll('[data-star]').forEach(function (button) {
      button.addEventListener('click', function () {
        Object.keys(mapping).forEach(function (record) { if (mapping[record] === button.dataset.star) delete mapping[record]; });
        mapping[activeRecord] = button.dataset.star;
        var nextEmpty = ['R1', 'R2', 'R3', 'R4'].find(function (record) { return !mapping[record]; });
        if (nextEmpty) activeRecord = nextEmpty;
        draw();
      });
    });
    document.querySelectorAll('[data-trust]').forEach(function (button) {
      button.addEventListener('click', function () {
        var value = button.dataset.trust;
        var index = chosen.indexOf(value);
        if (index >= 0) chosen.splice(index, 1);
        else if (chosen.length < 2) chosen.push(value);
        draw();
      });
    });
    var hint = document.getElementById('hintBtn');
    if (hint) hint.addEventListener('click', context.hint);
    document.getElementById('s1Submit').addEventListener('click', async function () {
      var answer = '';
      if (question === 1) answer = selected;
      if (question === 2) answer = ['R1', 'R2', 'R3', 'R4'].map(function (record) { return mapping[record] || ''; }).join('');
      if (question === 3) answer = chosen.slice().sort().join('');
      var feedback = document.getElementById('feedback');
      if (!answer || (question === 2 && answer.length !== 4) || (question === 3 && chosen.length !== 2)) {
        feedback.textContent = question === 2 ? 'R1~R4를 모두 연결하세요.' : question === 3 ? '검증할 기록 두 개를 선택하세요.' : '오류로 판단한 기록을 선택하세요.';
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
      activeRole = options.state.player.role;
      lastQuestion = 0;
    }
    var question = currentQuestion();
    if (lastQuestion && question !== lastQuestion) {
      inspect = null;
      puzzleOpen = false;
      selected = '';
      activeRecord = 'R1';
      mapping = {};
      chosen = [];
      banner = question === 2 ? '오류 기록 제외 · 보조 전력 복구 · 수납함 잠금 해제' : '관측 기록 복구 완료 · 항법장치 활성화';
    }
    lastQuestion = question;
    draw();
  }

  function renderEnding(game, onContinue) {
    game.innerHTML = '<div class="s1-shell"><div class="s1-room opened"><div class="s1-ending"><div class="s1-ending-card"><small>OBSERVATION ROOM 01 · COMPLETE</small><h2>중앙 통로 잠금 해제</h2><p>루멘이 삭제된 기록의 수정 시각을 복구했습니다.</p><div class="signal">기록 변경 · 사고 발생 17분 전<br><br>치직— “관측 기록을 믿지 마.”</div><p>송신자 식별 불가. 신호는 2번 구획에서 발생했습니다.</p><button class="primary action" id="s1Continue">2번 구획으로 이동</button></div></div></div></div>';
    document.getElementById('s1Continue').addEventListener('click', onContinue);
  }

  window.StarEscapeScene01 = { render: render, renderEnding: renderEnding };
})();
