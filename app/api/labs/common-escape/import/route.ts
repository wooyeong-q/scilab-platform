import {importWorkbook} from '@/lib/common-escape/import.mjs';
import {checkOrigin,limitedBytes,failure,json} from '@/lib/common-escape/http';
export const runtime='nodejs';
export async function POST(request:Request){try{checkOrigin(request);const name=decodeURIComponent(request.headers.get('x-file-name')||'');return json(await importWorkbook(await limitedBytes(request,3*1024*1024),name));}catch(e){return failure(e);}}
