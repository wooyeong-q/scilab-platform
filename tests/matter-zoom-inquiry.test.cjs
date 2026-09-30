const {test} = require('node:test');
const assert = require('node:assert/strict');
const inquiry = import('../public/labs/matter-zoom/inquiry.mjs');

test('comparison and charge cases use consistent atomic identity, net charge and electron counts', async () => {
  const {COMPARISON_CASES, CHARGE_TASKS, NUMBER_EXAMPLES, NUMBER_TARGET} = await inquiry;
  for (const item of [...COMPARISON_CASES, ...CHARGE_TASKS]) {
    assert.equal(item.p, item.z);
    assert.equal(item.charge, item.p - item.e);
    assert.equal(item.shells.reduce((total, count) => total + count, 0), item.e);
    assert.ok(Number.isInteger(item.n) && item.n >= 0);
  }
  assert.deepEqual(COMPARISON_CASES.map(item => [item.symbol, item.p, item.n, item.e]), [
    ['Na', 11, 12, 11], ['Na⁺', 11, 12, 10], ['Ne', 10, 12, 10],
  ]);
  for (const item of [...NUMBER_EXAMPLES, NUMBER_TARGET]) {
    assert.equal(item.p, item.z);
    assert.equal(item.number, item.p);
  }
  assert.deepEqual(NUMBER_TARGET, {z: 7, p: 7, n: 8, e: 7, number: 7});
  assert.equal(NUMBER_EXAMPLES.find(item => item.symbol === 'Na⁺').e, 10);
});

test('controlled comparisons change exactly one independent particle count at a time', async () => {
  const {COMPARISON_CASES} = await inquiry;
  const [a, b, c] = COMPARISON_CASES;
  const changed = (left, right) => ['p', 'n', 'e'].filter(key => left[key] !== right[key]);
  assert.deepEqual(changed(a, b), ['e']);
  assert.equal(a.z, b.z);
  assert.equal(a.element, b.element);
  assert.notEqual(a.charge, b.charge);
  assert.deepEqual(changed(b, c), ['p']);
  assert.notEqual(b.z, c.z);
  assert.notEqual(b.element, c.element);
});

test('proton grouping works while electron and neutron grouping produce actual counterexamples', async () => {
  const {COMPARISON_CASES, groupCases, groupingWorks} = await inquiry;
  const snapshot = JSON.stringify(COMPARISON_CASES);
  assert.deepEqual(groupCases().map(group => [group.value, group.cases.map(item => item.id)]), [
    [10, ['c']], [11, ['a', 'b']],
  ]);
  assert.equal(groupingWorks('p'), true);
  assert.equal(groupingWorks('e'), false);
  assert.equal(groupingWorks('n'), false);
  const electronGroups = groupCases('e');
  assert.deepEqual(electronGroups.map(group => group.value), [10, 11]);
  const electronCounterexample = electronGroups[0].cases;
  assert.equal(new Set(electronCounterexample.map(item => item.e)).size, 1);
  assert.equal(new Set(electronCounterexample.map(item => item.z)).size, 2);
  assert.equal(groupCases('n').length, 1);
  assert.equal(groupCases('n')[0].cases.length, 3);
  assert.equal(JSON.stringify(COMPARISON_CASES), snapshot);
  for (const key of ['z', 'number', '__proto__', '', null]) {
    assert.throws(() => groupCases(key), TypeError);
    assert.throws(() => groupingWorks(key), TypeError);
  }
});

test('sorting checks atomic-number order rather than contiguous ordinal positions', async () => {
  const {ORDER_ZS, validOrder} = await inquiry;
  assert.deepEqual(ORDER_ZS, [8, 2, 6, 1]);
  assert.equal(validOrder(ORDER_ZS), false);
  const sorted = [...ORDER_ZS].sort((a, b) => a - b);
  assert.equal(validOrder(sorted), true);
  assert.equal(sorted[2], 6); // Third card is carbon Z=6, not atomic number 3.
  for (const forged of [null, {}, [1, 2, 3, 4], [1, 2, 6, 6], [1, '2', 6, 8], [1, 2, 8, 6], [1, 2, 6], [1, 2, 6, 8, 9]]) {
    assert.equal(validOrder(forged), false);
  }
});

test('number discovery requires the correct rule as well as a correct prediction', async () => {
  const {testNumber, MAP_TARGETS} = await inquiry;
  for (const answer of [7, '7', ' 7 ']) assert.equal(testNumber('p', answer), true);
  for (const rule of ['e', 'n', 'position', '', undefined]) assert.equal(testNumber(rule, 7), false);
  for (const answer of ['', ' ', null, undefined, false, [7], {value: 7}, 8, '8', NaN, Infinity]) {
    assert.equal(testNumber('p', answer), false);
  }
  assert.deepEqual(MAP_TARGETS, [12, 20]);
});

test('charge comparison requires correct neutral, positive and negative explanations', async () => {
  const {CHARGE_TASKS, chargeRuleWorks} = await inquiry;
  const correct = {'na': 'neutral', 'na-plus': 'positive', 'cl-minus': 'negative'};
  assert.equal(chargeRuleWorks(correct), true);
  for (const item of CHARGE_TASKS) {
    const incomplete = {...correct};
    delete incomplete[item.id];
    assert.equal(chargeRuleWorks(incomplete), false);
    assert.equal(chargeRuleWorks({...correct, [item.id]: 'neutral'}), item.correct === 'neutral');
  }
  for (const answers of [null, undefined, {}, {na: 'neutral'}, true]) {
    assert.equal(chargeRuleWorks(answers), false);
  }
});
