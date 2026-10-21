import {sql} from '@/lib/db';
import {ContentError} from '../../public/labs/common-escape/content.mjs';
import {createService} from './service.mjs';
export {json,token,checkOrigin,limitedBytes,body,failure} from '../common-escape/http';
export const service=createService(async(statement,params=[])=>{if(!sql)throw new ContentError('수업 서버에 연결할 수 없습니다.',503);return await sql.query(statement,params,{fetchOptions:{signal:AbortSignal.timeout(10000),cache:'no-store'}}) as any[];});
