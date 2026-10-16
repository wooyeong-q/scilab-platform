import type { Program } from './programs';

export type CatalogSort = 'recommended' | 'popular' | 'views';
export type ProgramGroup = { name: string; programs: Program[] };
const SUBJECT_ORDER = ['지구과학', '화학', '물리', '생명과학', '통합과학'];
const SUBJECT_ALIASES: ReadonlyArray<readonly [string, readonly string[]]> = [
  ['지구과학', ['지구과학','별과우주','지구와우주','우주','천문','지질','지권','지구계','대기','날씨','해양']],
  ['화학', ['화학','물질의구성','물질의성질','물질의변화']],
  ['물리', ['물리','운동과에너지','전기와자기','빛과파동','힘과운동']],
  ['생명과학', ['생명','생물','생태','유전']],
  ['통합과학', ['통합','융합']],
];

export function programSubject(program: Pick<Program, 'category'>): string {
  const category = program.category.trim();
  const compact = category.replace(/\s+/g, '');
  for (const [subject, aliases] of SUBJECT_ALIASES) {
    if (aliases.some(alias => compact.includes(alias))) return subject;
  }
  return category || '기타';
}

function compareSubjects(a: string, b: string): number {
  const ai = SUBJECT_ORDER.indexOf(a);
  const bi = SUBJECT_ORDER.indexOf(b);
  return (ai < 0 ? SUBJECT_ORDER.length : ai) - (bi < 0 ? SUBJECT_ORDER.length : bi)
    || a.localeCompare(b, 'ko');
}

export function groupPrograms(programs: readonly Program[]): ProgramGroup[] {
  const groups = new Map<string, Program[]>();
  for (const program of programs) {
    const name = programSubject(program);
    const group = groups.get(name);
    if (group) group.push(program);
    else groups.set(name, [program]);
  }
  return [...groups].sort(([a], [b]) => compareSubjects(a, b))
    .map(([name, items]) => ({ name, programs: items }));
}

export function selectPrograms(
  programs: readonly Program[], query: string, subject: string, sort: CatalogSort,
): Program[] {
  const words = query.normalize('NFKC').trim().toLocaleLowerCase('ko').split(/\s+/).filter(Boolean);
  return programs.filter(program => {
    if (subject !== '전체' && programSubject(program) !== subject) return false;
    const text = [program.title, program.summary, program.category, programSubject(program), program.grade, ...program.tags]
      .join(' ').normalize('NFKC').toLocaleLowerCase('ko');
    return words.every(word => text.includes(word));
  }).sort((a, b) => {
    const metric = sort === 'views'
      ? (b.viewCount || 0) - (a.viewCount || 0)
      : sort === 'popular'
        ? (b.likeCount || 0) - (a.likeCount || 0)
        : Number(Boolean(b.featured)) - Number(Boolean(a.featured))
          || (b.likeCount || 0) - (a.likeCount || 0);
    return metric || a.title.localeCompare(b.title, 'ko') || a.id.localeCompare(b.id);
  });
}

export function rememberProgram(id: string) {
  try {
    const value: unknown = JSON.parse(localStorage.getItem('scilab-recent') || '[]');
    const recent = Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
    localStorage.setItem('scilab-recent', JSON.stringify([id, ...recent.filter(item => item !== id)].slice(0, 12)));
  } catch { /* Browsing the catalog also works when storage is unavailable. */ }
}
