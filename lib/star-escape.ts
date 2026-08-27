import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { sql } from './db';

const SESSION_DAYS = 14;
const MAX_PLAYERS = 45;
const MAX_TEAMS = 12;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const STAGE_QUESTION_COUNTS = [3, 3, 4, 3] as const;
const QUESTIONS = [
  [
    { answer: '7139', label: '비상 전력 암호', hint: '각 대원의 별 색과 숫자를 모은 뒤, 별의 표면 온도가 높은 순서대로 숫자를 배열하세요.' },
    { answer: '4826', label: '관측 수납함 배선', hint: 'R3은 노란색입니다. 별의 표면 온도는 푸른색, 흰색, 노란색, 붉은색 순으로 낮아집니다. 네 조건을 비교해 각 대원의 전선을 알맞은 별 색 단자에 연결하세요.' },
    { answer: '14', label: '항법장치 검증 암호', hint: '자료가 부족한 기록은 틀린 기록과 다릅니다. 과학적으로 참이라고 확인되는 기록 번호 두 개를 고르세요.' },
  ],
  [
    { answer: 'A', label: '관측 센서 기준 표적', hint: '각 대원이 본 표적이 배경에 대해 얼마나 위치가 달라졌는지 말해 보세요.', hints: ['각 대원이 본 표적이 배경에 대해 얼마나 위치가 달라졌는지 말해 보세요.', '가까운 물체일수록 관측 위치가 바뀌었을 때 시차가 크게 나타납니다.', '네 표적 중 A의 위치 변화가 가장 큽니다.'] },
    { answer: 'ABP', label: '6개월 관측과 연주시차', hint: '세 대원이 받은 관측 날짜부터 서로 말해 보세요.', hints: ['세 대원이 받은 관측 날짜부터 서로 말해 보세요.', '지구가 태양의 반대편에 놓이는 6개월 간격의 관측 기록이 필요합니다.', '3월 18일과 9월 18일을 고르세요. 두 겉보기 위치 사이의 최대 각거리는 2p이고, 그 절반이 연주시차 p입니다.'] },
    { answer: 'KMNL', label: '별 거리 자료 복구', hint: '먼저 네 별의 연주시차가 큰 순서를 말로 정리하세요.', hints: ['먼저 네 별의 연주시차가 큰 순서를 말로 정리하세요.', '연주시차가 클수록 별까지의 거리는 가깝습니다.', '연주시차는 K > M > N > L 순입니다. 따라서 가까운 순서도 K → M → N → L입니다.'] },
  ],
  [
    { answer: 'OPEN', label: '산개성단 판별', hint: '젊은 별들이 은하 원반에서 느슨하고 불규칙하게 모여 있습니다.' },
    { answer: 'GLOBULAR', label: '구상성단 판별', hint: '오래된 별들이 둥글고 조밀하게 모이며 우리은하 헤일로에 분포합니다.' },
    { answer: '1212', label: '성단 기록 비교', hint: '1은 산개성단, 2는 구상성단입니다. 대원 1번부터 차례로 분류하세요.' },
    { answer: '35214', label: '천체 5종 분류', hint: '발광성운 1, 반사성운 2, 암흑성운 3, 산개성단 4, 구상성단 5로 바꾸세요.' },
  ],
  [
    { answer: 'BARREDSPIRAL', label: '우리은하 모양', hint: '우리은하는 중심에 막대 구조가 있는 나선은하입니다.' },
    { answer: 'DISK', label: '태양계 위치', hint: '태양계는 중심이나 헤일로가 아니라 우리은하 원반의 나선팔에 있습니다.' },
    { answer: '4826', label: '지구 귀환 좌표', hint: '범위를 우주 → 우리은하 → 태양계 → 지구 순으로 줄여 숫자를 읽으세요.' },
  ],
] as const;

let initialized = false;
let initialization: Promise<void> | null = null;

type EscapeSession = {
  id: string;
  code: string;
  title: string;
  durationSeconds: number;
  startedAt: string | null;
  expiresAt: string;
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

function mapSession(row: Record<string, unknown>): EscapeSession {
  return {
    id: String(row.id),
    code: String(row.code),
    title: String(row.title || ''),
    durationSeconds: Number(row.duration_seconds || 1800),
    startedAt: row.started_at ? new Date(String(row.started_at)).toISOString() : null,
    expiresAt: new Date(String(row.expires_at)).toISOString(),
  };
}

function normalizeTeam(value: unknown) {
  const number = Number(String(value || '').replace(/[^0-9]/g, ''));
  return Number.isInteger(number) && number >= 1 && number <= MAX_TEAMS ? `${number}모둠` : '';
}

function safeAnswer(value: unknown) {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20);
}

