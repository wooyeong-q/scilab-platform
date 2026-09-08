const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { harness } = require('./helpers.cjs');
process.env.DATABASE_URL = 'postgres://test:test@localhost/test';
let h;
before(async () => { h = await harness(); });
after(async () => h.close());

test('escape room: R1–R4, teacher start/hints, shared state, 14 puzzles and four scene transitions', async () => {
  const game = h.load('lib/star-escape.ts');
  const { session, teacherKey } = await game.createStarEscapeSession('Isolated regression test');
  const code = session.code, players = [];
  assert.equal(session.durationSeconds, 1800);
  for (let role = 1; role <= 4; role++) {
    const p = await game.joinStarEscapeSession(code, 'Player ' + role, '1', role);
    assert.equal(p.status, 'joined'); assert.equal(p.player.role, role); players.push(p);
  }
  assert.equal((await game.joinStarEscapeSession(code, 'Duplicate role', '1', 1)).status, 'role_taken');
  const p = players[0], args = [code, p.player.id, p.playerKey];
  assert.equal((await game.submitStarEscapeAnswer(...args, 1, 1, '7139')).status, 'waiting');
  assert.equal((await game.controlStarEscapeSession(code, 'bad-key', { action: 'start' })).status, 'unauthorized');
  assert.equal((await game.controlStarEscapeSession(code, teacherKey, { action: 'start' })).status, 'started');
  assert.equal((await game.getStarEscapeState(...args)).members.length, 4);
  assert.equal((await game.submitStarEscapeAnswer(...args, 1, 1, '0000')).status, 'wrong');
  for (let i = 0; i < 4; i++) {
    const hint = await game.requestStarEscapeHint(...args, 1, 1);
    assert.equal(hint.status, 'ok'); assert.ok(hint.hint);
    assert.equal(hint.penaltyAdded, i === 3 ? 30 : 0);
  }
  assert.equal((await game.controlStarEscapeSession(code, teacherKey, { action: 'hint', message: 'Test teacher hint', stage: 1, question: 1 })).status, 'hint_sent');
  assert.equal((await game.getStarEscapeState(code, players[3].player.id, players[3].playerKey)).teacherHints[0].message, 'Test teacher hint');
  const answers = [['7139', '4826', '14'], ['A', '6측12', 'ACDB'], ['123456', 'A', 'C', 'XYZ'], ['반사판뒤', '성운분류완료', '성단분류완료', 'RETURN']];
  for (let stage = 1; stage <= 4; stage++) {
    for (let question = 1; question <= answers[stage - 1].length; question++) {
      if (stage === 3 && question === 1) {
        const scene = { p1Slots: ['1','','','','',''], p4Slots: ['','',''], p3Positions: { A: 50, B: 50, C: 50, D: 50 } };
        assert.equal((await game.updateStarEscapeSceneState(...args, 3, 1, scene)).status, 'ok');
        const other = await game.getStarEscapeState(code, players[1].player.id, players[1].playerKey);
        assert.deepEqual(other.progress.sceneState.p1Slots, scene.p1Slots);
      }
      const result = await game.submitStarEscapeAnswer(...args, stage, question, answers[stage - 1][question - 1]);
      assert.equal(result.status, 'correct', `${stage}-${question}`);
      assert.equal(result.sceneCompleted, question === answers[stage - 1].length);
      const synced = await game.getStarEscapeState(code, players[2].player.id, players[2].playerKey);
      assert.equal(synced.progress.stage, result.stage);
      assert.equal(synced.progress.question, result.question);
    }
  }
  const final = await game.getStarEscapeState(...args);
  assert.equal(final.progress.stage, 5); assert.ok(final.progress.completedAt);
  const teacher = await game.getStarEscapeTeacherState(code, teacherKey);
  assert.equal(teacher.players, 4); assert.ok(teacher.questionStats.length >= 14);
  assert.equal((await game.submitStarEscapeAnswer(...args, 4, 4, 'RETURN')).status, 'stale');
});

test('escape room: expired timer still prevents answers', async () => {
  const game = h.load('lib/star-escape.ts');
  const { session } = await game.createStarEscapeSession('Isolated timer test');
  const p = await game.joinStarEscapeSession(session.code, 'Timer player', '1', 1);
  await h.pg.query("UPDATE star_escape_sessions SET started_at=NOW()-INTERVAL '31 minutes' WHERE id=$1", [session.id]);
  assert.equal((await game.submitStarEscapeAnswer(session.code, p.player.id, p.playerKey, 1, 1, '7139')).status, 'expired');
});

test('galaxy classroom: 30 joins, observation/classification scoring and live scoreboard', async () => {
  const game = h.load('lib/galaxy-voyage.ts');
  const { session } = await game.createGalaxySession('Isolated 30 student test');
  const players = await Promise.all(Array.from({ length: 30 }, (_, i) => game.joinGalaxySession(session.code, 'Student ' + i)));
  assert.ok(players.every(p => p.status === 'joined'));
  const p = players[0], args = [session.code, p.player.id, p.playerKey];
  assert.equal((await game.applyGalaxyScoreEvent(...args, 'observation', 'm42')).score, 10);
  assert.equal((await game.applyGalaxyScoreEvent(...args, 'observation', 'm42')).status, 'duplicate');
  assert.equal((await game.applyGalaxyScoreEvent(...args, 'classification_correct', 'm42')).score, 110);
  assert.equal((await game.applyGalaxyScoreEvent(...args, 'classification_wrong', 'm45')).score, 90);
  const boards = await Promise.all(players.map(p => game.getGalaxyScoreboard(session.code, p.player.id, p.playerKey, new Date(0).toISOString())));
  assert.equal(boards[0].self.score, 90);
  assert.ok(boards.every(board => board.leaders.length === 10));
  assert.equal((await h.pg.query('SELECT count(*)::int AS n FROM galaxy_voyage_players WHERE session_id=$1', [session.id])).rows[0].n, 30);
});

test('earthquake/volcano classroom: lesson code, points and deletion authorization', async () => {
  const game = h.load('lib/earthquake-volcano.ts');
  const { session, teacherKey } = await game.createMapSession('Isolated map test');
  const point = await game.addMapPoint(session.code, { group: '1', type: '지진', name: 'Test point', lat: 35.1, lng: 139.2 });
  assert.equal(point.status, 'created');
  assert.equal((await game.listMapPoints(session.code)).points.length, 1);
  assert.equal(await game.verifyTeacher(session.code, teacherKey), true);
  assert.equal(await game.deleteMapPoint(session.code, point.point.id, 'bad-key'), false);
  assert.equal(await game.deleteMapPoint(session.code, point.point.id, point.deleteKey), true);
});
