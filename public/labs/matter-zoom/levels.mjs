import { atom, ELEMENTS } from './data.mjs';

// The same zoom model serves both levels. "High" is a selected extension,
// not a claim to cover every integrated-science or chemistry standard.
export const MODE_INFO = {
  middle: {
    label: '중학교',
    title: '중학교 · 물질의 구성',
    description: '중학교 2학년을 기준으로 물질을 확대하며 원자·분자·원소, 원자 구조와 전하를 알아봅니다.',
    focus: ['원자·분자·원소 구별', '양성자·중성자·전자', '원자 번호와 중성', '전자 하나의 이동과 이온'],
    extension: '원자번호 1~20의 단순한 전자배치는 관찰을 돕는 확장 활동입니다. 중성자 수 암기, 질량수와 동위원소 계산은 기본 평가에 넣지 않습니다.',
    modelNote: '원자 내부와 전자배치는 이해를 돕는 모형입니다. 확대한다고 분자의 결합이 끊어지는 것은 아닙니다.'
  },
  high: {
    label: '고등학교',
    title: '고등학교 · 주기성과 원자 비교',
    description: '공통 확대 탐험에 통합과학의 최외각 전자·족·주기 비교를 연결합니다. 질량수와 동위원소는 화학 선택과목을 위한 추가 탐구입니다.',
    focus: ['최외각 전자와 같은 족의 비교', '전자껍질 수와 주기', '전자 수·전하·원소의 구별', '분자와 반복 구조의 모형 경계'],
    extension: '화학 추가 탐구에서 탄소-12와 탄소-13, 질량수(양성자 수 + 중성자 수)를 비교합니다. 고등학교 전체 교육과정을 대신하는 활동은 아닙니다.',
    modelNote: '전자껍질 그림은 실제 전자의 궤도가 아닙니다. 원자번호 1~20의 바닥상태 중성 원자와 제시된 대표 이온만 비교합니다.'
  }
};

const REPRESENTATIVE_MODEL = '대표 원자·이온의 단순 모형 · 중성자 수는 예시 값';

export const CHARGE_CASES = [
  { id: 'na', z: 11, p: 11, n: 12, e: 11, symbol: 'Na', name: '나트륨 원자', charge: 0, shells: [2, 8, 1], modelLabel: REPRESENTATIVE_MODEL },
  { id: 'na-plus', z: 11, p: 11, n: 12, e: 10, symbol: 'Na⁺', name: '나트륨 이온', charge: 1, shells: [2, 8], modelLabel: REPRESENTATIVE_MODEL },
  { id: 'ne', z: 10, p: 10, n: 10, e: 10, symbol: 'Ne', name: '네온 원자', charge: 0, shells: [2, 8], modelLabel: REPRESENTATIVE_MODEL },
  { id: 'cl-minus', z: 17, p: 17, n: 18, e: 18, symbol: 'Cl⁻', name: '염화 이온', charge: -1, shells: [2, 8, 8], modelLabel: REPRESENTATIVE_MODEL }
];

export const FAMILY_CASES = [
  { id: 'group-1', group: 1, label: '1족 비교', atoms: [3, 11, 19], note: '리튬·나트륨·칼륨의 중성 원자는 최외각 전자가 1개입니다. 이 공통점과 성질 자료를 함께 비교합니다.' },
  { id: 'group-17', group: 17, label: '17족 비교', atoms: [9, 17], note: '플루오린·염소의 중성 원자는 최외각 전자가 7개입니다.' },
  { id: 'group-18', group: 18, label: '18족 비교', atoms: [2, 10, 18], note: '헬륨의 최외각 전자는 2개, 네온과 아르곤은 8개입니다. 헬륨에는 첫 번째 껍질만 있습니다.' }
];

const mission = (id, z, n, e, shells, title, scope = 'basic') => ({
  id, z, p: z, n, e, shells, title, scope, modelLabel: REPRESENTATIVE_MODEL
});

