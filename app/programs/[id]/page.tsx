import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, BookOpen, Clock3, FileText, Github, MonitorPlay, Presentation, School, Video } from 'lucide-react';
import { Header } from '@/components/Header';
import { ProgramInteractions } from '@/components/ProgramInteractions';
import { getProgram } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function ProgramPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const program=await getProgram(id);
  if(!program) notFound();
  const resources=[
    {label:'활동지',url:program.worksheetUrl,icon:<FileText size={20}/>},
    {label:'수업용 PPT',url:program.pptUrl,icon:<Presentation size={20}/>},
    {label:'수업 영상',url:program.videoUrl,icon:<Video size={20}/>},
    {label:'소스코드',url:program.sourceUrl,icon:<Github size={20}/>},
    {label:'교사용 안내자료',url:program.guideUrl,icon:<BookOpen size={20}/>},
  ].filter((item)=>item.url);

  return <><Header/><main id="main-content" className="container detailPage">
    <Link href="/" className="backLink"><ArrowLeft size={17}/> 프로그램 목록</Link>
    <section className="detailHero"><div className="detailIcon">{program.icon}</div><div className="detailCopy"><span>{program.category}</span><h1>{program.title}</h1><p>{program.description}</p></div></section>
    <ProgramInteractions id={program.id} url={program.url} initialViews={program.viewCount} initialLaunches={program.launchCount} initialLikes={program.likeCount}/>
    <section className="detailGrid"><article><School/><span>대상</span><strong>{program.grade}</strong></article><article><Clock3/><span>예상 시간</span><strong>{program.duration}</strong></article><article><MonitorPlay/><span>활동 형태</span><strong>{program.format}</strong></article></section>
    <section className="detailSection"><h2>핵심어</h2><div className="detailTags">{program.tags.map((tag)=><span key={tag}>{tag}</span>)}</div></section>
    <section className="detailSection"><h2>수업 자료</h2>{resources.length===0?<p className="mutedText">아직 연결된 활동지나 수업 자료가 없습니다.</p>:<div className="resourceGrid">{resources.map((item)=><a className="resourceCard" key={item.label} href={item.url} target="_blank" rel="noreferrer">{item.icon}<span>{item.label}</span></a>)}</div>}</section>
  </main></>;
}
