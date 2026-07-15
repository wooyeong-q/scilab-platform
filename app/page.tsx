import { ArrowRight, BookOpenCheck, Layers3, UsersRound } from 'lucide-react';
import { Header } from '@/components/Header';
import { ProgramExplorer } from '@/components/ProgramExplorer';
import { getPrograms } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const programs = await getPrograms();
  return <>
    <Header />
    <main>
      <section className="hero container">
        <div className="heroCopy"><span className="heroBadge">SCIENCE LEARNING PLATFORM</span><h1>좋은 과학 수업을<br/><em>더 쉽게 발견하세요.</em></h1><p>교사가 만든 가상 실험, 탐구 활동, AI 학습 프로그램을 한곳에서 찾고 바로 수업에 활용하세요.</p><a href="#programs" className="primaryCta">프로그램 둘러보기 <ArrowRight size={18}/></a></div>
        <div className="heroVisual"><div className="visualGlow"/><div className="visualCard large"><span>오늘의 추천</span><strong>{programs.find((p)=>p.featured)?.title || '과학 학습 프로그램'}</strong><small>수업에서 바로 활용할 수 있는 탐구 활동</small></div><div className="visualCard small top"><BookOpenCheck size={22}/><strong>{programs.length}</strong><span>공개 프로그램</span></div><div className="visualCard small bottom"><Layers3 size={22}/><strong>{new Set(programs.map((p)=>p.category)).size}</strong><span>과학 영역</span></div></div>
      </section>
      <section className="container featureStrip"><div><BookOpenCheck/><span><strong>수업 중심</strong><small>교실에서 바로 활용</small></span></div><div><Layers3/><span><strong>단원별 탐색</strong><small>학년과 영역으로 분류</small></span></div><div><UsersRound/><span><strong>교사 공유</strong><small>좋은 프로그램을 함께 확장</small></span></div></section>
      <section className="container explorer" id="programs"><ProgramExplorer programs={programs}/></section>
    </main>
    <footer><div className="container footerInner"><span>SciLab</span><p>과학 수업을 위한 학습 프로그램 플랫폼</p></div></footer>
  </>;
}
