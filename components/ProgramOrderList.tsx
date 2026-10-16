'use client';

import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { ArrowDown, ArrowUp, Eye, GripVertical, Heart, PencilLine, Play, Save, Trash2, Undo2 } from 'lucide-react';
import type { Program } from '@/lib/programs';
import { groupPrograms, programSubject } from '@/lib/program-catalog';
import { catalogOrder, moveCatalogProgram, moveCatalogProgramTo, moveCatalogSubject } from '@/lib/program-order';

type Props = {
  programs: Program[];
  onEdit: (program: Program) => void;
  onRemove: (id: string) => Promise<void>;
  onReload: () => Promise<void>;
  onBusyChange: (busy: boolean) => void;
};

export function ProgramOrderList({ programs, onEdit, onRemove, onReload, onBusyChange }: Props) {
  const baseline = useMemo(() => catalogOrder(programs), [programs]);
  const [draft, setDraft] = useState<Program[]>(baseline);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const dragged = useRef<string | null>(null);
  const groups = useMemo(() => groupPrograms(catalogOrder(draft)), [draft]);
  const dirty = draft.map(program => program.id).join('\0') !== baseline.map(program => program.id).join('\0');
  useEffect(() => { setDraft(baseline); }, [baseline]);
  useEffect(() => { onBusyChange(dirty || saving); }, [dirty, saving, onBusyChange]);

  function move(update: (current: Program[]) => Program[]) {
    if (saving) return;
    setDraft(update); setError(''); setMessage('');
  }
  function drop(event: DragEvent, target: Program) {
    event.preventDefault();
    const id = dragged.current; dragged.current = null;
    if (id && !saving) move(current => moveCatalogProgramTo(current, id, target.id));
  }
  function allowDrop(event: DragEvent, target: Program) {
    const source = draft.find(program => program.id === dragged.current);
    if (!saving && source && programSubject(source) === programSubject(target)) {
      event.preventDefault(); event.dataTransfer.dropEffect = 'move';
    }
  }
  async function saveOrder() {
    if (!dirty || saving) return;
    setSaving(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/admin/programs/order', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: catalogOrder(draft).map(program => program.id) }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 409 || response.status === 401) await onReload();
        throw new Error(data.error || '순서를 저장하지 못했습니다.');
      }
      await onReload(); setMessage('홈페이지 표시 순서를 저장했습니다.');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : '순서를 저장하지 못했습니다.');
    } finally { setSaving(false); }
  }

  return <div className="adminProgramOrdering">
    <div className="adminOrderBar">
      <div><strong>홈페이지 표시 순서</strong><p>분야는 제목 옆의 화살표로, 프로그램은 끌거나 ↑↓로 이동한 뒤 저장하세요.</p></div>
      <div className="adminOrderActions">
        <button type="button" className="adminOrderReset" disabled={!dirty || saving}
          onClick={() => { setDraft(baseline); setError(''); setMessage(''); }}><Undo2 size={15}/> 되돌리기</button>
        <button type="button" className="saveButton" disabled={!dirty || saving} onClick={saveOrder}>
          <Save size={15}/>{saving ? '저장 중…' : '순서 저장'}</button>
      </div>
      {dirty ? <span className="adminOrderStatus">저장하지 않은 순서 변경이 있습니다. 저장하거나 되돌린 뒤 수정·삭제할 수 있습니다.</span> : null}
      {message ? <span className="adminOrderStatus success" role="status">{message}</span> : null}
      {error ? <span className="adminOrderStatus failure" role="alert">{error}</span> : null}
    </div>
    {groups.length ? groups.map((group, groupIndex) => <section key={group.name} className="adminOrderGroup" aria-label={group.name}>
      <div className="adminOrderGroupHeading">
        <h3>{group.name}<span>{group.programs.length}개</span></h3>
        <div>
          <button type="button" disabled={saving || groupIndex === 0} aria-label={group.name + ' 분야를 위로 이동'}
            onClick={() => move(current => moveCatalogSubject(current, group.name, -1))}><ArrowUp size={15}/> 분야 위로</button>
          <button type="button" disabled={saving || groupIndex === groups.length - 1} aria-label={group.name + ' 분야를 아래로 이동'}
            onClick={() => move(current => moveCatalogSubject(current, group.name, 1))}><ArrowDown size={15}/> 분야 아래로</button>
        </div>
      </div>
      <div className="adminList">{group.programs.map((program, index) => <article className="adminCard adminOrderedCard" key={program.id}
        onDragOver={event => allowDrop(event, program)} onDrop={event => drop(event, program)}>
        <div className="adminProgramStart">
          <span className="adminOrderNumber">{String(index + 1).padStart(2, '0')}</span>
          <div className="adminMoveButtons">
            <button type="button" className="adminDragGrip" draggable={!saving} disabled={saving}
              aria-label={program.title + ' 끌어서 순서 변경'} title="같은 분야 안에서 끌어서 이동"
              onDragStart={event => { dragged.current = program.id; event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', program.id); }}
              onDragEnd={() => { dragged.current = null; }}><GripVertical size={18}/></button>
            <button type="button" disabled={saving || index === 0} aria-label={program.title + ' 위로 이동'}
              onClick={() => move(current => moveCatalogProgram(current, program.id, -1))}><ArrowUp size={16}/></button>
            <button type="button" disabled={saving || index === group.programs.length - 1} aria-label={program.title + ' 아래로 이동'}
              onClick={() => move(current => moveCatalogProgram(current, program.id, 1))}><ArrowDown size={16}/></button>
          </div>
          <div className="adminIcon">{program.icon}</div>
        </div>
        <div className="adminInfo"><span>{program.category} · {program.grade}</span><h2>{program.title}</h2>
          <a href={program.url} target="_blank" rel="noreferrer">{program.url}</a>
          <div className="adminStats"><span><Eye size={13}/> 조회 {program.viewCount || 0}</span><span><Play size={13}/> 실행 {program.launchCount || 0}</span><span><Heart size={13}/> 추천 {program.likeCount || 0}</span></div>
        </div>
        <div className="adminActions">
          <button type="button" disabled={dirty || saving} onClick={() => onEdit(program)}><PencilLine size={16}/> 수정</button>
          <button type="button" className="danger" disabled={dirty || saving} onClick={() => onRemove(program.id)}><Trash2 size={16}/> 삭제</button>
        </div>
      </article>)}</div>
    </section>) : <div className="adminNotice">등록된 프로그램이 없습니다.</div>}
  </div>;
}
