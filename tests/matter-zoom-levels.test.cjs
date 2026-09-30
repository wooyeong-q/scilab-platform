const { test } = require('node:test');
const assert = require('node:assert/strict');

const levels = () => import('../public/labs/matter-zoom/levels.mjs');

test('matter zoom levels: charge cases separate element identity from electron count', async () => {
  const { CHARGE_CASES } = await levels();
  const na = CHARGE_CASES.find(v => v.id === 'na');
  const naPlus = CHARGE_CASES.find(v => v.id === 'na-plus');
  const ne = CHARGE_CASES.find(v => v.id === 'ne');
  const clMinus = CHARGE_CASES.find(v => v.id === 'cl-minus');
  assert.equal(na.z, naPlus.z);
  assert.notEqual(na.e, naPlus.e);
  assert.equal(naPlus.e, ne.e);
  assert.notEqual(naPlus.z, ne.z);
  assert.equal(clMinus.charge, -1);
  for (const example of CHARGE_CASES) {
    assert.equal(example.p, example.z);
    assert.equal(example.charge, example.p - example.e);
    assert.equal(example.shells.reduce((sum, value) => sum + value, 0), example.e);
    assert.match(example.modelLabel, /모형/);
  }
});

test('matter zoom levels: unfamiliar missions include unequal neutron counts and non-neutral particles', async () => {
  const { MISSIONS, missionFor, evaluateMission } = await levels();
  const f = MISSIONS.middle.find(v => v.z === 9);
  assert.notEqual(f.n, f.z);
  assert.equal(f.e, f.z);
  for (const mode of ['middle', 'high']) {
    assert.ok(MISSIONS[mode].some(v => v.e !== v.z));
    for (const example of MISSIONS[mode]) {
      assert.equal(example.shells.reduce((sum, value) => sum + value, 0), example.e);
      const result = evaluateMission(example, { neutral: example.e === example.z ? 'yes' : 'no', number: example.z, element: example.z, shells: example.shells, mass: example.z + example.n }, mode);
      assert.equal(result.allCorrect, true);
      assert.equal(Object.hasOwn(result, 'mass'), mode === 'high');
    }
    assert.equal(missionFor(mode, MISSIONS[mode].length).id, MISSIONS[mode][0].id);
    assert.equal(missionFor(mode, -1).id, MISSIONS[mode].at(-1).id);
  }
  const first = missionFor('middle', 0);
  first.shells[0] = 999;
  assert.deepEqual(missionFor('middle', 0).shells, [2, 7]);
  assert.equal(missionFor('unknown', 0).id, f.id);
});

test('matter zoom levels: scoring catches electron-count, neutron-count and shell misconceptions', async () => {
  const { missionFor, evaluateMission } = await levels();
  const f = missionFor('middle', 0);
  assert.equal(evaluateMission(f, { neutral: 'yes', number: f.n, element: f.n, shells: [2, 7] }).number, false);
  const naPlus = missionFor('middle', 2);
  const mistaken = evaluateMission(naPlus, { neutral: 'yes', number: 10, element: 10, shells: '2, 8' });
  assert.deepEqual(mistaken, { neutrality: false, number: false, element: false, shells: true, allCorrect: false });
  assert.equal(evaluateMission(f, { neutral: 'yes', number: 9, element: 'F', shells: '2, 7, 0, 0' }).allCorrect, true);
  for (const invalid of ['2,,7', '2,7,1', '2,-7', '2,7.1', '', [2, 7, NaN], [2, 7, false], [2, 7, null]]) {
    assert.equal(evaluateMission(f, { shells: invalid }).shells, false);
  }
  assert.equal(evaluateMission(f, {}).neutrality, false);
  assert.equal(evaluateMission(f, null).allCorrect, false);
  const c13 = missionFor('high', 1);
  assert.equal(evaluateMission(c13, { neutral: 'yes', number: 6, element: '탄소', shells: [2, 4], mass: 12 }, 'high').mass, false);
  assert.throws(() => evaluateMission({ z: 79, e: 79, n: 118, shells: [79] }), TypeError);
  assert.throws(() => evaluateMission({ z: 9, p: 8, e: 9, n: 10, shells: [2, 7] }), TypeError);
  assert.throws(() => evaluateMission({ z: 9, e: 9, n: 10, shells: [2, 8] }), TypeError);
});

