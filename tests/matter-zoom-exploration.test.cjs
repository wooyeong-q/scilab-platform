const {test} = require('node:test');
const assert = require('node:assert/strict');
const explorerPath = '../public/labs/matter-zoom/exploration.mjs';

test('matter explorer: fresh workspace has no quiz completion or navigation gates', async () => {
  const {freshExplorer} = await import(explorerPath);
  const first = freshExplorer();
  assert.equal(first.version, 4);
  assert.equal(first.mode, 'middle');
  assert.equal(first.material, null);
  assert.equal(first.drawer, '');
  for (const key of ['chapter', 'unlocked', 'answers', 'mission', 'done', 'identityConfirmed']) {
    assert.equal(Object.hasOwn(first, key), false);
  }
  first.visited.push('water');
  first.shells[0] = 1;
  assert.deepEqual(freshExplorer().visited, []);
  assert.deepEqual(freshExplorer().shells, [0, 0, 0, 0]);
  assert.equal(freshExplorer('high').mode, 'high');
  assert.equal(freshExplorer('<script>').mode, 'middle');
});

test('matter explorer: old observations migrate without mandatory answers or completion state', async () => {
  const {freshExplorer, restoreExplorer} = await import(explorerPath);
  for (const version of [2, 3]) {
    const saved = {
      version, mode: 'middle', material: 'water', z: 8, selected: 22, level: 4, deepest: 5,
      visited: ['water', 'hydrogen', 'water'], seen: ['8:p', '8:e'],
      records: ['water', 'structure', 'particles', 'compare', 'number', 'final'],
      shellZ: 12, shells: [2, 8, 1, 0], shellDone: [8, 12], tableSeen: [1, 8],
      chapter: 5, unlocked: 5, conceptAnswers: {water: {atoms: '3', types: '2'}},
      identityConfirmed: true, done: true, mission: {element: '9'},
    };
    const result = restoreExplorer(JSON.stringify(saved));
    assert.equal(result.version, 4);
    assert.equal(result.upgraded, true);
    assert.equal(result.material, 'water');
    assert.equal(result.z, 8);
    assert.equal(result.selected, 22);
    assert.equal(result.level, 4);
    assert.equal(result.deepest, 5);
    assert.deepEqual(result.visited, ['water', 'hydrogen']);
    assert.deepEqual(result.seen, ['8:p', '8:e']);
    assert.deepEqual(result.records, ['water', 'structure', 'particles', 'compare', 'number']);
    assert.deepEqual(result.shells, [2, 8, 1, 0]);
    assert.deepEqual(result.shellDone, [8, 12]);
    for (const key of ['chapter', 'unlocked', 'conceptAnswers', 'identityConfirmed', 'done', 'mission']) {
      assert.equal(Object.hasOwn(result, key), false);
    }
    assert.deepEqual(restoreExplorer(JSON.stringify(saved), 'high'), freshExplorer('high'));
  }
});

test('matter explorer: restores only safe fields and allowed observation values', async () => {
  const {freshExplorer, restoreExplorer} = await import(explorerPath);
  const saved = {
    ...freshExplorer(), material: 'water', z: 79, selected: 99, level: 4, deepest: 2,
    visited: ['water', '<svg>', 'gold', 'water'], seen: ['8:p', '<img>', '1:e', '8:p', '20:p'],
    records: ['water', 'shells', 'final', '__proto__', '<script>', 'water'],
    shellDone: [1, 8, 8, 21, '2'], tableSeen: [20, 1, 20, 79],
    numberZ: '<script>', compareZ: 79, tableZ: 21, drawer: '<img>',
    chargeZ: 17, chargeVariant: 'lost', extra: '<script>', answers: {identity: 'p'},
  };
  const result = restoreExplorer(JSON.stringify(saved));
  assert.equal(result.z, 8);
  assert.equal(result.selected, 0);
  assert.equal(result.deepest, 4);
  assert.deepEqual(result.visited, ['water', 'gold']);
  assert.deepEqual(result.seen, ['8:p', '1:e']);
  assert.deepEqual(result.records, ['water', 'shells']);
  assert.deepEqual(result.shellDone, [1, 8]);
  assert.deepEqual(result.tableSeen, [20, 1]);
  assert.equal(result.numberZ, 8);
  assert.equal(result.compareZ, 79);
  assert.equal(result.tableZ, 8);
  assert.equal(result.drawer, '');
  assert.equal(result.chargeZ, 17);
  assert.equal(result.chargeVariant, 'neutral');
  assert.equal(Object.hasOwn(result, 'extra'), false);
  assert.equal(Object.hasOwn(result, 'answers'), false);
});