function questionConfig(stage: number, question: number) {
  return QUESTIONS[stage - 1]?.[question - 1];
}

export function normalizeEscapeCode(value: unknown) {
  const code = String(value || '').trim().toUpperCase();
  return /^[A-HJ-NP-Z2-9]{6}$/.test(code) ? code : '';
}

export async function ensureStarEscapeDatabase() {
  if (initialized) return;
  if (initialization) return initialization;
  initialization = (async () => {
    const db = database();
    const schemaRows = await db`SELECT
      to_regclass('public.star_escape_sessions') IS NOT NULL AS has_sessions,
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='star_escape_team_progress' AND column_name='question_no'
      ) AS has_question_progress,
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='star_escape_team_progress' AND column_name='last_action_status'
      ) AS has_action_progress`;
    if (schemaRows[0]?.has_sessions && schemaRows[0]?.has_question_progress && schemaRows[0]?.has_action_progress) {
      initialized = true;
      return;
    }
    await db`CREATE TABLE IF NOT EXISTS star_escape_sessions (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL DEFAULT '',
      teacher_key_hash TEXT NOT NULL,
      duration_seconds INTEGER NOT NULL DEFAULT 1800 CHECK (duration_seconds BETWEEN 300 AND 3600),
      started_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL
    )`;
    await db`CREATE TABLE IF NOT EXISTS star_escape_players (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES star_escape_sessions(id) ON DELETE CASCADE,
      team_name TEXT NOT NULL,
      nickname TEXT NOT NULL,
      role_no INTEGER NOT NULL CHECK (role_no BETWEEN 1 AND 4),
      player_key_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(session_id, nickname),
      UNIQUE(session_id, team_name, role_no)
    )`;
    await db`CREATE TABLE IF NOT EXISTS star_escape_team_progress (
      session_id TEXT NOT NULL REFERENCES star_escape_sessions(id) ON DELETE CASCADE,
      team_name TEXT NOT NULL,
      stage INTEGER NOT NULL DEFAULT 1 CHECK (stage BETWEEN 1 AND 5),
      question_no INTEGER NOT NULL DEFAULT 1,
      stage_started_at TIMESTAMPTZ,
      question_started_at TIMESTAMPTZ,
      penalty_seconds INTEGER NOT NULL DEFAULT 0 CHECK (penalty_seconds >= 0),
      hint_count INTEGER NOT NULL DEFAULT 0 CHECK (hint_count >= 0),
      last_submitter TEXT,
      last_action_status TEXT,
      last_action_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY(session_id, team_name)
    )`;
    await db`CREATE TABLE IF NOT EXISTS star_escape_attempts (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES star_escape_sessions(id) ON DELETE CASCADE,
      team_name TEXT NOT NULL,
      player_id TEXT NOT NULL REFERENCES star_escape_players(id) ON DELETE CASCADE,
      stage INTEGER NOT NULL CHECK (stage BETWEEN 1 AND 4),
      question_no INTEGER NOT NULL DEFAULT 1,
      answer TEXT NOT NULL DEFAULT '',
      is_correct BOOLEAN NOT NULL DEFAULT FALSE,
      elapsed_ms INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await db`CREATE TABLE IF NOT EXISTS star_escape_hints (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES star_escape_sessions(id) ON DELETE CASCADE,
      team_name TEXT,
      requester_id TEXT REFERENCES star_escape_players(id) ON DELETE SET NULL,
      hint_type TEXT NOT NULL CHECK (hint_type IN ('request', 'teacher')),
      stage INTEGER NOT NULL DEFAULT 1,
      question_no INTEGER NOT NULL DEFAULT 1,
      message TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await db`ALTER TABLE star_escape_team_progress ADD COLUMN IF NOT EXISTS question_no INTEGER NOT NULL DEFAULT 1`;
    await db`ALTER TABLE star_escape_team_progress ADD COLUMN IF NOT EXISTS question_started_at TIMESTAMPTZ`;
    await db`ALTER TABLE star_escape_team_progress ADD COLUMN IF NOT EXISTS last_submitter TEXT`;
    await db`ALTER TABLE star_escape_team_progress ADD COLUMN IF NOT EXISTS last_action_status TEXT`;
    await db`ALTER TABLE star_escape_team_progress ADD COLUMN IF NOT EXISTS last_action_at TIMESTAMPTZ`;
    await db`ALTER TABLE star_escape_attempts ADD COLUMN IF NOT EXISTS question_no INTEGER NOT NULL DEFAULT 1`;
    await db`ALTER TABLE star_escape_hints ADD COLUMN IF NOT EXISTS question_no INTEGER NOT NULL DEFAULT 1`;
    await db`CREATE INDEX IF NOT EXISTS star_escape_sessions_expires_idx ON star_escape_sessions(expires_at)`;
    await db`CREATE INDEX IF NOT EXISTS star_escape_players_session_team_idx ON star_escape_players(session_id, team_name)`;
    await db`CREATE INDEX IF NOT EXISTS star_escape_attempts_session_stage_idx ON star_escape_attempts(session_id, stage)`;
    await db`CREATE INDEX IF NOT EXISTS star_escape_hints_session_created_idx ON star_escape_hints(session_id, created_at DESC)`;
    initialized = true;
  })().catch((error) => {
    initialization = null;
    throw error;
  });
  return initialization;
}

export async function createStarEscapeSession(titleValue: unknown) {
  await ensureStarEscapeDatabase();
  const db = database();
  const title = String(titleValue || '우주방위대 귀환 작전').trim().slice(0, 60) || '우주방위대 귀환 작전';
  const teacherKey = newSecret();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);
  await db`DELETE FROM star_escape_sessions WHERE expires_at < NOW()`;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const id = randomUUID();
    const code = newCode();
    const rows = await db`INSERT INTO star_escape_sessions (id, code, title, teacher_key_hash, duration_seconds, expires_at)
      VALUES (${id}, ${code}, ${title}, ${hashKey(teacherKey)}, 1800, ${expiresAt.toISOString()})
      ON CONFLICT (code) DO NOTHING RETURNING *`;
    if (rows[0]) return { session: mapSession(rows[0] as Record<string, unknown>), teacherKey };
  }
  throw new Error('수업 코드를 만들지 못했습니다.');
}

