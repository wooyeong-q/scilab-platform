import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { sql } from './db';

const SESSION_DAYS = 14;
const MAX_PLAYERS = 40;
const MAX_UFO_EVENTS = 30;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
// The fixed 25-object catalog in the Milky Way Objects activity.
const MILKY_WAY_OBJECT_KEYS = [
  'lagoon', 'eagle', 'omega', 'north-america', 'rosette',
  'm78', 'iris', 'ngc1999', 'blue-horsehead', 'ngc2023',
  'horsehead', 'barnard68', 'coalsack', 'pipe', 'snake',
  'pleiades', 'beehive', 'm35', 'double-cluster', 'jewel-box',
  'm13', 'm3', 'm5', 'm15', 'omega-centauri',
];
const MILKY_WAY_OBSERVATION_KEYS = MILKY_WAY_OBJECT_KEYS.map((key) => `observation:${key}`);


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

// Schema is validated at build time and migrated only with npm run db:migrate.
export async function ensureGalaxyVoyageDatabase() {
  database();
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
  // Rank the class once and return both the leaderboard and the player's row.
  const snapshotRows = await db`WITH ranked AS (
      SELECT id, nickname, score, ROW_NUMBER() OVER (ORDER BY score DESC, updated_at ASC)::int AS rank
      FROM galaxy_voyage_players WHERE session_id=${sessionId}
    ) SELECT
      (SELECT COALESCE(json_agg(r ORDER BY r.rank), '[]'::json) FROM ranked r WHERE r.rank<=10) AS leaders,
      (SELECT row_to_json(r) FROM ranked r WHERE r.id=${playerId} LIMIT 1) AS self,
      (SELECT COUNT(*)>=${MILKY_WAY_OBJECT_KEYS.length} FROM galaxy_voyage_score_events
        WHERE actor_id=${playerId} AND event_key=ANY(${MILKY_WAY_OBSERVATION_KEYS}::text[])) AS milky_way_ufo_bonus,
      (SELECT COALESCE(json_agg(n ORDER BY n.created_at ASC), '[]'::json) FROM (
        SELECT e.id, e.target_message AS message, e.created_at FROM galaxy_voyage_score_events e
        WHERE e.target_id=${playerId} AND e.created_at > ${safeSince}
        ORDER BY e.created_at ASC LIMIT 10
      ) n) AS notifications`;
  const snapshot = snapshotRows[0] as Record<string, unknown>;
  const leaders = snapshot.leaders as Record<string, unknown>[];
  const own = snapshot.self as Record<string, unknown> | null;
  const notificationRows = snapshot.notifications as Record<string, unknown>[];
  const mapPlayer = (row: Record<string, unknown>): GalaxyPlayer => ({
    id: String(row.id), nickname: String(row.nickname), score: Number(row.score || 0), rank: Number(row.rank || 0),
  });
  return {
    self: own ? mapPlayer(own) : null,
    milkyWayUfoBonus: Boolean(snapshot.milky_way_ufo_bonus),
    leaders: leaders.map((row) => mapPlayer(row as Record<string, unknown>)),
    notifications: notificationRows.map((row) => ({ id: String(row.id), message: String(row.message), createdAt: new Date(String(row.created_at)).toISOString() })),
    serverTime: checkpoint,
  };
}

function eventDelta(kind: Exclude<ScoreEventKind, 'ufo'>, isMilkyWayObjects: boolean) {
  if (kind === 'observation') return isMilkyWayObjects ? 20 : 10;
  if (kind === 'classification_correct') return isMilkyWayObjects ? 200 : 100;
  return 0;
}

