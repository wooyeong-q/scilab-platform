'use client';

import { useState } from 'react';
import { Link2, PencilLine, Save, Trash2 } from 'lucide-react';
import { Header } from '@/components/Header';
import { programs as initialPrograms, type Program } from '@/lib/programs';

export default function AdminPage(){
  const [items,setItems]=useState<Program[]>(initialPrograms);
  const [editing,setEditing]=useState<Program|null>(null);
  const save=(event:React.FormEvent<HTMLFormElement>)=>{
    event.preventDefault(); if(!editing)return;
    setItems((current)=>current.map((item)=>item.id===editing.id?editing:item));
    setEditing(null);
  };
  return <><Header/><main className="container adminPage">
    <div className="adminHeading"><div><span>ADMIN</span><h1>프로그램 관리</h1><p>프로그램명은 고정하고, 실행 주소와 수업 정보를 관리합니다.</p></div></div>
    <div className="adminNotice">현재 변경 내용은 새로고침하면 초기화됩니다. 다음 단계에서 데이터베이스와 관리자 인증을 연결합니다.</div>
    <section className="adminList">{items.map((program)=><article className="adminCard" key={program.id}>
      <div className="adminIcon">{program.icon}</div>
      <div className="adminInfo"><span>{program.category} · {program.grade}</span><h2>{program.title}</h2><a href={program.url} target="_blank" rel="noreferrer"><Link2 size={14}/> {program.url}</a></div>
      <div className="adminActions"><button onClick={()=>setEditing(program)}><PencilLine size={16}/> 주소·정보 수정</button><button className="danger" onClick={()=>setItems(items.filter((item)=>item.id!==program.id))}><Trash2 size={16}/> 삭제</button></div>
    </article>)}</section>
    {editing&&<div className="modalBackdrop" onMouseDown={()=>setEditing(null)}><form className="editModal" onSubmit={save} onMouseDown={(e)=>e.stopPropagation()}>
      <div className="modalHeader"><div><span>EDIT PROGRAM</span><h2>{editing.title}</h2></div><button type="button" onClick={()=>setEditing(null)}>×</button></div>
      <label>실행 주소<input type="url" value={editing.url} onChange={(e)=>setEditing({...editing,url:e.target.value})} required/></label>
      <label>프로그램 설명<textarea value={editing.summary} onChange={(e)=>setEditing({...editing,summary:e.target.value})} required/></label>
      <div className="formColumns"><label>과학 영역<input value={editing.category} onChange={(e)=>setEditing({...editing,category:e.target.value})}/></label><label>대상 학년<input value={editing.grade} onChange={(e)=>setEditing({...editing,grade:e.target.value})}/></label></div>
      <label>핵심어<input value={editing.tags.join(', ')} onChange={(e)=>setEditing({...editing,tags:e.target.value.split(',').map((tag)=>tag.trim()).filter(Boolean)})}/></label>
      <button className="saveButton" type="submit"><Save size={17}/> 저장</button>
    </form></div>}
  </main></>;
}
