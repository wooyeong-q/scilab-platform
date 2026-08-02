import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { sql } from './db';

const SESSION_DAYS = 14;
const MAX_PLAYERS = 40;
const MAX_UFO_EVENTS = 30;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

let initialized = false;
let initialization: Promise<void> | null = null;

export type GalaxySession = {
  id: string;
  code: string;
  title: string;
  expiresAt: string;
};

export type GalaxyPlayer = {
  id: string;
  nickname: string;
  score: number;
  rank: number;
};

type ScoreEventKind = 'observation' | 'classification_correct' | 'classification_wrong' | 'ufo';

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

function mapSession(row: Record<string, unknown>): GalaxySession {
  return {
    id: String(row.id),
    code: String(row.code),
    title: String(row.title || ''),
    expiresAt: new Date(String(row.expires_at)).toISOString(),
  };
}

export function normalizeGalaxySessionCode(value: unknown) {
  const code = String(value || '').trim().toUpperCase();
  return /^[A-HJ-NP-Z2-9]{6}$/.test(code) ? code : '';
}

export async function ensureGalaxyVoyageDatabase() {
  if (initialized) return;
  if (initialization) return initialization;

  initialization = (async () => {
    const db = database();
    await db`CREATE TABLE IF NOT EXISTS galaxy_voyage_sessions (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL DEFAULT '',
      teacher_key_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL
    )`;
    await db`CREATE TABLE IF NOT EXISTS galaxy_voyage_players (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES galaxy_voyage_sessions(id) ON DELETE CASCADE,
      nickname TEXT NOT NULL,
      player_key_hash TEXT NOT NULL,
      score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(session_id, nickname)
    )`;
    await db`CREATE TABLE IF NOT EXISTS galaxy_voyage_score_events (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES galaxy_voyage_sessions(id) ON DELETE CASCADE,
      actor_id TEXT NOT NULL REFERENCES galaxy_voyage_players(id) ON DELETE CASCADE,
      target_id TEXT REFERENCES galaxy_voyage_players(id) ON DELETE CASCADE,
      event_key TEXT NOT NULL,
      event_kind TEXT NOT NULL,
      actor_delta INTEGER NOT NULL DEFAULT 0,
      target_delta INTEGER NOT NULL DEFAULT 0,
      actor_message TEXT NOT NULL DEFAULT '',
      target_message TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(actor_id, event_key)
    )`;
    await db`CREATE INDEX IF NOT EXISTS galaxy_voyage_sessions_expires_idx ON galaxy_voyage_sessions(expires_at)`;
    await db`CREATE INDEX IF NOT EXISTS galaxy_voyage_players_session_score_idx ON galaxy_voyage_players(session_id, score DESC)`;
    await db`CREATE INDEX IF NOT EXISTS galaxy_voyage_events_target_created_idx ON galaxy_voyage_score_events(target_id, created_at DESC)`;
    initialized = true;
  })().catch((error) => {
    initialization = null;
    throw error;
  });

  return initialization;
}

export async function createGalaxySession(titleValue: unknown) {
  await ensureGalaxyVoyageDatabase();
  const db = database();
  const title = String(titleValue || '은하 항해 수업').trim().slice(0, 60) || '은하 항해 수업';
  const teacherKey = newSecret();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db`DELETE FROM galaxy_voyage_sessions WHERE expires_at < NOW()`;

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const id = randomUUID();
    const code = newCode();
    const rows = await db`INSERT INTO galaxy_voyage_sessions (id, code, title, teacher_key_hash, expires_at)
      VALUES (${id}, ${code}, ${title}, ${hashKey(teacherKey)}, ${expiresAt.toISOString()})
      ON CONFLICT (code) DO NOTHING RETURNING *`;
    if (rows[0]) return { session: mapSession(rows[0] as Record<string, unknown>), teacherKey };
  }
  throw new Error('수업 코드를 만들지 못했습니다.');
}

export async function joinGalaxySession(code: string, nicknameValue: unknown) {
  await ensureGalaxyVoyageDatabase();
  const db = database();
  const nickname = String(nicknameValue || '').trim().replace(/\s+/g, ' ').slice(0, 16);
  if (!nickname) return { status: 'invalid' as const };
  const sessions = await db`SELECT * FROM galaxy_voyage_sessions WHERE code=${code} AND expires_at > NOW() LIMIT 1`;
  if (!sessions[0]) return { status: 'missing' as const };
  const session = mapSession(sessions[0] as Record<string, unknown>);
  const counts = await db`SELECT COUNT(*)::int AS count FROM galaxy_voyage_players WHERE session_id=${session.id}`;
  if (Number(counts[0]?.count || 0) >= MAX_PLAYERS) return { status: 'full' as const };
  const playerKey = newSecret();
  const id = randomUUID();
  const rows = await db`INSERT INTO galaxy_voyage_players (id, session_id, nickname, player_key_hash)
    VALUES (${id}, ${session.id}, ${nickname}, ${hashKey(playerKey)})
    ON CONFLICT (session_id, nickname) DO NOTHING
    RETURNING id, nickname, score`;
  if (!rows[0]) return { status: 'duplicate' as const };
  return {
    status: 'joined' as const,
    session,
    player: { id: String(rows[0].id), nickname: String(rows[0].nickname), score: Number(rows[0].score || 0), rank: 1 },
    playerKey,
  };
}

