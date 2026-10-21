import {service,body,failure,json} from '@/lib/common-escape/http';
export const runtime='nodejs';
export async function POST(request:Request){try{return json(await service.create(await body(request,3*1024*1024)),201);}catch(e){return failure(e);}}
