import Link from 'next/link';
import { FlaskConical, Settings } from 'lucide-react';

export function Header() {
  return (
    <header className="topbar">
      <div className="container nav">
        <Link href="/" className="brand">
          <span className="brandMark"><FlaskConical size={20} /></span>
          <span>SciLab</span>
        </Link>
        <nav className="navLinks">
          <Link href="/">프로그램</Link>
          <Link href="/admin" className="navButton"><Settings size={16} /> 관리</Link>
        </nav>
      </div>
    </header>
  );
}
