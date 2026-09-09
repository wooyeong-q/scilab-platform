// @ts-nocheck
'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Printer, Save, Shuffle, UsersRound } from 'lucide-react';
import { Header } from '@/components/Header';

const SEAT_W = 118;
const SEAT_H = 66;
const STORE_KEY = 'scilab-seat-arrangement-v1';
const DEFAULT_NAMES = [
  '김민준','이서준','박도윤','최예준','정시우','강하준','조지호','윤주원','장우진','임건우',
  '한서윤','오지우','서하은','신지민','권유진','황채원','안수아','송나연','전예은','홍다은',
  '유현우','고준서','문도현','양지훈','손민재','배은우','백하린','허지아','남소율'
];

const sleep = (ms:number) => new Promise((resolve)=>setTimeout(resolve,ms));
const shuffled = (items:any[]) => {
  const a=[...items];
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  return a;
};

function makeSeats(rows:number, cols:number, width=900) {
  const result:any[]=[];
  const leftPad=48, topPad=86;
  const gapX=Math.max(8,Math.min(28,(Math.max(width,760)-leftPad*2-cols*SEAT_W)/Math.max(1,cols-1)));
  const gapY=18;
  for(let r=0;r<rows;r++) for(let c=0;c<cols;c++) result.push({
    active:true,
    x:Math.round(leftPad+c*(SEAT_W+gapX)),
    y:Math.round(topPad+r*(SEAT_H+gapY))
  });
  return result;
}

