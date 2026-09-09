-- Existing additive schema, moved out of request handlers. Never resets data.

CREATE TABLE IF NOT EXISTS programs (
    id TEXT PRIMARY KEY,title TEXT NOT NULL,summary TEXT NOT NULL,description TEXT NOT NULL,category TEXT NOT NULL,grade TEXT NOT NULL,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,icon TEXT NOT NULL DEFAULT '🧪',url TEXT NOT NULL,author TEXT NOT NULL,featured BOOLEAN NOT NULL DEFAULT FALSE,
    duration TEXT NOT NULL DEFAULT '수업에 따라',format TEXT NOT NULL DEFAULT '웹 프로그램',standard TEXT NOT NULL DEFAULT '',thumbnail_url TEXT NOT NULL DEFAULT '',
    is_published BOOLEAN NOT NULL DEFAULT TRUE,view_count INTEGER NOT NULL DEFAULT 0,launch_count INTEGER NOT NULL DEFAULT 0,like_count INTEGER NOT NULL DEFAULT 0,
    worksheet_url TEXT NOT NULL DEFAULT '',ppt_url TEXT NOT NULL DEFAULT '',video_url TEXT NOT NULL DEFAULT '',source_url TEXT NOT NULL DEFAULT '',guide_url TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());

ALTER TABLE programs ADD COLUMN IF NOT EXISTS standard TEXT NOT NULL DEFAULT '';

ALTER TABLE programs ADD COLUMN IF NOT EXISTS thumbnail_url TEXT NOT NULL DEFAULT '';

ALTER TABLE programs ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE programs ADD COLUMN IF NOT EXISTS launch_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE programs ADD COLUMN IF NOT EXISTS like_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE programs ADD COLUMN IF NOT EXISTS worksheet_url TEXT NOT NULL DEFAULT '';

ALTER TABLE programs ADD COLUMN IF NOT EXISTS ppt_url TEXT NOT NULL DEFAULT '';

ALTER TABLE programs ADD COLUMN IF NOT EXISTS video_url TEXT NOT NULL DEFAULT '';

ALTER TABLE programs ADD COLUMN IF NOT EXISTS source_url TEXT NOT NULL DEFAULT '';

ALTER TABLE programs ADD COLUMN IF NOT EXISTS guide_url TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS submissions (
    id TEXT PRIMARY KEY,title TEXT NOT NULL,author TEXT NOT NULL,url TEXT NOT NULL,category TEXT NOT NULL,grade TEXT NOT NULL,summary TEXT NOT NULL,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,duration TEXT NOT NULL DEFAULT '',standard TEXT NOT NULL DEFAULT '',thumbnail_url TEXT NOT NULL DEFAULT '',
    worksheet_url TEXT NOT NULL DEFAULT '',ppt_url TEXT NOT NULL DEFAULT '',video_url TEXT NOT NULL DEFAULT '',source_url TEXT NOT NULL DEFAULT '',guide_url TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),reviewed_at TIMESTAMPTZ);

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS duration TEXT NOT NULL DEFAULT '';

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS standard TEXT NOT NULL DEFAULT '';

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS thumbnail_url TEXT NOT NULL DEFAULT '';

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS worksheet_url TEXT NOT NULL DEFAULT '';

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS ppt_url TEXT NOT NULL DEFAULT '';

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS video_url TEXT NOT NULL DEFAULT '';

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS source_url TEXT NOT NULL DEFAULT '';

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS guide_url TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS galaxy_voyage_sessions (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL DEFAULT '',
      teacher_key_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL
    );

CREATE TABLE IF NOT EXISTS galaxy_voyage_players (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES galaxy_voyage_sessions(id) ON DELETE CASCADE,
      nickname TEXT NOT NULL,
      player_key_hash TEXT NOT NULL,
      score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(session_id, nickname)
    );

ALTER TABLE galaxy_voyage_players ADD COLUMN IF NOT EXISTS last_ufo_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS galaxy_voyage_score_events (
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
    );

