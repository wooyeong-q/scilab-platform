import path from 'node:path';
import { unzipSync } from 'fflate';
import { XMLParser } from 'fast-xml-parser';
import { readSheet } from 'read-excel-file/node';
import { QuizError } from './quiz-rally-errors';
import type { QuizQuestion } from './quiz-rally-questions';

import { validateImage, validateQuestions, MAX_FILE_BYTES, type QuestionImage, type ImportedQuestion } from './quiz-rally-bank';
export { validateQuestions, MAX_FILE_BYTES } from './quiz-rally-bank';
function fail(message:string):never { throw new QuizError(message); }
const arr=(v:any):any[]=>v===undefined?[]:Array.isArray(v)?v:[v];
const parser=new XMLParser({ignoreAttributes:false,removeNSPrefix:true,parseTagValue:false,processEntities:false});
function xml(files:Record<string,Uint8Array>,name:string) { const raw=files[name];if(!raw)fail('엑셀 내부 연결을 읽지 못했습니다. 새 .xlsx 파일로 저장해 주세요.');const s=Buffer.from(raw).toString('utf8');if(/<!DOCTYPE|<!ENTITY/i.test(s))fail('지원하지 않는 엑셀 XML 형식입니다.');return parser.parse(s); }
function relation(files:Record<string,Uint8Array>,source:string,id:string) {
  const relName=path.posix.join(path.posix.dirname(source),'_rels',path.posix.basename(source)+'.rels');
  const r=arr(xml(files,relName).Relationships?.Relationship).find(x=>x['@_Id']===id);
  if(!r||r['@_TargetMode']==='External')fail('엑셀 그림의 내부 연결을 확인해 주세요.');
  const target=String(r['@_Target']||'');const dest=path.posix.normalize(target.startsWith('/')?target.slice(1):path.posix.join(path.posix.dirname(source),target));
  if(dest.startsWith('../'))fail('엑셀 내부 경로가 올바르지 않습니다.');return dest;
}
function csvRows(text:string) {
  const delimiter=text.split(/\r?\n/,1)[0].includes('\t')?'\t':',';
  const rows:string[][]=[];let row:string[]=[],value='',quoted=false;
  for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){value+='"';i++;}else if(quoted||!value)quoted=!quoted;else value+=c;}else if(!quoted&&(c===delimiter||c==='\n'||c==='\r')){row.push(value);value='';if(c!==delimiter){if(c==='\r'&&text[i+1]==='\n')i++;rows.push(row);row=[];}}else value+=c;if(value.length>10000||row.length>40||rows.length>1500)fail('CSV의 행·열 또는 셀 길이가 너무 큽니다. 문제 양식을 확인해 주세요.');}
  if(quoted)fail('CSV의 따옴표가 닫히지 않았습니다. 엑셀에서 다시 저장해 주세요.');if(value||row.length){row.push(value);rows.push(row);}return rows;
}
export async function importQuestionFile(bytes:Uint8Array,name:string) {
  if(!bytes.length||bytes.length>MAX_FILE_BYTES)fail('파일은 3MB 이하로 올려 주세요.');
  let rows:unknown[][]=[], rowImages=new Map<number,QuestionImage>();const warnings:string[]=[];
  if(/\.csv$/i.test(name)){let content:string;try{content=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{content=new TextDecoder('euc-kr').decode(bytes);}rows=csvRows(content.replace(/^\uFEFF/,''));}
  else if(/\.xlsx$/i.test(name)) {
    let files:Record<string,Uint8Array>,expanded=0,count=0;
    try {files=unzipSync(bytes,{filter(entry){expanded+=entry.originalSize;count++;if(expanded>24*1024*1024||entry.originalSize>10*1024*1024||count>2500)fail('압축을 푼 엑셀 용량이 너무 큽니다. 필요한 문제와 그림만 새 파일에 옮겨 주세요.');return true;}});}catch(e){if(e instanceof QuizError)throw e;fail('엑셀 파일을 읽지 못했습니다. 암호 없이 .xlsx로 저장해 주세요.');}
    if(Object.keys(files!).some(n=>n.startsWith('xl/richData/')||/cellimages\.xml$/.test(n)))fail('이 파일은 셀 내부 그림 형식을 사용합니다. 그림을 ‘셀 위에 배치’로 바꾸어 저장해 주세요.');
    const workbook=xml(files!,'xl/workbook.xml');const first=arr(workbook.workbook?.sheets?.sheet)[0];if(!first)fail('엑셀의 첫 시트에 문제를 넣어 주세요.');
    const sheetName=relation(files!,'xl/workbook.xml',first['@_id']);const sheet=xml(files!,sheetName).worksheet;
    const cells=arr(sheet?.sheetData?.row);if(cells.length>1500||cells.some(r=>Number(r['@_r'])>1500||arr(r.c).some(c=>/^[A-Z]{3,}/.test(c['@_r']||''))))fail('첫 시트의 불필요한 빈 행·열을 지워 주세요. 최대 500문제를 지원합니다.');
    try {rows=await readSheet(Buffer.from(bytes)) as unknown[][];}catch{fail('첫 시트의 셀을 읽지 못했습니다. 문제 양식에 복사해서 다시 저장해 주세요.');}
    for(const drawing of arr(sheet.drawing)) {
      const drawingName=relation(files!,sheetName,drawing['@_id']);const doc=xml(files!,drawingName).wsDr;
      for(const a of [...arr(doc?.oneCellAnchor),...arr(doc?.twoCellAnchor)]) {
        if(!a.pic)continue;const row=Number(a.from?.row)+1,embed=a.pic?.blipFill?.blip?.['@_embed'];
        if(!Number.isInteger(row)||!embed)fail('그림 위치를 읽지 못했습니다. 그림 왼쪽 위를 해당 문제 행에 맞춰 주세요.');
        if(rowImages.has(row))fail(`${row}행: 그림은 문제당 1개로 합쳐 넣어 주세요.`);
        const media=relation(files!,drawingName,embed),data=files![media];if(!data)fail(`${row}행: 그림 파일이 없습니다.`);
        const ext=path.posix.extname(media).toLowerCase(),mime=ext==='.png'?'image/png':/\.jpe?g/.test(ext)?'image/jpeg':ext==='.webp'?'image/webp':'';
        rowImages.set(row,validateImage({mime,data:Buffer.from(data).toString('base64')},row));
      }
    }
  }else fail('지원하는 파일은 .xlsx 또는 .csv입니다. .xls 파일은 .xlsx로 다시 저장해 주세요.');
  const norm=(v:unknown)=>String(v??'').replace(/[\s_()（）~～]/g,'').toLowerCase();
  const aliases:Record<string,string[]>={prompt:['문제','문제내용','질문'],one:['보기1','선택지1'],two:['보기2','선택지2'],three:['보기3','선택지3'],four:['보기4','선택지4'],answer:['정답','정답번호','정답14'],explanation:['해설','정답해설'],topic:['단원','주제'],imageUrl:['그림url','이미지url','그림주소','문제그림'],imageAlt:['그림설명','이미지설명']};
  const header=rows.slice(0,20).findIndex(row=>row.some(v=>aliases.prompt.includes(norm(v)))&&row.some(v=>aliases.answer.includes(norm(v))));
  if(header<0)fail('첫 시트에 문제·보기1·보기2·보기3·보기4·정답 열이 필요합니다. 양식 파일을 사용해 주세요.');
  const cols=Object.fromEntries(Object.entries(aliases).map(([key,values])=>[key,rows[header].findIndex(v=>values.includes(norm(v)))]));
  for(const key of ['prompt','one','two','three','four','answer'])if(cols[key]<0)fail('필수 열(문제, 보기1~4, 정답)이 빠졌습니다. 양식의 제목 행을 유지해 주세요.');
  const questions:ImportedQuestion[]=[];
  for(let i=header+1;i<rows.length;i++) {const row=rows[i];if(!row||row.every(v=>v===null||v===undefined||String(v).trim()===''))continue;const get=(key:string)=>row[cols[key]];const answer=Number(get('answer'));
    questions.push({row:i+1,prompt:get('prompt') as string,options:[get('one'),get('two'),get('three'),get('four')] as QuizQuestion['options'],answer:answer-1,explanation:get('explanation') as string,topic:get('topic') as string,imageUrl:get('imageUrl') as string,imageAlt:get('imageAlt') as string,...(rowImages.has(i+1)?{image:rowImages.get(i+1)}:{})});
    rowImages.delete(i+1);
  }
  if(rowImages.size)warnings.push(`${rowImages.size}개 그림은 문제 행에 연결되지 않았습니다. 그림의 왼쪽 위를 해당 문제 행에 맞춰 주세요.`);
  const {bank,images}=validateQuestions(questions);
  const normalized=Object.values(bank).map((q,i)=>{const {id,imageId,...rest}=q;return {...rest,row:questions[i].row,...(imageId?{image:images[imageId]}:{})};});
  return {questions:normalized,warnings,name:name.replace(/\.(xlsx|csv)$/i,'').slice(0,80)};
}
