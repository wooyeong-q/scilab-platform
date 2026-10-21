export function createService(query:(statement:string,params?:any[])=>Promise<any[]>,options?:{now?:()=>number}):any;
