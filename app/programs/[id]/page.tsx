import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowUpRight, Clock3, MonitorPlay, School } from 'lucide-react';
import { Header } from '@/components/Header';
import { getProgram } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function ProgramPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const program=await getProgram(id);
  if(!program) notFound();
  return <><Header/><main className="container detailPage">
    <Link href="/" className="backLink"><ArrowLeft size={17}/> 프로그램 목록</Link>
    <section className="detailHero"><div className="detailIcon">{program.icon}</div><div className="detailCopy"><span>{program.category}</span><h1>{program.title}</h1><p>{program.description}</p></div><a href={program.url} target="_blank" rel="noreferrer" className="launchButton">프로그램 실행 <ArrowUpRight size={18}/></a></section>
    <section className="detailGrid"><article><School/><span>대상</span><strong>{program.grade}</strong></article><article><Clock3/><span>예상 시간</span><strong>{program.duration}</strong></article><article><MonitorPlay/><span>활동 형태</span><strong>{program.format}</strong></article></section>
    <section className="detailSection"><h2>핵심어</h2><div className="detailTags">{program.tags.map((tag)=><span key={tag}>{tag}</span>)}</div></section>
  </main></>;
}
