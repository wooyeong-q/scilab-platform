import type { Metadata } from 'next';
import './globals.css';
import './enhancements.css';
import './responsive.css';
import './modal-responsive.css';
import './runner.css';

export const metadata: Metadata = {
  title: 'SciLab | 과학 학습 프로그램 플랫폼',
  description: '교사가 만든 과학 학습 프로그램을 한곳에서 찾고 실행하는 플랫폼',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