test('matter zoom levels: periodic comparison handles helium and the fourth shell correctly', async () => {
  const { FAMILY_CASES, outerElectrons, assessIsotope, MODE_INFO } = await levels();
  assert.deepEqual(FAMILY_CASES[0].atoms.map(outerElectrons), [1, 1, 1]);
  assert.deepEqual(FAMILY_CASES[1].atoms.map(outerElectrons), [7, 7]);
  assert.deepEqual(FAMILY_CASES[2].atoms.map(outerElectrons), [2, 8, 8]);
  assert.equal(outerElectrons(20), 2);
  for (const z of [0, 21, 79, 1.1, '1']) assert.equal(outerElectrons(z), null);
  assert.deepEqual(assessIsotope(6, 6, 7), { sameElement: true, isotopes: true, massNumbers: [12, 13] });
  assert.equal(assessIsotope(6, 6, 6).isotopes, false);
  assert.equal(assessIsotope(6, -1, 7), null);
  assert.match(MODE_INFO.middle.description, /중학교 2학년/);
  assert.match(MODE_INFO.high.description, /통합과학/);
  assert.match(MODE_INFO.high.description, /선택과목/);
});

test('matter zoom levels: high chemistry extension is optional but attempted mass answers receive feedback', async () => {
  const { missionFor, evaluateMission } = await levels();
  const c13 = missionFor('high', 1);
  const basic = { neutral: 'yes', number: 6, element: 'C', shells: [2, 4] };
  for (const mass of [undefined, null, '', '   ']) {
    const result = evaluateMission(c13, { ...basic, mass }, 'high');
    assert.equal(result.allCorrect, true);
    assert.equal(Object.hasOwn(result, 'mass'), false);
  }
  for (const mass of [12, '12', 0, 'wrong']) {
    const result = evaluateMission(c13, { ...basic, mass }, 'high');
    assert.equal(result.mass, false);
    assert.equal(result.allCorrect, false);
  }
  for (const mass of [13, '13']) {
    const result = evaluateMission(c13, { ...basic, mass }, 'high');
    assert.equal(result.mass, true);
    assert.equal(result.allCorrect, true);
  }
  const middle = evaluateMission(c13, { ...basic, mass: 12 }, 'middle');
  assert.equal(Object.hasOwn(middle, 'mass'), false);
  assert.equal(middle.allCorrect, true);
});

test('matter zoom levels: skipping middle electron placement assesses only identity, number and neutrality', async () => {
  const { missionFor, evaluateMission } = await levels();
  const f = missionFor('middle', 0);
  const basic = { neutral: 'yes', number: 9, element: 'F' };
  assert.deepEqual(evaluateMission(f, basic, 'middle', { requireShells: false }), {
    neutrality: true, number: true, element: true, allCorrect: true
  });
  assert.equal(evaluateMission(f, basic, 'middle').allCorrect, false);
  assert.equal(evaluateMission(f, basic, 'middle').shells, false);
  assert.equal(evaluateMission(f, basic, 'middle', {}).shells, false);
  assert.equal(evaluateMission(f, { ...basic, shells: [2, 7] }, 'middle').allCorrect, true);
  assert.equal(evaluateMission(f, { ...basic, shells: [2, 8] }, 'middle', { requireShells: false }).allCorrect, true);
  const wrongIdentity = evaluateMission(f, { neutral: 'yes', number: 10, element: 'Ne' }, 'middle', { requireShells: false });
  assert.equal(wrongIdentity.allCorrect, false);
  assert.equal(wrongIdentity.number, false);
  assert.equal(wrongIdentity.element, false);
  assert.equal(Object.hasOwn(wrongIdentity, 'shells'), false);
});

test('matter zoom levels: mission titles do not reveal the element being identified', async () => {
  const { MISSIONS, MODE_INFO } = await levels();
  const { atom } = await import('../public/labs/matter-zoom/data.mjs');
  for (const example of Object.values(MISSIONS).flat()) {
    assert.equal(example.title.includes(atom(example.z).name), false);
  }
  assert.equal(MISSIONS.middle[1].title.includes('전자배치'), false);
  assert.match(MODE_INFO.middle.extension, /선택 탐험/);
  assert.match(MODE_INFO.middle.extension, /선택한 경우에만/);
});
