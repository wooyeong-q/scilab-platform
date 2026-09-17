'use client';

import Image from 'next/image';
import { useState } from 'react';
import { assetMetadata, assetUrl, CHUNK_SIZE, FILE_ACCEPT, fileSize, IMAGE_ACCEPT, MAX_ASSETS, type ProgramAsset } from '@/lib/program-assets';

type Props = {
  programId: string;
  assets: ProgramAsset[];
  disabled: boolean;
  onAdd: (asset: ProgramAsset) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: number) => void;
  onBusy: (busy: boolean) => void;
};

async function checkedFetch(url: string, init: RequestInit) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(60000) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || '전송하지 못했습니다. 연결을 확인한 뒤 다시 시도해 주세요.');
  return data;
}

export function ProgramAssetEditor({ programId, assets, disabled, onAdd, onRemove, onMove, onBusy }: Props) {
  const [progress, setProgress] = useState<{ name: string; value: number } | null>(null);
  const [error, setError] = useState('');
  async function upload(files: File[], kind: 'image' | 'file') {
    if (!files.length || disabled) return;
    setError('');
    if (assets.length + files.length > MAX_ASSETS) { setError(`이미지와 파일은 합쳐서 ${MAX_ASSETS}개까지 첨부할 수 있습니다.`); return; }
    try { for (const file of files) assetMetadata(file.name, file.size, kind); }
    catch (error) { setError(error instanceof Error ? error.message : '파일을 확인해 주세요.'); return; }
    onBusy(true);
    const base = `/api/admin/programs/${encodeURIComponent(programId)}/assets`;
    try {
      for (const file of files) {
        setProgress({ name: file.name, value: 0 });
        const asset = await checkedFetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: file.name, size: file.size, kind }) }) as ProgramAsset;
        const url = `${base}/${asset.id}`;
        try {
          for (let offset = 0; offset < file.size; offset += CHUNK_SIZE) {
            // A retry replaces the same chunk; it never duplicates file bytes.
            let sent = false;
            for (let attempt = 0; attempt < 2 && !sent; attempt++) {
              try { await checkedFetch(`${url}?part=${offset / CHUNK_SIZE}`, { method: 'PUT', headers: { 'Content-Type': 'application/octet-stream' }, body: file.slice(offset, offset + CHUNK_SIZE) }); sent = true; }
              catch (error) { if (attempt === 1) throw error; }
            }
            setProgress({ name: file.name, value: Math.round(Math.min(offset + CHUNK_SIZE, file.size) / file.size * 100) });
          }
          const completed = await checkedFetch(url, { method: 'POST' }) as ProgramAsset;
          onAdd(completed);
        } catch (error) {
          await fetch(url, { method: 'DELETE' }).catch(() => undefined);
          throw error;
        }
      }
    } catch (error) { setError(error instanceof Error ? error.message : '업로드하지 못했습니다. 다시 시도해 주세요.'); }
    finally { setProgress(null); onBusy(false); }
  }

  return <section className="assetEditor" aria-label="이미지 및 첨부파일">
    <h3>설명 이미지</h3>
    <p className="assetHelp">프로그램 설명 아래에 표시됩니다. PNG, JPG, GIF, WebP · 장당 10MB 이하</p>
    <label className="assetPicker">이미지 파일 선택<input type="file" accept={IMAGE_ACCEPT} multiple disabled={disabled} onChange={(event) => { const files = Array.from(event.target.files || []); event.target.value = ''; void upload(files, 'image'); }}/></label>
    <AssetList assets={assets.filter(asset => asset.kind === 'image')} disabled={disabled} onRemove={onRemove} onMove={onMove}/>
    <h3>첨부파일</h3>
    <p className="assetHelp">설명서·활동지·수업용 PPT를 직접 올려 주세요. PDF, PPT/PPTX, HWP/HWPX, Word, Excel, ZIP · 파일당 30MB 이하</p>
    <label className="assetPicker">자료 파일 선택<input type="file" accept={FILE_ACCEPT} multiple disabled={disabled} onChange={(event) => { const files = Array.from(event.target.files || []); event.target.value = ''; void upload(files, 'file'); }}/></label>
    <AssetList assets={assets.filter(asset => asset.kind === 'file')} disabled={disabled} onRemove={onRemove} onMove={onMove}/>
    {progress && <div role="status" className="assetProgress"><span>{progress.name} · {progress.value}%</span><progress max={100} value={progress.value}/></div>}
    {error && <p className="assetError" role="alert">{error}</p>}
    <p className="assetHelp">총 {assets.length}/{MAX_ASSETS}개 · 아래 ‘저장’을 눌러야 추가·삭제한 내용이 공개됩니다.</p>
  </section>;
}

function AssetList({ assets, disabled, onRemove, onMove }: Pick<Props, 'assets' | 'disabled' | 'onRemove' | 'onMove'>) {
  return <ul className="assetEditList">{assets.map((asset, index) => <li key={asset.id}>
    {asset.kind === 'image' && <Image unoptimized src={assetUrl(asset.id)} width={72} height={60} alt={asset.name}/>}
    <a href={assetUrl(asset.id)} target="_blank" rel="noreferrer">{asset.name}<small>{fileSize(asset.size)}</small></a>
    <div className="assetActions"><button type="button" disabled={disabled || index === 0} onClick={() => onMove(asset.id, -1)} aria-label={`${asset.name} 위로`}>↑</button><button type="button" disabled={disabled || index === assets.length - 1} onClick={() => onMove(asset.id, 1)} aria-label={`${asset.name} 아래로`}>↓</button><button type="button" disabled={disabled} onClick={() => onRemove(asset.id)} aria-label={`${asset.name} 삭제`}>삭제</button></div>
  </li>)}</ul>;
}
