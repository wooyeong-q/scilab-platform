import { importQuestionFile, MAX_FILE_BYTES } from '@/lib/quiz-rally-import';
import { QuizError } from '@/lib/quiz-rally-errors';
import { quizFailure, quizJson } from '@/lib/quiz-rally-http';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){
  try {
    const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new QuizError('같은 사이트에서 올려 주세요.',403);
    if(Number(request.headers.get('content-length')||0)>MAX_FILE_BYTES+65536)throw new QuizError('파일은 3MB 이하로 올려 주세요.',413);
    let form:FormData;try{form=await request.formData();}catch{throw new QuizError('파일 업로드 형식을 확인해 주세요.');}
    const file=form.get('file');if(!file||typeof file==='string'||file.size>MAX_FILE_BYTES)throw new QuizError('3MB 이하의 엑셀 또는 CSV 파일을 선택해 주세요.');
    return quizJson(await importQuestionFile(new Uint8Array(await file.arrayBuffer()),file.name));
  }catch(e){return quizFailure(e);}
}
