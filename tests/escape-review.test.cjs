const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { harness, root } = require('./helpers.cjs');
process.env.DATABASE_URL = 'postgres://test:test@localhost/test';
let h, game;
before(async () => { h = await harness(); game = h.load('lib/star-escape.ts'); });
after(async () => h.close());

const html = fs.readFileSync(`${root}/public/labs/star-escape/index.html`, 'utf8');
function client(api, initial, refresh = async () => {}) {
  const sandbox = {
    state: initial, auth: { code: 'REVIEW' }, API: '/api/labs/star-escape/sessions',
    soloMode: false, headers: () => ({}), api, loadPlayer: refresh,
    renderGame() {}, renderPlayer() {}, toast() {}, Soundscape: null, $: () => null,
    setTimeout: () => 0,
  };
  vm.createContext(sandbox);
  vm.runInContext(html.slice(html.indexOf('var sceneSaveQueue='), html.indexOf('async function getHint()')), sandbox);
  vm.runInContext(fs.readFileSync(`${root}/public/labs/star-escape/progress.js`, 'utf8'), vm.createContext({ window: sandbox }));
  return sandbox;
}

test('failed scene save does not poison later answer submissions', async () => {
  const calls = [];
  const c = client(async (url, options) => {
    calls.push(options.method);
    if (options.method === 'PATCH') throw new Error('connection interrupted');
    return { status: 'correct', stage: 3, question: 2 };
  }, { progress: { stage: 3, question: 1, sceneState: {} }, player: { nickname: 'Tester' } });
  await assert.rejects(c.syncSceneState({ p1Slots: ['1'] }, {}));
  assert.equal((await c.submit('654321')).status, 'correct');
  assert.deepEqual(calls, ['PATCH', 'POST']);
});

test('double-clicked answer stays on the same question and sends only once', async () => {
  let resolve, calls = 0;
  const c = client(() => { calls++; return new Promise(r => { resolve = r; }); },
    { progress: { stage: 3, question: 1, sceneState: {} }, player: { nickname: 'Tester' } });
  const first = c.submit('654321');
  await Promise.resolve();
  assert.equal((await c.submit('654321')).status, 'busy');
  resolve({ status: 'correct', stage: 3, question: 2 });
  await first;
  assert.equal(calls, 1);
});

test('saved scene-four completion survives lost answer request and explicit retry after reconnect', async () => {
  const { session, teacherKey } = await game.createStarEscapeSession('Recovery review');
  const p = await game.joinStarEscapeSession(session.code, 'Tester', '1', 1);
  await game.controlStarEscapeSession(session.code, teacherKey, { action: 'start' });
  await h.pg.query('UPDATE star_escape_team_progress SET stage=4,question_no=1 WHERE session_id=$1', [session.id]);
  const args = [session.code, p.player.id, p.playerKey];
  const saved = await game.updateStarEscapeSceneState(...args, 4, 1, { patternA: true, filmB: true, overlayComplete: true,
    nebulaSlots: ['', '', ''], clusterSlots: ['', ''], finalSlots: ['', '', '', '', ''] });
  assert.equal(saved.status, 'ok');
  let fail = true, requests = 0, c;
  c = client(async (_url, options) => {
    requests++;
    if (fail) throw new Error('answer connection interrupted');
    const body = JSON.parse(options.body);
    return game.submitStarEscapeAnswer(...args, body.stage, body.question, body.answer);
  }, await game.getStarEscapeState(...args), async () => { c.state = await game.getStarEscapeState(...args); });
  const pending = () => c.StarEscapeProgress.pendingAnswer(c.state.progress);
  assert.equal(pending(), '반사판뒤');
  assert.equal((await c.submit(pending())).status, 'error');
  c.state = await game.getStarEscapeState(...args); // Refresh/rejoin keeps the saved milestone.
  assert.equal(pending(), '반사판뒤');
  fail = false;
  assert.equal((await c.submit(pending())).status, 'correct');
  assert.equal(c.state.progress.question, 2);
  assert.equal(pending(), '');
  assert.equal(requests, 2, 'no background mutation retries');
  const attempts = await h.pg.query('SELECT * FROM star_escape_attempts WHERE session_id=$1', [session.id]);
  assert.equal(attempts.rows.length, 1);
});

test('recovery is offered only for completed current puzzles, never skips recordings or endings', () => {
  const c = client(() => {}, {});
  const answer = c.StarEscapeProgress.pendingAnswer;
  for (const [stage, question, field, expected] of [
    [3, 1, 'p1Complete', '654321'], [3, 2, 'q2Complete', 'A'], [3, 3, 'q3Complete', 'C'],
    [4, 1, 'overlayComplete', '반사판뒤'], [4, 2, 'nebulaComplete', '성운분류완료'], [4, 3, 'lockerOpen', '성단분류완료'],
  ]) {
    assert.equal(answer({ stage, question, sceneState: { [field]: true } }), expected);
    assert.equal(answer({ stage, question, sceneState: { [field]: false } }), '');
    assert.equal(answer({ stage, question: question + 1, sceneState: { [field]: true } }), '');
  }
  for (const stage of [3, 4, 5]) assert.equal(answer({ stage, question: 4, sceneState: { recordingComplete: true, cctvComplete: true, exitOpen: true } }), '');
});

test('completed magnitude view shows the same six tiles without interactive slots', () => {
  let source = fs.readFileSync(`${root}/public/labs/star-escape/scene03.js`, 'utf8');
  source = source.replace('window.StarEscapeScene03 =', 'window.device = magnitudeDevice; window.StarEscapeScene03 =');
  const sandbox = { window: {} }; vm.runInNewContext(source, sandbox);
  const markup = sandbox.window.device({ p1Slots: ['1', '2', '3', '4', '5', '6'] }, true);
  assert.equal((markup.match(/class="s3-p1-slot filled"/g) || []).length, 6);
  assert.equal((markup.match(/등급"/g) || []).length, 6);
  assert.doesNotMatch(markup, /data-s3-draggable|data-s3-drop|<button/);
});
