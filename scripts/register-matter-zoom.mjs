// Register this program and upgrade only metadata still equal to its original seed.
import {readFile} from 'node:fs/promises';
import {neon} from '@neondatabase/serverless';
import {pathToFileURL} from 'node:url';

export const ORIGINAL_SEED_METADATA=Object.freeze({
  summary:'물·수소·금을 직접 확대하며 분자에서 원자 내부까지 탐험하고, 비교·전자 배치·주기율표로 연결하는 과학 탐구',
  description:'물방울, 수소 기체, 금 조각에서 작은 세계로 들어가 보세요. 물 분자와 수소 분자의 원자를 고르고, 금의 반복된 원자 배열을 관찰합니다. 선택한 원자의 내부를 확대하고 양성자·중성자·전자를 탐색한 뒤, 원소를 결정하는 양성자 수와 원자 번호, 중성 원자의 규칙을 발견합니다. 원자번호 1~20의 전자 배치를 직접 조작하고 주기율표에서 확인하며, 이름이 가려진 원자를 분석하는 종합 탐험으로 마무리합니다. 키보드·터치·드래그를 지원하며 특정 학습지 없이 사용할 수 있습니다.',
  grade:'중학교 2학년',
  tags:Object.freeze(['물질의 구성','확대 탐험','분자와 원자','원자 번호','전자 배치','주기율표']),
  format:'개별 탐구 · 확대 관찰 · 조작형 시뮬레이션',
  standard:'분자와 원자의 구분, 원자 구성 입자, 원자 번호와 중성 원자의 전자 배치 이해',
});

export async function registerMatterZoom(sql,p){
  await sql.query(`INSERT INTO programs (id,title,summary,description,category,grade,tags,icon,url,author,featured,duration,format,standard)
 VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11,$12,$13,$14) ON CONFLICT (id) DO NOTHING`,
 [p.id,p.title,p.summary,p.description,p.category,p.grade,JSON.stringify(p.tags),p.icon,p.url,p.author,p.featured,p.duration,p.format,p.standard],
 {fetchOptions:{signal:AbortSignal.timeout(15000)}});
  const old=ORIGINAL_SEED_METADATA;
  await sql.query(`UPDATE programs SET
    summary=CASE WHEN summary=$2 THEN $3 ELSE summary END,
    description=CASE WHEN description=$4 OR description=$14 THEN $5 ELSE description END,
    grade=CASE WHEN grade=$6 THEN $7 ELSE grade END,
    tags=CASE WHEN tags=$8::jsonb THEN $9::jsonb ELSE tags END,
    format=CASE WHEN format=$10 THEN $11 ELSE format END,
    standard=CASE WHEN standard=$12 THEN $13 ELSE standard END
    WHERE id=$1 AND (summary=$2 OR description=$4 OR grade=$6 OR tags=$8::jsonb OR format=$10 OR standard=$12 OR description=$14)`,
    [p.id,old.summary,p.summary,old.description,p.description,old.grade,p.grade,JSON.stringify(old.tags),JSON.stringify(p.tags),old.format,p.format,old.standard,p.standard,"물방울, 수소 기체, 금 조각에서 작은 세계로 들어가 보세요. 물 분자와 수소 분자의 원자를 고르고, 금의 반복된 원자 배열에서 원자 내부까지 확대합니다. 기본 수준은 중학교 2학년의 물질의 구성에 맞춰 원소·원자·분자, 양성자·중성자·전자, 원자 번호와 중성 원자를 탐구합니다. 고등학교 수준에서는 통합과학 내용을 연결하고 화학 확장 내용을 선택해 탐험할 수 있습니다. 전자 배치와 원자번호 1~20 주기율표, 처음 보는 원자 분석을 제공하며, 키보드·터치·드래그를 지원합니다. 학생 계정 없이 사용할 수 있고, 서로 다른 교사와 여러 학급은 반별 독립 링크와 기기별 탐험 기록으로 수업을 구분할 수 있습니다. 특정 학습지나 정해진 차시 없이 교사가 필요한 탐험을 선택합니다."],
    {fetchOptions:{signal:AbortSignal.timeout(15000)}});
}

async function main(){
  if(process.env.VERCEL_ENV && process.env.VERCEL_ENV!=='production'){
    console.log('Preview build: matter zoom registration deferred to production.');
    return;
  }
  if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is not configured');
  const p=JSON.parse(await readFile(new URL('../public/labs/matter-zoom/program.json',import.meta.url),'utf8'));
  await registerMatterZoom(neon(process.env.DATABASE_URL),p);
  console.log('Matter zoom catalog entry registered; original metadata upgraded and administrator edits preserved.');
}

if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href)await main();
