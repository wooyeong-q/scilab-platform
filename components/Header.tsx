'use client';

import Link from 'next/link';
import { FlaskConical, Menu, PlusCircle, Settings, X } from 'lucide-react';
import { useState } from 'react';

export function Header() {
  const [open,setOpen]=useState(false);
  const close=()=>setOpen(false);
  return (
    <header className="topbar">
      <div className="container nav">
        <Link href="/" className="brand" onClick={close}>
          <span className="brandMark"><FlaskConical size={20} /></span>
          <span>SciLab</span>
        </Link>
        <button className="mobileMenuButton" type="button" aria-label={open?'메뉴 닫기':'메뉴 열기'} aria-expanded={open} onClick={()=>setOpen((value)=>!value)}>
          {open?<X size={22}/>:<Menu size={22}/>} 
        </button>
        <nav className={open?'navLinks open':'navLinks'}>
          <Link href="/" onClick={close}>프로그램</Link>
          <Link href="/submit" onClick={close}><PlusCircle size={16} /> 프로그램 제안</Link>
          <Link href="/admin" className="navButton" onClick={close}><Settings size={16} /> 관리</Link>
        </nav>
      </div>
    </header>
  );
}
