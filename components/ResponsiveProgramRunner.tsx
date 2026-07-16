'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, Maximize2, RotateCcw, X } from 'lucide-react';

type LockableScreen = Screen & {
  orientation?: {
    lock?: (orientation: string) => Promise<void>;
  };
};

export function ResponsiveProgramRunner({title,url,programId}:{title:string;url:string;programId:string}){
  const shellRef=useRef<HTMLDivElement>(null);
  const router=useRouter();
  const [portrait,setPortrait]=useState(false);
  const [loaded,setLoaded]=useState(false);
  const [rotateMessage,setRotateMessage]=useState('');

  useEffect(()=>{
    const update=()=>setPortrait(window.innerWidth<720&&window.innerHeight>window.innerWidth);
    update();
    window.addEventListener('resize',update);
    window.addEventListener('orientationchange',update);
    return()=>{
      window.removeEventListener('resize',update);
      window.removeEventListener('orientationchange',update);
    };
  },[]);

  function showTemporaryMessage(message:string,delay=2800){
    setRotateMessage(message);
    window.setTimeout(()=>setRotateMessage(''),delay);
  }

  async function fullscreen(){
    const element=shellRef.current;
    if(!element)return;
    try{
      if(document.fullscreenElement)await document.exitFullscreen();
      else await element.requestFullscreen();
    }catch{
      showTemporaryMessage('이 브라우저에서는 전체 화면 실행이 제한되어 있어요.');
    }
  }

  async function requestLandscape(){
    const element=shellRef.current;
    let locked=false;

    try{
      if(element?.requestFullscreen&&!document.fullscreenElement){
        await element.requestFullscreen();
      }
      const orientation=(window.screen as LockableScreen).orientation;
      if(orientation?.lock){
        await orientation.lock('landscape');
        locked=true;
      }
    }catch{
      locked=false;
    }

    if(!locked){
      showTemporaryMessage('자동 회전이 제한되어 있어요. 화면 회전 잠금을 끄고 휴대폰을 옆으로 돌려 주세요.',3200);
    }
  }

  async function closeRunner(){
    try{if(document.fullscreenElement)await document.exitFullscreen();}catch{}
    router.push(`/programs/${programId}`);
  }

  return <main className="runnerPage">
    <header className="runnerHeader">
      <div className="runnerTitleBlock"><span>PROGRAM</span><h1>{title}</h1></div>
      <div className="runnerActions">
        <button type="button" onClick={fullscreen} aria-label="전체 화면" title="전체 화면"><Maximize2 size={18}/><span className="runnerActionLabel">전체 화면</span></button>
        <a href={url} target="_blank" rel="noreferrer" aria-label="원본 열기" title="원본 열기"><ExternalLink size={18}/><span className="runnerActionLabel">원본 열기</span></a>
        <button type="button" className="runnerCloseAction" onClick={closeRunner} aria-label="닫기" title="닫기"><X size={19}/><span className="runnerActionLabel">닫기</span></button>
      </div>
    </header>
    {portrait&&<button type="button" className="rotateNotice" onClick={requestLandscape}>
      <RotateCcw size={18}/><div><strong>가로로 보기</strong><span>눌러서 전체화면·가로모드를 시도합니다.</span></div>
    </button>}
    {rotateMessage&&<div className="runnerRotateMessage" role="status">{rotateMessage}</div>}
    <div className="runnerShell" ref={shellRef}>
      <button type="button" className="runnerFloatingClose" onClick={closeRunner} aria-label="프로그램 닫기" title="프로그램 닫기"><X size={21}/></button>
      {!loaded&&<div className="runnerLoading">프로그램을 불러오는 중입니다.</div>}
      <iframe src={url} title={title} onLoad={()=>setLoaded(true)} allow="fullscreen; clipboard-read; clipboard-write" />
    </div>
    <p className="runnerHelp">화면이 비어 있거나 조작이 제한되면 <strong>원본 열기</strong>를 눌러 주세요.</p>
  </main>;
}
