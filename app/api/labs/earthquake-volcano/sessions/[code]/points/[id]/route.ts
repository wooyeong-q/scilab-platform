import { NextResponse } from 'next/server';
import { deleteMapPoint, normalizeSessionCode } from '@/lib/earthquake-volcano';

type Context = { params: Promise<{ code: string; id: string }> };

export async function DELETE(request: Request, { params }: Context) {
  try {
    const { code: rawCode, id } = await params;
    const code = normalizeSessionCode(rawCode);
    const pointKey = request.headers.get('x-point-key') || request.headers.get('x-teacher-key') || '';
    if (!code || !id) return NextResponse.json({ error: '삭제할 점을 확인해 주세요.' }, { status: 400 });
    if (!await deleteMapPoint(code, id, pointKey)) {
      return NextResponse.json({ error: '이 점을 등록한 기기 또는 교사만 삭제할 수 있습니다.' }, { status: 403 });
    }
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Failed to delete earthquake-volcano point', error);
    return NextResponse.json({ error: '점을 삭제하지 못했습니다.' }, { status: 500 });
  }
}
