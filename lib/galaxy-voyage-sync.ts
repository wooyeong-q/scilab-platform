import { createHash } from 'node:crypto';
import { sql } from './db';
import { timingForPlayer } from './galaxy-voyage';

// Stateless, authenticated snapshots. Tokens describe committed row contents, not
// an application-server clock, so reconnects and separate Vercel instances agree.
type Row = Record<string, any>;
function database() {
  if (!sql) throw new Error('DATABASE_URL is not configured');
  return sql;
}
function hash(key: string) { return createHash('sha256').update(key).digest('hex'); }
function versions(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '{}';
  return JSON.stringify(Object.fromEntries(Object.entries(value).slice(0, 40)
    .filter(([id, token]) => /^[a-zA-Z0-9-]{1,80}$/.test(id) && typeof token === 'string' && /^[a-f0-9]{32}$/.test(token))));
}
function token(value: unknown) { return typeof value === 'string' && /^[a-f0-9]{32}$/.test(value) ? value : ''; }
function cursor(value: any) {
  // Keep PostgreSQL's microseconds intact; converting through Date can lose a
  // notification at a page boundary. A tuple also handles equal timestamps.
  const at = typeof value?.at === 'string' && value.at.length <= 40 && Number.isFinite(Date.parse(value.at)) ? value.at : '1970-01-01T00:00:00Z';
  const id = typeof value?.id === 'string' && /^[a-zA-Z0-9-]{0,80}$/.test(value.id) ? value.id : '';
  return { at, id };
}

export async function syncGalaxyClassroom(code: string, playerId: string, playerKey: string, input: Row = {}) {
  const position = Array.isArray(input.position) && input.position.length === 3 && input.position.every((v: unknown) => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 20000) ? input.position : null;
  const notes = cursor(input.notifications);
  const rows = await database()`WITH actor AS MATERIALIZED (
      SELECT p.*,s.title,s.duration_seconds,s.started_at,statement_timestamp() AS server_now
      FROM galaxy_voyage_players p JOIN galaxy_voyage_sessions s ON s.id=p.session_id
      WHERE s.code=${code} AND s.expires_at>statement_timestamp() AND p.id=${playerId} AND p.player_key_hash=${hash(playerKey)}
    ), moved AS (
      UPDATE galaxy_voyage_players p SET flight_x=CASE WHEN p.disabled_until>statement_timestamp() THEN p.flight_x ELSE ${position?.[0] ?? 0} END,
        flight_y=CASE WHEN p.disabled_until>statement_timestamp() THEN p.flight_y ELSE ${position?.[1] ?? 0} END,
        flight_z=CASE WHEN p.disabled_until>statement_timestamp() THEN p.flight_z ELSE ${position?.[2] ?? 0} END,flight_at=statement_timestamp()
      FROM actor a WHERE p.id=a.id AND ${Boolean(position)}
        AND (a.duration_seconds IS NULL OR (a.started_at<=statement_timestamp() AND a.started_at+a.duration_seconds*INTERVAL '1 second'>statement_timestamp()))
        AND (p.flight_at IS NULL OR p.flight_at<statement_timestamp()-INTERVAL '1 second')
        AND (p.flight_x<>${position?.[0] ?? 0} OR p.flight_y<>${position?.[1] ?? 0} OR p.flight_z<>${position?.[2] ?? 0} OR p.flight_at<statement_timestamp()-INTERVAL '4 seconds')
      RETURNING p.id
    ), ranked AS MATERIALIZED (
      SELECT p.id,p.nickname,p.score,p.updated_at,
        ROW_NUMBER() OVER(ORDER BY p.score DESC,p.updated_at ASC,p.id ASC)::int AS rank
      FROM galaxy_voyage_players p JOIN actor a ON a.session_id=p.session_id
    ), revision AS (
      SELECT md5(COALESCE(string_agg(id||':'||score||':'||updated_at::text,',' ORDER BY id),'')) AS board_version FROM ranked
    ), peers AS MATERIALIZED (
      SELECT p.id,p.nickname,p.flight_x AS x,p.flight_y AS y,p.flight_z AS z,p.disabled_until,
        md5(concat_ws(':',p.flight_x,p.flight_y,p.flight_z,COALESCE(p.disabled_until::text,''))) AS version
      FROM galaxy_voyage_players p JOIN actor a ON a.session_id=p.session_id
      WHERE p.id<>a.id AND p.flight_at>statement_timestamp()-INTERVAL '8 seconds'
    ), notifications AS MATERIALIZED (
      SELECT e.id,e.target_message AS message,e.created_at AS "createdAt",e.created_at::text AS cursor_at
      FROM galaxy_voyage_score_events e JOIN actor a ON e.target_id=a.id
      WHERE (e.created_at,e.id)>(${notes.at}::timestamptz,${notes.id}::text)
      ORDER BY e.created_at,e.id LIMIT 50
    ) SELECT a.duration_seconds,a.started_at,a.server_now,
      a.attack_at,a.disabled_until,a.flight_x AS x,a.flight_y AS y,a.flight_z AS z,a.flight_at,
      md5(a.updated_at::text||':'||a.score) AS progress_version,r.board_version,
      (SELECT row_to_json(me) FROM ranked me WHERE me.id=a.id) AS self,
      CASE WHEN r.board_version<>${token(input.boardVersion)} THEN (SELECT json_agg(b ORDER BY b.rank) FROM ranked b) END AS leaders,
      CASE WHEN md5(a.updated_at::text||':'||a.score)<>${token(input.progressVersion)} THEN (
        SELECT json_build_object(
          'observations',COALESCE(json_agg(e.event_key) FILTER(WHERE e.event_kind='observation'),'[]'::json),
          'classifications',COALESCE(json_agg(e.event_key) FILTER(WHERE e.event_kind='classification_correct'),'[]'::json))
        FROM galaxy_voyage_score_events e WHERE e.actor_id=a.id AND e.event_kind IN ('observation','classification_correct')
      ) END AS progress,
      CASE WHEN a.title LIKE '%우리은하 천체 탐사%' THEN 25 ELSE 50 END AS completion_count,
      (SELECT COALESCE(json_agg(p.id ORDER BY p.id),'[]'::json) FROM peers p) AS peer_ids,
      (SELECT COALESCE(json_agg(p ORDER BY p.id),'[]'::json) FROM peers p WHERE COALESCE(${versions(input.peers)}::jsonb->>p.id,'')<>p.version) AS peers,
      (SELECT COALESCE(json_agg(n ORDER BY n."createdAt",n.id),'[]'::json) FROM notifications n) AS notifications
    FROM actor a CROSS JOIN revision r`;
  const row = rows[0] as Row | undefined;
  if (!row) return null;
  const notifications = row.notifications as Row[], last = notifications.at(-1);
  return {
    protocol: 2, timing: timingForPlayer(row), serverTime: new Date(row.server_now).toISOString(),
    boardVersion: row.board_version, progressVersion: row.progress_version,
    self: { ...row.self, x: row.x, y: row.y, z: row.z, flightAt: row.flight_at, disabledUntil: row.disabled_until, ...(row.progress || {}) },
    completionCount: row.completion_count, leaders: row.leaders,
    flight: { peers: row.peers, peerIds: row.peer_ids, attack_at: row.attack_at, disabled_until: row.disabled_until, server_time: row.server_now },
    notifications: notifications.map(({ cursor_at, ...note }) => note),
    notificationCursor: last ? { at: last.cursor_at, id: last.id } : notes,
    moreNotifications: notifications.length === 50,
  };
}

