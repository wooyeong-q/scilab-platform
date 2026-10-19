const LINK_FIELDS = [
  ['url', '실행 주소'], ['worksheetUrl', '활동지 링크'], ['pptUrl', 'PPT 링크'],
  ['videoUrl', '수업 영상 링크'], ['sourceUrl', '소스코드 링크'], ['guideUrl', '교사용 안내자료 링크'],
] as const;

type LinkField = typeof LINK_FIELDS[number][0];

export function isValidProgramLink(value: string): boolean {
  const link = value.trim();
  if (!link || /[\u0000-\u001f\u007f\\\\]/.test(link)) return false;
  // A single leading slash is an address within SciLab, not a remote host.
  if (link.startsWith('/')) return !link.startsWith('//');
  try {
    const url = new URL(link);
    return (url.protocol === 'https:' || url.protocol === 'http:') && Boolean(url.hostname);
  } catch { return false; }
}

export function programLinkError(values: Partial<Record<LinkField, unknown>>): string | null {
  for (const [field, label] of LINK_FIELDS) {
    const value = values[field];
    if (value === undefined) continue; // PATCH preserves omitted fields.
    if (field !== 'url' && (value === null || value === '')) continue;
    if (typeof value === 'string' && (field !== 'url' && !value.trim() || isValidProgramLink(value))) continue;
    return label + '를 확인해 주세요. https://로 시작하는 주소나 /labs/처럼 /로 시작하는 내부 주소를 입력할 수 있습니다.';
  }
  return null;
}