export const MISSIONS = {
  middle: [
    mission('middle-f', 9, 10, 9, [2, 7], '처음 보는 중성 원자를 분석해 봅시다.'),
    mission('middle-mg', 12, 12, 12, [2, 8, 2], '원자 번호와 전자배치를 연결해 봅시다.'),
    mission('middle-na-ion', 11, 12, 10, [2, 8], '이온 탐구 후: 전자 하나를 잃으면 무엇이 달라질까요?', 'ion-application')
  ],
  high: [
    mission('high-c12', 6, 6, 6, [2, 4], '화학 추가 탐구: 탄소-12의 원자 구조를 분석해 봅시다.', 'chemistry-extension'),
    mission('high-c13', 6, 7, 6, [2, 4], '화학 추가 탐구: 중성자 수가 다른 탄소를 비교해 봅시다.', 'chemistry-extension'),
    mission('high-cl-ion', 17, 18, 18, [2, 8, 8], '염화 이온: 전자 수가 달라도 원소는 같을까요?', 'ion-application'),
    mission('high-ca-ion', 20, 20, 18, [2, 8, 8], '칼슘 이온: 원자 번호와 전자 수를 구별해 봅시다.', 'ion-application')
  ]
};

/** Get a repeatable case; callers can keep an index in their own session. */
export function missionFor(mode = 'middle', index = 0) {
  const cases = MISSIONS[mode === 'high' ? 'high' : 'middle'];
  const position = Number.isInteger(index) ? ((index % cases.length) + cases.length) % cases.length : 0;
  const selected = cases[position];
  return { ...selected, shells: [...selected.shells] };
}

function shellAnswer(value) {
  const values = Array.isArray(value) ? value : typeof value === 'string' && value.trim() ? value.split(',').map(v => v.trim()) : null;
  if (!values || !values.length || values.length > 4 || values.some(v => !['number', 'string'].includes(typeof v) || v === '' || !Number.isInteger(Number(v)) || Number(v) < 0)) return null;
  const result = values.map(Number);
  while (result.length > 1 && result.at(-1) === 0) result.pop();
  return result;
}

function neutralAnswer(value) {
  if (value === 'yes' || value === true) return true;
  if (value === 'no' || value === false) return false;
  return null;
}

/** Assess the particular particle, so p=e is checked rather than assumed. */
export function evaluateMission(selected, answers = {}, mode = 'middle') {
  const expectedShells = shellAnswer(selected?.shells);
  if (!selected || !ELEMENTS.some(v => v.z === selected.z) || !Number.isInteger(selected.e) || selected.e < 0 || !Number.isInteger(selected.n) || selected.n < 0 || (selected.p !== undefined && selected.p !== selected.z) || !expectedShells || expectedShells.reduce((sum, value) => sum + value, 0) !== selected.e) {
    throw new TypeError('제시된 원자·이온 모형이 올바르지 않습니다.');
  }
  if (!answers || typeof answers !== 'object') answers = {};
  const element = atom(selected.z);
  const offeredShells = shellAnswer(answers.shells);
  const result = {
    neutrality: neutralAnswer(answers.neutral) === (selected.z === selected.e),
    number: Number(answers.number) === selected.z,
    element: Number(answers.element) === selected.z || answers.element === element.symbol || answers.element === element.name,
    shells: !!offeredShells && offeredShells.length === expectedShells.length && offeredShells.every((v, i) => v === expectedShells[i])
  };
  // Mass number belongs to the optional chemistry extension. A blank answer
  // leaves the shared four-part assessment intact; an attempted answer receives
  // feedback and contributes to completion until it is corrected or cleared.
  const hasMassAnswer = answers.mass !== undefined && answers.mass !== null && String(answers.mass).trim() !== '';
  if (mode === 'high' && hasMassAnswer) result.mass = Number(answers.mass) === selected.z + selected.n;
  result.allCorrect = Object.values(result).every(Boolean);
  return result;
}

/** Outermost shell count, not a universal definition of valence electrons. */
export function outerElectrons(z) {
  if (!Number.isInteger(z) || z < 1 || z > 20) return null;
  return atom(z).shells.at(-1);
}

/** Known isotope examples can be compared without simulating a nuclear change. */
export function assessIsotope(p, n1, n2) {
  if (![p, n1, n2].every(Number.isInteger) || p < 1 || n1 < 0 || n2 < 0) return null;
  return { sameElement: true, isotopes: n1 !== n2, massNumbers: [p + n1, p + n2] };
}