export async function syncGalaxyTeacher(code: string, teacherKey: string, input: Row = {}) {
  const rows = await database()`WITH session AS MATERIALIZED (
      SELECT * FROM galaxy_voyage_sessions WHERE code=${code} AND teacher_key_hash=${hash(teacherKey)} AND expires_at>statement_timestamp()
    ), players AS MATERIALIZED (
      SELECT p.*,ROW_NUMBER() OVER(ORDER BY p.score DESC,p.updated_at ASC,p.id ASC)::int AS rank,
        md5(p.updated_at::text||':'||p.score) AS progress_version,
        md5(concat_ws(':',p.flight_x,p.flight_y,p.flight_z,COALESCE(p.disabled_until::text,''),COALESCE(p.flight_at::text,''))) AS flight_version
      FROM galaxy_voyage_players p JOIN session s ON p.session_id=s.id
    ) SELECT s.duration_seconds,s.started_at,statement_timestamp() AS server_now,
      (SELECT COUNT(*)::int FROM players) AS participant_count,
      (SELECT COALESCE(json_agg(p.id ORDER BY p.rank),'[]'::json) FROM players p) AS player_ids,
      (SELECT COALESCE(json_agg(v ORDER BY v.rank),'[]'::json) FROM (
        SELECT p.id,p.nickname,p.score,p.rank,p.progress_version AS "progressVersion",p.flight_version AS "flightVersion",
          p.flight_x AS x,p.flight_y AS y,p.flight_z AS z,p.flight_at,
          CASE WHEN COALESCE(${versions(input.progress)}::jsonb->>p.id,'')<>p.progress_version THEN (
            SELECT json_build_object(
              'observations',COALESCE(json_agg(e.event_key) FILTER(WHERE e.event_kind='observation'),'[]'::json),
              'classifications',COALESCE(json_agg(e.event_key) FILTER(WHERE e.event_kind='classification_correct'),'[]'::json))
            FROM galaxy_voyage_score_events e WHERE e.actor_id=p.id AND e.event_kind IN ('observation','classification_correct')
          ) END AS progress
        FROM players p WHERE COALESCE(${versions(input.progress)}::jsonb->>p.id,'')<>p.progress_version
          OR COALESCE(${versions(input.flights)}::jsonb->>p.id,'')<>p.flight_version
      ) v) AS players
    FROM session s`;
  const row = rows[0] as Row | undefined;
  return row ? { protocol: 2, timing: timingForPlayer(row), participantCount: row.participant_count, playerIds: row.player_ids, players: row.players } : null;
}
