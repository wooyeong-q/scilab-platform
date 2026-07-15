'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Search, Sparkles } from 'lucide-react';
import type { Program } from '@/lib/programs';

export function ProgramExplorer({ programs }: { programs: Program[] }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('전체');
  const categories = ['전체', ...Array.from(new Set(programs.map((program) => program.category)))];
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return programs.filter((program) => {
      const categoryMatch = category === '전체' || program.category === category;
      const text = [program.title, program.summary, program.category, program.grade, ...program.tags].join(' ').toLowerCase();
      return categoryMatch && text.includes(normalized);
    });
  }, [category, programs, query]);

  return <>
    <section className="searchPanel">
      <div className="searchBox"><Search size={20}/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="프로그램명, 단원, 핵심어로 검색"/></div>
      <div className="filters">{categories.map((item)=><button key={item} className={category===item?'filter active':'filter'} onClick={()=>setCategory(item)}>{item}</button>)}</div>
    </section>
    <div className="sectionHeading"><div><span className="sectionEyebrow">PROGRAMS</span><h2>수업에 바로 쓰는 프로그램</h2></div><p>{filtered.length}개 프로그램</p></div>
    <section className="programGrid">{filtered.map((program)=><article className="programCard" key={program.id}>
      <div className="cardTop"><span className="programIcon">{program.icon}</span>{program.featured&&<span className="featured"><Sparkles size={13}/> 추천</span>}</div>
      <div className="cardBody"><span className="categoryLabel">{program.category}</span><h3>{program.title}</h3><p>{program.summary}</p></div>
      <div className="tagRow">{program.tags.slice(0,3).map((tag)=><span key={tag}>{tag}</span>)}</div>
      <div className="cardFooter"><span>{program.grade}</span><Link href={`/programs/${program.id}`}>자세히 보기 <ArrowUpRight size={16}/></Link></div>
    </article>)}</section>
  </>;
}
