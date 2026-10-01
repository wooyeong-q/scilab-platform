import {MATERIALS, DISCOVERIES} from './data.mjs';

const modeOf = mode => mode === 'high' ? 'high' : 'middle';
const integer = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;
const elementNumber = value => integer(value, 1, 20);
const observedAtoms = new Set(Object.values(MATERIALS).flatMap(m => m.atoms));
const drawers = new Set(['', 'compare', 'number', 'charge']);

// This is an observation workspace. Opening a view never depends on a quiz,
// a completed chapter, or a record inherited from the earlier lesson flow.
export function freshExplorer(mode = 'middle') {
  return {
    version: 5, mode: modeOf(mode), material: null, level: 0, deepest: 0,
    z: 8, selected: 0, visited: [], seen: [], records: [],
    tableZ: 8, tableSeen: [], numberZ: 8, compareZ: 8,
    chargeZ: 11, chargeVariant: 'neutral', drawer: '', upgraded: false,
  };
}

export function restoreExplorer(raw, mode = 'middle') {
  const state = freshExplorer(mode);
  if (!raw) return state;
  let saved;
  try { saved = JSON.parse(raw); } catch { return state; }
  if (!saved || typeof saved !== 'object' || Array.isArray(saved) ||
      ![2, 3, 4, 5].includes(saved.version) || saved.mode !== state.mode) return state;

  const material = typeof saved.material === 'string' &&
    Object.hasOwn(MATERIALS, saved.material) ? saved.material : null;
  if (material) {
    state.material = material;
    state.z = MATERIALS[material].atoms.includes(saved.z) ? saved.z : MATERIALS[material].defaultZ;
    if (integer(saved.level, 0, 5)) state.level = saved.level;
    if (integer(saved.deepest, 0, 5)) state.deepest = saved.deepest;
    // Metals and monatomic gases skip the molecule close-up.
    if (MATERIALS[material].kind !== 'molecule') {
      if (state.level === 2) state.level = 4;
      if (state.deepest === 2) state.deepest = 4;
    }
    if (state.level === 3) state.level = 4;
    if (state.deepest === 3) state.deepest = 4;
    state.deepest = Math.max(state.deepest, state.level);
    // selected is the index of a molecule or an atom in the repeated field,
    // not the atom's position within H₂O or H₂.
    if (integer(saved.selected, 0, 39)) state.selected = saved.selected;
  }

  const arrays = [
    ['visited', value => typeof value === 'string' && Object.hasOwn(MATERIALS, value)],
    ['seen', value => typeof value === 'string' && /^\d+:[pne]$/.test(value) && observedAtoms.has(Number(value.split(':')[0]))],
    ['records', value => typeof value === 'string' && value !== 'final' && value !== 'shells' && Object.hasOwn(DISCOVERIES, value)],
    ['tableSeen', elementNumber],
  ];
  for (const [key, valid] of arrays) {
    if (Array.isArray(saved[key])) state[key] = [...new Set(saved[key].filter(valid))];
  }

  for (const key of ['tableZ', 'numberZ']) {
    if (elementNumber(saved[key])) state[key] = saved[key];
  }
  if (elementNumber(saved.compareZ) || observedAtoms.has(saved.compareZ)) state.compareZ = saved.compareZ;
  // Start an absent/invalid number selection from the currently observed atom.
  if (!elementNumber(saved.numberZ) && elementNumber(state.z)) state.numberZ = state.z;

  if (saved.chargeZ === 11 || saved.chargeZ === 17) state.chargeZ = saved.chargeZ;
  if (saved.chargeVariant === 'neutral' ||
      saved.chargeVariant === 'lost' && state.chargeZ === 11 ||
      saved.chargeVariant === 'gained' && state.chargeZ === 17) {
    state.chargeVariant = saved.chargeVariant;
  }
  if (typeof saved.drawer === 'string' && drawers.has(saved.drawer)) state.drawer = saved.drawer;
  state.upgraded = saved.version < 5 || saved.upgraded === true;
  return state;
}
