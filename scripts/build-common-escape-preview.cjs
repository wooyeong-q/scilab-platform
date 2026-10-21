// Local review artifact only. Does not deploy, connect to a DB, or register a program.
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
async function main(){
 const root=path.resolve(__dirname,'..'),game=path.join(root,'public/labs/common-escape');
 const output=path.resolve(process.argv[2]||'/tmp/common-escape-preview.html');
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'common-escape-preview-'));
 const read=file=>fs.readFile(path.join(game,file),'utf8');
 const prompt=await read('authoring-prompt.txt'),template=(await fs.readFile(path.join(game,'common-escape-template.xlsx'))).toString('base64');
 const {IMAGE_FILES}=await import(require('node:url').pathToFileURL(path.join(game,'assets.mjs')));
 const assets=Object.fromEntries(await Promise.all(Object.entries(IMAGE_FILES).map(async([name,file])=>[name,'data:image/webp;base64,'+(await fs.readFile(path.join(game,file))).toString('base64')])));
 const {AUDIO_FILES}=await import(require('node:url').pathToFileURL(path.join(game,'sound.mjs')));
 const audio=Object.fromEntries(await Promise.all(Object.entries(AUDIO_FILES).map(async([name,file])=>[name,'data:audio/mpeg;base64,'+(await fs.readFile(path.join(game,file))).toString('base64')])));
 const setup=`import {importWorkbook} from ${JSON.stringify(path.join(root,'lib/common-escape/import.mjs'))};
 window.__commonEscapeAudio=${JSON.stringify(audio)};
 window.__commonEscapeAssets=${JSON.stringify(assets)};
 window.__commonEscapeOffline=true;
 window.__commonEscapeImport=importWorkbook;
 window.__commonEscapePrompt=${JSON.stringify(prompt)};
 window.__commonEscapePromptURL='data:text/plain;charset=utf-8,'+encodeURIComponent(window.__commonEscapePrompt);
 window.__commonEscapeTemplateURL='data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${template}';
 globalThis.Buffer={from(data){return {toString(){let text='';for(let i=0;i<data.length;i+=8192)text+=String.fromCharCode(...data.subarray(i,i+8192));return btoa(text);}}}};`;
 await fs.writeFile(path.join(temp,'setup.mjs'),setup);
 await fs.writeFile(path.join(temp,'entry.mjs'),`import './setup.mjs';\nimport ${JSON.stringify(path.join(game,'app.mjs'))};`);
 await fs.writeFile(path.join(temp,'zip-path.mjs'),`const normalize=p=>{const out=[];for(const s of p.split('/')){if(!s||s==='.')continue;if(s==='..'&&out.length&&out.at(-1)!=='..')out.pop();else out.push(s);}return out.join('/')||'.';};export default {posix:{normalize,join:(...p)=>normalize(p.join('/')),dirname:p=>p.includes('/')?p.slice(0,p.lastIndexOf('/')):'.',basename:p=>p.slice(p.lastIndexOf('/')+1),extname:p=>{const f=p.slice(p.lastIndexOf('/')+1);return f.includes('.')?f.slice(f.lastIndexOf('.')):'';}}};`);
 const compiled=require('next/dist/compiled/webpack/webpack');compiled.init();
 await new Promise((resolve,reject)=>{
  const compiler=compiled.webpack({mode:'production',target:'web',entry:path.join(temp,'entry.mjs'),output:{path:temp,filename:'game.js'},devtool:false,optimization:{minimize:false},resolve:{alias:{'node:path':path.join(temp,'zip-path.mjs')}},plugins:[new compiled.webpack.NormalModuleReplacementPlugin(/^node:path$/,path.join(temp,'zip-path.mjs'))]});
  compiler.run((err,stats)=>compiler.close(()=>err?reject(err):stats.hasErrors()?reject(new Error(stats.toString({all:false,errors:true}))):resolve()));
 });
 const js=(await fs.readFile(path.join(temp,'game.js'),'utf8')).replace(/<\/script/gi,'<\\/script');
 let html=await read('index.html');html=html.replace('<title>마지막 방송 — 학교 괴담</title>','<title>마지막 방송 · 개인 체험</title>');
 const css=await read('style.css');
 html=html.replace(/<link rel="stylesheet" href="\.\/style\.css\?v=\d+">/,()=>'<style>'+css+'</style>');
 html=html.replace(/<script type="module" src="\.\/app\.mjs\?v=\d+"><\/script>/,()=>'<script>'+js+'</script>');
 await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,html);
 await fs.rm(temp,{recursive:true,force:true});console.log(output);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
