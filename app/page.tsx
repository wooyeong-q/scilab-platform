import Link from 'next/link';
import { ArrowUpRight, LibraryBig } from 'lucide-react';
import { Header } from '@/components/Header';
import { ProgramExplorer } from '@/components/ProgramExplorer';
import { getPrograms } from '@/lib/program-cache';

export const revalidate = 60;

export default async function Home() {
  const programs = await getPrograms();
  return <>
    <Header />
    <main className="catalogHome">
      <section className="container catalogIntro" aria-labelledby="catalog-title">
        <div>
          <span className="catalogEyebrow"><LibraryBig size={16} aria-hidden="true"/> SCIENCE LAB</span>
          <h1 id="catalog-title">과학 수업 프로그램</h1>
          <p>수업에 필요한 가상 실험, 탐구 활동, 게임을 찾아보세요.</p>
        </div>
        <div className="catalogIntroMeta">
          <span><strong>{programs.length}</strong>개의 공개 프로그램</span>
          <Link href="/class-activities">학급활동 도구 <ArrowUpRight size={16} aria-hidden="true"/></Link>
        </div>
      </section>
      <section className="container catalogExplorer" id="programs" aria-label="프로그램 목록">
        <ProgramExplorer programs={programs}/>
      </section>
    </main>
    <footer><div className="container footerInner"><span>SciLab</span><p>과학 수업을 위한 학습 프로그램 플랫폼</p></div></footer>
  </>;
}