export async function applyGalaxyScoreEvent(code: string, playerId: string, playerKey: string, kind: Exclude<ScoreEventKind, 'ufo'>, referenceValue: unknown, experienceValue?: unknown) {
  await ensureGalaxyVoyageDatabase();
  const player = await verifiedPlayer(code, playerId, playerKey);
  if (!player) return { status: 'unauthorized' as const };
  const reference = String(referenceValue || '').trim().toLowerCase();
  if (!/^[a-z0-9:_-]{1,80}$/.test(reference)) return { status: 'invalid' as const };
  const isMilkyWayObjects = experienceValue === 'milky-way-objects';
  if (isMilkyWayObjects && kind !== 'classification_wrong' && !MILKY_WAY_OBJECT_KEYS.includes(reference)) {
    return { status: 'invalid' as const };
  }
  const delta = eventDelta(kind, isMilkyWayObjects);
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

function randomMilkyWayUfoOutcome() {
  const roll = Math.random();
  if (roll < .15) return 'gain25';
  if (roll < .40) return 'gain50';
  if (roll < .55) return 'gain100';
  if (roll < .65) return 'gain250';
  if (roll < .70) return 'gain500';
  if (roll < .80) return 'lose15';
  if (roll < .95) return 'steal15';
  return 'swap';
}

async function applyMilkyWayUfoEvent(player: Record<string, unknown>, eventRef: string) {
  const playerId = String(player.id);
  const sessionId = String(player.session_id);
  const outcome = randomMilkyWayUfoOutcome();
  const needsTarget = outcome === 'steal15' || outcome === 'swap';
  const bonus = outcome.startsWith('gain') ? Number(outcome.slice(4)) : 0;
  const eventId = randomUUID();
  const eventKey = `ufo:${eventRef}`;

  // Lock both participants in ID order, then calculate from their current scores.
  // The timestamp keeps the five-second cooldown without scanning growing event history.
  // The event and both score changes commit together; a repeated event cannot award twice.
  // Probe the 25 unique observation keys, rather than count the unbounded UFO history.
  const rows = await database()`WITH progress AS (
      SELECT CASE WHEN COUNT(*)>=${MILKY_WAY_OBJECT_KEYS.length} THEN 2 ELSE 1 END AS reward_multiplier
      FROM galaxy_voyage_score_events
      WHERE actor_id=${playerId} AND event_key=ANY(${MILKY_WAY_OBSERVATION_KEYS}::text[])
    ), candidate AS MATERIALIZED (
      SELECT id FROM galaxy_voyage_players
      WHERE session_id=${sessionId} AND id<>${playerId} AND ${needsTarget}::boolean
        AND (${outcome}::text='swap' OR score>0)
      ORDER BY RANDOM() LIMIT 1
    ), locked AS MATERIALIZED (
      SELECT p.id, p.nickname, p.score, p.last_ufo_at
      FROM galaxy_voyage_players p
      WHERE p.session_id=${sessionId} AND (p.id=${playerId} OR p.id=(SELECT id FROM candidate))
      ORDER BY p.id FOR UPDATE OF p
    ), ready AS (
      SELECT a.score AS actor_score, a.nickname AS actor_name,
        t.id AS target_id, t.score AS target_score, t.nickname AS target_name, progress.reward_multiplier,
        CASE WHEN ${needsTarget}::boolean AND t.id IS NULL THEN 'gain25'
          WHEN ${outcome}::text='steal15' AND t.score<=0 THEN 'gain25'
          ELSE ${outcome}::text END AS outcome
      FROM locked a LEFT JOIN locked t ON t.id<>${playerId}
      CROSS JOIN progress
      WHERE a.id=${playerId}
        AND (a.last_ufo_at IS NULL OR a.last_ufo_at<=statement_timestamp()-INTERVAL '5 seconds')
    ), amounts AS (
      SELECT *, CASE outcome
          WHEN 'swap' THEN target_score-actor_score
          WHEN 'steal15' THEN LEAST(15*reward_multiplier, target_score)
          WHEN 'lose15' THEN -LEAST(15, actor_score)
          WHEN 'gain25' THEN 25*reward_multiplier ELSE ${bonus}::int*reward_multiplier END AS delta
      FROM ready
    ), inserted AS (
      INSERT INTO galaxy_voyage_score_events
        (id, session_id, actor_id, target_id, event_key, event_kind, actor_delta, target_delta, actor_message, target_message)
      SELECT ${eventId}, ${sessionId}, ${playerId},
        CASE WHEN outcome IN ('swap', 'steal15') THEN target_id END,
        ${eventKey}, 'ufo_' || outcome, delta,
        CASE WHEN outcome IN ('swap', 'steal15') THEN -delta ELSE 0 END,
        CASE outcome
          WHEN 'swap' THEN target_name || '와 총점을 서로 교환했습니다! ' || actor_score || ' → ' || target_score || '점'
          WHEN 'steal15' THEN target_name || '에게서 ' || delta || '점을 가져왔습니다!'
          WHEN 'lose15' THEN 'UFO가 ' || (-delta) || '점을 가져갔습니다.'
          WHEN 'gain500' THEN CASE WHEN reward_multiplier=2 THEN '빨간 UFO 잭팟! ' ELSE 'UFO 잭팟! ' END || delta || '점을 획득했습니다!'
          ELSE CASE WHEN reward_multiplier=2 THEN '빨간 UFO에서 ' ELSE 'UFO에서 ' END || delta || '점을 발견했습니다!' END,
        CASE outcome
          WHEN 'swap' THEN actor_name || '와 총점을 서로 교환했습니다! ' || target_score || ' → ' || actor_score || '점'
          WHEN 'steal15' THEN actor_name || '가 ' || delta || '점을 가져갔습니다.'
          ELSE '' END
      FROM amounts
      ON CONFLICT (actor_id, event_key) DO NOTHING
      RETURNING target_id, actor_delta, target_delta, actor_message, event_kind
    ), updated AS (
      UPDATE galaxy_voyage_players p
      SET score=GREATEST(0, p.score + CASE WHEN p.id=${playerId} THEN i.actor_delta ELSE i.target_delta END),
        updated_at=statement_timestamp(),
        last_ufo_at=CASE WHEN p.id=${playerId} THEN statement_timestamp() ELSE p.last_ufo_at END
      FROM inserted i WHERE p.id=${playerId} OR p.id=i.target_id
      RETURNING p.id, p.score
    ) SELECT COALESCE(u.score, a.score) AS score, i.actor_delta, i.actor_message, i.event_kind,
        EXISTS(SELECT 1 FROM ready) AS ready, (SELECT reward_multiplier FROM progress) AS reward_multiplier
      FROM locked a LEFT JOIN inserted i ON TRUE LEFT JOIN updated u ON u.id=a.id
      WHERE a.id=${playerId}`;

  const row = rows[0];
  if (!row) return { status: 'unauthorized' as const };
  if (!row.event_kind) {
    if (!row.ready) return { status: 'cooldown' as const };
    return { status: 'duplicate' as const, score: Number(row.score || 0), delta: 0, message: '이미 처리된 UFO입니다.' };
  }
  return {
    status: 'applied' as const,
    outcome: String(row.event_kind).replace(/^ufo_/, ''),
    milkyWayUfoBonus: Number(row.reward_multiplier) === 2,
    score: Number(row.score || 0),
    delta: Number(row.actor_delta || 0),
    message: String(row.actor_message || ''),
  };
}

export async function applyRandomUfoEvent(code: string, playerId: string, playerKey: string, eventKeyValue: unknown, experienceValue?: unknown) {
  await ensureGalaxyVoyageDatabase();
  const player = await verifiedPlayer(code, playerId, playerKey);
  if (!player) return { status: 'unauthorized' as const };
  const eventRef = String(eventKeyValue || '').trim().toLowerCase();
  if (!/^[a-z0-9-]{8,80}$/.test(eventRef)) return { status: 'invalid' as const };
  if (experienceValue === 'milky-way-objects') return applyMilkyWayUfoEvent(player, eventRef);
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
