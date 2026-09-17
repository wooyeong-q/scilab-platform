import Link from 'next/link';
import Image from 'next/image';
import { assetUrl, fileSize } from '@/lib/program-assets';
import { notFound } from 'next/navigation';
import { ArrowLeft, BookOpen, Clock3, FileText, Github, MonitorPlay, Presentation, School, Video } from 'lucide-react';
import { Header } from '@/components/Header';
import { ProgramInteractions } from '@/components/ProgramInteractions';
import { getProgram, getPrograms } from '@/lib/program-cache';

export const revalidate = 60;

export async function generateStaticParams() {
  return (await getPrograms()).map(({ id }) => ({ id }));
}

export default async function ProgramPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const program=await getProgram(id);
  if(!program) notFound();
  const images=(program.assets||[]).filter(asset=>asset.kind==='image');
  const files=(program.assets||[]).filter(asset=>asset.kind==='file');
  const resources=[
    {label:'활동지',url:program.worksheetUrl,icon:<FileText size={20}/>},
    {label:'수업용 PPT',url:program.pptUrl,icon:<Presentation size={20}/>},
    {label:'수업 영상',url:program.videoUrl,icon:<Video size={20}/>},
    {label:'소스코드',url:program.sourceUrl,icon:<Github size={20}/>},
    {label:'교사용 안내자료',url:program.guideUrl,icon:<BookOpen size={20}/>},
  ].filter((item)=>item.url);

  return <><Header/><main className="container detailPage">
    <Link href="/" className="backLink"><ArrowLeft size={17}/> 프로그램 목록</Link>
    <section className="detailHero"><div className="detailIcon">{program.icon}</div><div className="detailCopy"><span>{program.category}</span><h1>{program.title}</h1><p style={{whiteSpace:'pre-wrap'}}>{program.description}</p></div></section>
    {images.length>0&&<section className="descriptionImages" aria-label="프로그램 설명 이미지">{images.map(image=><a key={image.id} href={assetUrl(image.id)} target="_blank" rel="noreferrer" aria-label={`${image.name} 원본 보기`}><Image unoptimized src={assetUrl(image.id)} width={1200} height={800} alt={image.name} loading="lazy"/></a>)}</section>}
    <ProgramInteractions id={program.id} url={program.url} initialViews={program.viewCount} initialLaunches={program.launchCount} initialLikes={program.likeCount}/>
    <section className="detailGrid"><article><School/><span>대상</span><strong>{program.grade}</strong></article><article><Clock3/><span>예상 시간</span><strong>{program.duration}</strong></article><article><MonitorPlay/><span>활동 형태</span><strong>{program.format}</strong></article></section>
    <section className="detailSection"><h2>핵심어</h2><div className="detailTags">{program.tags.map((tag)=><span key={tag}>{tag}</span>)}</div></section>
    <section className="detailSection"><h2>수업 자료</h2>{resources.length===0&&files.length===0?<p style={{color:'#667085'}}>아직 등록된 수업 자료가 없습니다.</p>:<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:12}}>{files.map(file=><a className="attachmentDownload" key={file.id} href={`${assetUrl(file.id)}?download=1`} download={file.name}><FileText size={22}/><span>{file.name}<small>{fileSize(file.size)} · 다운로드</small></span></a>)}{resources.map((item)=><a key={item.label} href={item.url} target="_blank" rel="noreferrer" style={{display:'flex',alignItems:'center',gap:10,padding:16,border:'1px solid #e7e9f0',borderRadius:14,fontWeight:800}}>{item.icon}{item.label}</a>)}</div>}</section>
  </main></>;
}