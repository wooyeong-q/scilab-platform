import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { sql } from './db';

const SESSION_DAYS = 14;
const MAX_POINTS_PER_SESSION = 300;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

let initialized = false;
let initialization: Promise<void> | null = null;

export type MapSession = {
  id: string;
  code: string;
  title: string;
  expiresAt: string;
};

export type MapPoint = {
  id: string;
  group: string;
  type: '지진' | '화산';
  name: string;
  lat: number;
  lng: number;
  createdAt: string;
};

function database() {
  if (!sql) throw new Error('DATABASE_URL is not configured');
  return sql;
}

function hashKey(key: string) {
  return createHash('sha256').update(key).digest('hex');
}

function newSecret() {
  return randomBytes(24).toString('base64url');
}

function newCode() {
  const bytes = randomBytes(6);
  return Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join('');
}

function mapSession(row: Record<string, unknown>): MapSession {
  return {
    id: String(row.id),
    code: String(row.code),
    title: String(row.title || ''),
    expiresAt: new Date(String(row.expires_at)).toISOString(),
  };
}

function mapPoint(row: Record<string, unknown>): MapPoint {
  return {
    id: String(row.id),
    group: String(row.group_name),
    type: String(row.point_type) as MapPoint['type'],
    name: String(row.name),
    lat: Number(row.lat),
    lng: Number(row.lng),
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

export async function ensureEarthquakeVolcanoDatabase() {
  if (initialized) return;
  if (initialization) return initialization;

  initialization = (async () => {
    const db = database();
    await db`CREATE TABLE IF NOT EXISTS earthquake_volcano_sessions (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL DEFAULT '',
      teacher_key_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL
    )`;
    await db`CREATE TABLE IF NOT EXISTS earthquake_volcano_points (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES earthquake_volcano_sessions(id) ON DELETE CASCADE,
      group_name TEXT NOT NULL,
      point_type TEXT NOT NULL CHECK (point_type IN ('지진', '화산')),
      name TEXT NOT NULL,
      lat DOUBLE PRECISION NOT NULL CHECK (lat BETWEEN -90 AND 90),
      lng DOUBLE PRECISION NOT NULL CHECK (lng BETWEEN -180 AND 180),
      delete_key_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await db`CREATE INDEX IF NOT EXISTS earthquake_volcano_points_session_created_idx
      ON earthquake_volcano_points(session_id, created_at)`;
    await db`CREATE INDEX IF NOT EXISTS earthquake_volcano_sessions_expires_idx
      ON earthquake_volcano_sessions(expires_at)`;
    initialized = true;
  })().catch((error) => {
    initialization = null;
    throw error;
  });

  return initialization;
}

export function normalizeSessionCode(value: unknown) {
  const code = String(value || '').trim().toUpperCase();
  return /^[A-HJ-NP-Z2-9]{6}$/.test(code) ? code : '';
}

export async function createMapSession(titleValue: unknown) {
  await ensureEarthquakeVolcanoDatabase();
  const db = database();
  const title = String(titleValue || '우리 반 지진·화산 지도').trim().slice(0, 60) || '우리 반 지진·화산 지도';
  const teacherKey = newSecret();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await db`DELETE FROM earthquake_volcano_sessions WHERE expires_at < NOW()`;

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const id = randomUUID();
    const code = newCode();
    const rows = await db`INSERT INTO earthquake_volcano_sessions (id, code, title, teacher_key_hash, expires_at)
      VALUES (${id}, ${code}, ${title}, ${hashKey(teacherKey)}, ${expiresAt.toISOString()})
      ON CONFLICT (code) DO NOTHING
      RETURNING *`;
    if (rows[0]) return { session: mapSession(rows[0] as Record<string, unknown>), teacherKey };
  }

  throw new Error('수업 코드를 만들지 못했습니다.');
}

export async function listMapPoints(code: string) {
  await ensureEarthquakeVolcanoDatabase();
  const db = database();
  const sessionRows = await db`SELECT * FROM earthquake_volcano_sessions
    WHERE code=${code} AND expires_at > NOW() LIMIT 1`;
  if (!sessionRows[0]) return null;

  const session = mapSession(sessionRows[0] as Record<string, unknown>);
  const pointRows = await db`SELECT p.* FROM earthquake_volcano_points p
    WHERE p.session_id=${session.id}
    ORDER BY p.created_at ASC`;
  return { session, points: pointRows.map((row) => mapPoint(row as Record<string, unknown>)) };
}

export async function addMapPoint(code: string, input: {
  group: string;
  type: MapPoint['type'];
  name: string;
  lat: number;
  lng: number;
}) {
  await ensureEarthquakeVolcanoDatabase();
  const db = database();
  const sessionRows = await db`SELECT id FROM earthquake_volcano_sessions
    WHERE code=${code} AND expires_at > NOW() LIMIT 1`;
  if (!sessionRows[0]) return { status: 'missing' as const };

  const sessionId = String(sessionRows[0].id);
  const countRows = await db`SELECT COUNT(*)::int AS count FROM earthquake_volcano_points WHERE session_id=${sessionId}`;
  if (Number(countRows[0]?.count || 0) >= MAX_POINTS_PER_SESSION) return { status: 'full' as const };

  const id = randomUUID();
  const deleteKey = newSecret();
  const rows = await db`INSERT INTO earthquake_volcano_points
    (id, session_id, group_name, point_type, name, lat, lng, delete_key_hash)
    VALUES (${id}, ${sessionId}, ${input.group}, ${input.type}, ${input.name}, ${input.lat}, ${input.lng}, ${hashKey(deleteKey)})
    RETURNING *`;

  return { status: 'created' as const, point: mapPoint(rows[0] as Record<string, unknown>), deleteKey };
}

export async function verifyTeacher(code: string, teacherKey: string) {
  await ensureEarthquakeVolcanoDatabase();
  if (!teacherKey) return false;
  const rows = await database()`SELECT id FROM earthquake_volcano_sessions
    WHERE code=${code} AND teacher_key_hash=${hashKey(teacherKey)} AND expires_at > NOW() LIMIT 1`;
  return Boolean(rows[0]);
}

export async function deleteMapPoint(code: string, pointId: string, key: string) {
  await ensureEarthquakeVolcanoDatabase();
  if (!key) return false;
  const rows = await database()`DELETE FROM earthquake_volcano_points p
    USING earthquake_volcano_sessions s
    WHERE p.id=${pointId}
      AND p.session_id=s.id
      AND s.code=${code}
      AND s.expires_at > NOW()
      AND (p.delete_key_hash=${hashKey(key)} OR s.teacher_key_hash=${hashKey(key)})
    RETURNING p.id`;
  return Boolean(rows[0]);
}

export async function clearMapPoints(code: string, teacherKey: string) {
  await ensureEarthquakeVolcanoDatabase();
  if (!teacherKey) return false;
  const rows = await database()`DELETE FROM earthquake_volcano_points p
    USING earthquake_volcano_sessions s
    WHERE p.session_id=s.id
      AND s.code=${code}
      AND s.teacher_key_hash=${hashKey(teacherKey)}
      AND s.expires_at > NOW()
    RETURNING p.id`;
  const validTeacher = rows.length > 0 || await verifyTeacher(code, teacherKey);
  return validTeacher;
}