export async function joinStarEscapeSession(code: string, nicknameValue: unknown, teamValue: unknown, roleValue: unknown) {
  await ensureStarEscapeDatabase();
  const db = database();
  const nickname = String(nicknameValue || '').trim().replace(/\s+/g, ' ').slice(0, 16);
  const team = normalizeTeam(teamValue);
  const role = Number(roleValue);
  if (!nickname || !team || !Number.isInteger(role) || role < 1 || role > 4) return { status: 'invalid' as const };
  const sessions = await db`SELECT * FROM star_escape_sessions WHERE code=${code} AND expires_at > NOW() LIMIT 1`;
  if (!sessions[0]) return { status: 'missing' as const };
  const session = mapSession(sessions[0] as Record<string, unknown>);
  const counts = await db`SELECT COUNT(*)::int AS count FROM star_escape_players WHERE session_id=${session.id}`;
  if (Number(counts[0]?.count || 0) >= MAX_PLAYERS) return { status: 'full' as const };
  const playerKey = newSecret();
  const id = randomUUID();
  const rows = await db`INSERT INTO star_escape_players (id, session_id, team_name, nickname, role_no, player_key_hash)
    VALUES (${id}, ${session.id}, ${team}, ${nickname}, ${role}, ${hashKey(playerKey)})
    ON CONFLICT DO NOTHING RETURNING id, nickname, team_name, role_no`;
  if (!rows[0]) {
    const duplicateName = await db`SELECT id FROM star_escape_players WHERE session_id=${session.id} AND nickname=${nickname} LIMIT 1`;
    return { status: duplicateName[0] ? 'duplicate' as const : 'role_taken' as const };
  }
  await db`INSERT INTO star_escape_team_progress (session_id, team_name, stage_started_at, question_started_at)
    VALUES (${session.id}, ${team}, ${session.startedAt}, ${session.startedAt}) ON CONFLICT (session_id, team_name) DO NOTHING`;
  return {
    status: 'joined' as const,
    session,
    player: { id, nickname, team, role },
    playerKey,
  };
}

