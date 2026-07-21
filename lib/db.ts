import { neon } from '@neondatabase/serverless';
import { programs as seedPrograms, type Program } from './programs';

const connectionString = process.env.DATABASE_URL;
const sql = connectionString ? neon(connectionString) : null;
let initialized = false;

const EARTHQUAKE_VOLCANO_APP_URL = 'https://scilab-platform.vercel.app/labs/earthquake-volcano/index.html';
const GALAXY_VOYAGE_APP_URL = 'https://scilab-platform.vercel.app/labs/galaxy-voyage/index.html';

export type Submission = {
  id:string; title:string; author:string; url:string; category:string; grade:string; summary:string; tags:string[];
  duration:string; standard:string; thumbnailUrl:string; worksheetUrl:string; pptUrl:string; videoUrl:string; sourceUrl:string; guideUrl:string;
  status:'pending'|'approved'|'rejected'; createdAt:string;
};

function rowToProgram(row: Record<string, unknown>): Program {
  return {
    id:String(row.id), title:String(row.title), summary:String(row.summary), description:String(row.description),
    category:String(row.category), grade:String(row.grade), tags:Array.isArray(row.tags)?row.tags.map(String):[],
    icon:String(row.icon||'🧪'), url:String(row.url), author:String(row.author), featured:Boolean(row.featured),
    duration:String(row.duration||'수업에 따라'), format:String(row.format||'웹 프로그램'), standard:String(row.standard||''),
    thumbnailUrl:String(row.thumbnail_url||''), viewCount:Number(row.view_count||0), launchCount:Number(row.launch_count||0), likeCount:Number(row.like_count||0),
    worksheetUrl:String(row.worksheet_url||''), pptUrl:String(row.ppt_url||''), videoUrl:String(row.video_url||''), sourceUrl:String(row.source_url||''), guideUrl:String(row.guide_url||''),
  };
}

