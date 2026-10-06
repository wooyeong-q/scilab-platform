import { randomBytes } from 'node:crypto';
import { QuizError } from './quiz-rally-errors';
import type { QuizQuestion } from './quiz-rally-questions';
export const MAX_QUESTIONS = 500;
export const MAX_FILE_BYTES = 3 * 1024 * 1024;
export type QuestionImage = { mime: string; data: string };
export type CustomQuestion = QuizQuestion & { imageId?: string; imageUrl?: string; imageAlt?: string };
export type ImportedQuestion = Omit<CustomQuestion, 'id' | 'imageId'> & { image?: QuestionImage; row?: number };
function fail(message: string): never { throw new QuizError(message); }
function field(v: unknown, max: number, name: string, row: number, optional = false) {
  if (v !== null && v !== undefined && typeof v !== 'string' && typeof v !== 'number') fail(`${row}행: ${name}에는 글자 또는 숫자를 넣어 주세요.`);
  const s = String(v ?? '').trim();
  if ((!optional && !s) || s.length > max) fail(`${row}행: ${name}은 ${optional ? '최대' : '1~'}${max}자까지 입력할 수 있습니다.`);
  return s;
}
export function validateImage(value: unknown, row: number): QuestionImage {
  const v = value as QuestionImage;
  if (!v || typeof v.data !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(v.data)) fail(`${row}행: 그림 데이터를 확인해 주세요.`);
  const data = Buffer.from(v.data, 'base64');
  const mime = data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'image/png' : data[0]===255 && data[1]===216 && data[2]===255 ? 'image/jpeg' : data.toString('ascii',0,4)==='RIFF' && data.toString('ascii',8,12)==='WEBP' ? 'image/webp' : '';
  if (!mime || v.mime !== mime || data.length > 1024*1024) fail(`${row}행: 그림은 PNG·JPG·WebP, 1장당 1MB 이하로 넣어 주세요.`);
  return { mime, data: data.toString('base64') };
}
export function validateQuestions(input: unknown) {
  if (!Array.isArray(input) || !input.length || input.length > MAX_QUESTIONS) fail('문제는 1~500개까지 넣을 수 있습니다.');
  const bank: Record<string, CustomQuestion> = {}, images: Record<string, QuestionImage> = {};
  let imageBytes = 0;
  for (const [i, raw] of input.entries()) {
    if (!raw || typeof raw !== 'object') fail(`${i+2}행: 문제 형식을 확인해 주세요.`);
    const row = Number.isInteger(raw.row) ? raw.row : i+2;
    const prompt = field(raw.prompt,500,'문제',row), topic=field(raw.topic,40,'단원',row,true)||'직접 넣은 문제';
    if (!Array.isArray(raw.options) || raw.options.length!==4) fail(`${row}행: 보기 4개를 넣어 주세요.`);
    const options=raw.options.map((v:unknown,j:number)=>field(v,200,`보기${j+1}`,row)) as QuizQuestion['options'];
    if(new Set(options).size!==4) fail(`${row}행: 보기 4개는 서로 달라야 합니다.`);
    if(!Number.isInteger(raw.answer)||raw.answer<0||raw.answer>3) fail(`${row}행: 정답은 보기 번호 1~4 중 하나여야 합니다.`);
    const id=`custom_${String(i+1).padStart(3,'0')}`;
    const q:CustomQuestion={id,prompt,topic,options,answer:raw.answer,explanation:field(raw.explanation,1000,'해설',row,true)||`정답은 ‘${options[raw.answer]}’입니다.`};
    q.imageAlt=field(raw.imageAlt,200,'그림 설명',row,true)||'문제에 제시된 그림';
    if(raw.image) { const img=validateImage(raw.image,row);imageBytes+=Buffer.byteLength(img.data,'base64');q.imageId=randomBytes(24).toString('base64url');images[q.imageId]=img; }
    else if(raw.imageUrl) { const u=field(raw.imageUrl,1500,'그림 URL',row);try { const url=new URL(u);if(url.protocol!=='https:'||url.username||url.password) fail(`${row}행: 그림 주소는 https://로 시작해야 합니다.`);q.imageUrl=url.href; }catch{fail(`${row}행: 올바른 https:// 그림 주소를 넣어 주세요.`);} }
    bank[id]=q;
  }
  if(imageBytes>2500000 || Buffer.byteLength(JSON.stringify({bank,images}))>4200000) fail('문제와 그림의 총용량이 큽니다. 그림 크기를 줄이거나 파일을 나누어 주세요.');
  return {bank,images};
}
