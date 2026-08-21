import { neon } from '@neondatabase/serverless';
import { programs as seedPrograms, type Program } from './programs';

const connectionString = process.env.DATABASE_URL;
const sql = connectionString ? neon(connectionString) : null;
let initialized = false;

const EARTHQUAKE_VOLCANO_APP_URL = 'https://scilab-platform.vercel.app/labs/earthquake-volcano/index.html';
const GALAXY_VOYAGE_APP_URL = 'https://scilab-platform.vercel.app/labs/galaxy-voyage/index.html';
const MILKY_WAY_OBJECTS_APP_URL = 'https://scilab-platform.vercel.app/labs/galaxy-voyage/index.html?experience=milky-way-objects';
const STAR_ESCAPE_APP_URL = 'https://scilab-platform.vercel.app/labs/star-escape/index.html';

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
      VALUES ('galaxy-voyage','은하 항해일지','먼 별빛 신호를 추적해 실제 은하를 발견하고 태양계와 지구 위치까지 관찰합니다.','마우스·키보드 또는 손가락으로 3차원 우주를 움직여 먼 별빛 신호에 접근합니다. 가까워지면 NASA/Hubble 실제 은하 이미지와 이름이 해금되며, 우리은하에서는 태양계와 지구의 위치를 확대 관찰할 수 있습니다. 은하의 전체 모양을 스캔한 뒤 여러 표본을 나선 은하·타원 은하·불규칙 은하로 분류하는 탐사형 학습 프로그램입니다.','별과 우주','중학교 2학년','["은하","3D 탐사","태양계","지구 위치","은하 분류"]'::jsonb,'🚀',${GALAXY_VOYAGE_APP_URL},'SciLab',TRUE,'20~25분','웹 시뮬레이션','은하의 모양과 특징을 관찰하고 나선 은하, 타원 은하, 불규칙 은하로 구분할 수 있다.','https://github.com/wooyeong-q/scilab-platform/tree/main/public/labs/galaxy-voyage')
      ON CONFLICT(id) DO NOTHING`;
    await sql`INSERT INTO programs (id,title,summary,description,category,grade,tags,icon,url,author,featured,duration,format,standard,source_url)
      VALUES ('milky-way-objects','우리은하 천체 탐사','우리은하의 실제 성운과 성단을 찾아 관측하고 다섯 종류로 분류합니다.','마우스·키보드 또는 모바일 터치 조이스틱으로 3차원 우주를 자유롭게 탐사합니다. 천체 가까이를 지나가면 실제 관측 사진이 자동으로 관측 목록에 추가되며, 발광 성운·반사 성운·암흑 성운·산개 성단·구상 성단의 특징을 비교해 분류합니다. 수업 코드와 실시간 점수, UFO 이벤트도 사용할 수 있습니다.','별과 우주','중학교 2학년','["우리은하","성운","성단","천체 분류","3D 탐사"]'::jsonb,'🔭',${MILKY_WAY_OBJECTS_APP_URL},'SciLab',TRUE,'20~25분','웹 시뮬레이션','우리은하에 있는 다양한 천체를 관찰하고 발광 성운, 반사 성운, 암흑 성운, 산개 성단, 구상 성단으로 분류할 수 있다.','https://github.com/wooyeong-q/scilab-platform/tree/main/public/labs/galaxy-voyage')
      ON CONFLICT(id) DO UPDATE SET title=EXCLUDED.title,summary=EXCLUDED.summary,description=EXCLUDED.description,category=EXCLUDED.category,grade=EXCLUDED.grade,tags=EXCLUDED.tags,icon=EXCLUDED.icon,url=EXCLUDED.url,author=EXCLUDED.author,featured=EXCLUDED.featured,duration=EXCLUDED.duration,format=EXCLUDED.format,standard=EXCLUDED.standard,source_url=EXCLUDED.source_url,updated_at=NOW()`;
    await sql`INSERT INTO programs (id,title,summary,description,category,grade,tags,icon,url,author,featured,duration,format,standard,source_url)
      VALUES ('star-escape','우주방위대: 지구 귀환 작전','서로 다른 별과 우리은하 자료를 공유해 고장 난 우주 정거장을 탈출하는 실시간 협력 방탈출입니다.','모둠원 각자가 스마트폰·태블릿·PC로 접속해 서로 다른 보안 자료를 확인합니다. 별의 색과 표면 온도, 밝기와 등급, 우리은하의 모양과 구성, 지구의 우주적 위치를 비교해 4단계 암호를 해결합니다. 제한시간 30분, 실시간 순위표, 모둠 힌트, 교사용 문제별 정답률·평균 소요시간·관제 힌트 기능을 제공합니다.','별과 우주','중학교 2학년','["별의 특징","우리은하","협력 학습","방탈출","실시간 수업"]'::jsonb,'🛡️',${STAR_ESCAPE_APP_URL},'SciLab',TRUE,'20~30분','협력형 방탈출','별의 색·표면 온도·밝기 등 여러 특징을 설명하고 우리은하의 모양과 구성 및 태양계의 위치를 이해할 수 있다.','https://github.com/wooyeong-q/scilab-platform/tree/main/public/labs/star-escape')
      ON CONFLICT(id) DO UPDATE SET title=EXCLUDED.title,summary=EXCLUDED.summary,description=EXCLUDED.description,category=EXCLUDED.category,grade=EXCLUDED.grade,tags=EXCLUDED.tags,icon=EXCLUDED.icon,url=EXCLUDED.url,author=EXCLUDED.author,featured=EXCLUDED.featured,duration=EXCLUDED.duration,format=EXCLUDED.format,standard=EXCLUDED.standard,source_url=EXCLUDED.source_url,updated_at=NOW()`;
  }
  await sql`UPDATE programs SET url=${EARTHQUAKE_VOLCANO_APP_URL}, updated_at=NOW() WHERE id='gas-learning-app' AND url<>${EARTHQUAKE_VOLCANO_APP_URL}`;
  initialized=true;
}

export async function getPrograms():Promise<Program[]>{if(!sql)return seedPrograms;await ensureDatabase();const rows=await sql`SELECT * FROM programs WHERE is_published=TRUE ORDER BY featured DESC,like_count DESC,created_at DESC`;return rows.map((row)=>rowToProgram(row as Record<string,unknown>));}
export async function getProgram(id:string):Promise<Program|null>{if(!sql)return seedPrograms.find((item)=>item.id===id)||null;await ensureDatabase();const rows=await sql`SELECT * FROM programs WHERE id=${id} AND is_published=TRUE LIMIT 1`;return rows[0]?rowToProgram(rows[0] as Record<string,unknown>):null;}
export async function getAdminData(){await ensureDatabase();const programRows=await sql!`SELECT * FROM programs ORDER BY updated_at DESC`;const submissionRows=await sql!`SELECT * FROM submissions ORDER BY created_at DESC`;return {programs:programRows.map((row)=>rowToProgram(row as Record<string,unknown>)),submissions:submissionRows.map((row)=>({id:String(row.id),title:String(row.title),author:String(row.author),url:String(row.url),category:String(row.category),grade:String(row.grade),summary:String(row.summary),tags:Array.isArray(row.tags)?row.tags.map(String):[],duration:String(row.duration||''),standard:String(row.standard||''),thumbnailUrl:String(row.thumbnail_url||''),worksheetUrl:String(row.worksheet_url||''),pptUrl:String(row.ppt_url||''),videoUrl:String(row.video_url||''),sourceUrl:String(row.source_url||''),guideUrl:String(row.guide_url||''),status:String(row.status),createdAt:new Date(String(row.created_at)).toISOString()}))};}
export {sql};
