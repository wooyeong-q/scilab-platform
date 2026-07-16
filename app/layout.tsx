import type { Metadata, Viewport } from 'next';
import './globals.css';
import './runner.css';

export const metadata: Metadata = {
  title: 'SciLab | 과학 학습 프로그램 플랫폼',
  description: '교사가 만든 과학 학습 프로그램을 한곳에서 찾고 실행하는 플랫폼',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f5f7fb',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body><a className="skipLink" href="#main-content">본문으로 바로가기</a>{children}</body></html>;
}