async function verifiedPlayer(code: string, playerId: string, playerKey: string) {
  const rows = await database()`SELECT p.id, p.session_id, p.nickname, p.score
    FROM galaxy_voyage_players p
    JOIN galaxy_voyage_sessions s ON s.id=p.session_id
    WHERE s.code=${code} AND s.expires_at > NOW() AND p.id=${playerId} AND p.player_key_hash=${hashKey(playerKey)}
    LIMIT 1`;
  return rows[0] as Record<string, unknown> | undefined;
}

export async function getGalaxyScoreboard(code: string, playerId: string, playerKey: string, sinceValue: unknown) {
  await ensureGalaxyVoyageDatabase();
  const player = await verifiedPlayer(code, playerId, playerKey);
  if (!player) return null;
  const db = database();
  const sessionId = String(player.session_id);
  const since = new Date(String(sinceValue || 0));
  const safeSince = Number.isFinite(since.getTime()) ? since.toISOString() : new Date(0).toISOString();
  const checkpoint = new Date().toISOString();
  const [leaders, ownRows, notificationRows] = await Promise.all([
    db`SELECT id, nickname, score, ROW_NUMBER() OVER (ORDER BY score DESC, updated_at ASC)::int AS rank
      FROM galaxy_voyage_players WHERE session_id=${sessionId}
      ORDER BY score DESC, updated_at ASC LIMIT 10`,
    db`SELECT id, nickname, score, rank FROM (
      SELECT id, nickname, score, ROW_NUMBER() OVER (ORDER BY score DESC, updated_at ASC)::int AS rank
      FROM galaxy_voyage_players WHERE session_id=${sessionId}
    ) ranked WHERE id=${playerId} LIMIT 1`,
    db`SELECT e.id, e.target_message AS message, e.created_at
      FROM galaxy_voyage_score_events e
      WHERE e.target_id=${playerId} AND e.created_at > ${safeSince}
      ORDER BY e.created_at ASC LIMIT 10`,
  ]);
  const mapPlayer = (row: Record<string, unknown>): GalaxyPlayer => ({
    id: String(row.id), nickname: String(row.nickname), score: Number(row.score || 0), rank: Number(row.rank || 0),
  });
  return {
    self: ownRows[0] ? mapPlayer(ownRows[0] as Record<string, unknown>) : null,
    leaders: leaders.map((row) => mapPlayer(row as Record<string, unknown>)),
    notifications: notificationRows.map((row) => ({ id: String(row.id), message: String(row.message), createdAt: new Date(String(row.created_at)).toISOString() })),
    serverTime: checkpoint,
  };
}

function eventDelta(kind: Exclude<ScoreEventKind, 'ufo'>) {
  if (kind === 'observation') return 10;
  if (kind === 'classification_correct') return 100;
  return -20;
}

export async function applyGalaxyScoreEvent(code: string, playerId: string, playerKey: string, kind: Exclude<ScoreEventKind, 'ufo'>, referenceValue: unknown) {
  await ensureGalaxyVoyageDatabase();
  const player = await verifiedPlayer(code, playerId, playerKey);
  if (!player) return { status: 'unauthorized' as const };
  const reference = String(referenceValue || '').trim().toLowerCase();
  if (!/^[a-z0-9:_-]{1,80}$/.test(reference)) return { status: 'invalid' as const };
  const delta = eventDelta(kind);
  const eventKey = `${kind}:${reference}`;
  const eventId = randomUUID();
  const message = delta > 0 ? `+${delta}점` : `${delta}점`;
  const rows = await database()`WITH inserted AS (
      INSERT INTO galaxy_voyage_score_events
        (id, session_id, actor_id, event_key, event_kind, actor_delta, actor_message)
      VALUES (${eventId}, ${String(player.session_id)}, ${playerId}, ${eventKey}, ${kind}, ${delta}, ${message})
      ON CONFLICT (actor_id, event_key) DO NOTHING
      RETURNING actor_delta
    ), updated AS (
      UPDATE galaxy_voyage_players p
      SET score=GREATEST(0, p.score + i.actor_delta), updated_at=NOW()
      FROM inserted i WHERE p.id=${playerId}
      RETURNING p.score
    ) SELECT score FROM updated`;
  if (!rows[0]) {
    const current = await verifiedPlayer(code, playerId, playerKey);
    return { status: 'duplicate' as const, score: Number(current?.score || 0), delta: 0 };
  }
  return { status: 'applied' as const, score: Number(rows[0].score || 0), delta };
}

type UfoOutcome = 'gain50' | 'gain100' | 'lose30' | 'steal30' | 'swap';

