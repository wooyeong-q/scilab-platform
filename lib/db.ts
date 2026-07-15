import { neon } from '@neondatabase/serverless';
import { programs as seedPrograms, type Program } from './programs';

const connectionString = process.env.DATABASE_URL;
const sql = connectionString ? neon(connectionString) : null;
let initialized = false;

export type Submission = {
  id: string;
  title: string;
  author: string;
  url: string;
  category: string;
  grade: string;
  summary: string;
  tags: string[];
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
};

function rowToProgram(row: Record<string, unknown>): Program {
  return {
    id: String(row.id),
    title: String(row.title),
    summary: String(row.summary),
    description: String(row.description),
    category: String(row.category),
    grade: String(row.grade),
    tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
    icon: String(row.icon || '🧪'),
    url: String(row.url),
    author: String(row.author),
    featured: Boolean(row.featured),
    duration: String(row.duration || '수업에 따라'),
    format: String(row.format || '웹 프로그램'),
  };
}

export async function ensureDatabase() {
  if (!sql) throw new Error('DATABASE_URL is not configured');
  if (initialized) return;

  await sql`
    CREATE TABLE IF NOT EXISTS programs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      grade TEXT NOT NULL,
      tags JSONB NOT NULL DEFAULT '[]'::jsonb,
      icon TEXT NOT NULL DEFAULT '🧪',
      url TEXT NOT NULL,
      author TEXT NOT NULL,
      featured BOOLEAN NOT NULL DEFAULT FALSE,
      duration TEXT NOT NULL DEFAULT '수업에 따라',
      format TEXT NOT NULL DEFAULT '웹 프로그램',
      is_published BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      url TEXT NOT NULL,
      category TEXT NOT NULL,
      grade TEXT NOT NULL,
      summary TEXT NOT NULL,
      tags JSONB NOT NULL DEFAULT '[]'::jsonb,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      reviewed_at TIMESTAMPTZ
    )
  `;

  // 초기 프로그램은 이미 현재 운영 DB에 등록되어 있다.
  // 여기서 매번 다시 삽입하면 관리자가 삭제한 프로그램이 서버 재시작 후 부활하므로
  // 데이터베이스 초기화 과정에서는 더 이상 기본 프로그램을 재등록하지 않는다.
  initialized = true;
}

export async function getPrograms(): Promise<Program[]> {
  if (!sql) return seedPrograms;
  await ensureDatabase();
  const rows = await sql`SELECT * FROM programs WHERE is_published = TRUE ORDER BY featured DESC, created_at DESC`;
  return rows.map((row) => rowToProgram(row as Record<string, unknown>));
}

export async function getProgram(id: string): Promise<Program | null> {
  if (!sql) return seedPrograms.find((item) => item.id === id) || null;
  await ensureDatabase();
  const rows = await sql`SELECT * FROM programs WHERE id = ${id} AND is_published = TRUE LIMIT 1`;
  return rows[0] ? rowToProgram(rows[0] as Record<string, unknown>) : null;
}

export async function getAdminData() {
  await ensureDatabase();
  const programRows = await sql!`SELECT * FROM programs ORDER BY updated_at DESC`;
  const submissionRows = await sql!`SELECT * FROM submissions ORDER BY created_at DESC`;
  return {
    programs: programRows.map((row) => rowToProgram(row as Record<string, unknown>)),
    submissions: submissionRows.map((row) => ({
      id: String(row.id), title: String(row.title), author: String(row.author), url: String(row.url),
      category: String(row.category), grade: String(row.grade), summary: String(row.summary),
      tags: Array.isArray(row.tags) ? row.tags.map(String) : [], status: String(row.status),
      createdAt: new Date(String(row.created_at)).toISOString(),
    })),
  };
}

export { sql };