async function verifiedPlayer(code: string, playerId: string, playerKey: string) {
  if (!playerId || !playerKey) return undefined;
  const rows = await database()`SELECT p.id, p.session_id, p.team_name, p.nickname, p.role_no
    FROM star_escape_players p JOIN star_escape_sessions s ON s.id=p.session_id
    WHERE s.code=${code} AND s.expires_at > NOW() AND p.id=${playerId} AND p.player_key_hash=${hashKey(playerKey)} LIMIT 1`;
  return rows[0] as Record<string, unknown> | undefined;
}

async function verifiedTeacher(code: string, teacherKey: string) {
  if (!teacherKey) return undefined;
  const rows = await database()`SELECT * FROM star_escape_sessions
    WHERE code=${code} AND teacher_key_hash=${hashKey(teacherKey)} AND expires_at > NOW() LIMIT 1`;
  return rows[0] as Record<string, unknown> | undefined;
}

function leaderboardFromRows(rows: Record<string, unknown>[]) {
  return rows.map((row, index) => ({
    rank: index + 1,
    team: String(row.team_name),
    stage: Number(row.stage || 1),
    question: Number(row.question_no || 1),
    completed: Boolean(row.completed_at),
    timeSeconds: Math.max(0, Math.round(Number(row.total_seconds || 0))),
    hints: Number(row.hint_count || 0),
  }));
}

export async function getStarEscapeState(code: string, playerId: string, playerKey: string) {
  await ensureStarEscapeDatabase();
  const player = await verifiedPlayer(code, playerId, playerKey);
  if (!player) return null;
  const db = database();
  const sessionId = String(player.session_id);
  const team = String(player.team_name);
  await db`UPDATE star_escape_players SET last_seen_at=NOW() WHERE id=${playerId}`;
  const [sessionRows, progressRows, memberRows, leaderboardRows, hintRows] = await Promise.all([
    db`SELECT * FROM star_escape_sessions WHERE id=${sessionId} LIMIT 1`,
    db`SELECT * FROM star_escape_team_progress WHERE session_id=${sessionId} AND team_name=${team} LIMIT 1`,
    db`SELECT id, nickname, role_no, last_seen_at FROM star_escape_players WHERE session_id=${sessionId} AND team_name=${team} ORDER BY role_no`,
    db`SELECT p.team_name, p.stage, p.question_no, p.completed_at, p.hint_count,
        CASE WHEN s.started_at IS NULL THEN 0 ELSE EXTRACT(EPOCH FROM (COALESCE(p.completed_at, NOW())-s.started_at))+p.penalty_seconds END AS total_seconds
      FROM star_escape_team_progress p JOIN star_escape_sessions s ON s.id=p.session_id
      WHERE p.session_id=${sessionId}
      ORDER BY (p.completed_at IS NOT NULL) DESC, p.stage DESC, p.question_no DESC,
        CASE WHEN s.started_at IS NULL THEN 0 ELSE EXTRACT(EPOCH FROM (COALESCE(p.completed_at, NOW())-s.started_at))+p.penalty_seconds END ASC,
        p.team_name ASC`,
    db`SELECT id, team_name, message, stage, question_no, created_at FROM star_escape_hints
      WHERE session_id=${sessionId} AND hint_type='teacher' AND (team_name IS NULL OR team_name=${team})
      ORDER BY created_at DESC LIMIT 8`,
  ]);
  if (!sessionRows[0] || !progressRows[0]) return null;
  const session = mapSession(sessionRows[0] as Record<string, unknown>);
  const progress = progressRows[0] as Record<string, unknown>;
  const elapsed = session.startedAt ? Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000) : 0;
  const penalty = Number(progress.penalty_seconds || 0);
  return {
    session,
    serverTime: new Date().toISOString(),
    player: { id: String(player.id), nickname: String(player.nickname), team, role: Number(player.role_no) },
    progress: {
      stage: Number(progress.stage || 1),
      question: Number(progress.question_no || 1),
      questionCount: Number(STAGE_QUESTION_COUNTS[Number(progress.stage || 1) - 1] || 0),
      completedAt: progress.completed_at ? new Date(String(progress.completed_at)).toISOString() : null,
      hintCount: Number(progress.hint_count || 0),
      penaltySeconds: penalty,
      remainingSeconds: Math.max(0, session.durationSeconds - elapsed - penalty),
      lastSubmitter: progress.last_submitter ? String(progress.last_submitter) : null,
      lastActionStatus: progress.last_action_status ? String(progress.last_action_status) : null,
      lastActionAt: progress.last_action_at ? new Date(String(progress.last_action_at)).toISOString() : null,
    },
    members: memberRows.map((row) => ({ id: String(row.id), nickname: String(row.nickname), role: Number(row.role_no), online: Date.now() - new Date(String(row.last_seen_at)).getTime() < 15000 })),
    leaderboard: leaderboardFromRows(leaderboardRows as Record<string, unknown>[]),
    teacherHints: hintRows.map((row) => ({ id: String(row.id), team: row.team_name ? String(row.team_name) : null, stage: Number(row.stage), question: Number(row.question_no || 1), message: String(row.message), createdAt: new Date(String(row.created_at)).toISOString() })).reverse(),
  };
}

