'use client';

import { useDeferredValue,useMemo,useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight,Eye,Heart,Search,Sparkles } from 'lucide-react';
import type { Program } from '@/lib/programs';

export function ProgramExplorer({programs}:{programs:Program[]}){
  const[query,setQuery]=useState('');
  const[category,setCategory]=useState('전체');
  const[sort,setSort]=useState<'recommended'|'popular'|'views'>('recommended');
  const deferredQuery=useDeferredValue(query);

  const categories=useMemo(()=>['전체',...Array.from(new Set(programs.map((program)=>program.category)))],[programs]);
  const filtered=useMemo(()=>{
    const normalized=deferredQuery.trim().toLowerCase();
    const result=programs.filter((program)=>{
      const text=[program.title,program.summary,program.category,program.grade,...program.tags].join(' ').toLowerCase();
      return(category==='전체'||program.category===category)&&text.includes(normalized);
    });
    return[...result].sort((a,b)=>sort==='popular'?(b.likeCount||0)-(a.likeCount||0):sort==='views'?(b.viewCount||0)-(a.viewCount||0):Number(Boolean(b.featured))-Number(Boolean(a.featured))||(b.likeCount||0)-(a.likeCount||0));
  },[category,deferredQuery,programs,sort]);

  function remember(id:string){
    try{
      const recent:string[]=JSON.parse(localStorage.getItem('scilab-recent')||'[]');
      localStorage.setItem('scilab-recent',JSON.stringify([id,...recent.filter((item)=>item!==id)].slice(0,12)));
    }catch{}
  }

  return <>
    <section className="searchPanel"><div className="searchBox"><Search size={20}/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="프로그램명, 단원, 핵심어로 검색"/></div><div className="filters">{categories.map((item)=><button key={item} className={category===item?'filter active':'filter'} onClick={()=>setCategory(item)}>{item}</button>)}</div></section>
    <div className="sectionHeading"><div><span className="sectionEyebrow">PROGRAMS</span><h2>수업에 바로 쓰는 프로그램</h2></div><div className="sectionTools"><p>{filtered.length}개</p><select value={sort} onChange={(e)=>setSort(e.target.value as typeof sort)}><option value="recommended">추천순</option><option value="popular">추천 많은 순</option><option value="views">조회 많은 순</option></select></div></div>
    <section className="programGrid">{filtered.map((program)=><Link className="programCardLink" href={`/programs/${program.id}`} key={program.id} prefetch={false} onClick={()=>remember(program.id)}><article className="programCard">{program.thumbnailUrl?<img className="programThumb" src={program.thumbnailUrl} alt="" loading="lazy" decoding="async"/>:<div className="cardTop"><span className="programIcon">{program.icon}</span>{program.featured&&<span className="featured"><Sparkles size={13}/> 추천</span>}</div>}<div className="cardBody"><span className="categoryLabel">{program.category}</span><h3>{program.title}</h3><p>{program.summary}</p></div><div className="tagRow">{program.tags.slice(0,3).map((tag)=><span key={tag}>{tag}</span>)}</div><div className="cardStats"><span><Eye size={14}/>{(program.viewCount||0).toLocaleString()}</span><span><Heart size={14}/>{(program.likeCount||0).toLocaleString()}</span></div><div className="cardFooter"><span>{program.grade}</span><span className="detailLink">자세히 보기 <ArrowUpRight size={16}/></span></div></article></Link>)}</section>
  </>;
}