function randomUfoOutcome(): UfoOutcome {
  const roll = Math.random();
  if (roll < .30) return 'gain50';
  if (roll < .42) return 'gain100';
  if (roll < .65) return 'lose30';
  if (roll < .90) return 'steal30';
  return 'swap';
}

export async function applyRandomUfoEvent(code: string, playerId: string, playerKey: string, eventKeyValue: unknown) {
  await ensureGalaxyVoyageDatabase();
  const player = await verifiedPlayer(code, playerId, playerKey);
  if (!player) return { status: 'unauthorized' as const };
  const eventRef = String(eventKeyValue || '').trim().toLowerCase();
  if (!/^[a-z0-9-]{8,80}$/.test(eventRef)) return { status: 'invalid' as const };
  const db = database();
  const recent = await db`SELECT COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '5 seconds')::int AS recent
    FROM galaxy_voyage_score_events WHERE actor_id=${playerId} AND event_kind LIKE 'ufo_%'`;
  if (Number(recent[0]?.total || 0) >= MAX_UFO_EVENTS) return { status: 'limit' as const };
  if (Number(recent[0]?.recent || 0) > 0) return { status: 'cooldown' as const };

  let outcome = randomUfoOutcome();
  let target: Record<string, unknown> | undefined;
  if (outcome === 'steal30' || outcome === 'swap') {
    const targets = await db`SELECT id, nickname, score FROM galaxy_voyage_players
      WHERE session_id=${String(player.session_id)} AND id<>${playerId} AND score>0
      ORDER BY RANDOM() LIMIT 1`;
    target = targets[0] as Record<string, unknown> | undefined;
    if (!target) outcome = 'gain50';
  }

  const actorScore = Number(player.score || 0);
  let actorDelta = 0;
  let targetDelta = 0;
  let actorMessage = '';
  let targetMessage = '';
  if (outcome === 'gain50') {
    actorDelta = 50;
    actorMessage = 'UFO에서 50점을 발견했습니다!';
  } else if (outcome === 'gain100') {
    actorDelta = 100;
    actorMessage = 'UFO 대박! 100점을 획득했습니다!';
  } else if (outcome === 'lose30') {
    actorDelta = -30;
    actorMessage = 'UFO가 30점을 가져갔습니다.';
  } else if (outcome === 'steal30' && target) {
    const amount = Math.min(30, Number(target.score || 0));
    actorDelta = amount;
    targetDelta = -amount;
    actorMessage = `${String(target.nickname)}에게서 ${amount}점을 가져왔습니다!`;
    targetMessage = `${String(player.nickname)}가 ${amount}점을 가져갔습니다.`;
  } else if (outcome === 'swap' && target) {
    actorDelta = Math.max(-50, Math.min(50, Number(target.score || 0) - actorScore));
    targetDelta = -actorDelta;
    actorMessage = `${String(target.nickname)}와 점수 파동이 발생했습니다. ${actorDelta >= 0 ? '+' : ''}${actorDelta}점`;
    targetMessage = `${String(player.nickname)}와 점수가 섞였습니다. ${targetDelta >= 0 ? '+' : ''}${targetDelta}점`;
  }

  const eventId = randomUUID();
  const eventKey = `ufo:${eventRef}`;
  const rows = await db`WITH inserted AS (
      INSERT INTO galaxy_voyage_score_events
        (id, session_id, actor_id, target_id, event_key, event_kind, actor_delta, target_delta, actor_message, target_message)
      VALUES (${eventId}, ${String(player.session_id)}, ${playerId}, ${target ? String(target.id) : null}, ${eventKey}, ${`ufo_${outcome}`}, ${actorDelta}, ${targetDelta}, ${actorMessage}, ${targetMessage})
      ON CONFLICT (actor_id, event_key) DO NOTHING
      RETURNING actor_delta, target_delta, target_id, actor_message
    ), actor_updated AS (
      UPDATE galaxy_voyage_players p SET score=GREATEST(0, p.score+i.actor_delta), updated_at=NOW()
      FROM inserted i WHERE p.id=${playerId} RETURNING p.score
    ), target_updated AS (
      UPDATE galaxy_voyage_players p SET score=GREATEST(0, p.score+i.target_delta), updated_at=NOW()
      FROM inserted i WHERE i.target_id IS NOT NULL AND p.id=i.target_id RETURNING p.id
    )
    SELECT i.actor_delta, i.actor_message, a.score FROM inserted i JOIN actor_updated a ON TRUE`;
  if (!rows[0]) {
    const current = await verifiedPlayer(code, playerId, playerKey);
    return { status: 'duplicate' as const, score: Number(current?.score || 0), delta: 0, message: '이미 처리된 UFO입니다.' };
  }
  return {
    status: 'applied' as const,
    outcome,
    score: Number(rows[0].score || 0),
    delta: Number(rows[0].actor_delta || 0),
    message: String(rows[0].actor_message || actorMessage),
  };
}
