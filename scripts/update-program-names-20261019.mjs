// Explicit, one-time administrator-requested program naming update.
// Never run this script during a normal build or registration.
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const programRenames = [
  {
    "id": "star-escape",
    "previousTitle": "우주방위대: 지구 귀환 작전",
    "title": "별과 우리은하 방탈출"
  },
  {
    "id": "milky-way-objects",
    "previousTitle": "우리은하 천체 탐사",
    "title": "성운·성단 분류 탐사"
  },
  {
    "id": "quiz-rally",
    "previousTitle": "도시 재가동",
    "title": "장애물레이스"
  },
  {
    "id": "galaxy-voyage",
    "previousTitle": "은하 항해일지",
    "title": "은하 모양 분류 탐사"
  },
  {
    "id": "earth-system-ai",
    "previousTitle": "지구계 탐구 학습 프로그램",
    "title": "지구계 분류·상호작용 탐구"
  },
  {
    "id": "igneous",
    "previousTitle": "화성암 가상실험실",
    "title": "화성암 생성 가상실험"
  },
  {
    "id": "mineral",
    "previousTitle": "광물의 특성 실험실",
    "title": "광물 특성 가상실험"
  },
  {
    "id": "matter-zoom",
    "previousTitle": "확대! 물질 탐험 연구소",
    "title": "물질·원자 확대 탐구"
  },
  {
    "id": "gas-learning-app",
    "previousTitle": "지진대 화산대 탐구",
    "title": "지진·화산 분포 지도 탐구"
  }
];

export async function renamePublicPrograms(sql) {
  const desired = programRenames.map(({id,previousTitle,title})=>({id,previous_title:previousTitle,title}));
  return sql`
    WITH desired AS (
      SELECT * FROM jsonb_to_recordset(${JSON.stringify(desired)}::jsonb) AS d(id text,previous_title text,title text)
    ), changed AS (
      UPDATE programs p SET title=d.title,updated_at=NOW()
      FROM desired d WHERE p.id=d.id AND p.title=d.previous_title
        AND p.is_published=TRUE AND p.deleted_at IS NULL
      RETURNING p.id
    )
    SELECT d.id, CASE WHEN c.id IS NOT NULL THEN 'renamed'
      WHEN p.id IS NULL OR p.deleted_at IS NOT NULL OR NOT p.is_published THEN 'unavailable'
      WHEN p.title=d.title THEN 'current' ELSE 'administrator-edit-preserved' END AS status
    FROM desired d LEFT JOIN programs p ON p.id=d.id LEFT JOIN changed c ON c.id=d.id ORDER BY d.id
  `;
}

const invoked = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  if (process.argv.length !== 3 || process.argv[2] !== '--rename-programs-20261019') {
    console.log('Program naming skipped; explicit --rename-programs-20261019 is required.');
  } else if (process.env.VERCEL_ENV !== 'production') {
    console.log('Program naming deferred to production.');
  } else {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
    const { neon } = await import('@neondatabase/serverless');
    const report = await renamePublicPrograms(neon(process.env.DATABASE_URL));
    for (const {id,status} of report) console.log('Program name:',id,status);
  }
}
