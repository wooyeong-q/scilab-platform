import { getQuizImage } from '@/lib/quiz-rally';
import { quizFailure } from '@/lib/quiz-rally-http';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(_request:Request,context:{params:Promise<{code:string;imageId:string}>}) {
  try{const {code,imageId}=await context.params,image=await getQuizImage(code,imageId);return new Response(new Uint8Array(Buffer.from(image.data,'base64')),{headers:{'Content-Type':image.mime,'X-Content-Type-Options':'nosniff','Cache-Control':'private, max-age=86400','Referrer-Policy':'no-referrer'}});}catch(e){return quizFailure(e);}
}
