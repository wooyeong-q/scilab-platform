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
  const iframeRef=useRef<HTMLIFrameElement>(null);
  const autoLandscapeTried=useRef(false);
  const router=useRouter();
  const [portrait,setPortrait]=useState(false);
  const [loaded,setLoaded]=useState(false);
  const [rotateMessage,setRotateMessage]=useState('');
  const [reloadKey,setReloadKey]=useState(0);
  const landscapeRecommended=true;
  const classroomStorageKey=programId==='galaxy-voyage'
    ?'scilab-galaxy-classroom'
    :programId==='milky-way-objects'
      ?'scilab-milky-way-objects-classroom'
      :'';

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

  function prepareNewClassroom(){
    if(!classroomStorageKey)return;
    try{window.localStorage.removeItem(classroomStorageKey);}catch{}
    setLoaded(false);
    setReloadKey(value=>value+1);
    showTemporaryMessage('이전 수업 연결을 해제했습니다. 새 수업을 만들 수 있습니다.',3200);
  }

  function enhanceMilkyWayObjects(frameDocument:Document){
    if(programId!=='milky-way-objects'||frameDocument.getElementById('scilabMilkyWayGuide'))return;

    const style=frameDocument.createElement('style');
    style.id='scilabMilkyWayRunnerPatch';
    style.textContent=`
      .scilabMilkyWayGuide{margin:14px 0 16px;padding:12px 13px;border:1px solid rgba(98,232,255,.24);border-radius:15px;background:rgba(98,232,255,.055);display:grid;gap:8px;text-align:left}
      .scilabMilkyWayGuideRow{display:grid;grid-template-columns:64px 1fr;gap:10px;align-items:start;color:#cbd7f0;font-size:11px;line-height:1.45}
      .scilabMilkyWayGuideRow strong{color:#dffaff;font-size:10px;letter-spacing:.04em}
      .scilabMilkyWayGuideKeys{font-weight:850;color:#fff}
      #classifyModal .modalClose{border-color:rgba(98,232,255,.55);background:rgba(98,232,255,.12);box-shadow:0 0 18px rgba(98,232,255,.12);font-size:27px;font-weight:900}
      .scilabClassifyReturnBar{position:sticky;z-index:30;bottom:-1px;margin:16px -6px -8px;padding:12px 6px 6px;background:linear-gradient(180deg,rgba(6,10,29,0),rgba(6,10,29,.96) 28%)}
      .scilabClassifyReturnButton{width:100%;min-height:50px;border:1px solid rgba(98,232,255,.55);border-radius:14px;background:linear-gradient(135deg,rgba(98,232,255,.22),rgba(114,135,255,.18));color:#effcff;font:inherit;font-weight:900;cursor:pointer;box-shadow:0 10px 28px rgba(0,0,0,.24)}
      .scilabClassifyReturnButton:hover{border-color:#62e8ff;background:linear-gradient(135deg,rgba(98,232,255,.3),rgba(114,135,255,.25))}
      #classifyModal #openReportButton{background:rgba(255,255,255,.07)!important;border:1px solid rgba(159,183,255,.3)!important;color:#dce6fb!important;box-shadow:none!important}
      #classifyModal .classifyResult .modalActions::before{content:'탐사를 충분히 마쳤다면';display:block;margin:0 0 7px;color:#9ba9c7;font-size:10px;text-align:center}
      @media(max-width:700px){
        .scilabMilkyWayGuide{margin:10px 0 12px;padding:10px;gap:6px}
        .scilabMilkyWayGuideRow{grid-template-columns:54px 1fr;gap:7px;font-size:9.5px}
        .scilabMilkyWayGuideRow strong{font-size:9px}
        #classifyModal .modalClose{position:sticky;top:0;z-index:40;width:48px;height:48px;flex-basis:48px;background:rgba(8,18,42,.96)}
        .scilabClassifyReturnBar{margin-top:12px;padding-bottom:calc(7px + env(safe-area-inset-bottom,0px))}
        .scilabClassifyReturnButton{min-height:52px;font-size:14px}
      }
    `;
    frameDocument.head.appendChild(style);

    const introCard=frameDocument.querySelector('#introModal .introModalCard');
    const classroomForm=frameDocument.querySelector('#introModal .classroomForm');
    if(introCard&&classroomForm){
      const guide=frameDocument.createElement('div');
      guide.id='scilabMilkyWayGuide';
      guide.className='scilabMilkyWayGuide';
      guide.innerHTML=`
        <div class="scilabMilkyWayGuideRow"><strong>조작</strong><span><span class="scilabMilkyWayGuideKeys">WASD</span> 이동 · <span class="scilabMilkyWayGuideKeys">Q/E</span> 상승·하강 · 마우스/터치로 시점 변경 · 이동·시점 속도 조절 가능</span></div>
        <div class="scilabMilkyWayGuideRow"><strong>분류</strong><span>천체를 관측한 뒤 <b>탐사 중간에도 언제든 분류</b>할 수 있습니다. 분류 후 다시 탐사로 돌아와 계속 찾을 수 있습니다.</span></div>
        <div class="scilabMilkyWayGuideRow"><strong>UFO</strong><span>우리은하 곳곳에 정체불명의 UFO가 숨어 있습니다. 천체를 탐사하면서 함께 찾아 가까이 접근해 보세요.</span></div>
      `;
      introCard.insertBefore(guide,classroomForm);
    }

    const classifyDescription=frameDocument.querySelector('#classifyModal .classifyHeader p:not(.modalEyebrow)');
    if(classifyDescription){
      classifyDescription.textContent='탐사 중 언제든 관측한 천체를 분류할 수 있습니다. 분류를 마치지 않아도 다시 탐사로 돌아갔다가 나중에 이어서 할 수 있습니다. PC에서는 끌어 놓기, 모바일에서는 천체와 분류함을 차례로 누르세요.';
    }

    const closeClassifyButton=frameDocument.getElementById('closeClassifyButton') as HTMLButtonElement|null;
    if(closeClassifyButton){
      closeClassifyButton.title='분류 화면 닫기 · 탐사로 돌아가기';
      closeClassifyButton.setAttribute('aria-label','분류 화면 닫기 · 탐사로 돌아가기');
    }

    const classifyCard=frameDocument.querySelector('#classifyModal .classifyCard');
    if(classifyCard&&closeClassifyButton){
      const returnBar=frameDocument.createElement('div');
      returnBar.className='scilabClassifyReturnBar';
      const returnButton=frameDocument.createElement('button');
      returnButton.type='button';
      returnButton.className='scilabClassifyReturnButton';
      returnButton.textContent='← 탐사로 돌아가기';
      returnButton.addEventListener('click',()=>closeClassifyButton.click());
      returnBar.appendChild(returnButton);
      classifyCard.appendChild(returnBar);
    }
  }

  function handleFrameLoad(){
    setLoaded(true);
    if(!classroomStorageKey)return;
    try{
      const frameDocument=iframeRef.current?.contentDocument;
      if(!frameDocument)return;
      frameDocument.addEventListener('keydown',event=>{
        const target=event.target as Element|null;
        if(target?.closest?.('input, textarea, select, [contenteditable="true"], [contenteditable=""]')){
          event.stopPropagation();
        }
      },true);
      enhanceMilkyWayObjects(frameDocument);
    }catch{}
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

  useEffect(()=>{
    if(programId!=='galaxy-voyage'||!loaded||!portrait||autoLandscapeTried.current)return;
    autoLandscapeTried.current=true;
    let messageTimer:number|undefined;

    void (async()=>{
      let locked=false;
      try{
        const element=shellRef.current;
        if(element?.requestFullscreen&&!document.fullscreenElement)await element.requestFullscreen();
        const orientation=(window.screen as LockableScreen).orientation;
        if(orientation?.lock){await orientation.lock('landscape');locked=true;}
      }catch{locked=false;}

      if(!locked){
        setRotateMessage('자동 가로 전환이 제한되어 있어요. 위의 가로모드 버튼을 누르거나 휴대폰을 옆으로 돌려 주세요.');
        messageTimer=window.setTimeout(()=>setRotateMessage(''),3600);
      }
    })();

    return()=>{if(messageTimer)window.clearTimeout(messageTimer);};
  },[loaded,portrait,programId]);

  async function closeRunner(){
    try{if(document.fullscreenElement)await document.exitFullscreen();}catch{}
    router.push(`/programs/${programId}`);
  }

  return <main className="runnerPage">
    <header className="runnerHeader">
      <div className="runnerTitleBlock"><span>PROGRAM</span><h1>{title}</h1></div>
      <div className="runnerActions">
        {classroomStorageKey&&<button type="button" onClick={prepareNewClassroom} aria-label="새 수업 준비" title="이전 수업 연결을 해제하고 새 수업 만들기 화면으로 돌아가기"><RotateCcw size={18}/><span className="runnerActionLabel">새 수업 준비</span></button>}
        <button type="button" onClick={fullscreen} aria-label="전체 화면" title="전체 화면"><Maximize2 size={18}/><span className="runnerActionLabel">전체 화면</span></button>
        <a href={url} target="_blank" rel="noreferrer" aria-label="원본 열기" title="원본 열기"><ExternalLink size={18}/><span className="runnerActionLabel">원본 열기</span></a>
        <button type="button" className="runnerCloseAction" onClick={closeRunner} aria-label="닫기" title="닫기"><X size={19}/><span className="runnerActionLabel">닫기</span></button>
      </div>
    </header>
    {portrait&&landscapeRecommended&&<button type="button" className="rotateNotice" onClick={requestLandscape}>
      <RotateCcw size={18}/><div><strong>가로로 보기</strong><span>눌러서 전체화면·가로모드를 시도합니다.</span></div>
    </button>}
    {rotateMessage&&<div className="runnerRotateMessage" role="status">{rotateMessage}</div>}
    <div className="runnerShell" ref={shellRef}>
      <button type="button" className="runnerFloatingClose" onClick={closeRunner} aria-label="프로그램 닫기" title="프로그램 닫기"><X size={21}/></button>
      {!loaded&&<div className="runnerLoading">프로그램을 불러오는 중입니다.</div>}
      <iframe ref={iframeRef} key={reloadKey} src={url} title={title} onLoad={handleFrameLoad} allow="fullscreen; clipboard-read; clipboard-write" />
    </div>
    <p className="runnerHelp">화면이 비어 있거나 조작이 제한되면 <strong>원본 열기</strong>를 눌러 주세요.</p>
  </main>;
}