export async function ensureDatabase(){
  if(!sql) throw new Error('DATABASE_URL is not configured');
  if(initialized) return;
  await sql`CREATE TABLE IF NOT EXISTS programs (
    id TEXT PRIMARY KEY,title TEXT NOT NULL,summary TEXT NOT NULL,description TEXT NOT NULL,category TEXT NOT NULL,grade TEXT NOT NULL,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,icon TEXT NOT NULL DEFAULT '🧪',url TEXT NOT NULL,author TEXT NOT NULL,featured BOOLEAN NOT NULL DEFAULT FALSE,
    duration TEXT NOT NULL DEFAULT '수업에 따라',format TEXT NOT NULL DEFAULT '웹 프로그램',standard TEXT NOT NULL DEFAULT '',thumbnail_url TEXT NOT NULL DEFAULT '',
    is_published BOOLEAN NOT NULL DEFAULT TRUE,view_count INTEGER NOT NULL DEFAULT 0,launch_count INTEGER NOT NULL DEFAULT 0,like_count INTEGER NOT NULL DEFAULT 0,
    worksheet_url TEXT NOT NULL DEFAULT '',ppt_url TEXT NOT NULL DEFAULT '',video_url TEXT NOT NULL DEFAULT '',source_url TEXT NOT NULL DEFAULT '',guide_url TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  for(const statement of [
    sql`ALTER TABLE programs ADD COLUMN IF NOT EXISTS standard TEXT NOT NULL DEFAULT ''`,
    sql`ALTER TABLE programs ADD COLUMN IF NOT EXISTS thumbnail_url TEXT NOT NULL DEFAULT ''`,
    sql`ALTER TABLE programs ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0`,
    sql`ALTER TABLE programs ADD COLUMN IF NOT EXISTS launch_count INTEGER NOT NULL DEFAULT 0`,
    sql`ALTER TABLE programs ADD COLUMN IF NOT EXISTS like_count INTEGER NOT NULL DEFAULT 0`,
    sql`ALTER TABLE programs ADD COLUMN IF NOT EXISTS worksheet_url TEXT NOT NULL DEFAULT ''`,
    sql`ALTER TABLE programs ADD COLUMN IF NOT EXISTS ppt_url TEXT NOT NULL DEFAULT ''`,
    sql`ALTER TABLE programs ADD COLUMN IF NOT EXISTS video_url TEXT NOT NULL DEFAULT ''`,
    sql`ALTER TABLE programs ADD COLUMN IF NOT EXISTS source_url TEXT NOT NULL DEFAULT ''`,
    sql`ALTER TABLE programs ADD COLUMN IF NOT EXISTS guide_url TEXT NOT NULL DEFAULT ''`
  ]) await statement;
  await sql`CREATE TABLE IF NOT EXISTS submissions (
    id TEXT PRIMARY KEY,title TEXT NOT NULL,author TEXT NOT NULL,url TEXT NOT NULL,category TEXT NOT NULL,grade TEXT NOT NULL,summary TEXT NOT NULL,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,duration TEXT NOT NULL DEFAULT '',standard TEXT NOT NULL DEFAULT '',thumbnail_url TEXT NOT NULL DEFAULT '',
    worksheet_url TEXT NOT NULL DEFAULT '',ppt_url TEXT NOT NULL DEFAULT '',video_url TEXT NOT NULL DEFAULT '',source_url TEXT NOT NULL DEFAULT '',guide_url TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),reviewed_at TIMESTAMPTZ)`;
  for(const statement of [
    sql`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS duration TEXT NOT NULL DEFAULT ''`,
    sql`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS standard TEXT NOT NULL DEFAULT ''`,
    sql`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS thumbnail_url TEXT NOT NULL DEFAULT ''`,
    sql`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS worksheet_url TEXT NOT NULL DEFAULT ''`,
    sql`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS ppt_url TEXT NOT NULL DEFAULT ''`,
    sql`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS video_url TEXT NOT NULL DEFAULT ''`,
    sql`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS source_url TEXT NOT NULL DEFAULT ''`,
    sql`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS guide_url TEXT NOT NULL DEFAULT ''`
  ]) await statement;
  if(process.env.VERCEL_ENV!=='preview'){
    await sql`INSERT INTO programs (id,title,summary,description,category,grade,tags,icon,url,author,featured,duration,format,standard,source_url)
      VALUES ('galaxy-voyage','은하 항해일지','우주선을 타고 우리은하와 여러 외부 은하를 탐사하며 모양에 따라 은하를 분류합니다.','우리은하를 정면과 옆면에서 관찰해 태양계의 위치를 찾고, 나선 은하·타원 은하·불규칙 은하의 특징을 비교한 뒤 미확인 은하를 스스로 판별하는 탐사형 학습 프로그램입니다.','별과 우주','중학교 2학년','["은하","우리은하","태양계","은하 분류"]'::jsonb,'🚀',${GALAXY_VOYAGE_APP_URL},'SciLab',TRUE,'15~20분','웹 시뮬레이션','은하의 모양과 특징을 관찰하고 종류를 구분할 수 있다.','https://github.com/wooyeong-q/scilab-platform/tree/main/public/labs/galaxy-voyage')
      ON CONFLICT(id) DO NOTHING`;
  }
  await sql`UPDATE programs SET url=${EARTHQUAKE_VOLCANO_APP_URL}, updated_at=NOW() WHERE id='gas-learning-app' AND url<>${EARTHQUAKE_VOLCANO_APP_URL}`;
  initialized=true;
}

export async function getPrograms():Promise<Program[]>{if(!sql)return seedPrograms;await ensureDatabase();const rows=await sql`SELECT * FROM programs WHERE is_published=TRUE ORDER BY featured DESC,like_count DESC,created_at DESC`;return rows.map((row)=>rowToProgram(row as Record<string,unknown>));}
export async function getProgram(id:string):Promise<Program|null>{if(!sql)return seedPrograms.find((item)=>item.id===id)||null;await ensureDatabase();const rows=await sql`SELECT * FROM programs WHERE id=${id} AND is_published=TRUE LIMIT 1`;return rows[0]?rowToProgram(rows[0] as Record<string,unknown>):null;}
export async function getAdminData(){await ensureDatabase();const programRows=await sql!`SELECT * FROM programs ORDER BY updated_at DESC`;const submissionRows=await sql!`SELECT * FROM submissions ORDER BY created_at DESC`;return {programs:programRows.map((row)=>rowToProgram(row as Record<string,unknown>)),submissions:submissionRows.map((row)=>({id:String(row.id),title:String(row.title),author:String(row.author),url:String(row.url),category:String(row.category),grade:String(row.grade),summary:String(row.summary),tags:Array.isArray(row.tags)?row.tags.map(String):[],duration:String(row.duration||''),standard:String(row.standard||''),thumbnailUrl:String(row.thumbnail_url||''),worksheetUrl:String(row.worksheet_url||''),pptUrl:String(row.ppt_url||''),videoUrl:String(row.video_url||''),sourceUrl:String(row.source_url||''),guideUrl:String(row.guide_url||''),status:String(row.status),createdAt:new Date(String(row.created_at)).toISOString()}))};}
export {sql};
