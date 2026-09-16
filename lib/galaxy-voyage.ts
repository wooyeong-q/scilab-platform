import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { sql } from './db';

const SESSION_DAYS = 14;
const MAX_PLAYERS = 40;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const GALAXY_CLASSIFICATION_COUNT = 50;
// The fixed 25-object catalog in the Milky Way Objects activity.
const MILKY_WAY_OBJECT_KEYS = [
  'lagoon', 'eagle', 'omega', 'north-america', 'rosette',
  'm78', 'iris', 'ngc1999', 'blue-horsehead', 'ngc2023',
  'horsehead', 'barnard68', 'coalsack', 'pipe', 'snake',
  'pleiades', 'beehive', 'm35', 'double-cluster', 'jewel-box',
  'm13', 'm3', 'm5', 'm15', 'omega-centauri',
];
export type GalaxySession = {
  id: string;
  code: string;
  title: string;
  expiresAt: string;
  durationSeconds: number | null;
  startedAt: string | null;
  endsAt: string | null;
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
    durationSeconds: row.duration_seconds == null ? null : Number(row.duration_seconds),
    startedAt: row.started_at ? new Date(String(row.started_at)).toISOString() : null,
    endsAt: row.started_at && row.duration_seconds ? new Date(new Date(String(row.started_at)).getTime()+Number(row.duration_seconds)*1000).toISOString() : null,
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

export async function createGalaxySession(titleValue: unknown, durationValue?: unknown) {
  await ensureGalaxyVoyageDatabase();
  const db = database();
  const title = String(titleValue || '은하 항해 수업').trim().slice(0, 60) || '은하 항해 수업';
  const duration = durationValue == null ? null : Number(durationValue);
  if (duration !== null && (!Number.isInteger(duration) || duration < 60 || duration > 7200)) throw new Error('Invalid duration');
  const teacherKey = newSecret();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db`DELETE FROM galaxy_voyage_sessions WHERE expires_at < NOW()`;

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const id = randomUUID();
    const code = newCode();
    const rows = await db`INSERT INTO galaxy_voyage_sessions (id, code, title, teacher_key_hash, expires_at, duration_seconds)
      VALUES (${id}, ${code}, ${title}, ${hashKey(teacherKey)}, ${expiresAt.toISOString()}, ${duration})
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
  if (session.endsAt && Date.parse(session.endsAt) <= Date.now()) return { status: 'ended' as const };
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
  const rows = await database()`SELECT p.id, p.session_id, p.nickname, p.score, s.title, s.duration_seconds, s.started_at,
      statement_timestamp() AS server_now
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
      (SELECT COALESCE(json_agg(r ORDER BY r.rank), '[]'::json) FROM ranked r WHERE r.rank<=200) AS leaders,
      (SELECT row_to_json(me) FROM (
        SELECT r.*,p.flight_x AS x,p.flight_y AS y,p.flight_z AS z,p.flight_at,p.disabled_until,
          (SELECT COALESCE(json_agg(e.event_key),'[]'::json) FROM galaxy_voyage_score_events e
            WHERE e.actor_id=p.id AND e.event_kind='observation') AS observations,
          (SELECT COALESCE(json_agg(e.event_key),'[]'::json) FROM galaxy_voyage_score_events e
            WHERE e.actor_id=p.id AND e.event_kind='classification_correct') AS classifications
        FROM ranked r JOIN galaxy_voyage_players p ON p.id=r.id WHERE r.id=${playerId} LIMIT 1
      ) me) AS self,
      (SELECT COUNT(*)>=${String(player.title).includes('우리은하 천체 탐사') ? MILKY_WAY_OBJECT_KEYS.length : GALAXY_CLASSIFICATION_COUNT}
        FROM galaxy_voyage_score_events WHERE actor_id=${playerId} AND event_kind='observation') AS ufo_bonus,
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
    self: own ? { ...mapPlayer(own), x: Number(own.x || 0), y: Number(own.y || 0), z: Number(own.z || 0),
      flightAt: own.flight_at ? new Date(String(own.flight_at)).toISOString() : null,
      disabledUntil: own.disabled_until ? new Date(String(own.disabled_until)).toISOString() : null,
      observations: Array.isArray(own.observations) ? own.observations.map(String) : [],
      classifications: Array.isArray(own.classifications) ? own.classifications.map(String) : [] } : null,
    timing: timingForPlayer(player),
    ufoBonus: Boolean(snapshot.ufo_bonus),
    milkyWayUfoBonus: Boolean(snapshot.ufo_bonus),
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

export async function applyGalaxyScoreEvent(code: string, playerId: string, playerKey: string, kind: Exclude<ScoreEventKind, 'ufo'>, referenceValue: unknown, _experienceValue?: unknown) {
  await ensureGalaxyVoyageDatabase();
  const player = await verifiedPlayer(code, playerId, playerKey);
  if (!player) return { status: 'unauthorized' as const };
  const timing = timingForPlayer(player);
  if (timing.state === 'waiting' || timing.state === 'ended') return { status: timing.state };
  const reference = String(referenceValue || '').trim().toLowerCase();
  if (!/^[a-z0-9:_-]{1,80}$/.test(reference)) return { status: 'invalid' as const };
  const isMilkyWayObjects = String(player.title).includes('우리은하 천체 탐사');
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
      SELECT ${eventId}, ${String(player.session_id)}, ${playerId}, ${eventKey}, ${kind}, ${delta}, ${message}
      FROM galaxy_voyage_sessions s WHERE s.id=${String(player.session_id)} AND (s.duration_seconds IS NULL OR (s.started_at IS NOT NULL AND s.started_at<=statement_timestamp() AND s.started_at+s.duration_seconds*INTERVAL '1 second'>statement_timestamp()))
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

async function applySharedUfoEvent(player: Record<string, unknown>, eventRef: string, isMilkyWayObjects: boolean) {
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
  const completionCount = isMilkyWayObjects ? MILKY_WAY_OBJECT_KEYS.length : GALAXY_CLASSIFICATION_COUNT;
  // Observation events are unique per player and object, so they are also the completion counter.
  const rows = await database()`WITH progress AS (
      SELECT CASE WHEN COUNT(*)>=${completionCount} THEN 2 ELSE 1 END AS reward_multiplier
      FROM galaxy_voyage_score_events
      WHERE actor_id=${playerId} AND event_kind='observation'
    ), candidate AS MATERIALIZED (
      SELECT id FROM galaxy_voyage_players
      WHERE session_id=${sessionId} AND id<>${playerId} AND ${needsTarget}::boolean
        AND (CASE WHEN ${outcome}::text='swap'
          THEN score>(SELECT score FROM galaxy_voyage_players WHERE id=${playerId})
          ELSE score>0 END)
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
          WHEN ${outcome}::text='swap' AND t.score<=a.score THEN 'gain25'
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
      FROM amounts WHERE EXISTS(SELECT 1 FROM galaxy_voyage_sessions s WHERE s.id=${sessionId} AND (s.duration_seconds IS NULL OR (s.started_at IS NOT NULL AND s.started_at<=statement_timestamp() AND s.started_at+s.duration_seconds*INTERVAL '1 second'>statement_timestamp())))
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
    ufoBonus: Number(row.reward_multiplier) === 2,
    milkyWayUfoBonus: Number(row.reward_multiplier) === 2,
    score: Number(row.score || 0),
    delta: Number(row.actor_delta || 0),
    message: String(row.actor_message || ''),
  };
}

export async function applyRandomUfoEvent(code: string, playerId: string, playerKey: string, eventKeyValue: unknown, _experienceValue?: unknown) {
  await ensureGalaxyVoyageDatabase();
  const player = await verifiedPlayer(code, playerId, playerKey);
  if (!player) return { status: 'unauthorized' as const };
  const timing = timingForPlayer(player);
  if (timing.state === 'waiting' || timing.state === 'ended') return { status: timing.state };
  const eventRef = String(eventKeyValue || '').trim().toLowerCase();
  if (!/^[a-z0-9-]{8,80}$/.test(eventRef)) return { status: 'invalid' as const };
  return applySharedUfoEvent(player, eventRef, String(player.title).includes('우리은하 천체 탐사'));
}

function timingForPlayer(row: Record<string, unknown>) {
  const duration = row.duration_seconds == null ? null : Number(row.duration_seconds);
  const start = row.started_at ? new Date(String(row.started_at)).getTime() : null;
  const now = new Date(String(row.server_now)).getTime();
  const end = start !== null && duration !== null ? start + duration * 1000 : null;
  const state: 'running' | 'waiting' | 'ended' = duration === null ? 'running' : start === null || now < start ? 'waiting' : now >= end! ? 'ended' : 'running';
  return { durationSeconds: duration, startedAt: start === null ? null : new Date(start).toISOString(), endsAt: end === null ? null : new Date(end).toISOString(), serverTime: new Date(now).toISOString(), state };
}

export async function controlGalaxySession(code: string, teacherKey: string, start: boolean) {
  const db = database();
  if (start) {
    await db`UPDATE galaxy_voyage_sessions SET started_at=statement_timestamp()+INTERVAL '10 seconds'
      WHERE code=${code} AND teacher_key_hash=${hashKey(teacherKey)} AND expires_at>NOW()
        AND duration_seconds IS NOT NULL AND started_at IS NULL`;
  }
  const rows = await db`SELECT s.duration_seconds, s.started_at, statement_timestamp() AS server_now,
    (SELECT COUNT(*)::int FROM galaxy_voyage_players p WHERE p.session_id=s.id) AS participant_count,
    (SELECT COALESCE(json_agg(r ORDER BY r.rank), '[]'::json) FROM (
      SELECT p.id,p.nickname,p.score,p.flight_x AS x,p.flight_y AS y,p.flight_z AS z,p.flight_at,
        ROW_NUMBER() OVER (ORDER BY p.score DESC,p.updated_at ASC)::int AS rank,
        (SELECT COALESCE(json_agg(e.event_key),'[]'::json) FROM galaxy_voyage_score_events e
          WHERE e.actor_id=p.id AND e.event_kind='observation') AS observations,
        (SELECT COALESCE(json_agg(e.event_key),'[]'::json) FROM galaxy_voyage_score_events e
          WHERE e.actor_id=p.id AND e.event_kind='classification_correct') AS classifications
      FROM galaxy_voyage_players p WHERE p.session_id=s.id
    ) r) AS leaders
    FROM galaxy_voyage_sessions s WHERE s.code=${code} AND s.teacher_key_hash=${hashKey(teacherKey)}
      AND s.expires_at>NOW()`;
  if (!rows[0]) return null;
  return { timing: timingForPlayer(rows[0]), participantCount: Number(rows[0].participant_count), leaders: rows[0].leaders };
}



// One authenticated statement per position exchange; positions are scoped to a classroom.
export async function syncGalaxyFlight(code: string, playerId: string, key: string, position: unknown) {
  if (!Array.isArray(position) || position.length !== 3 || !position.every(v => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 20000)) return null;
  const [x,y,z] = position;
  const rows = await database()`WITH actor AS MATERIALIZED (
    SELECT p.id,p.session_id,p.attack_at,p.disabled_until,s.title FROM galaxy_voyage_players p
    JOIN galaxy_voyage_sessions s ON p.session_id=s.id WHERE s.code=${code} AND p.id=${playerId}
      AND p.player_key_hash=${hashKey(key)} AND s.expires_at>statement_timestamp()
      AND (s.duration_seconds IS NULL OR (s.started_at<=statement_timestamp() AND s.started_at+s.duration_seconds*INTERVAL '1 second'>statement_timestamp()))
  ), moved AS (
    UPDATE galaxy_voyage_players p SET
      flight_x=CASE WHEN p.disabled_until>statement_timestamp() THEN p.flight_x ELSE ${x} END,
      flight_y=CASE WHEN p.disabled_until>statement_timestamp() THEN p.flight_y ELSE ${y} END,
      flight_z=CASE WHEN p.disabled_until>statement_timestamp() THEN p.flight_z ELSE ${z} END,
      flight_at=statement_timestamp()
    FROM actor a WHERE p.id=a.id AND (p.flight_at IS NULL OR p.flight_at<statement_timestamp()-INTERVAL '1 second')
    RETURNING p.id
  ) SELECT a.attack_at,a.disabled_until,statement_timestamp() AS server_time,
    (SELECT COUNT(*)>=CASE WHEN a.title LIKE '%우리은하 천체 탐사%' THEN ${MILKY_WAY_OBJECT_KEYS.length}::int ELSE ${GALAXY_CLASSIFICATION_COUNT}::int END
      FROM galaxy_voyage_score_events WHERE actor_id=a.id AND event_kind='observation') AS unlocked,
    (SELECT COALESCE(json_agg(v),'[]'::json) FROM (
      SELECT p.id,p.nickname,p.flight_x AS x,p.flight_y AS y,p.flight_z AS z,p.disabled_until
      FROM galaxy_voyage_players p WHERE p.session_id=a.session_id AND p.id<>a.id
        AND p.flight_at>statement_timestamp()-INTERVAL '8 seconds'
      ORDER BY p.id LIMIT 40
    ) v) AS peers FROM actor a`;
  return rows[0] || null;
}

export async function attackGalaxyPlayer(code: string, playerId: string, key: string, target: unknown, shot: unknown) {
  if (typeof target !== 'string' || target===playerId || typeof shot !== 'string' || !/^[a-zA-Z0-9-]{8,80}$/.test(shot)) return null;
  // Lock in the same ID order as UFO exchanges, keeping each score transfer atomic.
  const rows = await database()`WITH auth AS MATERIALIZED (
    SELECT p.id,p.session_id,s.title FROM galaxy_voyage_players p JOIN galaxy_voyage_sessions s ON s.id=p.session_id
    WHERE p.id=${playerId} AND p.player_key_hash=${hashKey(key)} AND s.code=${code} AND s.expires_at>statement_timestamp()
      AND (s.duration_seconds IS NULL OR (s.started_at<=statement_timestamp() AND s.started_at+s.duration_seconds*INTERVAL '1 second'>statement_timestamp()))
  ), locked AS MATERIALIZED (
    SELECT p.*,a.title FROM galaxy_voyage_players p JOIN auth a ON p.session_id=a.session_id
    WHERE p.id=a.id OR p.id=${target} ORDER BY p.id FOR UPDATE OF p
  ), ready AS (
    SELECT a.id AS actor_id,a.session_id,a.nickname AS actor_name,t.id AS target_id,t.nickname AS target_name,LEAST(50,t.score) AS delta
    FROM locked a JOIN locked t ON t.id=${target} WHERE a.id=${playerId}
      AND (SELECT COUNT(*) FROM galaxy_voyage_score_events WHERE actor_id=a.id AND event_kind='observation')>=
        CASE WHEN a.title LIKE '%우리은하 천체 탐사%' THEN ${MILKY_WAY_OBJECT_KEYS.length}::int ELSE ${GALAXY_CLASSIFICATION_COUNT}::int END
      AND (a.attack_at IS NULL OR a.attack_at<=statement_timestamp()-INTERVAL '2 seconds')
      AND (a.disabled_until IS NULL OR a.disabled_until<=statement_timestamp())
      AND a.flight_at>statement_timestamp()-INTERVAL '8 seconds' AND t.flight_at>statement_timestamp()-INTERVAL '8 seconds'
      AND power(a.flight_x-t.flight_x,2)+power(a.flight_y-t.flight_y,2)+power(a.flight_z-t.flight_z,2)<=810000
  ), event AS (
    INSERT INTO galaxy_voyage_score_events(id,session_id,actor_id,target_id,event_key,event_kind,actor_delta,target_delta,actor_message,target_message)
    SELECT ${randomUUID()},session_id,actor_id,target_id,${'attack:'+shot},'player_attack',delta,-delta,
      target_name||' 명중! +'||delta||'점',actor_name||'의 공격! -'||delta||'점' FROM ready
    ON CONFLICT(actor_id,event_key) DO NOTHING RETURNING *
  ), changed AS (
    UPDATE galaxy_voyage_players p SET score=p.score+CASE WHEN p.id=e.actor_id THEN e.actor_delta ELSE e.target_delta END,
      attack_at=CASE WHEN p.id=e.actor_id THEN statement_timestamp() ELSE p.attack_at END,
      disabled_until=CASE WHEN p.id=e.target_id AND (p.disabled_until IS NULL OR p.disabled_until<=statement_timestamp())
        AND 1+(SELECT COUNT(*) FROM galaxy_voyage_score_events h WHERE h.target_id=e.target_id
          AND h.event_kind='player_attack' AND h.created_at>statement_timestamp()-INTERVAL '10 seconds')>=3
        THEN statement_timestamp()+INTERVAL '30 seconds' ELSE p.disabled_until END,
      updated_at=statement_timestamp()
    FROM event e WHERE p.id=e.actor_id OR p.id=e.target_id RETURNING p.id,p.score,p.disabled_until
  ) SELECT e.actor_message||CASE WHEN t.disabled_until>statement_timestamp() THEN ' · 상대 우주선 30초 불능!' ELSE '' END AS message,
      e.actor_delta AS delta,c.score FROM event e JOIN changed c ON c.id=e.actor_id JOIN changed t ON t.id=e.target_id`;
  return rows[0] || null;
}
