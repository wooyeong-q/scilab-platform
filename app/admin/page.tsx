import { Header } from '@/components/Header';
import { AdminConsole } from '@/components/AdminConsole';

export default function AdminPage(){
  return <><Header/><main id="main-content" className="container adminPage">
    <div className="adminHeading"><div><span>ADMIN</span><h1>프로그램 관리</h1><p>제안 승인, 프로그램 수정과 삭제를 관리합니다.</p></div></div>
    <AdminConsole/>
  </main></>;
}
