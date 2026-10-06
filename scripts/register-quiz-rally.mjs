import {readFile} from 'node:fs/promises';
import {neon} from '@neondatabase/serverless';
import {pathToFileURL} from 'node:url';
export async function registerQuizRally(sql,p){
 await sql.query(`INSERT INTO programs(id,title,summary,description,category,grade,tags,icon,url,author,featured,duration,format,standard)
 VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11,$12,$13,$14) ON CONFLICT(id) DO NOTHING`,
 [p.id,p.title,p.summary,p.description,p.category,p.grade,JSON.stringify(p.tags),p.icon,p.url,p.author,p.featured,p.duration,p.format,p.standard],
 {fetchOptions:{signal:AbortSignal.timeout(15000)}});
 // Upgrade only the untouched original catalog entry; preserve teacher/admin edits.
 await sql.query(`UPDATE programs SET title=$2,summary=$3,description=$4,tags=$5::jsonb,icon=$6
 WHERE id=$1 AND title='퀴즈 챌린지' AND summary='정답을 맞히고 보상 상자를 열어 아이템을 모으는, 우리 반 함께 과학 퀴즈 게임'`,
 [p.id,p.title,p.summary,p.description,JSON.stringify(p.tags),p.icon],{fetchOptions:{signal:AbortSignal.timeout(15000)}});
}
async function main(){
 if(process.env.VERCEL_ENV&&process.env.VERCEL_ENV!=='production'){console.log('Preview: Quiz Rally registration deferred to production.');return;}
 if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is not configured');
 const p=JSON.parse(await readFile(new URL('../public/labs/quiz-rally/program.json',import.meta.url),'utf8'));
 await registerQuizRally(neon(process.env.DATABASE_URL),p);console.log('Quiz Rally catalog entry registered; existing content preserved.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
