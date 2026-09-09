import Link from 'next/link';
import { ArrowRight, LayoutGrid, UsersRound } from 'lucide-react';
import { Header } from '@/components/Header';

export default function ClassActivitiesPage() {
  return <>
    <Header />
    <main>
      <section className="container" style={{paddingTop:48,paddingBottom:56}}>
        <div style={{maxWidth:760,marginBottom:28}}>
          <div style={{display:'inline-flex',alignItems:'center',gap:8,padding:'7px 11px',borderRadius:999,background:'#eef1ff',color:'#4256e8',fontWeight:800,fontSize:13,marginBottom:14}}>
            <UsersRound size={16}/> CLASS ACTIVITIES
          </div>
          <h1 style={{fontSize:'clamp(32px,5vw,54px)',lineHeight:1.08,margin:'0 0 14px'}}>학급 운영에 필요한 도구를<br/>한곳에서 사용하세요.</h1>
          <p style={{fontSize:17,lineHeight:1.7,color:'#697386',margin:0}}>과학 프로그램과 분리된 학급 활동용 공간입니다. 자리배치처럼 수업과 학급 운영에 바로 쓰는 도구를 모아둘 수 있습니다.</p>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:18}}>
          <Link href="/class-activities/seat-arrangement" style={{textDecoration:'none',color:'inherit'}}>
            <article style={{height:'100%',padding:24,border:'1px solid #e1e5ea',borderRadius:20,background:'#fff',boxShadow:'0 10px 28px rgba(31,42,68,.08)',transition:'transform .15s ease, box-shadow .15s ease'}}>
              <div style={{width:48,height:48,borderRadius:14,display:'grid',placeItems:'center',background:'#eef1ff',color:'#4256e8',marginBottom:18}}><LayoutGrid size={24}/></div>
              <h2 style={{fontSize:23,margin:'0 0 8px'}}>자리배치</h2>
              <p style={{margin:'0 0 20px',color:'#697386',lineHeight:1.65}}>책상을 자유롭게 배치하고 학생 이름을 빠르게 섞어 자리를 정합니다. 교사용 지정석과 인쇄 기능도 포함되어 있습니다.</p>
              <span style={{display:'inline-flex',alignItems:'center',gap:7,color:'#4256e8',fontWeight:900}}>실행하기 <ArrowRight size={17}/></span>
            </article>
          </Link>
        </div>
      </section>
    </main>
    <footer><div className="container footerInner"><span>SciLab</span><p>학급 운영을 위한 활동 도구</p></div></footer>
  </>;
}
