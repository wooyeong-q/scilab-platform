// Retire the program requested by the administrator before generating public pages.
import { readFile } from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';
import { pathToFileURL } from 'node:url';

export async function retireAtomExplorer(sql, p) {
  if (p.id !== 'atom-explorer') throw new Error('Only atom-explorer can be retired by this script');
  await sql.query(`WITH deleted AS (
    INSERT INTO programs (id,title,summary,description,category,grade,tags,icon,url,author,featured,duration,format,standard,is_published,deleted_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11,$12,$13,$14,FALSE,NOW())
    ON CONFLICT (id) DO UPDATE SET
      is_published=FALSE, deleted_at=COALESCE(programs.deleted_at,NOW()),
      assets='[]'::jsonb, updated_at=NOW()
    WHERE programs.deleted_at IS NULL OR programs.is_published=TRUE OR programs.assets<>'[]'::jsonb
    RETURNING id
  )
  DELETE FROM program_assets WHERE program_id IN (SELECT id FROM deleted)`,
  [p.id,p.title,p.summary,p.description,p.category,p.grade,JSON.stringify(p.tags),p.icon,p.url,p.author,p.featured,p.duration,p.format,p.standard],
  { fetchOptions: { signal: AbortSignal.timeout(15000) } });
}

async function main() {
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production') {
    console.log('Preview build: atom explorer retirement deferred to production.');
    return;
  }
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');
  const p = JSON.parse(await readFile(new URL('../public/labs/atom-explorer/program.json',import.meta.url),'utf8'));
  await retireAtomExplorer(neon(process.env.DATABASE_URL), p);
  console.log('Atom explorer removed from the catalog; deletion marker preserved.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
