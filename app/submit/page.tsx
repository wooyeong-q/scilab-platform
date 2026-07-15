'use client';

import { useState } from 'react';
import { CheckCircle2, Send } from 'lucide-react';
import { Header } from '@/components/Header';

export default function SubmitPage() {
  const [done, setDone] = useState(false);

  return (
    <><Header /><main className="container submitPage">
      <section className="submitIntro">
        <span>SHARE A PROGRAM</span>
        <h1>좋은 학습 프로그램을<br />사이랩에 제안해 주세요.</h1>
        <p>Vercel, Google Apps Script, GitHub Pages 등 웹에서 실행되는 과학 학습 프로그램이라면 등록할 수 있습니다.</p>
      </section>

      {done ? (
        <section className="submitSuccess"><CheckCircle2 size={42} /><h2>제안이 저장되었습니다.</h2><p>현재 베타 버전에서는 이 브라우저에만 저장됩니다. 데이터베이스 연결 후 관리자 검토함으로 전송되도록 바뀝니다.</p><button onClick={() => setDone(false)}>다른 프로그램 제안하기</button></section>
      ) : (
        <form className="submitForm" onSubmit={(event) => { event.preventDefault(); setDone(true); }}>
          <div className="formColumns">
            <label>프로그램명<input required placeholder="예: 광물의 특성 실험실" /></label>
            <label>제작자명<input required placeholder="이름 또는 닉네임" /></label>
          </div>
          <label>실행 주소<input required type="url" placeholder="https://..." /></label>
          <div className="formColumns">
            <label>과학 영역<select required defaultValue=""><option value="" disabled>선택</option><option>지질</option><option>전기와 자기</option><option>생명</option><option>화학</option><option>천문</option><option>기타</option></select></label>
            <label>대상 학년<input required placeholder="예: 중학교 2학년" /></label>
          </div>
          <label>프로그램 설명<textarea required placeholder="학생이 무엇을 탐구하고 어떤 개념을 학습하는지 적어주세요." /></label>
          <label>핵심어<input placeholder="쉼표로 구분: 광물, 굳기, 조흔색" /></label>
          <button className="submitButton" type="submit"><Send size={17} /> 프로그램 제안 보내기</button>
        </form>
      )}

      <style jsx>{`
        .submitPage{padding:62px 0 100px;display:grid;grid-template-columns:.8fr 1.2fr;gap:34px;align-items:start}
        .submitIntro{position:sticky;top:110px;padding:18px 8px}.submitIntro>span{font-size:12px;letter-spacing:.14em;font-weight:900;color:#5b5cf0}.submitIntro h1{font-size:46px;line-height:1.08;letter-spacing:-.055em;margin:12px 0 16px}.submitIntro p{color:#667085;line-height:1.75;font-size:17px}
        .submitForm,.submitSuccess{background:#fff;border:1px solid #e7e9f0;border-radius:26px;padding:28px;box-shadow:0 24px 70px rgba(36,40,70,.11)}.submitForm{display:grid;gap:16px}.submitForm label{display:grid;gap:8px;font-weight:800;font-size:14px}.submitForm input,.submitForm textarea,.submitForm select{width:100%;border:1px solid #e7e9f0;border-radius:13px;padding:13px 14px;background:#fff;outline:0;font:inherit}.submitForm input:focus,.submitForm textarea:focus,.submitForm select:focus{border-color:#5b5cf0;box-shadow:0 0 0 4px rgba(91,92,240,.1)}.submitForm textarea{min-height:140px;resize:vertical}.submitButton,.submitSuccess button{border:0;border-radius:13px;background:#111827;color:#fff;padding:14px 16px;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px}.submitSuccess{text-align:center;padding:54px 34px}.submitSuccess :global(svg){color:#16a34a}.submitSuccess h2{font-size:28px;margin:16px 0 10px}.submitSuccess p{color:#667085;line-height:1.7;margin-bottom:24px}.submitSuccess button{margin:auto}
        @media(max-width:820px){.submitPage{grid-template-columns:1fr}.submitIntro{position:static}.submitIntro h1{font-size:38px}}
        @media(max-width:620px){.submitForm{padding:20px}.formColumns{grid-template-columns:1fr}}
      `}</style>
    </main></>
  );
}
