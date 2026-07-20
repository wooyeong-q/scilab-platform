import { NextResponse } from 'next/server';
import {
  addMapPoint,
  clearMapPoints,
  listMapPoints,
  normalizeSessionCode,
  type MapPoint,
} from '@/lib/earthquake-volcano';

type Context = { params: Promise<{ code: string }> };

function noStore(payload: unknown, init?: ResponseInit) {
  const response = NextResponse.json(payload, init);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

export async function GET(_: Request, { params }: Context) {
  try {
    const code = normalizeSessionCode((await params).code);
    if (!code) return noStore({ error: '수업 코드 형식을 확인해 주세요.' }, { status: 400 });
    const result = await listMapPoints(code);
    if (!result) return noStore({ error: '수업 코드를 찾을 수 없거나 사용 기간이 끝났습니다.' }, { status: 404 });
    return noStore(result);
  } catch (error) {
    console.error('Failed to list earthquake-volcano points', error);
    return noStore({ error: '자료를 불러오지 못했습니다.' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const code = normalizeSessionCode((await params).code);
    if (!code) return noStore({ error: '수업 코드 형식을 확인해 주세요.' }, { status: 400 });

    const body: Record<string, unknown> = await request.json().catch(() => ({}));
    const group = String(body.group || '').trim().slice(0, 20);
    const type = String(body.type || '').trim() as MapPoint['type'];
    const name = String(body.name || '').trim().slice(0, 80);
    const lat = Number(body.lat);
    const lng = Number(body.lng);

    if (!group || !name || !['지진', '화산'].includes(type) || !Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return noStore({ error: '점의 모둠, 종류, 이름과 좌표를 확인해 주세요.' }, { status: 400 });
    }

    const result = await addMapPoint(code, { group, type, name, lat, lng });
    if (result.status === 'missing') return noStore({ error: '수업 코드를 찾을 수 없거나 사용 기간이 끝났습니다.' }, { status: 404 });
    if (result.status === 'full') return noStore({ error: '한 수업에는 점을 300개까지 저장할 수 있습니다.' }, { status: 409 });
    return noStore({ point: result.point, deleteKey: result.deleteKey }, { status: 201 });
  } catch (error) {
    console.error('Failed to add earthquake-volcano point', error);
    return noStore({ error: '점을 저장하지 못했습니다.' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    const code = normalizeSessionCode((await params).code);
    const teacherKey = request.headers.get('x-teacher-key') || '';
    if (!code) return noStore({ error: '수업 코드 형식을 확인해 주세요.' }, { status: 400 });
    if (!await clearMapPoints(code, teacherKey)) return noStore({ error: '교사용 키가 올바르지 않습니다.' }, { status: 403 });
    return noStore({ ok: true });
  } catch (error) {
    console.error('Failed to clear earthquake-volcano points', error);
    return noStore({ error: '점을 초기화하지 못했습니다.' }, { status: 500 });
  }
}
