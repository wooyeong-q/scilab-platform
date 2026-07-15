'use client';

import { useEffect, useState } from 'react';
import { LogOut, PencilLine, Save, Trash2, Check, X, Eye, Play, Heart } from 'lucide-react';
import type { Program } from '@/lib/programs';

type Submission = { id:string; title:string; author:string; url:string; category:string; grade:string; summary:string; tags:string[]; status:string; createdAt:string };

export function AdminConsole() {
  const [authenticated,setAuthenticated]=useState<boolean|null>(null);
  const [password,setPassword]=useState('');
  const [error,setError]=useState('');
  const [programs,setPrograms]=useState<Program[]>([]);
  const [submissions,setSubmissions]=useState<Submission[]>([]);
  const [editing,setEditing]=useState<Program|null>(null);
  const [tagInput,setTagInput]=useState('');

  async function load(){const response=await fetch('/api/admin/data',{cache:'no-store'});if(response.status===401){setAuthenticated(false);return;}const data=await response.json();if(!response.ok){setError(data.error||'불러오지 못했습니다.');setAuthenticated(false);return;}setPrograms(data.programs);setSubmissions(data.submissions);setAuthenticated(true);}
  useEffect(()=>{load();},[]);
  async function login(e:React.FormEvent){e.preventDefault();setError('');const r=await fetch('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});const d=await r.json();if(!r.ok){setError(d.error);return;}setPassword('');load();}
  async function logout(){await fetch('/api/admin/logout',{method:'POST'});setAuthenticated(false);}
  async function review(id:string,action:'approve'|'reject'){setError('');const response=await fetch(`/api/admin/submissions/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({action})});const data=await response.json().catch(()=>({}));if(!response.ok){setError(data.error||'처리하지 못했습니다.');return;}await load();}
  async function removeProgram(id:string){if(!confirm('이 프로그램을 삭제할까요?'))return;setError('');const response=await fetch(`/api/admin/programs/${id}`,{method:'DELETE'});const data=await response.json().catch(()=>({}));if(!response.ok){setError(data.error||'삭제하지 못했습니다.');return;}setPrograms((current)=>current.filter((program)=>program.id!==id));await load();}
  function startEdit(program:Program){setError('');setEditing({...program});setTagInput(program.tags.join(', '));}
  async function save(e:React.FormEvent){e.preventDefault();if(!editing)return;setError('');const tags=Array.from(new Set(tagInput.split(',').map((tag)=>tag.trim()).filter(Boolean)));const payload={...editing,tags};const response=await fetch(`/api/admin/programs/${editing.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const data=await response.json().catch(()=>({}));if(!response.ok){setError(data.error||'저장하지 못했습니다.');return;}setEditing(null);setTagInput('');await load();}

  if(authenticated===null)return <div className="adminNotice">관리자 상태를 확인하는 중입니다.</div>;
  if(!authenticated)return <form className="editModal" onSubmit={login}><div className="modalHeader"><div><span>ADMIN LOGIN</span><h2>관리자 로그인</h2></div></div><label>비밀번호<input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} autoFocus required/></label>{error&&<p style={{color:'#dc2626'}}>{error}</p>}<button className="saveButton" type="submit">로그인</button></form>;

  return <>
    {error&&<div className="adminNotice" style={{color:'#dc2626'}}>{error}</div>}
    <div style={{display:'flex',justifyContent:'flex-end',marginBottom:16}}><button className="saveButton" onClick={logout}><LogOut size={16}/> 로그아웃</button></div>
    <h2>등록 제안</h2>
    <section className="adminList">{submissions.length===0?<div className="adminNotice">대기 중인 제안이 없습니다.</div>:submissions.map((item)=><article className="adminCard" key={item.id}><div className="adminIcon">🧪</div><div className="adminInfo"><span>{item.status} · {item.category} · {item.grade}</span><h2>{item.title}</h2><p>{item.author} · {item.summary}</p></div><div className="adminActions">{item.status==='pending'&&<><button onClick={()=>review(item.id,'approve')}><Check size={16}/> 승인</button><button className="danger" onClick={()=>review(item.id,'reject')}><X size={16}/> 반려</button></>}</div></article>)}</section>
    <h2 style={{marginTop:38}}>공개 프로그램</h2>
    <section className="adminList">{programs.map((program)=><article className="adminCard" key={program.id}><div className="adminIcon">{program.icon}</div><div className="adminInfo"><span>{program.category} · {program.grade}</span><h2>{program.title}</h2><a href={program.url} target="_blank" rel="noreferrer">{program.url}</a><div className="adminStats"><span><Eye size={13}/> 조회 {program.viewCount||0}</span><span><Play size={13}/> 실행 {program.launchCount||0}</span><span><Heart size={13}/> 추천 {program.likeCount||0}</span></div></div><div className="adminActions"><button onClick={()=>startEdit(program)}><PencilLine size={16}/> 수정</button><button className="danger" onClick={()=>removeProgram(program.id)}><Trash2 size={16}/> 삭제</button></div></article>)}</section>
    {editing&&<div className="modalBackdrop" onMouseDown={()=>{setEditing(null);setTagInput('')}}><form className="editModal" onSubmit={save} onMouseDown={(e)=>e.stopPropagation()}><div className="modalHeader"><div><span>EDIT PROGRAM</span><h2>{editing.title}</h2></div><button type="button" onClick={()=>{setEditing(null);setTagInput('')}}>×</button></div>
      <label>프로그램 이름<input value={editing.title} onChange={(e)=>setEditing({...editing,title:e.target.value})} required/></label>
      <label>실행 주소<input type="url" value={editing.url} onChange={(e)=>setEditing({...editing,url:e.target.value})} required/></label>
      <label>프로그램 설명<textarea value={editing.summary} onChange={(e)=>setEditing({...editing,summary:e.target.value,description:e.target.value})} required/></label>
      <div className="formColumns"><label>과학 영역<input value={editing.category} onChange={(e)=>setEditing({...editing,category:e.target.value})}/></label><label>대상 학년<input value={editing.grade} onChange={(e)=>setEditing({...editing,grade:e.target.value})}/></label></div>
      <label>핵심어<input value={tagInput} onChange={(e)=>setTagInput(e.target.value)} placeholder="예: 광물, 굳기, 조흔색"/><small style={{color:'#667085',fontWeight:500}}>쉼표로 구분하면 여러 개를 등록할 수 있습니다.</small></label>
      <h3 style={{margin:'8px 0 0'}}>연결 자료</h3>
      <label>활동지 링크<input type="url" value={editing.worksheetUrl||''} onChange={(e)=>setEditing({...editing,worksheetUrl:e.target.value})} placeholder="Google Drive 또는 PDF 주소"/></label>
      <label>PPT 링크<input type="url" value={editing.pptUrl||''} onChange={(e)=>setEditing({...editing,pptUrl:e.target.value})} placeholder="Google Drive 또는 공개 주소"/></label>
      <label>수업 영상 링크<input type="url" value={editing.videoUrl||''} onChange={(e)=>setEditing({...editing,videoUrl:e.target.value})} placeholder="YouTube 등"/></label>
      <label>소스코드 링크<input type="url" value={editing.sourceUrl||''} onChange={(e)=>setEditing({...editing,sourceUrl:e.target.value})} placeholder="GitHub 등"/></label>
      <label>교사용 안내자료 링크<input type="url" value={editing.guideUrl||''} onChange={(e)=>setEditing({...editing,guideUrl:e.target.value})} placeholder="문서 또는 PDF 주소"/></label>
      <button className="saveButton" type="submit"><Save size={17}/> 저장</button></form></div>}
  </>;
}