export async function submitStarEscapeAnswer(code: string, playerId: string, playerKey: string, stageValue: unknown, questionValue: unknown, answerValue: unknown) {
  await ensureStarEscapeDatabase();
  const player = await verifiedPlayer(code, playerId, playerKey);
  if (!player) return { status: 'unauthorized' as const };
  const db = database();
  const sessionId = String(player.session_id);
  const team = String(player.team_name);
  const stage = Number(stageValue);
  const question = Number(questionValue);
  const answer = safeAnswer(answerValue);
  const config = questionConfig(stage, question);
  if (!Number.isInteger(stage) || !Number.isInteger(question) || !config || !answer) return { status: 'invalid' as const };
  const rows = await db`SELECT s.started_at, s.duration_seconds, p.stage, p.question_no, p.stage_started_at, p.question_started_at, p.penalty_seconds, p.completed_at
    FROM star_escape_team_progress p JOIN star_escape_sessions s ON s.id=p.session_id
    WHERE p.session_id=${sessionId} AND p.team_name=${team} LIMIT 1`;
  if (!rows[0]) return { status: 'missing' as const };
  const current = rows[0] as Record<string, unknown>;
  if (!current.started_at) return { status: 'waiting' as const };
  if (current.completed_at || Number(current.stage) !== stage || Number(current.question_no || 1) !== question) return { status: 'stale' as const };
  const totalElapsed = Math.floor((Date.now() - new Date(String(current.started_at)).getTime()) / 1000) + Number(current.penalty_seconds || 0);
  if (totalElapsed >= Number(current.duration_seconds || 1800)) return { status: 'expired' as const };
  const correct = answer === config.answer;
  const questionStartedAt = current.question_started_at
    ? new Date(String(current.question_started_at)).getTime()
    : current.stage_started_at
      ? new Date(String(current.stage_started_at)).getTime()
      : new Date(String(current.started_at)).getTime();
  const elapsedMs = Math.max(0, Math.min(3600000, Date.now() - questionStartedAt));
  await db`INSERT INTO star_escape_attempts (id, session_id, team_name, player_id, stage, question_no, answer, is_correct, elapsed_ms)
    VALUES (${randomUUID()}, ${sessionId}, ${team}, ${playerId}, ${stage}, ${question}, ${answer}, ${correct}, ${elapsedMs})`;
  if (!correct) {
    const actionRows = await db`UPDATE star_escape_team_progress SET
        last_submitter=${String(player.nickname)}, last_action_status='wrong', last_action_at=NOW(), updated_at=NOW()
      WHERE session_id=${sessionId} AND team_name=${team} AND stage=${stage} AND question_no=${question}
      RETURNING last_action_at`;
    return {
      status: 'wrong' as const,
      submitter: String(player.nickname),
      actionAt: actionRows[0]?.last_action_at ? new Date(String(actionRows[0].last_action_at)).toISOString() : null,
    };
  }
  const lastQuestion = question === STAGE_QUESTION_COUNTS[stage - 1];
  const nextStage = lastQuestion ? stage + 1 : stage;
  const nextQuestion = lastQuestion ? 1 : question + 1;
  const updated = await db`UPDATE star_escape_team_progress SET stage=${nextStage}, question_no=${nextQuestion},
      stage_started_at=CASE WHEN ${lastQuestion} THEN NOW() ELSE stage_started_at END,
      question_started_at=NOW(), completed_at=CASE WHEN ${nextStage}=5 THEN NOW() ELSE completed_at END,
      last_submitter=${String(player.nickname)}, last_action_status='correct', last_action_at=NOW(), updated_at=NOW()
    WHERE session_id=${sessionId} AND team_name=${team} AND stage=${stage} AND question_no=${question}
    RETURNING stage, question_no, completed_at, last_action_at`;
  return updated[0]
    ? {
        status: 'correct' as const,
        stage: nextStage,
        question: nextQuestion,
        sceneCompleted: lastQuestion,
        completed: nextStage === 5,
        submitter: String(player.nickname),
        actionAt: new Date(String(updated[0].last_action_at)).toISOString(),
      }
    : { status: 'stale' as const };
}