CREATE INDEX IF NOT EXISTS galaxy_voyage_sessions_expires_idx ON galaxy_voyage_sessions(expires_at);

CREATE INDEX IF NOT EXISTS galaxy_voyage_players_session_score_idx ON galaxy_voyage_players(session_id, score DESC);

CREATE INDEX IF NOT EXISTS galaxy_voyage_events_target_created_idx ON galaxy_voyage_score_events(target_id, created_at DESC);

CREATE TABLE IF NOT EXISTS earthquake_volcano_sessions (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL DEFAULT '',
      teacher_key_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL
    );

CREATE TABLE IF NOT EXISTS earthquake_volcano_points (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES earthquake_volcano_sessions(id) ON DELETE CASCADE,
      group_name TEXT NOT NULL,
      point_type TEXT NOT NULL CHECK (point_type IN ('지진', '화산')),
      name TEXT NOT NULL,
      lat DOUBLE PRECISION NOT NULL CHECK (lat BETWEEN -90 AND 90),
      lng DOUBLE PRECISION NOT NULL CHECK (lng BETWEEN -180 AND 180),
      delete_key_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

CREATE INDEX IF NOT EXISTS earthquake_volcano_points_session_created_idx
      ON earthquake_volcano_points(session_id, created_at);

CREATE INDEX IF NOT EXISTS earthquake_volcano_sessions_expires_idx
      ON earthquake_volcano_sessions(expires_at);

CREATE TABLE IF NOT EXISTS star_escape_sessions (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL DEFAULT '',
      teacher_key_hash TEXT NOT NULL,
      duration_seconds INTEGER NOT NULL DEFAULT 1800 CHECK (duration_seconds BETWEEN 300 AND 3600),
      started_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL
    );

CREATE TABLE IF NOT EXISTS star_escape_players (
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
    );

CREATE TABLE IF NOT EXISTS star_escape_team_progress (
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
    );

CREATE TABLE IF NOT EXISTS star_escape_attempts (
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
    );

CREATE TABLE IF NOT EXISTS star_escape_hints (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES star_escape_sessions(id) ON DELETE CASCADE,
      team_name TEXT,
      requester_id TEXT REFERENCES star_escape_players(id) ON DELETE SET NULL,
      hint_type TEXT NOT NULL CHECK (hint_type IN ('request', 'teacher')),
      stage INTEGER NOT NULL DEFAULT 1,
      question_no INTEGER NOT NULL DEFAULT 1,
      message TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

ALTER TABLE star_escape_team_progress ADD COLUMN IF NOT EXISTS question_no INTEGER NOT NULL DEFAULT 1;

ALTER TABLE star_escape_team_progress ADD COLUMN IF NOT EXISTS question_started_at TIMESTAMPTZ;

ALTER TABLE star_escape_team_progress ADD COLUMN IF NOT EXISTS last_submitter TEXT;

ALTER TABLE star_escape_team_progress ADD COLUMN IF NOT EXISTS last_action_status TEXT;

ALTER TABLE star_escape_team_progress ADD COLUMN IF NOT EXISTS last_action_at TIMESTAMPTZ;

ALTER TABLE star_escape_team_progress ADD COLUMN IF NOT EXISTS scene_state JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE star_escape_attempts ADD COLUMN IF NOT EXISTS question_no INTEGER NOT NULL DEFAULT 1;

ALTER TABLE star_escape_hints ADD COLUMN IF NOT EXISTS question_no INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS star_escape_sessions_expires_idx ON star_escape_sessions(expires_at);

CREATE INDEX IF NOT EXISTS star_escape_players_session_team_idx ON star_escape_players(session_id, team_name);

CREATE INDEX IF NOT EXISTS star_escape_attempts_session_stage_idx ON star_escape_attempts(session_id, stage);

CREATE INDEX IF NOT EXISTS star_escape_hints_session_created_idx ON star_escape_hints(session_id, created_at DESC);
