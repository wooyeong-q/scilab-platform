'use client';

import { useState } from 'react';
import { CheckCircle2, Send } from 'lucide-react';
import { Header } from '@/components/Header';

export default function SubmitPage(){
  const[done,setDone]=useState(false);const[loading,setLoading]=useState(false);const[error,setError]=useState('');
  async function submit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();setLoading(true);setError('');const form=new FormData(event.currentTarget);const value=(key:string)=>form.get(key);
    const response=await fetch('/api/submissions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:value('title'),author:value('author'),url:value('url'),category:value('category'),grade:value('grade'),summary:value('summary'),duration:value('duration'),standard:value('standard'),thumbnailUrl:value('thumbnailUrl'),worksheetUrl:value('worksheetUrl'),pptUrl:value('pptUrl'),videoUrl:value('videoUrl'),sourceUrl:value('sourceUrl'),guideUrl:value('guideUrl'),tags:String(value('tags')||'').split(',').map((tag)=>tag.trim()).filter(Boolean)})});
    const result=await response.json();setLoading(false);if(!response.ok){setError(result.error||'저장하지 못했습니다.');return;}setDone(true);
  }
  return <><Header/><main id="main-content" className="container submitPage"><section className="submitIntro"><span>SHARE A PROGRAM</span><h1>좋은 학습 프로그램을<br/>사이랩에 제안해 주세요.</h1><p>입력한 자료는 관리자 검토 후 공개됩니다. 필수 항목 외에는 비워도 됩니다.</p></section>{done?<section className="submitSuccess" role="status"><CheckCircle2 size={42}/><h2>제안이 접수되었습니다.</h2><p>관리자 검토 후 프로그램 목록에 공개됩니다.</p><button type="button" onClick={()=>setDone(false)}>다른 프로그램 제안하기</button></section>:<form className="submitForm" onSubmit={submit}>
    <div className="formColumns"><label>프로그램명<input name="title" autoComplete="off" required/></label><label>제작자명<input name="author" autoComplete="name" required/></label></div>
    <label>실행 주소<input name="url" required type="url" placeholder="https://..."/></label>
    <div className="formColumns"><label>과학 영역<select name="category" required defaultValue=""><option value="" disabled>선택</option><option>지질</option><option>전기와 자기</option><option>생명</option><option>화학</option><option>천문</option><option>기타</option></select></label><label>대상 학년<input name="grade" required placeholder="예: 중학교 2학년"/></label></div>
    <div className="formColumns"><label>예상 수업 시간<input name="duration" placeholder="예: 20~30분"/></label><label>성취기준<input name="standard" placeholder="성취기준 또는 관련 단원"/></label></div>
    <label>프로그램 설명<textarea name="summary" required/></label><label>핵심어<input name="tags" placeholder="쉼표로 구분"/></label>
    <label>대표 이미지 주소<input name="thumbnailUrl" type="url" placeholder="공개 이미지 주소"/></label>
    <h3>연결 자료</h3><label>활동지 링크<input name="worksheetUrl" type="url" placeholder="Google Drive 또는 PDF 주소"/></label><label>PPT 링크<input name="pptUrl" type="url"/></label><label>수업 영상 링크<input name="videoUrl" type="url"/></label><label>소스코드 링크<input name="sourceUrl" type="url"/></label><label>교사용 안내자료<input name="guideUrl" type="url"/></label>
    {error&&<p className="formError" role="alert">{error}</p>}<button className="submitButton" type="submit" disabled={loading}><Send size={17}/>{loading?'전송 중...':'프로그램 제안 보내기'}</button>
  </form>}</main></>;
}
