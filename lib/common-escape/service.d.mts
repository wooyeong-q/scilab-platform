export function createService(query:(sql:string,params?:unknown[])=>Promise<any[]>,options?:{now?:()=>number}):any;
export function allowedRoles(me:any,members:any[]):number[];
