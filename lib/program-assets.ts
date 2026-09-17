export type ProgramAsset = {
  id: string;
  name: string;
  size: number;
  mime: string;
  kind: 'image' | 'file';
};

export const CHUNK_SIZE = 512 * 1024;
export const MAX_ASSETS = 30;
export const MAX_FILE_SIZE = 30 * 1024 * 1024;
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
export const IMAGE_ACCEPT = '.png,.jpg,.jpeg,.gif,.webp';
export const FILE_ACCEPT = '.pdf,.ppt,.pptx,.hwp,.hwpx,.doc,.docx,.xls,.xlsx,.zip';
const types: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
  pdf: 'application/pdf', ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  hwp: 'application/x-hwp', hwpx: 'application/vnd.hancom.hwpx', zip: 'application/zip',
};

export function assetMetadata(name: unknown, size: unknown, kind: unknown) {
  if (typeof name !== 'string' || !name.trim() || name.length > 180 || /[/\\\x00-\x1f\x7f]/.test(name)) throw new Error('파일 이름을 확인해 주세요. (180자 이하)');
  const extension = name.split('.').pop()?.toLowerCase() || '';
  const mime = types[extension];
  if (!mime || (kind !== 'image' && kind !== 'file') || (kind === 'image') !== mime.startsWith('image/')) throw new Error('지원하지 않는 파일 형식입니다.');
  const limit = kind === 'image' ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;
  if (typeof size !== 'number' || !Number.isInteger(size) || size <= 0 || size > limit) throw new Error(`파일은 0바이트보다 크고 ${limit / 1024 / 1024}MB 이하여야 합니다.`);
  return { name: name.trim(), size, kind, mime } as Omit<ProgramAsset, 'id'>;
}

// Check actual signatures; never trust the browser's MIME or serve active HTML/SVG inline.
export function matchesSignature(bytes: Uint8Array, mime: string) {
  const starts = (...prefix: number[]) => prefix.every((value, index) => bytes[index] === value);
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  if (mime === 'image/png') return starts(137,80,78,71,13,10,26,10);
  if (mime === 'image/jpeg') return starts(255,216,255);
  if (mime === 'image/gif') return ['GIF87a', 'GIF89a'].includes(ascii(0,6));
  if (mime === 'image/webp') return ascii(0,4) === 'RIFF' && ascii(8,12) === 'WEBP';
  if (mime === 'application/pdf') return ascii(0,5) === '%PDF-';
  if (['application/vnd.ms-powerpoint','application/msword','application/vnd.ms-excel','application/x-hwp'].includes(mime)) return starts(208,207,17,224,161,177,26,225);
  return starts(80,75,3,4) || starts(80,75,5,6);
}

export function assetUrl(id: string) { return `/api/program-assets/${encodeURIComponent(id)}`; }
export function fileSize(size: number) { return size < 1024 * 1024 ? `${Math.max(1, Math.ceil(size / 1024))} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`; }
