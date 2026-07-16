'use client';

import Link from 'next/link';
import { FlaskConical, Menu, PlusCircle, Settings, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export function Header() {
  const [open,setOpen]=useState(false);
  const pathname=usePathname();
  const close=()=>setOpen(false);

  useEffect(()=>{
    const onKeyDown=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false);};
    window.addEventListener('keydown',onKeyDown);
    return()=>window.removeEventListener('keydown',onKeyDown);
  },[]);

  return (
    <header className="topbar">
      <div className="container nav">
        <Link href="/" className="brand" onClick={close}>
          <span className="brandMark"><FlaskConical size={20} /></span>
          <span>SciLab</span>
        </Link>
        <button className="mobileMenuButton" type="button" aria-label={open?'메뉴 닫기':'메뉴 열기'} aria-controls="primary-navigation" aria-expanded={open} onClick={()=>setOpen((value)=>!value)}>
          {open?<X size={22}/>:<Menu size={22}/>} 
        </button>
        <nav id="primary-navigation" aria-label="주요 메뉴" className={open?'navLinks open':'navLinks'}>
          <Link href="/" aria-current={pathname==='/'?'page':undefined} onClick={close}>프로그램</Link>
          <Link href="/submit" aria-current={pathname==='/submit'?'page':undefined} onClick={close}><PlusCircle size={17} /> 프로그램 제안</Link>
          <Link href="/admin" aria-current={pathname==='/admin'?'page':undefined} className="navButton" onClick={close}><Settings size={17} /> 관리</Link>
        </nav>
      </div>
    </header>
  );
}
