const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function sceneClient({ role = 1, solo = false, storage = new Map() } = {}) {
  const nodes = new Map();
  const game = { innerHTML: '' };
  const state = {
    session: { code: 'CLUES', startedAt: '2026-10-21T10:00:00.000Z' },
    player: { team: '1', role },
    progress: { question: 1, hintCount: 0 },
    members: (solo ? [role] : [1, 2, 3, 4]).map(role => ({ role })),
  };
  function markup() { return game.innerHTML + (nodes.get('s1ClueLayer')?.innerHTML || ''); }
  const document = {
    activeElement: null,
    getElementById(id) {
      if (!markup().includes('id="' + id + '"')) return null;
      if (!nodes.has(id)) nodes.set(id, {
        id, innerHTML: '', value: '', dataset: {}, attributes: {}, listeners: {},
        addEventListener(type, handler) { this.listeners[type] = handler; },
        setAttribute(key, value) { this.attributes[key] = value; },
        focus() { document.activeElement = this; },
        querySelectorAll() { return []; },
      });
      return nodes.get(id);
    },
    querySelectorAll(selector) {
      if (selector !== '[data-s1-clue-step]') return [];
      return [...markup().matchAll(/id="(s1ClueStep([1-3]))"/g)].map(match => {
        const node = document.getElementById(match[1]);
        node.dataset.s1ClueStep = match[2];
        return node;
      });
    },
    querySelector() { return null; },
  };
  const sandbox = {
    window: { addEventListener() {} }, document, console,
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
    setTimeout() {}, requestAnimationFrame() {},
  };
  let source = fs.readFileSync(path.join(__dirname, '../public/labs/star-escape/scene01.js'), 'utf8');
  source = source.replace('window.StarEscapeScene01 =', 'window.investigate = inspectObject; window.finishInvestigation = completeInspectTask; window.StarEscapeScene01 =');
  vm.runInNewContext(source, sandbox);
  const context = { state, game, submit() {}, hint() {}, toast() {} };
  function render() { sandbox.window.StarEscapeScene01.render(context); }
  render();
  function openPuzzle() { sandbox.window.investigate({ 1: 'terminal', 2: 'storage', 3: 'navigation' }[state.progress.question]); }
  function openClues() { document.getElementById('s1ClueTab').onclick(); return nodes.get('s1ClueLayer').innerHTML; }
  function closeClues() { document.getElementById('s1ClueClose').onclick(); }
  return { state, game, nodes, storage, document, render, openPuzzle, openClues, closeClues, investigate: sandbox.window.investigate, finish: sandbox.window.finishInvestigation };
}

test('scene 1 saves only completed clues, restores them after reload, and protects teammates clues', () => {
  const c = sceneClient({ role: 2 });
  c.investigate('monitor');
  c.openPuzzle();
  assert.doesNotMatch(c.openClues(), /복구 숫자 2|관측 표본 A|복구 숫자는 5/);
  c.closeClues();
  c.investigate('monitor');
  c.finish();
  c.openPuzzle();
  assert.match(c.openClues(), /복구 숫자 2/);
  assert.doesNotMatch(c.nodes.get('s1ClueLayer').innerHTML, /대원 R1|대원 R3|대원 R4/);
  const reloaded = sceneClient({ role: 2, storage: c.storage });
  reloaded.openPuzzle();
  assert.match(reloaded.openClues(), /복구 숫자 2/);
});

test('scene 1 clue overlay preserves the actual answer field and hint, and earlier clues stay accessible', () => {
  const c = sceneClient({ solo: true });
  c.investigate('window');
  c.investigate('communicator');
  c.openPuzzle();
  const input = c.document.getElementById('s1CodeInput');
  input.value = '52'; input.listeners.input();
  const hint = c.document.getElementById('hintbox'); hint.innerHTML = '진행 중인 힌트';
  const puzzleMarkup = c.game.innerHTML;
  const clues = c.openClues();
  assert.match(clues, /관측 표본 A/);
  assert.match(clues, /통신기 · 복구 설명서/);
  assert.match(clues, /s1ClueStep2[^>]* disabled/);
  assert.doesNotMatch(clues, /R3의 별은/);
  c.closeClues();
  assert.equal(c.game.innerHTML, puzzleMarkup, 'opening the notebook does not rebuild the underlying puzzle');
  assert.equal(c.document.getElementById('s1CodeInput'), input);
  assert.equal(input.value, '52');
  assert.equal(hint.innerHTML, '진행 중인 힌트');
  c.state.progress.question = 2; c.render(); c.openPuzzle(); c.openClues();
  c.document.getElementById('s1ClueStep1').onclick();
  assert.match(c.nodes.get('s1ClueLayer').innerHTML, /관측 표본 A/);
});

test('scene 1 exposes the four existing verification records only at the final question', () => {
  const c = sceneClient({ solo: true });
  c.openPuzzle();
  assert.doesNotMatch(c.openClues(), /수납함에서 전송된 검증 기록/);
  c.state.progress.question = 3; c.render(); c.openPuzzle();
  const clues = c.openClues();
  assert.equal((clues.match(/수납함에서 전송된 검증 기록/g) || []).length, 4);
  assert.match(clues, /\[대상 기록 손상\]/, 'incomplete evidence remains incomplete');
  c.state.session.startedAt = '2026-10-22T10:00:00.000Z'; c.state.progress.question = 1; c.render(); c.openPuzzle();
  assert.doesNotMatch(c.openClues(), /복구 숫자는 5|수납함에서 전송된 검증 기록/);
});
