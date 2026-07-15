'use client';

import { useState } from 'react';
import { CheckCircle2, Send } from 'lucide-react';
import { Header } from '@/components/Header';

export default function SubmitPage() {
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setError('');
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.get('title'), author: form.get('author'), url: form.get('url'),
        category: form.get('category'), grade: form.get('grade'), summary: form.get('summary'),
        tags: String(form.get('tags') || '').split(',').map((tag) => tag.trim()).filter(Boolean),
      }),
    });
    const result = await response.json();
    setLoading(false);
    if (!response.ok) { setError(result.error || '저장하지 못했습니다.'); return; }
    setDone(true);
  }

  return <><Header /><main className="container submitPage">
    <section className="submitIntro"><span>SHARE A PROGRAM</span><h1>좋은 학습 프로그램을<br />사이랩에 제안해 주세요.</h1><p>제안된 프로그램은 관리자 검토 후 공개됩니다.</p></section>
    {done ? <section className="submitSuccess"><CheckCircle2 size={42} /><h2>제안이 접수되었습니다.</h2><p>관리자 검토함에 안전하게 저장됐습니다. 승인되면 프로그램 목록에 공개됩니다.</p><button onClick={() => setDone(false)}>다른 프로그램 제안하기</button></section> :
    <form className="submitForm" onSubmit={submit}>
      <div className="formColumns"><label>프로그램명<input name="title" required /></label><label>제작자명<input name="author" required /></label></div>
      <label>실행 주소<input name="url" required type="url" placeholder="https://..." /></label>
      <div className="formColumns"><label>과학 영역<select name="category" required defaultValue=""><option value="" disabled>선택</option><option>지질</option><option>전기와 자기</option><option>생명</option><option>화학</option><option>천문</option><option>기타</option></select></label><label>대상 학년<input name="grade" required /></label></div>
      <label>프로그램 설명<textarea name="summary" required /></label><label>핵심어<input name="tags" placeholder="쉼표로 구분" /></label>
      {error && <p style={{color:'#dc2626',margin:0}}>{error}</p>}
      <button className="submitButton" type="submit" disabled={loading}><Send size={17} /> {loading ? '전송 중...' : '프로그램 제안 보내기'}</button>
    </form>}
    <style jsx>{`.submitPage{padding:62px 0 100px;display:grid;grid-template-columns:.8fr 1.2fr;gap:34px;align-items:start}.submitIntro{position:sticky;top:110px;padding:18px 8px}.submitIntro>span{font-size:12px;letter-spacing:.14em;font-weight:900;color:#5b5cf0}.submitIntro h1{font-size:46px;line-height:1.08;letter-spacing:-.055em;margin:12px 0 16px}.submitIntro p{color:#667085;line-height:1.75;font-size:17px}.submitForm,.submitSuccess{background:#fff;border:1px solid #e7e9f0;border-radius:26px;padding:28px;box-shadow:0 24px 70px rgba(36,40,70,.11)}.submitForm{display:grid;gap:16px}.submitForm label{display:grid;gap:8px;font-weight:800;font-size:14px}.submitForm input,.submitForm textarea,.submitForm select{width:100%;border:1px solid #e7e9f0;border-radius:13px;padding:13px 14px;background:#fff;outline:0;font:inherit}.submitForm textarea{min-height:140px;resize:vertical}.submitButton,.submitSuccess button{border:0;border-radius:13px;background:#111827;color:#fff;padding:14px 16px;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px}.submitSuccess{text-align:center;padding:54px 34px}.submitSuccess :global(svg){color:#16a34a}.submitSuccess p{color:#667085;line-height:1.7}.submitSuccess button{margin:auto}.formColumns{display:grid;grid-template-columns:1fr 1fr;gap:12px}@media(max-width:820px){.submitPage{grid-template-columns:1fr}.submitIntro{position:static}}@media(max-width:620px){.formColumns{grid-template-columns:1fr}}`}</style>
  </main></>;
}
