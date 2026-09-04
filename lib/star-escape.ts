import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { sql } from './db';

const SESSION_DAYS = 14;
const MAX_PLAYERS = 45;
const MAX_TEAMS = 12;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const STAGE_QUESTION_COUNTS = [3, 3, 4, 4] as const;
const QUESTIONS = [
  [
    { answer: '7139', label: '비상 전력 암호', hint: '각 대원의 별 색과 숫자를 모은 뒤, 별의 표면 온도가 높은 순서대로 숫자를 배열하세요.' },
    { answer: '4826', label: '관측 수납함 배선', hint: 'R3은 노란색입니다. 별의 표면 온도는 푸른색, 흰색, 노란색, 붉은색 순으로 낮아집니다. 네 조건을 비교해 각 대원의 전선을 알맞은 별 색 단자에 연결하세요.' },
    { answer: '14', label: '항법장치 검증 암호', hint: '자료가 부족한 기록은 틀린 기록과 다릅니다. 과학적으로 참이라고 확인되는 기록 번호 두 개를 고르세요.' },
  ],
  [
    { answer: 'A', label: '관측 카드 기준별 선택', hint: '각 요원이 단서 탭에 저장한 3월·9월 카드에서 같은 별의 위치 변화를 비교하세요.', hints: ['각 요원이 맡은 별 A~D의 위치 변화가 얼마나 큰지 말로 공유하세요.', '두 사진의 배경별은 같으므로 날짜가 다른 같은 별의 위치만 비교하면 됩니다.', '별 A의 3월·9월 위치 변화가 가장 큽니다.'] },
    { answer: '6측12', label: '연주시차 분석 장치 암호', hint: '수수께끼가 가리키는 물건을 직접 눌러 숨은 정의 기록을 찾으세요.', hints: ['왼쪽 관측 콘솔의 조작판을 자세히 살펴보세요.', '연필 아래 기록은 “별을 (□)개월 간격으로 관(□)했을 때, 두 관측 방향 사이 각의 (□)/(□)이 연주시차이다.”입니다.', '빈칸은 6, 측, 1, 2입니다. 순서대로 이어 입력하세요.'] },
    { answer: 'ACDB', label: '같은 별 거리 자료 복구', hint: '처음 조사한 별 A~D의 두 관측 카드에서 위치 변화가 큰 순서를 공유하세요.', hints: ['각 요원이 단서 탭을 다시 열어 3월·9월 카드의 위치 변화를 비교하세요.', '연주시차가 클수록 별까지의 거리는 가깝습니다.', '위치 변화는 A > C > D > B입니다. 따라서 가까운 순서는 A → C → D → B입니다.'] },
  ],
  [
    { answer: '123456', label: '별의 등급 표시 복구', hint: '별은 등급 숫자가 작을수록 밝습니다.' },
    { answer: 'A', label: '겉보기등급 비교', hint: '전송된 관측 자료와 등급 기준을 다시 확인하세요.', hints: ['각 대원의 단서 탭에 전송된 겉보기등급을 말로 공유하세요.', '별은 등급 숫자가 작을수록 밝습니다.'] },
    { answer: 'C', label: '기준 거리 실제 밝기 비교', hint: '현재 별들은 서로 다른 거리에 있습니다.', hints: ['현재 별들은 서로 다른 거리에 있습니다.', '별들을 같은 거리에서 비교해 보세요.'] },
    { answer: 'XYZ', label: '겉보기등급·절대등급 거리 판정', hint: '겉보기등급은 지구에서 보이는 밝기입니다.', hints: ['겉보기등급은 지구에서 보이는 밝기입니다.', '절대등급은 10 pc에서의 밝기입니다.', '실제보다 밝게 보이면 가까운 쪽, 어둡게 보이면 먼 쪽입니다.'] },
  ],
  [
    {
      answer: '반사판뒤', label: '두 조각의 숨은 문구', hint: '두 조각을 겹치면 숨은 문구를 읽을 수 있습니다.',
      hints: ['두 조각을 겹치면 숨은 문구를 읽을 수 있습니다.', '한 장은 고정하고, 다른 한 장의 위치를 조금씩 맞춰 보세요.', '겹쳤을 때 위치를 알려주는 짧은 문구가 나타납니다.'],
    },
    {
      answer: '성운분류완료', label: '성운 관측 명판', hint: '흑백 사진을 모두 복원한 뒤 공통점과 차이를 비교하세요.',
      hints: ['흑백 사진을 모두 복원한 뒤 공통점과 차이를 비교하세요.', '붉게 빛나는 성운, 푸르게 보이는 성운, 배경을 가리는 어두운 성운을 구분해 보세요.', 'A는 붉은빛, B는 푸른빛, C는 어두운 가림 현상이 핵심입니다.'],
    },
    {
      answer: '성단분류완료', label: '성단 관측 보관함', hint: '성단의 모양과 별의 분포를 먼저 비교해 보세요.',
      hints: ['성단의 모양과 별의 분포를 먼저 비교해 보세요.', '성기고 불규칙한 무리는 산개성단, 둥글고 중심이 촘촘한 무리는 구상성단입니다.', 'X는 산개성단, Y는 구상성단입니다.'],
    },
    {
      answer: 'RETURN', label: '최종 귀환 인증', hint: 'UV로 확인한 다섯 개 분류 순서를 떠올려 보세요.',
      hints: ['UV로 확인한 다섯 개 분류 순서를 떠올려 보세요.', '시작 표시 `▲`부터 시계방향으로 배치해야 합니다.', '방출성운 → 산개성단 → 암흑성운 → 구상성단 → 반사성운'],
    },
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
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9가-힣]/g, '').slice(0, 20);
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
      ) AS has_action_progress,
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='star_escape_team_progress' AND column_name='scene_state'
      ) AS has_scene_state`;
    if (schemaRows[0]?.has_sessions && schemaRows[0]?.has_question_progress && schemaRows[0]?.has_action_progress && schemaRows[0]?.has_scene_state) {
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
      scene_state JSONB NOT NULL DEFAULT '{}'::jsonb,
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
    await db`ALTER TABLE star_escape_team_progress ADD COLUMN IF NOT EXISTS scene_state JSONB NOT NULL DEFAULT '{}'::jsonb`;
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
      sceneState: progress.scene_state && typeof progress.scene_state === 'object' ? progress.scene_state : {},
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
      question_started_at=NOW(), scene_state=CASE WHEN ${lastQuestion} THEN '{}'::jsonb ELSE scene_state END,
      completed_at=CASE WHEN ${nextStage}=5 THEN NOW() ELSE completed_at END,
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

function sceneSlots(value: unknown, size: number, allowed: readonly string[]) {
  if (!Array.isArray(value) || value.length !== size) return null;
  const slots = value.map((entry) => String(entry ?? ''));
  if (slots.some((entry) => entry && !allowed.includes(entry))) return null;
  const placed = slots.filter(Boolean);
  return new Set(placed).size === placed.length ? slots : null;
}

function normalizeScene03State(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const p1Slots = sceneSlots(input.p1Slots, 6, ['1', '2', '3', '4', '5', '6']);
  const p4Slots = sceneSlots(input.p4Slots, 3, ['X', 'Y', 'Z']);
  if (!p1Slots || !p4Slots) return null;

  const positionInput = input.p3Positions;
  if (!positionInput || typeof positionInput !== 'object' || Array.isArray(positionInput)) return null;
  const rawPositions = positionInput as Record<string, unknown>;
  const p3Positions = Object.fromEntries(['A', 'B', 'C', 'D'].map((letter) => {
    const position = Number(rawPositions[letter]);
    return [letter, Number.isFinite(position) ? Math.max(10, Math.min(90, Math.round(position * 10) / 10)) : 50];
  })) as Record<'A' | 'B' | 'C' | 'D', number>;

  const q2Selected = ['A', 'B', 'C', 'D'].includes(String(input.q2Selected || '')) ? String(input.q2Selected) : '';
  const referenceCard = ['A', 'B', 'C', 'D'].includes(String(input.referenceCard || '')) ? String(input.referenceCard) : '';
  const p1Complete = input.p1Complete === true && p1Slots.join('') === '123456';
  const dataSent = p1Complete && input.dataSent === true;
  const q2Complete = dataSent && q2Selected === 'A' && input.q2Complete === true;
  const p3Aligned = q2Complete && Object.values(p3Positions).every((position) => position === 50) && input.p3Aligned === true;
  const p3ResultConfirmed = p3Aligned && input.p3ResultConfirmed === true;
  const q3Complete = p3ResultConfirmed && referenceCard === 'C' && input.q3Complete === true;
  const p4Complete = q3Complete && p4Slots.join('') === 'XYZ' && input.p4Complete === true;
  const maintenanceOpen = p4Complete && input.maintenanceOpen === true;
  const requestedDialogue = Number(input.maintenanceDialogue);
  const maintenanceDialogue = maintenanceOpen && Number.isInteger(requestedDialogue)
    ? Math.max(0, Math.min(2, requestedDialogue))
    : -1;
  const recordingStarted = maintenanceOpen && maintenanceDialogue >= 2 && input.recordingStarted === true;
  const requestedLine = Number(input.recordingLine);
  const recordingLine = recordingStarted && Number.isInteger(requestedLine)
    ? Math.max(0, Math.min(5, requestedLine))
    : 0;
  const recordingComplete = recordingStarted && recordingLine === 5 && input.recordingComplete === true;

  return {
    p1Slots,
    p1Complete,
    dataSent,
    q2Selected,
    q2Complete,
    p3Positions,
    p3Aligned,
    p3ResultConfirmed,
    referenceCard,
    q3Complete,
    p4Slots,
    p4Complete,
    maintenanceOpen,
    maintenanceDialogue,
    recordingStarted,
    recordingLine,
    recordingComplete,
  };
}

function normalizeScene04State(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const nebulaSlots = sceneSlots(input.nebulaSlots, 3, ['emission', 'reflection', 'dark']);
  const clusterSlots = sceneSlots(input.clusterSlots, 2, ['open', 'globular']);
  const finalSlots = sceneSlots(input.finalSlots, 5, ['emission', 'open', 'dark', 'globular', 'reflection']);
  if (!nebulaSlots || !clusterSlots || !finalSlots) return null;

  const patternA = input.patternA === true;
  const filmB = input.filmB === true;
  const overlayComplete = patternA && filmB && input.overlayComplete === true;
  const lensAcquired = overlayComplete && input.lensAcquired === true;
  const restoredInput = input.photosRestored && typeof input.photosRestored === 'object' && !Array.isArray(input.photosRestored)
    ? input.photosRestored as Record<string, unknown>
    : {};
  const photosRestored = {
    A: lensAcquired && restoredInput.A === true,
    B: lensAcquired && restoredInput.B === true,
    C: lensAcquired && restoredInput.C === true,
  };
  const allPhotosRestored = photosRestored.A && photosRestored.B && photosRestored.C;
  const nebulaComplete = allPhotosRestored
    && nebulaSlots.join(',') === 'emission,reflection,dark'
    && input.nebulaComplete === true;
  const lockerActive = nebulaComplete && input.lockerActive === true;
  const dataSent = lockerActive && input.dataSent === true;
  const clusterComplete = dataSent
    && clusterSlots.join(',') === 'open,globular'
    && input.clusterComplete === true;
  const handleUnlocked = clusterComplete && input.handleUnlocked === true;
  const lockerOpen = handleUnlocked && input.lockerOpen === true;
  const uvAcquired = lockerOpen && input.uvAcquired === true;
  const uvRevealed = uvAcquired && input.uvRevealed === true;
  const authComplete = uvRevealed
    && finalSlots.join(',') === 'emission,open,dark,globular,reflection'
    && input.authComplete === true;
  const horrorSeen = authComplete && input.horrorSeen === true;
  const maintenanceOpen = horrorSeen && input.maintenanceOpen === true;
  const recordingStarted = maintenanceOpen && input.recordingStarted === true;
  const requestedRecordingLine = Number(input.recordingLine);
  const recordingLine = recordingStarted && Number.isInteger(requestedRecordingLine)
    ? Math.max(0, Math.min(4, requestedRecordingLine))
    : 0;
  const recordingComplete = recordingStarted && recordingLine === 4 && input.recordingComplete === true;
  const logSeen = recordingComplete && input.logSeen === true;
  const cctvStarted = logSeen && input.cctvStarted === true;
  const requestedCctvFrame = Number(input.cctvFrame);
  const cctvFrame = cctvStarted && Number.isInteger(requestedCctvFrame)
    ? Math.max(0, Math.min(6, requestedCctvFrame))
    : 0;
  const cctvComplete = cctvStarted && cctvFrame === 6 && input.cctvComplete === true;
  const exitOpen = cctvComplete && input.exitOpen === true;

  return {
    patternA,
    filmB,
    overlayComplete,
    lensAcquired,
    photosRestored,
    nebulaSlots,
    nebulaComplete,
    lockerActive,
    dataSent,
    clusterSlots,
    clusterComplete,
    handleUnlocked,
    lockerOpen,
    uvAcquired,
    uvRevealed,
    finalSlots,
    authComplete,
    horrorSeen,
    maintenanceOpen,
    recordingStarted,
    recordingLine,
    recordingComplete,
    logSeen,
    cctvStarted,
    cctvFrame,
    cctvComplete,
    exitOpen,
  };
}

export async function updateStarEscapeSceneState(code: string, playerId: string, playerKey: string, stageValue: unknown, questionValue: unknown, stateValue: unknown) {
  await ensureStarEscapeDatabase();
  const player = await verifiedPlayer(code, playerId, playerKey);
  if (!player) return { status: 'unauthorized' as const };
  const stage = Number(stageValue);
  const question = Number(questionValue);
  const sceneState = stage === 3
    ? normalizeScene03State(stateValue)
    : stage === 4
      ? normalizeScene04State(stateValue)
      : null;
  const questionCount = stage === 3 ? STAGE_QUESTION_COUNTS[2] : stage === 4 ? STAGE_QUESTION_COUNTS[3] : 0;
  if (!questionCount || !Number.isInteger(question) || question < 1 || question > questionCount || !sceneState) {
    return { status: 'invalid' as const };
  }
  const serialized = JSON.stringify(sceneState);
  const rows = await database()`UPDATE star_escape_team_progress SET scene_state=${serialized}::jsonb, updated_at=NOW()
    WHERE session_id=${String(player.session_id)} AND team_name=${String(player.team_name)}
      AND stage=${stage} AND question_no=${question}
    RETURNING scene_state`;
  return rows[0]
    ? { status: 'ok' as const, sceneState: rows[0].scene_state }
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
  if (action === 'extend') {
    const seconds = Math.max(300, Math.min(1800, Number(input.seconds) || 600));
    const rows = await db`UPDATE star_escape_sessions SET duration_seconds=LEAST(3600,
        GREATEST(duration_seconds, CEIL(EXTRACT(EPOCH FROM (NOW()-started_at)))::int)+${seconds})
      WHERE id=${sessionId} AND started_at IS NOT NULL
      RETURNING duration_seconds, started_at`;
    if (!rows[0]) return { status: 'invalid' as const };
    const elapsed = Math.max(0, Math.floor((Date.now() - new Date(String(rows[0].started_at)).getTime()) / 1000));
    return {
      status: 'extended' as const,
      durationSeconds: Number(rows[0].duration_seconds || 1800),
      remainingSeconds: Math.max(0, Number(rows[0].duration_seconds || 1800) - elapsed),
    };
  }
  if (action === 'restart') {
    const rows = await db`UPDATE star_escape_sessions SET started_at=NOW(), duration_seconds=1800
      WHERE id=${sessionId} RETURNING started_at`;
    if (!rows[0]) return { status: 'invalid' as const };
    const startedAt = new Date(String(rows[0].started_at)).toISOString();
    await db`DELETE FROM star_escape_attempts WHERE session_id=${sessionId}`;
    await db`DELETE FROM star_escape_hints WHERE session_id=${sessionId}`;
    await db`UPDATE star_escape_team_progress SET stage=1, question_no=1,
      stage_started_at=${startedAt}, question_started_at=${startedAt}, penalty_seconds=0, hint_count=0,
      last_submitter=NULL, last_action_status=NULL, last_action_at=NULL, scene_state='{}'::jsonb,
      completed_at=NULL, updated_at=NOW()
      WHERE session_id=${sessionId}`;
    return { status: 'restarted' as const, startedAt, durationSeconds: 1800 };
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
