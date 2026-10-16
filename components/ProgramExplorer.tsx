'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import { Atom, Dna, Earth, FlaskConical, Layers3, LayoutGrid, Search, SearchX, X } from 'lucide-react';
import { ProgramCard } from '@/components/ProgramCard';
import { groupPrograms, selectPrograms, type CatalogSort } from '@/lib/program-catalog';
import type { Program } from '@/lib/programs';

const SUBJECT_ICONS = { '지구과학': Earth, '화학': FlaskConical, '물리': Atom, '생명과학': Dna };
function SubjectIcon({ name }: { name: string }) {
  const Icon = SUBJECT_ICONS[name as keyof typeof SUBJECT_ICONS] || Layers3;
  return <Icon size={18} aria-hidden="true"/>;
}

export function ProgramExplorer({ programs }: { programs: Program[] }) {
  const [query, setQuery] = useState('');
  const [subject, setSubject] = useState('전체');
  const [sort, setSort] = useState<CatalogSort>('recommended');
  const deferredQuery = useDeferredValue(query);
  const subjects = useMemo(() => groupPrograms(programs), [programs]);
  const filtered = useMemo(
    () => selectPrograms(programs, deferredQuery, subject, sort),
    [programs, deferredQuery, subject, sort],
  );
  const groups = useMemo(() => sort === 'recommended'
    ? groupPrograms(filtered)
    : [{ name: subject === '전체' ? '전체 프로그램' : subject, programs: filtered }],
  [filtered, subject, sort]);

  function reset() { setQuery(''); setSubject('전체'); }
  return <div className="catalogWorkspace">
    <aside className="catalogSidebar">
      <h2>과학 영역</h2>
      <nav className="catalogSubjects" aria-label="과학 영역 선택">
        <button type="button" className={subject === '전체' ? 'isActive' : ''}
          aria-pressed={subject === '전체'} onClick={() => setSubject('전체')}>
          <LayoutGrid size={18} aria-hidden="true"/><span>전체 프로그램</span><small>{programs.length}</small>
        </button>
        {subjects.map(group => <button key={group.name} type="button"
          className={subject === group.name ? 'isActive' : ''} aria-pressed={subject === group.name}
          onClick={() => setSubject(group.name)}>
          <SubjectIcon name={group.name}/><span>{group.name}</span><small>{group.programs.length}</small>
        </button>)}
      </nav>
      <p className="catalogSidebarNote">분야를 선택하거나<br/>단원과 핵심어로 검색하세요.</p>
    </aside>
    <div className="catalogResults">
      <div className="catalogToolbar">
        <div className="catalogSearch" role="search">
          <Search size={20} aria-hidden="true"/>
          <input id="catalog-search" type="search" value={query} onChange={event => setQuery(event.target.value)}
            placeholder="프로그램명, 단원, 핵심어 검색" aria-label="프로그램 검색"/>
          {query ? <button type="button" aria-label="검색어 지우기" onClick={() => setQuery('')}><X size={17}/></button> : null}
        </div>
        <label className="catalogSort">정렬
          <select value={sort} onChange={event => setSort(event.target.value as CatalogSort)}>
            <option value="recommended">기본순</option>
            <option value="popular">추천 많은 순</option>
            <option value="views">조회 많은 순</option>
          </select>
        </label>
      </div>
      <div className="catalogResultsHeading">
        <h2>{subject === '전체' ? '전체 프로그램' : subject}<span>{filtered.length}</span></h2>
        <p role="status" aria-live="polite">{deferredQuery.trim() ? '“' + deferredQuery.trim() + '” 검색 결과' : '프로그램을 선택하면 설명과 수업 자료를 볼 수 있습니다.'}</p>
      </div>
      <div className="catalogGroups" aria-busy={query !== deferredQuery}>
        {filtered.length ? groups.map(group => <section key={group.name} className="catalogGroup" aria-label={group.name}>
          <div className="catalogGroupHeading">
            <h3><SubjectIcon name={group.name}/>{group.name}<span>{group.programs.length}개</span></h3>
            {sort === 'recommended' ? <span className="catalogGroupUnits">{[...new Set(group.programs.map(program => program.category))].join(' · ')}</span> : null}
          </div>
          <div className="catalogGrid">{group.programs.map(program => <ProgramCard key={program.id} program={program}/>)}</div>
        </section>) : <div className="catalogEmpty">
          <SearchX size={32} aria-hidden="true"/><h3>{programs.length ? '검색 결과가 없습니다.' : '공개된 프로그램이 없습니다.'}</h3>
          <p>{programs.length ? '다른 검색어를 입력하거나 전체 프로그램을 확인해 보세요.' : '프로그램이 등록되면 이곳에 표시됩니다.'}</p>
          {programs.length ? <button type="button" onClick={reset}>전체 프로그램 보기</button> : null}
        </div>}
      </div>
    </div>
  </div>;
}
