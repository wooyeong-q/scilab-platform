// Controlled comparisons: A -> B changes only electron count; B -> C changes
// only proton count. Electron shells/charge/identity are derived consequences.
// C uses a real stable Ne-22 nucleus (10 p, 12 n), rather than inventing a
// neutron count to create a counterexample. NIST isotope composition reference:
// https://physics.nist.gov/cgi-bin/Compositions/stand_alone.pl?ele=Ne
// These neutron counts are example nuclei, not constants for each element.
// Middle-school activities need not teach isotope names or mass-number notation.
export const COMPARISON_CASES = [
  {id: 'a', z: 11, p: 11, n: 12, e: 11, element: '나트륨', symbol: 'Na', name: '나트륨 원자', charge: 0, shells: [2, 8, 1]},
  {id: 'b', z: 11, p: 11, n: 12, e: 10, element: '나트륨', symbol: 'Na⁺', name: '나트륨 이온', charge: 1, shells: [2, 8]},
  {id: 'c', z: 10, p: 10, n: 12, e: 10, element: '네온', symbol: 'Ne', name: '네온 원자', charge: 0, shells: [2, 8]},
];

export function groupCases(key = 'p') {
  if (!['p', 'e', 'n'].includes(key)) {
    throw new TypeError('양성자(p), 전자(e), 중성자(n) 수로 비교해 주세요.');
  }
  const groups = new Map();
  for (const item of COMPARISON_CASES) {
    if (!groups.has(item[key])) groups.set(item[key], []);
    groups.get(item[key]).push(item);
  }
  return [...groups].sort(([left], [right]) => left - right)
    .map(([value, cases]) => ({value, cases}));
}

export function groupingWorks(key) {
  const groups = groupCases(key);
  const groupByElement = new Map();
  for (const {value, cases} of groups) {
    if (new Set(cases.map(item => item.z)).size !== 1) return false;
    const z = cases[0].z;
    if (groupByElement.has(z) && groupByElement.get(z) !== value) return false;
    groupByElement.set(z, value);
  }
  return true;
}

// Deliberate gaps distinguish atomic number from a card's ordinal position:
// carbon remains Z=6 even though it is the third card after sorting.
export const ORDER_ZS = [8, 2, 6, 1];
export function validOrder(order) {
  return Array.isArray(order) && order.length === 4 &&
    [1, 2, 6, 8].every((z, index) => order[index] === z);
}

export const NUMBER_EXAMPLES = [
  {z: 1, p: 1, n: 0, e: 1, number: 1, symbol: 'H'},
  {z: 2, p: 2, n: 2, e: 2, number: 2, symbol: 'He'},
  {z: 8, p: 8, n: 8, e: 8, number: 8, symbol: 'O'},
  {z: 11, p: 11, n: 12, e: 10, number: 11, symbol: 'Na⁺'},
];
// Stable N-15 provides n != p while staying scientifically real. Reference:
// https://physics.nist.gov/cgi-bin/Compositions/stand_alone.pl?ele=N
export const NUMBER_TARGET = {z: 7, p: 7, n: 8, e: 7, number: 7};
export function testNumber(rule, prediction) {
  if (rule !== 'p') return false;
  if (typeof prediction !== 'number' && typeof prediction !== 'string') return false;
  if (typeof prediction === 'string' && !prediction.trim()) return false;
  return Number(prediction) === NUMBER_TARGET.number;
}

export const MAP_TARGETS = [12, 20];
export const CHARGE_TASKS = [
  {id: 'na', name: '나트륨 원자', symbol: 'Na', z: 11, p: 11, n: 12, e: 11, charge: 0, shells: [2, 8, 1], correct: 'neutral'},
  {id: 'na-plus', name: '나트륨 양이온', symbol: 'Na⁺', z: 11, p: 11, n: 12, e: 10, charge: 1, shells: [2, 8], correct: 'positive'},
  {id: 'cl-minus', name: '염화 이온', symbol: 'Cl⁻', z: 17, p: 17, n: 18, e: 18, charge: -1, shells: [2, 8, 8], correct: 'negative'},
];
export function chargeRuleWorks(answers) {
  return Boolean(answers && typeof answers === 'object' &&
    CHARGE_TASKS.every(item => answers[item.id] === item.correct));
}