export async function requestStarEscapeHint(code: string, playerId: string, playerKey: string, stageValue: unknown, questionValue: unknown) {
  await ensureStarEscapeDatabase();
  const player = await verifiedPlayer(code, playerId, playerKey);
  if (!player) return { status: 'unauthorized' as const };
  const stage = Number(stageValue);
  const question = Number(questionValue);
  const config = questionConfig(stage, question);
  if (!config) return { status: 'invalid' as const };
  const db = database();
  const sessionId = String(player.session_id);
  const team = String(player.team_name);
  const priorHintRows = await db`SELECT COUNT(*)::int AS count FROM star_escape_hints
    WHERE session_id=${sessionId} AND team_name=${team} AND hint_type='request' AND stage=${stage} AND question_no=${question}`;
  const hintNumber = Number(priorHintRows[0]?.count || 0);
  const configuredHints = (config as { hint: string; hints?: readonly string[] }).hints;
  const hint = configuredHints?.[Math.min(hintNumber, configuredHints.length - 1)] || config.hint;
  const updated = await db`UPDATE star_escape_team_progress SET hint_count=hint_count+1,
      penalty_seconds=penalty_seconds+CASE WHEN hint_count>=3 THEN 30 ELSE 0 END, updated_at=NOW()
    WHERE session_id=${sessionId} AND team_name=${team} AND stage=${stage} AND question_no=${question}
      AND EXISTS (SELECT 1 FROM star_escape_sessions s WHERE s.id=${sessionId} AND s.started_at IS NOT NULL)
    RETURNING hint_count, penalty_seconds`;
  if (!updated[0]) return { status: 'stale' as const };
  const count = Number(updated[0].hint_count || 0);
  await db`INSERT INTO star_escape_hints (id, session_id, team_name, requester_id, hint_type, stage, question_no, message)
    VALUES (${randomUUID()}, ${sessionId}, ${team}, ${playerId}, 'request', ${stage}, ${question}, ${`${String(player.nickname)} · ${stage}-${question} 문제 힌트 요청`})`;
  return {
    status: 'ok' as const,
    hint,
    hintCount: count,
    penaltySeconds: Number(updated[0].penalty_seconds || 0),
    penaltyAdded: count > 3 ? 30 : 0,
  };
}