test('matter explorer: material selection constrains the atom while retaining field selection', async () => {
  const {freshExplorer, restoreExplorer} = await import(explorerPath);
  const save = fields => JSON.stringify({...freshExplorer(), ...fields});
  assert.equal(restoreExplorer(save({material: 'water', z: 1, selected: 39})).z, 1);
  assert.equal(restoreExplorer(save({material: 'water', z: 1, selected: 39})).selected, 39);
  assert.equal(restoreExplorer(save({material: 'hydrogen', z: 8})).z, 1);
  assert.equal(restoreExplorer(save({material: 'hydrogen', z: 1, numberZ: null})).numberZ, 1);
  assert.equal(restoreExplorer(save({material: 'gold', z: 8})).z, 79);
  const legacyGold = restoreExplorer(save({version: 3, material: 'gold', z: 79, level: 2, deepest: 2}));
  assert.equal(legacyGold.level, 3);
  assert.equal(legacyGold.deepest, 3);
  const arrayGold = restoreExplorer(save({material: 'gold', z: 79, level: 1, deepest: 2}));
  assert.equal(arrayGold.level, 1);
  assert.equal(arrayGold.deepest, 3);
  const invalid = restoreExplorer(save({material: '__proto__', level: 5, deepest: 5, z: 79, selected: 22}));
  assert.equal(invalid.material, null);
  assert.equal(invalid.level, 0);
  assert.equal(invalid.deepest, 0);
  assert.equal(invalid.z, 8);
  assert.equal(invalid.selected, 0);
});

test('matter explorer: validates shell caps, inner-shell filling, and available electron count', async () => {
  const {freshExplorer, restoreExplorer} = await import(explorerPath);
  const save = (shellZ, shells) => JSON.stringify({...freshExplorer(), shellZ, shells});
  assert.deepEqual(restoreExplorer(save(20, [2, 8, 8, 2])).shells, [2, 8, 8, 2]);
  assert.deepEqual(restoreExplorer(save(8, [2, 3, 0, 0])).shells, [2, 3, 0, 0]);
  for (const [z, shells] of [[8, [2, 7, 0, 0]], [20, [2, 9, 0, 0]], [8, [1, 1, 0, 0]],
    [20, [2, 8, 7, 1]], [8, [2, -1, 0, 0]], [8, [2, 2.5, 0, 0]], [8, [2, 6]], [8, ['2', 6, 0, 0]]]) {
    assert.deepEqual(restoreExplorer(save(z, shells)).shells, [0, 0, 0, 0]);
  }
});

test('matter explorer: fixed ion views and drawer selections round-trip with separate level saves', async () => {
  const {freshExplorer, restoreExplorer} = await import(explorerPath);
  for (const [chargeZ, chargeVariant] of [[11, 'neutral'], [11, 'lost'], [17, 'neutral'], [17, 'gained']]) {
    const saved = {...freshExplorer('high'), material: 'hydrogen', z: 1, chargeZ, chargeVariant, drawer: 'charge'};
    const restored = restoreExplorer(JSON.stringify(saved), 'high');
    assert.equal(restored.chargeZ, chargeZ);
    assert.equal(restored.chargeVariant, chargeVariant);
    assert.equal(restored.drawer, 'charge');
    assert.deepEqual(restoreExplorer(JSON.stringify(saved), 'middle'), freshExplorer('middle'));
  }
  for (const raw of ['{', 'null', '[]', '"text"', JSON.stringify({...freshExplorer(), version: 99})]) {
    assert.deepEqual(restoreExplorer(raw), freshExplorer());
  }
  assert.equal(restoreExplorer(JSON.stringify({...freshExplorer(), drawer: 'compare'})).drawer, 'compare');
  assert.equal(restoreExplorer(JSON.stringify({...freshExplorer(), drawer: 'number'})).drawer, 'number');
  assert.equal(restoreExplorer(JSON.stringify({...freshExplorer(), drawer: 'shells'})).drawer, 'shells');
});
