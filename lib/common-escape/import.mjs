import path from 'node:path';
import {unzipSync} from 'fflate';
import {XMLParser} from 'fast-xml-parser';
import {ContentError,fromSheets,HEADERS} from '../../public/labs/common-escape/content.mjs';
const list=v=>v===undefined?[]:Array.isArray(v)?v:[v];
const parser=new XMLParser({ignoreAttributes:false,removeNSPrefix:true,parseTagValue:false,parseAttributeValue:false,processEntities:true});
const fail=m=>{throw new ContentError(m);};
const text=v=>typeof v==='object'&&v!==null?String(v['#text']??''):String(v??'');
const stringValue=v=>v?.t!==undefined?text(v.t):list(v?.r).map(r=>text(r.t)).join('');
const column=address=>{let n=0;for(const c of address.replace(/\d/g,''))n=n*26+c.charCodeAt(0)-64;return n-1;};
export async function importWorkbook(bytes,name){
 if(!/\.xlsx$/i.test(name))fail('.xlsx 양식을 올려 주세요. .xls·CSV·예전 12문제 양식은 지원하지 않습니다.');
 if(!bytes.length||bytes.length>3*1024*1024)fail('파일은 3MB 이하로 저장해 주세요.');
 let files,total=0,count=0;
 try{files=unzipSync(bytes,{filter:e=>{total+=e.originalSize;count++;if(total>20*1024*1024||e.originalSize>8*1024*1024||count>1000)fail('압축 해제 용량이 큽니다. 필요한 시트와 그림만 남겨 주세요.');return true;}});}catch(e){if(e instanceof ContentError)throw e;fail('엑셀을 읽지 못했습니다. 암호 없이 .xlsx로 저장해 주세요.');}
 if(Object.keys(files).some(n=>/vbaProject|externalLinks|richData\/|cellimages\.xml/i.test(n)))fail('매크로·외부 연결·셀 안 그림은 지원하지 않습니다. 그림은 셀 위에 배치해 주세요.');
 const xml=name=>{if(!files[name])fail('엑셀 내부 파일이 빠져 있습니다. 양식에 복사해 다시 저장해 주세요.');const str=new TextDecoder().decode(files[name]);if(/<!DOCTYPE|<!ENTITY/i.test(str))fail('지원하지 않는 XML 형식입니다.');try{return parser.parse(str);}catch{fail('엑셀 내부 형식을 읽지 못했습니다.');}};
 const rel=(source,id)=>{
   const links=xml(path.posix.join(path.posix.dirname(source),'_rels',path.posix.basename(source)+'.rels'));
   const found=list(links.Relationships?.Relationship).find(r=>r['@_Id']===id);
   if(!found||found['@_TargetMode']==='External')fail('엑셀의 외부 파일 연결은 지원하지 않습니다.');
   const target=String(found['@_Target']||''),result=path.posix.normalize(target.startsWith('/')?target.slice(1):path.posix.join(path.posix.dirname(source),target));
   if(result.startsWith('../')||!files[result])fail('엑셀 내부 경로를 확인해 주세요.');return result;
 };
 const strings=files['xl/sharedStrings.xml']?list(xml('xl/sharedStrings.xml').sst?.si).map(stringValue):[];
 if(strings.length>5000)fail('엑셀의 글자 자료가 너무 많습니다.');
 const sheets={},warnings=[];let cells=0;
 for(const sheet of list(xml('xl/workbook.xml').workbook?.sheets?.sheet)){
   const name=sheet['@_name'];if(!Object.hasOwn(HEADERS,name)){warnings.push(`${name} 시트는 사용하지 않았습니다.`);continue;}
   if(sheets[name])fail(name+': 이름이 같은 시트가 있습니다.');
   const source=rel('xl/workbook.xml',sheet['@_id']),doc=xml(source).worksheet,rows=[];
   for(const row of list(doc?.sheetData?.row)){
     const n=Number(row['@_r']);if(!Number.isInteger(n)||n<1||n>500)fail(name+': 500행 이내로 정리해 주세요.');
     const values=[];
     for(const c of list(row.c)){
       if(++cells>5000||!/^([A-Z]{1,2})([1-9]\d*)$/.test(c['@_r']||''))fail(name+': 셀 범위를 확인해 주세요.');
       const col=column(c['@_r']);if(col>25||Number(c['@_r'].match(/\d+$/)[0])!==n)fail(name+': 26열 이내로 정리해 주세요.');
       if(c.f!==undefined)fail(`${name}!${c['@_r']}: 수식 대신 계산된 내용을 값으로 넣어 주세요.`);
       if(c['@_t']==='e')fail(`${name}!${c['@_r']}: 엑셀 오류 값을 확인해 주세요.`);
       const type=c['@_t'],raw=text(c.v);
       if(type==='s'&&!Number.isInteger(Number(raw)))fail(name+': 문자열 참조를 확인해 주세요.');
       const value=type==='s'?strings[Number(raw)]:type==='inlineStr'?stringValue(c.is):raw;
       if(value===undefined)fail(name+': 문자열 연결이 올바르지 않습니다.');
       values[col]=value;
     }
     rows[n-1]=values;
   }
   sheets[name]=rows;
   if(name!=='자료'&&doc.drawing)fail(name+': 그림은 자료 시트의 해당 행 위에 넣어 주세요.');
   const header=rows.findIndex(r=>r?.includes('자료ID')&&r?.includes('그림주소'));
   const imageCol=header>=0?rows[header].indexOf('그림주소'):-1,used=new Set();
   for(const drawing of list(doc.drawing)){
     const file=rel(source,drawing['@_id']),drawingDoc=xml(file).wsDr;
     if(drawingDoc?.absoluteAnchor)fail('그림 왼쪽 위를 자료 시트의 해당 데이터 행 안에 배치해 주세요.');
     for(const anchor of [...list(drawingDoc?.oneCellAnchor),...list(drawingDoc?.twoCellAnchor)]){
       if(!anchor.pic)continue;
       const r=Number(anchor.from?.row),id=anchor.pic?.blipFill?.blip?.['@_embed'];
       if(!id||!Number.isInteger(r)||r<=header||!rows[r]||used.has(r)||imageCol<0)fail('자료 행마다 그림 하나씩 배치해 주세요.');
       const asset=rel(file,id),data=files[asset],ext=path.posix.extname(asset).toLowerCase(),mime=ext==='.png'?'png':/\.jpe?g$/.test(ext)?'jpeg':ext==='.webp'?'webp':'';
       if(!mime||!data||data.length>500000)fail(`자료 ${r+1}행: 500KB 이하 PNG·JPG·WEBP 그림을 사용해 주세요.`);
       used.add(r);rows[r][imageCol]=`data:image/${mime};base64,${Buffer.from(data).toString('base64')}`;
     }
   }
 }
 if(sheets.설정?.some(r=>r?.[0]==='양식버전'&&r?.[1]==='LAST-BROADCAST-2'))warnings.push('이전 7단계 양식입니다. 교과 자료를 유지하고 공통 기록으로 구성한 추가 퍼즐 3개를 적용했습니다. 새 양식에서는 이 세 퍼즐도 교과별로 바꿀 수 있어요.');
 return {lesson:fromSheets(sheets),warnings};
}
