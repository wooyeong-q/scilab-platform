// Run with the artifact-tool runtime; no production dependency is added.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {toSheets} from '../public/labs/first-love/content.mjs';
import {ESCAPE_SAMPLE} from '../public/labs/first-love/escape-sample.mjs';
import {COOPERATIVE_SAMPLE} from '../public/labs/first-love/cooperative-sample.mjs';
const require=createRequire(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'builder.cjs'):import.meta.url);
const {Workbook,SpreadsheetFile}=await import(require.resolve('@oai/artifact-tool'));
const v3=process.argv.includes('--v3'),wb=Workbook.create(),sheets=toSheets(v3?ESCAPE_SAMPLE:COOPERATIVE_SAMPLE),output=process.argv[2]||'public/labs/first-love/first-love-template-v2.xlsx',previews=process.argv[3];
const widths={설정:[170,350,350],퍼즐:[80,110,100,220,300,300,360,280,280,280],자료:[80,80,140,270,70,90,100,100,100,130,230],대상:[80,90,90,220],모둠단서:[80,70,180,350,260],장치:[160,360,350]};
const editable={설정:[1],퍼즐:[2,4,5,6,7,8,9],자료:[2,3,5,9,10],대상:[3],모둠단서:[2,3,4],장치:[]};
if(v3){for(const row of sheets.장치)if(row[0]==='시작표식')row[2]='부스 책갈피 / 고정';else if(row[0]==='시계방향회전')row[2]='P8 위치표 / 고정';else if(row[0]==='이동경로')row[2]='P9 점검 덮개 안쪽 / 고정';}
for(const [name,rows]of Object.entries(sheets)){
 const sh=wb.worksheets.add(name),cols=rows[0].length;
 sh.showGridLines=false;
 const table=sh.getRangeByIndexes(3,0,rows.length,cols);table.values=rows.map(r=>Array.from({length:cols},(_,i)=>r[i]??''));
 table.format.font={name:'Arial',size:11,color:'#273B42'};table.format.verticalAlignment='center';table.format.wrapText=true;table.format.rowHeightPx=name==='퍼즐'?120:name==='모둠단서'?90:60;table.format.fill='#F0F0EC';
 sh.getRange('A2').values=[[name+' · 오늘, 너에게 v'+(v3?'3':'2')]];sh.getRange('A2').format.font={name:'Arial',size:15,bold:true,color:'#355A65'};sh.getRange('A2').format.rowHeightPx=36;
 const head=sh.getRangeByIndexes(3,0,1,cols);head.format.fill='#355A65';head.format.font={bold:true,color:'#FFFFFF'};head.format.rowHeightPx=32;head.format.horizontalAlignment='center';
 for(let i=0;i<cols;i++)sh.getRangeByIndexes(3,i,rows.length,1).format.columnWidthPx=widths[name][i];
 for(const col of rows.length>1?editable[name]:[])sh.getRangeByIndexes(4,col,rows.length-1,1).format.fill='#FFF2CF';
 if(name==='설정'){sh.getRange('B5').format.fill='#F0F0EC';sh.getRange('C6').values=[['연노랑: 입력 / 회색: 유지']];}
 if(!v3&&name==='퍼즐')sh.getRange('C5:C12').dataValidation={rule:{type:'list',values:['choose','order','classify']}};
 if(v3){if(name==='퍼즐')sh.getRange('C5:C12').format.fill='#F0F0EC';for(let r=1;r<rows.length;r++){if(['퍼즐','資料','자료','모둠단서'].includes(name)&&['P1','P2','P5','P6'].includes(rows[r][0]))sh.getRangeByIndexes(r+3,0,1,cols).format.fill='#F0F0EC';if(name==='자료'&&['P7','P8'].includes(rows[r][0]))sh.getRangeByIndexes(r+3,6,1,1).format.fill='#FFF2CF';}}
 if(rows.length>12)sh.freezePanes.freezeRows(4);
}
wb.recalculate();
console.log((await wb.inspect({kind:'table',range:'설정!A4:C11',include:'values',maxChars:1800,tableMaxRows:8,tableMaxCols:3})).ndjson);
console.log((await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?',options:{useRegex:true,maxResults:20},maxChars:500})).ndjson);
const xlsx=await SpreadsheetFile.exportXlsx(wb);await fs.mkdir(path.dirname(output),{recursive:true});await xlsx.save(output);
if(previews){await fs.mkdir(previews,{recursive:true});if(v3){for(const row of sheets.장치)if(row[0]==='시작표식')row[2]='부스 책갈피 / 고정';else if(row[0]==='시계방향회전')row[2]='P8 위치표 / 고정';else if(row[0]==='이동경로')row[2]='P9 점검 덮개 안쪽 / 고정';}
for(const [name,rows]of Object.entries(sheets)){const last=name==='퍼즐'?'F':name==='자료'?'F':String.fromCharCode(64+rows[0].length);const png=await wb.render({sheetName:name,range:`A2:${last}${Math.min(rows.length+3,11)}`,scale:1,format:'png'});await fs.writeFile(path.join(previews,name+'.png'),new Uint8Array(await png.arrayBuffer()));}}
console.log(output);