export default function SeatArrangementPage(){
  const stageRef=useRef<HTMLDivElement|null>(null);
  const dragRef=useRef<any>(null);
  const [namesText,setNamesText]=useState(DEFAULT_NAMES.join('\n'));
  const [rows,setRows]=useState(6);
  const [cols,setCols]=useState(5);
  const [seats,setSeats]=useState<any[]>([]);
  const [assignments,setAssignments]=useState<Record<number,string>>({});
  const [preview,setPreview]=useState<Record<number,string>|null>(null);
  const [shuffling,setShuffling]=useState(false);
  const [message,setMessage]=useState('아직 배정하지 않았습니다.');
  const [teacherOpen,setTeacherOpen]=useState(false);
  const [teacherUnlocked,setTeacherUnlocked]=useState(false);
  const [pin,setPin]=useState('2468');
  const [pinInput,setPinInput]=useState('');
  const [newPin,setNewPin]=useState('');
  const [overrides,setOverrides]=useState<any[]>([]);
  const [toast,setToast]=useState('');

  const names=useMemo(()=>namesText.split('\n').map(v=>v.trim()).filter(Boolean),[namesText]);
  const activeIndexes=useMemo(()=>seats.map((s,i)=>s.active?i:-1).filter(i=>i>=0),[seats]);

  const notify=(text:string)=>{setToast(text);window.setTimeout(()=>setToast(''),1700);};

  useEffect(()=>{
    try{
      const raw=localStorage.getItem(STORE_KEY);
      if(raw){
        const saved=JSON.parse(raw);
        setNamesText(saved.namesText||DEFAULT_NAMES.join('\n'));
        setRows(saved.rows||6);setCols(saved.cols||5);
        setSeats(Array.isArray(saved.seats)?saved.seats:makeSeats(6,5));
        setAssignments(saved.assignments||{});setOverrides(saved.overrides||[]);setPin(saved.pin||'2468');
      } else setSeats(makeSeats(6,5));
    }catch{setSeats(makeSeats(6,5));}
  },[]);

  useEffect(()=>{
    const key=(e:KeyboardEvent)=>{
      if(e.ctrlKey&&e.shiftKey&&e.key.toLowerCase()==='l'){
        e.preventDefault();setTeacherUnlocked(false);setPinInput('');setTeacherOpen(true);
      }
    };
    window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
  },[]);

  const overlaps=(moving:number,x:number,y:number,current=seats)=>{
    const a={l:x,t:y,r:x+SEAT_W,b:y+SEAT_H};
    for(let i=0;i<current.length;i++){
      if(i===moving||!current[i].active)continue;
      const b={l:current[i].x,t:current[i].y,r:current[i].x+SEAT_W,b:current[i].y+SEAT_H};
      if(!(a.r<=b.l||a.l>=b.r||a.b<=b.t||a.t>=b.b)) return true;
    }
    return false;
  };

  useEffect(()=>{
    const move=(e:PointerEvent)=>{
      const d=dragRef.current;if(!d||!stageRef.current)return;
      const rect=stageRef.current.getBoundingClientRect();
      let x=Math.round(Math.max(0,Math.min(stageRef.current.clientWidth-SEAT_W,e.clientX-rect.left-d.ox)));
      let y=Math.round(Math.max(48,Math.min(stageRef.current.clientHeight-SEAT_H,e.clientY-rect.top-d.oy)));
      setSeats(current=>{
        if(overlaps(d.i,x,y,current)) return current;
        const next=current.map((s,idx)=>idx===d.i?{...s,x,y}:s);
        d.lastX=x;d.lastY=y;return next;
      });
    };
    const up=()=>{dragRef.current=null;};
    window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);window.addEventListener('pointercancel',up);
    return()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',up);};
  },[seats]);

  const startDrag=(e:any,i:number)=>{
    if(shuffling||!stageRef.current)return;
    const rect=stageRef.current.getBoundingClientRect();
    dragRef.current={i,ox:e.clientX-rect.left-seats[i].x,oy:e.clientY-rect.top-seats[i].y};
    e.currentTarget.setPointerCapture?.(e.pointerId);e.preventDefault();
  };

  const toggleSeat=(i:number)=>{
    if(shuffling)return;
    if(Object.keys(assignments).length){notify('배정 결과를 지운 뒤 좌석을 변경하세요.');return;}
    setSeats(current=>current.map((s,idx)=>idx===i?{...s,active:!s.active}:s));
  };

  const rebuild=()=>{
    const r=Math.max(1,Math.min(10,Number(rows)||6));const c=Math.max(1,Math.min(10,Number(cols)||5));
    setRows(r);setCols(c);setAssignments({});setSeats(makeSeats(r,c,stageRef.current?.clientWidth||900));setMessage('책상을 새로 만들었습니다.');
  };

  const arrangeGrid=()=>{
    const fresh=makeSeats(rows,cols,stageRef.current?.clientWidth||900);
    setSeats(current=>fresh.map((s,i)=>({...s,active:current[i]?.active!==false})));
    notify('격자형으로 정렬했습니다.');
  };

  const centerSeats=()=>{
    if(!stageRef.current||!activeIndexes.length)return;
    const used=activeIndexes.map(i=>seats[i]);
    const minX=Math.min(...used.map(s=>s.x));const maxX=Math.max(...used.map(s=>s.x+SEAT_W));
    const delta=Math.round((stageRef.current.clientWidth-(maxX-minX))/2-minX);
    setSeats(current=>current.map((s,i)=>activeIndexes.includes(i)?{...s,x:Math.max(0,Math.min((stageRef.current?.clientWidth||900)-SEAT_W,s.x+delta))}:s));
  };

  const buildFinal=()=>{
    if(!names.length)throw new Error('학생 이름을 입력하세요.');
    if(activeIndexes.length<names.length)throw new Error('학생 수보다 사용 좌석이 적습니다.');
    const usedNames=new Set<string>(),usedSeats=new Set<number>(),valid:any[]=[];
    overrides.forEach(o=>{
      const seat=Number(o.seat),name=String(o.name||'').trim();
      if(!name||!names.includes(name)||!activeIndexes.includes(seat)||usedNames.has(name)||usedSeats.has(seat))return;
      valid.push({name,seat});usedNames.add(name);usedSeats.add(seat);
    });
    const restNames=shuffled(names.filter(n=>!usedNames.has(n)));
    const restSeats=shuffled(activeIndexes.filter(i=>!usedSeats.has(i)));
    const result:Record<number,string>={};
    valid.forEach(o=>result[o.seat]=o.name);restNames.forEach((name,i)=>result[restSeats[i]]=name);
    return result;
  };

  const randomPreview=()=>{
    const ns=shuffled(names),ss=shuffled(activeIndexes),map:Record<number,string>={};
    for(let i=0;i<Math.min(ns.length,ss.length);i++)map[ss[i]]=ns[i];
    return map;
  };

  const runShuffle=async()=>{
    try{
      setShuffling(true);setAssignments({});setMessage('이름이 섞이는 중...');
      const final=buildFinal();
      const delays=[35,35,35,40,40,45,50,55,65,80,100,130,170,220];
      for(const delay of delays){setPreview(randomPreview());await sleep(delay);}
      setPreview(final);await sleep(180);setAssignments(final);setPreview(null);
      setMessage(`배정 완료! ${Object.keys(final).length}명의 자리가 정해졌습니다.`);
    }catch(e:any){notify(e.message||'배정 중 오류가 발생했습니다.');setPreview(null);}
    finally{setShuffling(false);}
  };

  const save=()=>{
    localStorage.setItem(STORE_KEY,JSON.stringify({namesText,rows,cols,seats,assignments,overrides,pin}));notify('현재 상태를 저장했습니다.');
  };
  const reset=()=>{
    if(!window.confirm('자리배치 데이터를 초기화할까요?'))return;
    localStorage.removeItem(STORE_KEY);setNamesText(DEFAULT_NAMES.join('\n'));setRows(6);setCols(5);setSeats(makeSeats(6,5,stageRef.current?.clientWidth||900));
    setAssignments({});setOverrides([]);setPin('2468');setMessage('아직 배정하지 않았습니다.');
  };
  const print=()=>window.print();

  const shown=preview||assignments;
  const activeCount=activeIndexes.length;
  const status=`학생 ${names.length}명 · 사용 좌석 ${activeCount}개${activeCount<names.length?` · 좌석 ${names.length-activeCount}개 부족`:activeCount>names.length?` · 빈자리 ${activeCount-names.length}개 예정`:''}`;

  return <>
    <Header/>
    <main className="seatPage">
      <div className="seatTop container">
        <div>
          <Link href="/class-activities" className="back"><ArrowLeft size={16}/> 학급활동</Link>
          <h1>자리배치</h1><p>책상 위 이름이 빠르게 섞이다가 최종 자리에서 멈춥니다.</p>
        </div>
        <div className="topButtons"><button onClick={print}><Printer size={17}/> 교탁용 인쇄</button><button onClick={save}><Save size={17}/> 저장</button><button onClick={reset}>초기화</button></div>
      </div>

      <div className="work container">
        <aside className="settings card noPrint">
          <h2>학생 / 교실 설정</h2>
          <label>학생 이름</label><textarea value={namesText} onChange={e=>setNamesText(e.target.value)}/>
          <div className="numberRow"><div><label>책상 행</label><input type="number" min="1" max="10" value={rows} onChange={e=>setRows(Number(e.target.value))}/></div><div><label>책상 열</label><input type="number" min="1" max="10" value={cols} onChange={e=>setCols(Number(e.target.value))}/></div></div>
          <button className="wide" onClick={rebuild}>책상 수 다시 만들기</button>
          <p className="hint">책상은 서로 겹칠 수 없지만 딱 붙일 수 있어 짝궁·모둠 배치가 가능합니다. 더블클릭하면 좌석을 제외합니다.</p>
          <div className="status">{status}</div>
        </aside>

        <section className="right">
          <div className="classroom card printArea">
            <div className="printTitle"><strong>자리 배치표</strong><span>{new Date().toLocaleDateString('ko-KR')} · 칠판 쪽이 위</span></div>
            <div className="board">칠 판</div>
            <div className="stageWrap"><div className="stage" ref={stageRef}>
              <div className="teacherDesk">교 탁</div>
              {seats.map((s,i)=><div key={i} className={`seat ${s.active?'':'off'} ${shuffling?'mixing':''}`} style={{left:s.x,top:s.y}} onPointerDown={e=>startDrag(e,i)} onDoubleClick={()=>toggleSeat(i)}>
                <span className="seatNo">{i+1}</span><strong>{s.active?(shown[i]||'빈 자리'):'사용 안 함'}</strong><span className="grip">⋮⋮</span>
              </div>)}
            </div></div>
            <div className="deskButtons noPrint"><button onClick={arrangeGrid}>격자형 정렬</button><button onClick={centerSeats}>가운데 맞춤</button><button onClick={print}><Printer size={16}/> 교탁용 인쇄</button></div>
          </div>

          <div className="shuffleBox card noPrint">
            <div><div className="activityIcon"><UsersRound size={22}/></div><h2>자리 섞기</h2><p>모든 책상의 이름이 동시에 빠르게 바뀌다가 약 2~3초 안에 최종 자리에서 멈춥니다.</p></div>
            <div className="shuffleControls"><button className="shuffleMain" onClick={runShuffle} disabled={shuffling}><Shuffle size={20}/>{shuffling?'섞는 중...':'빙글빙글 자리 정하기'}</button><div className="message">{message}</div><div className="minor"><button onClick={runShuffle} disabled={shuffling}>다시 배정</button><button onClick={()=>{setAssignments({});setPreview(null);setMessage('배정 결과를 지웠습니다.');}} disabled={shuffling}>결과 지우기</button></div></div>
          </div>
        </section>
      </div>
    </main>

    {teacherOpen&&<div className="modalBack noPrint" onMouseDown={e=>{if(e.target===e.currentTarget)setTeacherOpen(false)}}><div className="modal">
      {!teacherUnlocked?<><h2>교사 설정</h2><p>교사 PIN을 입력하세요.</p><input autoFocus type="password" value={pinInput} onChange={e=>setPinInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){if(pinInput===pin)setTeacherUnlocked(true);else notify('PIN이 맞지 않습니다.')}}}/><div className="modalButtons"><button onClick={()=>setTeacherOpen(false)}>닫기</button><button className="primary" onClick={()=>{if(pinInput===pin)setTeacherUnlocked(true);else notify('PIN이 맞지 않습니다.')}}>확인</button></div></>:
      <><h2>교사 설정 <span className="secret">학생 화면 비노출</span></h2><p>지정석도 섞이는 동안에는 일반 랜덤처럼 보이고 마지막에 지정 자리에서 멈춥니다.</p>
        <div className="overrideList">{overrides.length===0&&<div className="empty">현재 지정된 자리가 없습니다.</div>}{overrides.map((o,idx)=><div className="override" key={idx}><select value={o.name} onChange={e=>setOverrides(v=>v.map((x,j)=>j===idx?{...x,name:e.target.value}:x))}>{names.map(n=><option key={n}>{n}</option>)}</select><select value={o.seat} onChange={e=>setOverrides(v=>v.map((x,j)=>j===idx?{...x,seat:Number(e.target.value)}:x))}>{activeIndexes.map(i=><option value={i} key={i}>{i+1}번 자리</option>)}</select><button onClick={()=>setOverrides(v=>v.filter((_,j)=>j!==idx))}>삭제</button></div>)}</div>
        <button className="add" onClick={()=>{if(!names.length||!activeIndexes.length)return;const usedN=new Set(overrides.map(o=>o.name)),usedS=new Set(overrides.map(o=>Number(o.seat)));setOverrides(v=>[...v,{name:names.find(n=>!usedN.has(n))||names[0],seat:activeIndexes.find(i=>!usedS.has(i))??activeIndexes[0]}])}}>+ 지정석 추가</button>
        <label className="pinLabel">교사 PIN 변경</label><input type="password" placeholder="새 PIN 4자리 이상" value={newPin} onChange={e=>setNewPin(e.target.value)}/>
        <div className="modalButtons"><button onClick={()=>setTeacherOpen(false)}>닫기</button><button className="primary" onClick={()=>{if(newPin&&newPin.length<4){notify('PIN은 4자리 이상으로 설정하세요.');return;}if(newPin){setPin(newPin);setNewPin('');}window.setTimeout(save,0);setTeacherOpen(false);notify('교사 설정을 저장했습니다.');}}>설정 저장</button></div></>}
    </div></div>}
    {toast&&<div className="toast">{toast}</div>}

    <style jsx>{`
      .seatPage{padding:34px 0 64px;background:#f4f6f9;min-height:calc(100vh - 72px)}
      .seatTop{display:flex;justify-content:space-between;gap:20px;align-items:flex-end;margin-bottom:18px}.seatTop h1{font-size:34px;margin:8px 0 5px}.seatTop p{margin:0;color:#6c7582}.back{display:inline-flex;align-items:center;gap:5px;text-decoration:none;color:#4256e8;font-weight:800;font-size:14px}
      button,input,textarea,select{font:inherit}.topButtons,.deskButtons,.minor{display:flex;gap:8px;flex-wrap:wrap}.topButtons button,.deskButtons button,.minor button,.wide,.add,.modalButtons button{display:inline-flex;align-items:center;justify-content:center;gap:6px;border:1px solid #dfe4ea;background:white;padding:10px 13px;border-radius:11px;font-weight:800;cursor:pointer}
      .work{display:grid;grid-template-columns:340px minmax(0,1fr);gap:18px;align-items:start}.right{display:flex;flex-direction:column;gap:18px}.card{background:white;border:1px solid #e0e5eb;border-radius:18px;box-shadow:0 10px 28px rgba(31,42,68,.08)}
      .settings{padding:18px;position:sticky;top:88px}.settings h2{font-size:19px;margin:0 0 16px}.settings label,.pinLabel{display:block;font-size:13px;font-weight:900;margin:12px 0 7px}.settings textarea{width:100%;height:285px;resize:vertical;border:1px solid #dfe4ea;border-radius:11px;background:#fafbfc;padding:11px;line-height:1.55}.numberRow{display:grid;grid-template-columns:1fr 1fr;gap:9px}.numberRow input,.modal input,.override select{width:100%;padding:10px;border:1px solid #dfe4ea;border-radius:10px}.wide{width:100%;margin-top:12px}.hint{font-size:12px;color:#77808d;line-height:1.55}.status,.message,.empty{padding:11px 12px;border-radius:11px;background:#f5f7fa;color:#667080;font-size:13px}
      .classroom{padding:18px}.board{width:min(520px,86%);margin:0 auto 15px;padding:10px;background:#29323d;color:white;text-align:center;border-radius:9px;font-weight:900;letter-spacing:.16em}.stageWrap{overflow:auto;border:1px solid #e0e5eb;border-radius:14px;padding:9px;background:#fafbfc}.stage{position:relative;min-width:760px;height:560px;overflow:hidden;border-radius:10px;background:linear-gradient(#eef1f5 1px,transparent 1px),linear-gradient(90deg,#eef1f5 1px,transparent 1px),#fff;background-size:40px 40px;touch-action:none}.teacherDesk{position:absolute;z-index:1;left:50%;top:12px;transform:translateX(-50%);padding:7px 17px;border:2px solid #707885;background:#f0f2f5;border-radius:9px;font-size:13px;font-weight:900}
      .seat{position:absolute;width:${SEAT_W}px;height:${SEAT_H}px;border:1px solid #cdd4de;border-radius:13px;background:#fff;display:flex;align-items:center;justify-content:center;text-align:center;padding:7px;box-shadow:0 3px 8px rgba(0,0,0,.06);user-select:none;touch-action:none;cursor:grab;transition:transform .08s,box-shadow .1s}.seat:hover{box-shadow:0 7px 17px rgba(0,0,0,.12)}.seat.off{background:#e8ebef;color:#999;border-style:dashed;opacity:.72}.seat strong{font-size:16px}.seatNo{position:absolute;left:7px;top:5px;font-size:10px;color:#9aa3ae}.grip{position:absolute;right:7px;top:4px;font-size:11px;color:#a5acb5}.seat.mixing{animation:mix .13s linear}@keyframes mix{50%{transform:scale(1.035)}}
      .deskButtons{justify-content:center;margin-top:12px}.printTitle{display:none}.shuffleBox{padding:19px;display:grid;grid-template-columns:1fr 310px;gap:20px;align-items:center}.activityIcon{width:44px;height:44px;display:grid;place-items:center;border-radius:13px;background:#eef1ff;color:#4256e8}.shuffleBox h2{margin:9px 0 5px;font-size:22px}.shuffleBox p{margin:0;color:#6c7582;line-height:1.6}.shuffleMain{width:100%;display:flex;align-items:center;justify-content:center;gap:8px;border:0;background:#4256e8;color:white;padding:14px;border-radius:13px;font-size:17px;font-weight:900;cursor:pointer}.shuffleMain:disabled,.minor button:disabled{opacity:.55}.message{margin-top:9px;font-weight:800;min-height:44px;display:flex;align-items:center}.minor{margin-top:8px}.minor button{flex:1}
      .modalBack{position:fixed;z-index:3000;inset:0;background:rgba(20,25,33,.55);display:grid;place-items:center;padding:20px}.modal{width:min(720px,100%);max-height:86vh;overflow:auto;background:white;border-radius:18px;padding:21px;box-shadow:0 30px 80px rgba(0,0,0,.25)}.modal h2{margin:0 0 7px}.modal p{color:#6c7582;font-size:13px}.modalButtons{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}.modalButtons .primary{background:#4256e8;color:#fff;border-color:#4256e8}.secret{display:inline-block;background:#eef1ff;color:#4256e8;font-size:11px;border-radius:999px;padding:4px 7px}.overrideList{display:grid;gap:8px}.override{display:grid;grid-template-columns:1fr 1fr auto;gap:7px}.override button{border:1px solid #ead0d0;background:#fff;color:#c13e3e;border-radius:9px;font-weight:800}.add{margin-top:10px}.toast{position:fixed;z-index:5000;top:28px;left:50%;transform:translateX(-50%);background:#18212c;color:#fff;padding:10px 17px;border-radius:999px;font-weight:800;box-shadow:0 8px 24px rgba(0,0,0,.2)}
      @media(max-width:980px){.work{grid-template-columns:1fr}.settings{position:static}.shuffleBox{grid-template-columns:1fr}.seatTop{align-items:flex-start;flex-direction:column}.topButtons{width:100%}}
      @media print{
        @page{size:A4 landscape;margin:10mm}.noPrint,:global(header),:global(footer),.seatTop{display:none!important}.seatPage{padding:0;background:white}.work{display:block}.right{display:block}.classroom{border:0;box-shadow:none;padding:0}.printTitle{display:flex;justify-content:space-between;align-items:end;border-bottom:2px solid #222;padding-bottom:4mm;margin-bottom:6mm}.printTitle strong{font-size:22pt}.printTitle span{font-size:10pt}.stageWrap{border:0;padding:0;overflow:visible}.stage{width:100%!important;min-width:0!important;height:155mm!important;border:1px solid #444;background:white!important}.board{background:#222!important;color:white!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}.teacherDesk{background:white}.seat{width:31mm!important;height:18mm!important;border:1.2px solid #444;box-shadow:none;background:white!important}.seat.off{display:none}.seat strong{font-size:10pt}.seatNo{font-size:7pt}.grip{display:none}}
    `}</style>
  </>;
}