export async function getStarEscapeTeacherState(code: string, teacherKey: string) {
  await ensureStarEscapeDatabase();
  const verified = await verifiedTeacher(code, teacherKey);
  if (!verified) return null;
  const db = database();
  const session = mapSession(verified);
  const [teamRows, stageRows, playerRows, requestRows] = await Promise.all([
    db`SELECT p.team_name, p.stage, p.question_no, p.hint_count, p.penalty_seconds, p.completed_at,
        CASE WHEN s.started_at IS NULL THEN 0 ELSE EXTRACT(EPOCH FROM (COALESCE(p.completed_at, NOW())-s.started_at))+p.penalty_seconds END AS total_seconds
      FROM star_escape_team_progress p JOIN star_escape_sessions s ON s.id=p.session_id
      WHERE p.session_id=${session.id}
      ORDER BY (p.completed_at IS NOT NULL) DESC, p.stage DESC, p.question_no DESC, total_seconds ASC, p.team_name`,
    db`SELECT stage, question_no, COUNT(*)::int AS attempts,
        COUNT(*) FILTER (WHERE is_correct)::int AS correct,
        COALESCE(AVG(elapsed_ms) FILTER (WHERE is_correct), 0)::float AS average_ms
      FROM star_escape_attempts WHERE session_id=${session.id} GROUP BY stage, question_no ORDER BY stage, question_no`,
    db`SELECT team_name, nickname, role_no, last_seen_at FROM star_escape_players WHERE session_id=${session.id} ORDER BY team_name, role_no`,
    db`SELECT h.id, h.team_name, h.stage, h.question_no, h.message, h.created_at FROM star_escape_hints h
      WHERE h.session_id=${session.id} AND h.hint_type='request' ORDER BY h.created_at DESC LIMIT 20`,
  ]);
  const members = new Map<string, { nickname: string; role: number; online: boolean }[]>();
  playerRows.forEach((row) => {
    const team = String(row.team_name);
    const list = members.get(team) || [];
    list.push({ nickname: String(row.nickname), role: Number(row.role_no), online: Date.now() - new Date(String(row.last_seen_at)).getTime() < 15000 });
    members.set(team, list);
  });
  const leaderboard = leaderboardFromRows(teamRows as Record<string, unknown>[]);
  return {
    session,
    serverTime: new Date().toISOString(),
    players: playerRows.length,
    activePlayers: playerRows.filter((row) => Date.now() - new Date(String(row.last_seen_at)).getTime() < 15000).length,
    teams: leaderboard.map((team) => ({ ...team, penaltySeconds: Number((teamRows[team.rank - 1] as Record<string, unknown>).penalty_seconds || 0), members: members.get(team.team) || [] })),
    questionStats: QUESTIONS.flatMap((questions, stageIndex) => questions.map((question, questionIndex) => {
      const stage = stageIndex + 1;
      const questionNo = questionIndex + 1;
      const row = stageRows.find((item) => Number(item.stage) === stage && Number(item.question_no || 1) === questionNo) as Record<string, unknown> | undefined;
      const attempts = Number(row?.attempts || 0);
      const correct = Number(row?.correct || 0);
      return {
        stage,
        question: questionNo,
        label: question.label,
        attempts,
        correct,
        accuracy: attempts ? Math.round(correct / attempts * 100) : 0,
        averageSeconds: Math.round(Number(row?.average_ms || 0) / 1000),
      };
    })),
    hintRequests: requestRows.map((row) => ({ id: String(row.id), team: String(row.team_name), stage: Number(row.stage), question: Number(row.question_no || 1), message: String(row.message), createdAt: new Date(String(row.created_at)).toISOString() })),
  };
}

export async function controlStarEscapeSession(code: string, teacherKey: string, input: Record<string, unknown>) {
  await ensureStarEscapeDatabase();
  const verified = await verifiedTeacher(code, teacherKey);
  if (!verified) return { status: 'unauthorized' as const };
  const db = database();
  const sessionId = String(verified.id);
  const action = String(input.action || '');
  if (action === 'start') {
    const rows = await db`UPDATE star_escape_sessions SET started_at=COALESCE(started_at, NOW()) WHERE id=${sessionId} RETURNING started_at`;
    const startedAt = new Date(String(rows[0]?.started_at || new Date().toISOString())).toISOString();
    await db`UPDATE star_escape_team_progress SET stage_started_at=COALESCE(stage_started_at, ${startedAt}),
      question_started_at=COALESCE(question_started_at, ${startedAt}), updated_at=NOW() WHERE session_id=${sessionId}`;
    return { status: 'started' as const, startedAt };
  }
  if (action === 'hint') {
    const message = String(input.message || '').trim().slice(0, 200);
    const teamValue = String(input.team || 'all');
    const team = teamValue === 'all' ? null : normalizeTeam(teamValue);
    const stage = Math.max(1, Math.min(4, Number(input.stage) || 1));
    const question = Math.max(1, Math.min(Number(STAGE_QUESTION_COUNTS[stage - 1]), Number(input.question) || 1));
    if (!message || (teamValue !== 'all' && !team)) return { status: 'invalid' as const };
    await db`INSERT INTO star_escape_hints (id, session_id, team_name, hint_type, stage, question_no, message)
      VALUES (${randomUUID()}, ${sessionId}, ${team}, 'teacher', ${stage}, ${question}, ${message})`;
    return { status: 'hint_sent' as const };
  }
  return { status: 'invalid' as const };
}
