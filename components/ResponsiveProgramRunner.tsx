'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, Maximize2, RotateCcw, X } from 'lucide-react';

export function ResponsiveProgramRunner({title,url,programId}:{title:string;url:string;programId:string}){
  const shellRef=useRef<HTMLDivElement>(null);
  const router=useRouter();
  const [portrait,setPortrait]=useState(false);
  const [loaded,setLoaded]=useState(false);

  useEffect(()=>{
    const update=()=>setPortrait(window.innerWidth<720&&window.innerHeight>window.innerWidth);
    update();window.addEventListener('resize',update);
    return()=>window.removeEventListener('resize',update);
  },[]);

  async function fullscreen(){
    const element=shellRef.current;
    if(!element)return;
    try{if(document.fullscreenElement)await document.exitFullscreen();else await element.requestFullscreen();}catch{}
  }

  async function closeRunner(){
    try{if(document.fullscreenElement)await document.exitFullscreen();}catch{}
    router.push(`/programs/${programId}`);
  }

  return <main className="runnerPage">
    <header className="runnerHeader">
      <div><span>MOBILE RUN MODE</span><h1>{title}</h1></div>
      <div className="runnerActions">
        <button type="button" onClick={fullscreen}><Maximize2 size={17}/> 전체 화면</button>
        <a href={url} target="_blank" rel="noreferrer"><ExternalLink size={17}/> 원본 열기</a>
        <button type="button" className="runnerCloseAction" onClick={closeRunner}><X size={18}/> 닫기</button>
      </div>
    </header>
    {portrait&&<div className="rotateNotice"><RotateCcw size={20}/><div><strong>가로 모드를 권장해요.</strong><span>실험 공간이 넓어져 조작하기 편합니다.</span></div></div>}
    <div className="runnerShell" ref={shellRef}>
      <button type="button" className="runnerFloatingClose" onClick={closeRunner} aria-label="프로그램 닫기" title="프로그램 닫기"><X size={24}/></button>
      {!loaded&&<div className="runnerLoading">프로그램을 불러오는 중입니다.</div>}
      <iframe src={url} title={title} onLoad={()=>setLoaded(true)} allow="fullscreen; clipboard-read; clipboard-write" />
    </div>
    <p className="runnerHelp">화면이 비어 있거나 조작이 제한되면 <strong>원본 열기</strong>를 눌러 주세요.</p>
  </main>;
}
