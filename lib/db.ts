import { neon } from '@neondatabase/serverless';
import { programs as seedPrograms, type Program } from './programs';

const connectionString = process.env.DATABASE_URL;
const sql = connectionString ? neon(connectionString) : null;


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

// Runtime callers only validate configuration. DDL lives in scripts/schema.sql.
export async function ensureDatabase(){
  if(!sql) throw new Error('DATABASE_URL is not configured');
}

function developmentPrograms() {
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    throw new Error('DATABASE_URL is not configured');
  }
  return seedPrograms;
}

// A fresh deadline per read; never cache a failure or substitute seed data on DB errors.
function readOptions() {
  return { fetchOptions: { signal: AbortSignal.timeout(8000), cache: 'no-store' } };
}

export async function getPrograms():Promise<Program[]>{if(!sql)return developmentPrograms();const rows=await sql.query('SELECT * FROM programs WHERE is_published=TRUE ORDER BY featured DESC,like_count DESC,created_at DESC',[],readOptions());return rows.map((row)=>rowToProgram(row as Record<string,unknown>));}
export async function getProgram(id:string):Promise<Program|null>{if(!sql)return developmentPrograms().find((item)=>item.id===id)||null;const rows=await sql.query('SELECT * FROM programs WHERE id=$1 AND is_published=TRUE LIMIT 1',[id],readOptions());return rows[0]?rowToProgram(rows[0] as Record<string,unknown>):null;}
export async function getAdminData(){await ensureDatabase();const programRows=await sql!`SELECT * FROM programs ORDER BY updated_at DESC`;const submissionRows=await sql!`SELECT * FROM submissions ORDER BY created_at DESC`;return {programs:programRows.map((row)=>rowToProgram(row as Record<string,unknown>)),submissions:submissionRows.map((row)=>({id:String(row.id),title:String(row.title),author:String(row.author),url:String(row.url),category:String(row.category),grade:String(row.grade),summary:String(row.summary),tags:Array.isArray(row.tags)?row.tags.map(String):[],duration:String(row.duration||''),standard:String(row.standard||''),thumbnailUrl:String(row.thumbnail_url||''),worksheetUrl:String(row.worksheet_url||''),pptUrl:String(row.ppt_url||''),videoUrl:String(row.video_url||''),sourceUrl:String(row.source_url||''),guideUrl:String(row.guide_url||''),status:String(row.status),createdAt:new Date(String(row.created_at)).toISOString()}))};}
export {sql};
