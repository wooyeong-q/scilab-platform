import type { Program } from './programs';
import { groupPrograms, programSubject, selectPrograms } from './program-catalog';

export function catalogOrder(programs: readonly Program[]): Program[] {
  return groupPrograms(selectPrograms(programs, '', '전체', 'recommended')).flatMap(group => group.programs);
}

function numbered(programs: Program[]): Program[] {
  return programs.map((program, index) => ({ ...program, sortOrder: index }));
}

export function moveCatalogProgramTo(programs: readonly Program[], id: string, targetId: string): Program[] {
  const ordered = catalogOrder(programs);
  const from = ordered.findIndex(program => program.id === id);
  const target = ordered.findIndex(program => program.id === targetId);
  if (from < 0 || target < 0 || from === target ||
      programSubject(ordered[from]) !== programSubject(ordered[target])) return ordered;
  const [moving] = ordered.splice(from, 1);
  ordered.splice(target, 0, moving);
  return numbered(ordered);
}

export function moveCatalogProgram(programs: readonly Program[], id: string, direction: -1 | 1): Program[] {
  const ordered = catalogOrder(programs);
  const program = ordered.find(item => item.id === id);
  if (!program) return ordered;
  const group = ordered.filter(item => programSubject(item) === programSubject(program));
  const target = group[group.findIndex(item => item.id === id) + direction];
  return target ? moveCatalogProgramTo(ordered, id, target.id) : ordered;
}

export function moveCatalogSubject(programs: readonly Program[], subject: string, direction: -1 | 1): Program[] {
  const groups = groupPrograms(catalogOrder(programs));
  const from = groups.findIndex(group => group.name === subject);
  const target = from + direction;
  if (from < 0 || target < 0 || target >= groups.length) return catalogOrder(programs);
  [groups[from], groups[target]] = [groups[target], groups[from]];
  return numbered(groups.flatMap(group => group.programs));
}
